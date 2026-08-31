/**
 * dsh-plugin-archived-conversations — settings page.
 *
 * Rendered inside a `settings.section` entry; receives the page controller
 * and the locale-bound translate function through the slot inject surface.
 *
 * Layout follows the DSH settings design language: a heading with an icon
 * chip, a right-aligned action toolbar, and project-grouped rows (like the
 * sidebar's workspace grouping) rendered with the `--dsw-alias-*` tokens.
 *
 * @module dsh-plugin-archived-conversations/client/page
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { jsx, jsxs } from "react/jsx-runtime";
import {
  Button,
  IconArchiveOutline20,
  IconFolderClose16,
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

/** Split the archived rows into project groups, preserving archive order. */
function groupItems(items) {
  const groups = [];
  const byPath = new Map();
  for (const item of items) {
    const path = item.cwd ?? "";
    let group = byPath.get(path);
    if (group === undefined) {
      group = { path, items: [] };
      byPath.set(path, group);
      groups.push(group);
    }
    group.items.push(item);
  }
  const ungrouped = groups.filter((group) => group.path === "");
  return [...groups.filter((group) => group.path !== ""), ...ungrouped];
}

/** Resolve a group's display title: workspace title → directory name → fallback. */
function projectTitle(path, projects, t) {
  if (path === "") return t("noWorkspace");
  const title = projects[path];
  if (typeof title === "string" && title !== "") return title;
  const segments = path.split("/").filter(Boolean);
  return segments.length > 0 ? segments[segments.length - 1] : path;
}

/** One conversation row: identity, meta, unarchive/delete actions. */
function ArchivedRow({ item, t, pending, onUnarchive, onDelete }) {
  const title = item.title ?? t("untitled");
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
              when !== "" && jsx("span", { children: when }),
              item.readError !== null && jsx("span", {
                className: "dshAcv-rowError",
                children: t("readErrorLabel").replace("{error}", item.readError)
              })
            ]
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
            className: "dshAcv-dangerButton",
            icon: jsx(IconTrashOutline16, {}),
            onClick: () => onDelete(item),
            children: t("delete")
          })
        ]
      })
    ]
  });
}

