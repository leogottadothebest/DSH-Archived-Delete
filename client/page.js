/**
 * dsh-plugin-archived-conversations — settings page.
 *
 * Rendered inside a `settings.section` entry; receives the page controller
 * and the locale-bound translate function through the slot inject surface.
 *
 * @module dsh-plugin-archived-conversations/client/page
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import {
  Button,
  IconArchiveOutline20,
  IconTrashOutline16,
  RiskConfirmation,
  relativeTime
} from "@deepseek-ai/dsh-client-ui-primitives";

/** Format one epoch-ms timestamp as a localized relative label. */
function formatWhen(at, t) {
  const when = relativeTime(at, Date.now());
  if (when.unit === "now") return t("time.now");
  return t(`time.${when.unit}`).replace("{n}", String(when.n));
}

/** One conversation row: identity, meta, unarchive/delete actions. */
function ArchivedRow({ item, t, pending, onUnarchive, onDelete }) {
  const title = item.title ?? t("untitled");
  const where = item.cwd ?? t("noWorkspace");
  const when = item.updatedAt !== null ? `${t("lastActivity")} · ${formatWhen(item.updatedAt, t)}` : "";
  const busy = pending;

  return jsx("li", {
    className: "dshAcv-row",
    children: [
      jsxs("div", {
        className: "dshAcv-rowMain",
        children: [
          jsx("div", { className: "dshAcv-rowTitle", title, children: title }),
          jsxs("div", {
            className: "dshAcv-rowMeta",
            children: [
              jsx("span", { className: "dshAcv-rowCwd", title: item.cwd ?? undefined, children: where }),
              when !== "" && jsx("span", { className: "dshAcv-rowWhen", children: when })
            ]
          }),
          item.readError !== null && jsx("div", {
            className: "dshAcv-rowError",
            children: t("readErrorLabel").replace("{error}", item.readError)
          })
        ]
      }),
      jsxs("div", {
        className: "dshAcv-rowActions",
        children: [
          jsx(Button, {
            variant: "outline",
            size: "sm",
            disabled: busy,
            icon: jsx(IconArchiveOutline20, { size: 14 }),
            onClick: () => onUnarchive(item.sessionId),
            children: t("unarchive")
          }),
          jsx(Button, {
            variant: "outline",
            size: "sm",
            disabled: busy,
            className: "dshAcv-danger",
            icon: jsx(IconTrashOutline16, {}),
            onClick: () => onDelete(item.sessionId),
            children: t("delete")
          })
        ]
      })
    ]
  });
}

/**
 * The archived-conversations settings page.
 * @param page - {@link ArchivedConversationsController}.
 * @param t - locale-bound translate function for this plugin's namespace.
 */
export function ArchivedConversationsPage({ page, t }) {
  const snapshot = useSyncExternalStore(page.subscribe, page.getSnapshot, page.getSnapshot);
  const [confirmItem, setConfirmItem] = useState(null);
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset the confirmation dialog whenever its target changes or closes.
  useEffect(() => {
    setAcknowledged(false);
  }, [confirmItem]);

  useEffect(() => {
    if (snapshot.message === null) return;
    const timer = setTimeout(() => page.dismissMessage(), 5000);
    return () => clearTimeout(timer);
  }, [snapshot.message, page]);

  const busyCount = snapshot.pending.size;

  const onConfirmDelete = async () => {
    if (confirmItem === null) return;
    const sessionId = confirmItem.sessionId;
    // Close first, then run: the row keeps a pending spinner while the
    // remote works, and any failure surfaces in the feedback banner.
    setConfirmItem(null);
    setAcknowledged(false);
    await page.deleteSession(sessionId);
  };

  return jsxs("div", {
    className: "dshAcv",
    children: [
      jsxs("header", {
        className: "dshAcv-header",
        children: [
          jsxs("div", {
            className: "dshAcv-heading",
            children: [
              jsx("h2", { className: "dshAcv-title", children: t("heading") }),
              jsx("p", { className: "dshAcv-description", children: t("description") })
            ]
          }),
          jsx(Button, {
            variant: "outline",
            size: "sm",
            disabled: snapshot.items.length === 0 || busyCount > 0,
            icon: jsx(IconArchiveOutline20, { size: 14 }),
            onClick: () => void page.unarchiveAll(),
            children: t("unarchiveAll")
          })
        ]
      }),

      snapshot.phase === "ready" && snapshot.message !== null && jsx("div", {
        className: `dshAcv-banner dshAcv-banner-${snapshot.message.kind}`,
        children: snapshot.message.key !== undefined
          ? t(snapshot.message.key).replace("{n}", String(snapshot.message.failed ?? 0))
          : snapshot.message.text
      }),

      snapshot.phase === "loading" && jsx("div", {
        className: "dshAcv-state",
        children: jsx("span", { className: "dshAcv-spinner", "aria-hidden": "true" })
      }),

      snapshot.phase === "error" && jsxs("div", {
        className: "dshAcv-state",
        children: [
          jsx("p", {
            className: "dshAcv-stateText",
            children: t("errorLabel").replace("{error}", snapshot.message?.text ?? "")
          }),
          jsx(Button, { variant: "outline", size: "sm", onClick: () => void page.refresh(), children: t("retry") })
        ]
      }),

      snapshot.phase === "ready" && snapshot.items.length === 0 && jsxs("div", {
        className: "dshAcv-state",
        children: [
          jsx(IconArchiveOutline20, { size: 28, className: "dshAcv-stateIcon" }),
          jsx("p", { className: "dshAcv-stateText", children: t("empty") })
        ]
      }),

      snapshot.phase === "ready" && snapshot.items.length > 0 && jsxs("div", {
        className: "dshAcv-listWrap",
        children: [
          jsx("p", { className: "dshAcv-count", children: t("countLabel").replace("{n}", String(snapshot.items.length)) }),
          jsx("ul", {
            className: "dshAcv-list",
            children: snapshot.items.map((item) => jsx(ArchivedRow, {
              item,
              t,
              pending: snapshot.pending.has(item.sessionId),
              onUnarchive: (sessionId) => void page.unarchive(sessionId),
              onDelete: (sessionId) => {
                const found = snapshot.items.find((candidate) => candidate.sessionId === sessionId);
                setConfirmItem(found ?? null);
                setAcknowledged(false);
              }
            }, item.sessionId))
          })
        ]
      }),

      jsx(RiskConfirmation, {
        open: confirmItem !== null,
        title: t("confirmTitle"),
        description: t("confirmDescription").replace("{title}", confirmItem?.title ?? t("untitled")),
        acknowledgeLabel: t("acknowledge"),
        cancelLabel: t("cancel"),
        closeLabel: t("cancel"),
        confirmLabel: t("confirmDelete"),
        acknowledged,
        disabled: snapshot.pending.size > 0,
        onAcknowledgedChange: setAcknowledged,
        onCancel: () => {
          setConfirmItem(null);
          setAcknowledged(false);
        },
        onConfirm: () => void onConfirmDelete()
      })
    ]
  });
}

export default ArchivedConversationsPage;
