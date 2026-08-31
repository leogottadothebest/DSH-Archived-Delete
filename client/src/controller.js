/**
 * dsh-plugin-archived-conversations — settings page controller.
 *
 * Holds the page snapshot (a tiny external store consumed through
 * `useSyncExternalStore`) and every remote action. The archive id set is
 * watched through the client `workspaces` service, so archiving a
 * conversation from the sidebar refreshes this page live; the reverse is
 * true after unarchive because the workspace feed replays the registry
 * change.
 *
 * @module dsh-plugin-archived-conversations/client/controller
 */

const IDLE = { phase: "loading", items: [], archivedSessionIds: [], message: null, pending: new Set() };

/**
 * Remote namespace accessor resolved lazily: the namespace service exists
 * once this plugin's own `$mount` completes (the page controller is only
 * constructed after that point).
 */
function archivedRemote(ctx) {
  const remote = ctx.get("remote.archivedSessions");
  if (remote === undefined) throw new Error("archived-conversations: remote.archivedSessions is not mounted");
  return remote;
}

function errorText(result) {
  const error = result?.error;
  if (error === undefined) return "unknown error";
  return typeof error === "string" ? error : `${error.code}: ${error.message}`;
}

export class ArchivedConversationsController {
  #ctx;
  #listeners = new Set();
  #snapshot = IDLE;
  #watchOff;
  #disposed = false;

  constructor(ctx) {
    this.#ctx = ctx;
    this.#watchOff = this.#watchArchiveSet(ctx);
    void this.refresh();
  }

  /** useSyncExternalStore contract. */
  getSnapshot = () => this.#snapshot;

  subscribe = (listener) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  #emit(patch) {
    if (this.#disposed) return;
    this.#snapshot = { ...this.#snapshot, ...patch };
    for (const listener of [...this.#listeners]) listener();
  }

  /** Live archive-set watch: refresh whenever the set changes elsewhere. */
  #watchArchiveSet(ctx) {
    const workspaces = ctx.get("workspaces");
    if (workspaces === undefined || typeof workspaces.list?.subscribe !== "function") return () => {};
    const idsOf = () => JSON.stringify(workspaces.list.getSnapshot()?.archivedSessionIds ?? []);
    let last = idsOf();
    return workspaces.list.subscribe(() => {
      const next = idsOf();
      if (next === last) return;
      last = next;
      void this.refresh();
    });
  }

  #pending(sessionId, on) {
    const pending = new Set(this.#snapshot.pending);
    if (on) pending.add(sessionId);
    else pending.delete(sessionId);
    this.#emit({ pending });
  }

  /** Reload the archived list. */
  async refresh() {
    if (this.#disposed) return;
    this.#emit({ phase: "loading" });
    try {
      const result = await archivedRemote(this.#ctx).list();
      if (this.#disposed) return;
      if (!result.ok) {
        this.#emit({ phase: "error", message: { kind: "error", text: errorText(result) } });
        return;
      }
      this.#emit({ phase: "ready", items: result.value.items, archivedSessionIds: result.value.archivedSessionIds, message: null });
    } catch (error) {
      if (this.#disposed) return;
      this.#emit({ phase: "error", message: { kind: "error", text: error instanceof Error ? error.message : String(error) } });
    }
  }

  /** Cancel the archive: the conversation returns to its workspace list. */
  async unarchive(sessionId) {
    this.#pending(sessionId, true);
    try {
      const result = await archivedRemote(this.#ctx).unarchive({ sessionId });
      if (!result.ok) {
        this.#pending(sessionId, false);
        this.#emit({ message: { kind: "error", text: errorText(result) } });
        return false;
      }
      await this.refresh();
      this.#emit({ message: { kind: "success", key: "unarchived" } });
      return true;
    } catch (error) {
      this.#pending(sessionId, false);
      this.#emit({ message: { kind: "error", text: error instanceof Error ? error.message : String(error) } });
      return false;
    }
  }

  /** Unarchive every listed conversation, sequentially, one refresh at the end. */
  async unarchiveAll() {
    const ids = this.#snapshot.items.map((item) => item.sessionId);
    if (ids.length === 0) return;
    this.#emit({ pending: new Set(ids) });
    let failed = 0;
    for (const sessionId of ids) {
      try {
        const result = await archivedRemote(this.#ctx).unarchive({ sessionId });
        if (!result.ok) failed += 1;
      } catch {
        failed += 1;
      }
    }
    await this.refresh();
    this.#emit({
      message: failed === 0
        ? { kind: "success", key: "unarchived" }
        : { kind: "error", key: "unarchivePartiallyFailed", failed }
    });
  }

  /** Permanently delete one archived conversation. */
  async deleteSession(sessionId) {
    this.#pending(sessionId, true);
    try {
      const result = await archivedRemote(this.#ctx).deleteSession({ sessionId });
      if (!result.ok) {
        this.#pending(sessionId, false);
        this.#emit({ message: { kind: "error", text: errorText(result) } });
        return false;
      }
      await this.refresh();
      this.#emit({ message: { kind: "success", key: "deleted" } });
      return true;
    } catch (error) {
      this.#pending(sessionId, false);
      this.#emit({ message: { kind: "error", text: error instanceof Error ? error.message : String(error) } });
      return false;
    }
  }

  /** Clear the transient feedback banner. */
  dismissMessage() {
    if (this.#snapshot.message === null) return;
    this.#emit({ message: null });
  }

  dispose() {
    this.#disposed = true;
    this.#watchOff?.();
    this.#listeners.clear();
  }
}