/** One project group: header (folder icon + title + count) over its rows. */
function ProjectGroup({ group, projects, t, pending, onUnarchive, onDelete }) {
  return jsxs("section", {
    className: "dshAcv-group",
    children: [
      jsxs("div", {
        className: "dshAcv-groupHeader",
        children: [
          jsx("span", {
            className: "dshAcv-groupIcon",
            children: jsx(IconFolderClose16, { size: 14 })
          }),
          jsx("span", {
            className: "dshAcv-groupTitle",
            title: group.path === "" ? undefined : group.path,
            children: projectTitle(group.path, projects, t)
          }),
          jsx("span", {
            className: "dshAcv-groupCount",
            children: String(group.items.length)
          })
        ]
      }),
      jsx("ul", {
        className: "dshAcv-list",
        children: group.items.map((item) => jsx(ArchivedRow, {
          item,
          t,
          pending: pending.has(item.sessionId),
          onUnarchive,
          onDelete
        }, item.sessionId))
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
  const [navIconPortal, setNavIconPortal] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Reset the confirmation dialog whenever its target changes or closes.
  useEffect(() => {
    setAcknowledged(false);
  }, [confirmItem, confirmAll]);

  useEffect(() => {
    if (snapshot.message === null) return;
    const timer = setTimeout(() => page.dismissMessage(), 5000);
    return () => clearTimeout(timer);
  }, [snapshot.message, page]);

  // The settings shell hardcodes nav icons per section id and offers no icon
  // option for third-party sections, so this section would show the generic
  // gear. Swap the gear for the archive glyph on the nav row whose label
  // matches this section (self-healing: re-runs while the section is open,
  // survives locale changes and panel remounts, and no-ops when absent).
  useEffect(() => {
    let applied = false;
    let wrap = null;
    let gear = null;
    const applyNavIcon = () => {
      if (applied) return;
      const dialog = document.querySelector('[role="dialog"]');
      if (dialog === null) return;
      const label = t("nav");
      for (const candidate of dialog.querySelectorAll("nav button")) {
        const spans = [...candidate.children].filter((child) => child.tagName === "SPAN");
        if (!spans.some((span) => span.textContent === label)) continue;
        gear = candidate.querySelector("svg");
        if (gear !== null) gear.style.display = "none";
        wrap = document.createElement("span");
        wrap.className = "dshAcv-navIcon";
        candidate.insertBefore(wrap, spans[0]);
        setNavIconPortal(createPortal(jsx(IconArchiveOutline20, { size: 16 }), wrap));
        applied = true;
        return;
      }
    };
    applyNavIcon();
    const timer = setInterval(applyNavIcon, 600);
    return () => {
      clearInterval(timer);
      wrap?.remove();
      if (gear !== null) gear.style.display = "";
    };
  }, [t]);

  const busyCount = snapshot.pending.size;
  const groups = groupItems(snapshot.items);

  const onConfirmSingleDelete = async () => {
    if (confirmItem === null) return;
    const sessionId = confirmItem.sessionId;
    setConfirmItem(null);
    setAcknowledged(false);
    await page.deleteSession(sessionId);
  };

  const onConfirmBulkDelete = async () => {
    setConfirmAll(false);
    setAcknowledged(false);
    await page.deleteAll();
  };

  return jsxs("div", {
    className: "dshAcv",
    children: [
      navIconPortal,
      jsxs("header", {
        className: "dshAcv-header",
        children: [
          jsxs("div", {
            className: "dshAcv-heading",
            children: [
              jsx("span", {
                className: "dshAcv-headingIcon",
                children: jsx(IconArchiveOutline20, { size: 18 })
              }),
              jsxs("div", {
                children: [
                  jsx("h2", { className: "dshAcv-title", children: t("heading") }),
                  jsx("p", { className: "dshAcv-description", children: t("description") })
                ]
              })
            ]
          }),
          jsxs("div", {
            className: "dshAcv-toolbar",
            children: [
              jsx(Button, {
                variant: "outline",
                size: "sm",
                disabled: snapshot.phase !== "ready" || snapshot.items.length === 0 || busyCount > 0,
                icon: jsx(IconArchiveOutline20, { size: 14 }),
                onClick: () => void page.unarchiveAll(),
                children: t("unarchiveAll")
              }),
              jsx(Button, {
                variant: "outline",
                size: "sm",
                disabled: snapshot.phase !== "ready" || snapshot.items.length === 0 || busyCount > 0,
                className: "dshAcv-dangerButton",
                icon: jsx(IconTrashOutline16, {}),
                onClick: () => {
                  setConfirmAll(true);
                  setAcknowledged(false);
                },
                children: t("deleteAll")
              })
            ]
          })
        ]
      }),

      snapshot.phase === "ready" && snapshot.message !== null && jsx("div", {
        className: `dshAcv-banner dshAcv-banner-${snapshot.message.kind}`,
        children: snapshot.message.key !== undefined
          ? t(snapshot.message.key)
            .replace("{n}", String(snapshot.message.failed ?? snapshot.message.deleted ?? 0))
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

      snapshot.phase === "ready" && groups.length === 0 && jsxs("div", {
        className: "dshAcv-state",
        children: [
          jsx(IconArchiveOutline20, { size: 28, className: "dshAcv-stateIcon" }),
          jsx("p", { className: "dshAcv-stateText", children: t("empty") })
        ]
      }),

      snapshot.phase === "ready" && groups.length > 0 && jsx("div", {
        className: "dshAcv-listWrap",
        children: groups.map((group) => jsx(ProjectGroup, {
          group,
          projects: snapshot.projects,
          t,
          pending: snapshot.pending,
          onUnarchive: (sessionId) => void page.unarchive(sessionId),
          onDelete: (item) => {
            setConfirmItem(item);
            setAcknowledged(false);
          }
        }, group.path === "" ? "__ungrouped__" : group.path))
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
        onConfirm: () => void onConfirmSingleDelete()
      }),

      jsx(RiskConfirmation, {
        open: confirmAll,
        title: t("confirmAllTitle"),
        description: t("confirmAllDescription").replace("{n}", String(snapshot.items.length)),
        acknowledgeLabel: t("acknowledge"),
        cancelLabel: t("cancel"),
        closeLabel: t("cancel"),
        confirmLabel: t("confirmDeleteAll"),
        acknowledged,
        disabled: snapshot.pending.size > 0,
        onAcknowledgedChange: setAcknowledged,
        onCancel: () => {
          setConfirmAll(false);
          setAcknowledged(false);
        },
        onConfirm: () => void onConfirmBulkDelete()
      })
    ]
  });
}
