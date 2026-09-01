/**
 * dsh-plugin-archived-conversations — client entry.
 *
 * 1. Mounts this plugin's Typert contribution so the `remote.archivedSessions`
 *    namespace service exists on the client.
 * 2. Registers dictionaries, the page stylesheet, and the settings nav icon
 *    swap (installed here, not in the page, so the icon is correct the
 *    moment the settings panel opens — regardless of the active section).
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
import { installNavIcon } from "./nav-icon.js";
import { en, zh } from "./locale.js";

export const NS = "archived-conversations";
export const name = "archived-conversations-client";

/** Required client services. */
export const inject = ["remote", "slots", "locale", "workspaces"];

// Inject the stylesheet at module materialization — the point where the DSH
// module system runs its `claimStyles` inventory, so the tag is recorded as
// this module's own CSS (first-party bundles inject here). Everything below
// the guard is idempotent, so a later re-materialization is a no-op.
installStyles();

async function apply(ctx) {
  // The namespace is created by this mount — so this plugin must not declare
  // `remote.archivedSessions` in its own inject list (that would park it
  // forever waiting on itself).
  const unmountRemote = await ctx.remote.$mount(TYPERT_REMOTE);

  const page = new ArchivedConversationsController(ctx);

  // Re-assert the stylesheet on every apply: idempotent, and heals the tag if
  // anything removed it while this plugin was inactive. The tag is owned by
  // the stylesheet module, not by this apply — so the dispose path below
  // deliberately does NOT remove it (removal-after-remount is the intermittent
  // unstyled-page failure).
  installStyles();

  ctx.effect(() => ctx.locale.register(NS, { zh, en }), "archived-conversations: dictionaries");

  const offNavIcon = installNavIcon(() => ctx.locale.bind(NS)("nav"));

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
    offNavIcon();
    page.dispose();
    await unmountRemote();
  };
}

export { apply };
