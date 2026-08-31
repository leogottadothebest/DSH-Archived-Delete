/**
 * dsh-plugin-archived-conversations — host entry.
 *
 * Mounts the archived-sessions Remote service on the root context. The
 * `./typert` export is registered automatically by
 * @deepseek-ai/dsh-typert-loader when this package's loader entry mounts.
 *
 * @module dsh-plugin-archived-conversations
 */
import { ArchivedSessionsRemote } from "./remote.js";

export const name = "archived-conversations";

export function apply(ctx) {
  ctx.plugin(ArchivedSessionsRemote);
}

export default apply;
