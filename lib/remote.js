/**
 * dsh-plugin-archived-conversations — host remote service.
 *
 * Owns the `archivedSessions` Remote namespace (service key
 * `archivedSessionsRemote`). The workspace registry already keeps the
 * authoritative archive set (`archivedSessionIds`); this service adds the
 * missing lifecycle halves:
 *
 *   - `list`          — archived rows for the settings page (title, cwd,
 *                       activity time, per-row read errors),
 *   - `archive`       — delegate to the built-in registry archive,
 *   - `unarchive`     — remove one id from the archive set,
 *   - `deleteSession` — permanent deletion: live-store teardown, durable
 *                       artifact removal, workspace accounting and archive
 *                       set cleanup.
 *
 * All registry mutations run through the registry's `enqueueOperation`
 * chain, so they serialize against every other workspace write; the storage
 * domain publishes `domain/changed` for each committed state write, which
 * the workspace feed turns into client `archived` increments — unarchive
 * therefore brings the conversation straight back into the sidebar without
 * any extra plumbing.
 *
 * @module dsh-plugin-archived-conversations/remote
 */
import { dirname } from "node:path";
import { rm } from "node:fs/promises";
import { TypertRemoteFailure, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";

/** Cordis service key (must match the Typert invocation `service` field). */
export const ARCHIVED_SESSIONS_SERVICE_KEY = "archivedSessionsRemote";
/** Wire namespace (must match the Typert invocation `namespace` field). */
export const ARCHIVED_SESSIONS_NAMESPACE = "archivedSessions";

/** Raise one business failure carried to the client as `{ ok: false, error }`. */
function failure(code, message, details = {}) {
  return new TypertRemoteFailure({ code, message, details });
}

/**
 * Detach one live session from the SessionStore.
 *
 * The store's public surface only returns a detach disposer to the fiber
 * that called `enter()`; there is no public remove-by-id. The compiled
 * SessionStore keeps its entry map and `detachEntered(entry)` reachable, so
 * this helper uses them under a feature guard and fails with a clear
 * business error when a future refactor hides them. Detaching emits
 * `session/disposed`, which drives the persistence retirement drain — so the
 * caller must flush BEFORE calling this, and must not delete the artifact
 * until the flush settled (see `deleteSession`).
 *
 * @param sessions - the live SessionStore service (`ctx.sessions`).
 * @param sessionId - the session to detach.
 * @returns true when an entry was detached, false when none was live.
 * @throws {TypertRemoteFailure} when the internal escape hatch is unavailable.
 */
function detachLiveSession(sessions, sessionId) {
  if (typeof sessions?.detachEntered !== "function" || !(sessions.store instanceof Map)) {
    throw failure(
      "live-detach-unsupported",
      `session "${sessionId}" is live and this build exposes no store detach surface; retry after the session is no longer open`,
      { sessionId }
    );
  }
  const entry = sessions.store.get(sessionId);
  if (entry === undefined) return false;
  sessions.detachEntered(entry);
  return true;
}

/**
 * Host remote for archived-conversation management.
 */
export class ArchivedSessionsRemote extends TypertRemoteService {
  static inject = [
    "workspaceRegistry",
    "sessionPersistence",
    "sessions",
    "sessionProjections",
    "sessionProjectionCache"
  ];

  constructor(ctx) {
    super(ctx, ARCHIVED_SESSIONS_SERVICE_KEY, { namespace: ARCHIVED_SESSIONS_NAMESPACE });
  }

  /**
   * Resolve one archived row through the zero-I/O projection ladder: live
   * sessions read the in-memory projection registry, cold sessions read the
   * persisted projection cache (`session_projcache`) keyed by the stored
   * header. A row that cannot be read still returns with `readError` set —
   * the management page must be able to delete a broken archive entry.
   */
  async describe(sessionId, signal) {
    signal?.throwIfAborted();
    const row = {
      sessionId,
      title: null,
      cwd: null,
      createdAt: null,
      updatedAt: null,
      running: this.ctx.sessions.get(sessionId) !== undefined,
      readError: null
    };
    try {
      const header = await this.ctx.workspaceRegistry.readSessionHeader(sessionId);
      signal?.throwIfAborted();
      const live = this.ctx.sessions.get(sessionId);
      const projections = live !== undefined
        ? this.ctx.get("sessionProjections")?.cachedSnapshot?.(live)
        : this.ctx.get("sessionProjectionCache")?.cachedSnapshot?.(header);
      const values = projections?.values;
      const lastPromptAt = values?.sessionListMetadata?.lastPromptAt ?? 0;
      row.title = values?.title ?? null;
      row.cwd = header.cwd ?? null;
      row.createdAt = header.createdAt ?? null;
      row.updatedAt = Math.max(header.createdAt ?? 0, lastPromptAt) || null;
    } catch (error) {
      row.readError = error instanceof Error ? error.message : String(error);
    }
    return row;
  }

  /**
   * List every archived conversation, newest archived first.
   * @param signal - cancellation for header reads.
   */
  async list(signal) {
    const registry = this.ctx.workspaceRegistry;
    const ids = [...registry.archivedSessionIds].reverse();
    const items = [];
    for (const sessionId of ids) {
      items.push(await this.describe(sessionId, signal));
    }
    return { items, archivedSessionIds: [...registry.archivedSessionIds] };
  }

  /**
   * Archive one known session through the built-in registry path. Provided
   * for API completeness; the sidebar menu already archives through the core
   * workspace controller.
   */
  async archive(request, signal) {
    signal?.throwIfAborted();
    await this.ctx.workspaceRegistry.archiveSession(request.sessionId);
    return {
      sessionId: request.sessionId,
      archivedSessionIds: [...this.ctx.workspaceRegistry.archivedSessionIds]
    };
  }

  /**
   * Unarchive one session: remove its id from the durable archive set. The
   * session keeps its workspace accounting, so it reappears exactly where it
   * was in the sidebar as soon as the workspace feed replays the change.
   */
  async unarchive(request, signal) {
    signal?.throwIfAborted();
    const registry = this.ctx.workspaceRegistry;
    const { sessionId } = request;
    if (!registry.archivedSessionIds.includes(sessionId)) {
      throw failure("not-archived", `session "${sessionId}" is not archived`, { sessionId });
    }
    await registry.enqueueOperation(async () => {
      const state = registry.requireState();
      if (!state.archivedSessionIds.includes(sessionId)) return;
      await registry.setState({
        ...state,
        archivedSessionIds: state.archivedSessionIds.filter((id) => id !== sessionId)
      });
    });
    return { sessionId, archivedSessionIds: [...registry.archivedSessionIds] };
  }

  /**
   * Permanently delete one archived session.
   *
   * Order matters:
   *  1. flush the live store entry (public `SessionStore.flush`) so every
   *     buffered event is durable before anything is removed;
   *  2. detach the entry (feature-guarded) — the paired `session/disposed`
   *     retirement drain then finds nothing left to write;
   *  3. remove the persisted artifact directory (`fs.rm`, recursive);
   *  4. inside one registry operation: drop the id from the archive set and
   *     detach it from its workspace's `sessionIds` accounting.
   *
   * A row whose artifact is already gone (broken archive entry) still
   * cleans the registry — the operation is self-healing.
   */
  async deleteSession(request, signal) {
    signal?.throwIfAborted();
    const registry = this.ctx.workspaceRegistry;
    const { sessionId } = request;
    if (!registry.archivedSessionIds.includes(sessionId)) {
      throw failure("not-archived", `session "${sessionId}" is not archived`, { sessionId });
    }

    // 1 + 2 — live-store teardown.
    const sessions = this.ctx.sessions;
    const live = sessions.get(sessionId);
    if (live !== undefined) {
      await sessions.flush(live);
      detachLiveSession(sessions, sessionId);
    }

    // 3 — durable artifact removal. `locate` is the jsonl backend's path
    // resolution; a backend without it cannot support deletion.
    try {
      const header = await registry.readSessionHeader(sessionId);
      const location = this.ctx.sessionPersistence.locate?.(header);
      if (location === undefined) {
        throw failure(
          "unsupported-backend",
          "this session-persistence backend does not expose session artifacts; nothing was removed from disk",
          { sessionId }
        );
      }
      await rm(dirname(location.path), { recursive: true, force: true });
    } catch (error) {
      if (error instanceof TypertRemoteFailure) throw error;
      // Header lookup or removal failed; registry cleanup still proceeds so
      // the archive entry cannot resurrect a half-deleted conversation.
      this.ctx.logger.warn(`archived-conversations: artifact removal for "${sessionId}" failed: ${String(error)}`);
    }

    // 4 — registry cleanup in one serialized operation.
    await registry.enqueueOperation(async () => {
      const state = registry.requireState();
      await registry.setState({
        ...state,
        archivedSessionIds: state.archivedSessionIds.filter((id) => id !== sessionId)
      });
      for (const entity of registry.list()) {
        if (entity.sessionIds.includes(sessionId)) await entity.detachSession(sessionId);
      }
    });

    return { sessionId, deleted: true };
  }
}

export default ArchivedSessionsRemote;
