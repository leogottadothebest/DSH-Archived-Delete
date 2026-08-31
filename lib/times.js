/**
 * dsh-plugin-archived-conversations — archive-time records.
 *
 * The core archive set (`workspaceRegistry.archivedSessionIds`) is a plain
 * id array with no timestamps, so this module owns a small storage domain
 * that stamps the moment a conversation ENTERS the archive set. Entries are
 * written only for transitions observed after this service starts —
 * conversations archived before the plugin was installed keep no record and
 * render as unknown instead of being backfilled with a misleading date.
 *
 * @module dsh-plugin-archived-conversations/times
 */
import { z } from "zod";
import { defineDomain, domainTable } from "@deepseek-ai/dsh-storage-domain";

/** One durable archive-time stamp, keyed by session id. */
const archiveTimeRecord = z.object({
  archivedAt: z.number().int().nonnegative()
});

/** The `archived-conversations` domain: one `sessions` table. */
export const archiveTimesDomainSpec = defineDomain({
  name: "archived_conversations",
  version: 1,
  tables: { sessions: domainTable(archiveTimeRecord) }
});
