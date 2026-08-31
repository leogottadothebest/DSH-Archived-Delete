/**
 * dsh-plugin-archived-conversations — client entry.
 *
 * 1. Mounts this plugin's Typert contribution so the `remote.archivedSessions`
 *    namespace service exists on the client.
 * 2. Registers dictionaries and the page stylesheet.
 * 3. Registers a `settings.section` entry ("已归档对话" / "Archived
 *    conversations") whose panel renders the management page.
 *
 * The `workspaces` service is declared as a dependency: the page controller
 * subscribes to its live archive-set snapshot, so conversations archived
 * from the sidebar appear here without a manual refresh — and unarchiving
 * here puts them straight back into the sidebar through the same feed.
 *
 * @module dsh-plugin-archived-conversations/client
 */
import { TYPERT_REMOTE } from "./typert.js";
import { ArchivedConversationsController } from "./controller.js";
import { ArchivedConversationsPage } from "./page.js";
import { installStyles } from "./styles.js";
import { en, zh } from "./locale.js";

export const NS = "archived-conversations";
export const name = "archived-conversations-client";

/** Required client services. */
export const inject = ["remote", "slots", "locale", "workspaces"];

async function apply(ctx) {
  // The namespace is created by this mount — so this plugin must not declare
  // `remote.archivedSessions` in its own inject list (that would park it
  // forever waiting on itself).
  const unmountRemote = await ctx.remote.$mount(TYPERT_REMOTE);

  const page = new ArchivedConversationsController(ctx);
  const offStyles = installStyles();

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "archived-conversations: dictionaries");

  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "archived-conversations",
    order: 30,
    label: () => ctx.locale.bind(NS)("nav"),
    locale: NS,
    inject: () => ({
      page,
      t: ctx.locale.bind(NS),
      readLocale: () => ctx.locale.getLocale().active
    })
  }, ArchivedConversationsPage));

  return async () => {
    page.dispose();
    offStyles();
    await unmountRemote();
  };
}

export { apply };
