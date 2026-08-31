/**
 * dsh-plugin-archived-conversations — page styles.
 *
 * One injected <style> element scoped by the `dshAcv-` class prefix; theme
 * colors ride the settings panel's inherited palette (currentColor +
 * CSS variables with graceful fallbacks), so light and dark themes work
 * without a theme dependency.
 *
 * @module dsh-plugin-archived-conversations/client/styles
 */

const STYLE_ID = "dsh-plugin-archived-conversations";

const css = `
.dshAcv {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.dshAcv-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dshAcv-heading {
  min-width: 0;
}

.dshAcv-title {
  margin: 0 0 4px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.4;
}

.dshAcv-description {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.5;
  color: color-mix(in srgb, currentColor 62%, transparent);
}

.dshAcv-count {
  margin: 0 0 6px;
  font-size: 11.5px;
  color: color-mix(in srgb, currentColor 55%, transparent);
}

.dshAcv-listWrap {
  min-width: 0;
}

.dshAcv-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dshAcv-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, currentColor 14%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, currentColor 3%, transparent);
  transition: border-color 120ms ease, background-color 120ms ease;
}

.dshAcv-row:hover {
  border-color: color-mix(in srgb, currentColor 24%, transparent);
  background: color-mix(in srgb, currentColor 5%, transparent);
}

.dshAcv-rowMain {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.dshAcv-rowTitle {
  font-size: 13px;
  font-weight: 550;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dshAcv-rowMeta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 10px;
  font-size: 11.5px;
  color: color-mix(in srgb, currentColor 58%, transparent);
}

.dshAcv-rowCwd {
  max-width: 34em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dshAcv-rowError {
  font-size: 11.5px;
  color: #d97706;
}

.dshAcv-rowActions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.dshAcv-danger {
  color: #dc2626;
}

.dshAcv-banner {
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12.5px;
  line-height: 1.5;
  border: 1px solid transparent;
}

.dshAcv-banner-success {
  color: #15803d;
  border-color: color-mix(in srgb, #15803d 30%, transparent);
  background: color-mix(in srgb, #15803d 9%, transparent);
}

.dshAcv-banner-error {
  color: #b91c1c;
  border-color: color-mix(in srgb, #b91c1c 30%, transparent);
  background: color-mix(in srgb, #b91c1c 9%, transparent);
}

.dshAcv-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 36px 16px;
  text-align: center;
}

.dshAcv-stateIcon {
  color: color-mix(in srgb, currentColor 40%, transparent);
}

.dshAcv-stateText {
  margin: 0;
  font-size: 12.5px;
  color: color-mix(in srgb, currentColor 62%, transparent);
}

.dshAcv-spinner {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid color-mix(in srgb, currentColor 18%, transparent);
  border-top-color: currentColor;
  animation: dshAcvSpin 700ms linear infinite;
}

@keyframes dshAcvSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 560px) {
  .dshAcv-row {
    flex-direction: column;
  }
  .dshAcv-rowActions {
    width: 100%;
    justify-content: flex-end;
  }
}
`;

/** Install the scoped stylesheet once; returns its disposer. */
export function installStyles() {
  if (document.querySelector(`style[data-plugin="${STYLE_ID}"]`) !== null) return () => {};
  const style = document.createElement("style");
  style.dataset.plugin = STYLE_ID;
  style.textContent = css;
  document.head.append(style);
  return () => {
    style.remove();
  };
}
