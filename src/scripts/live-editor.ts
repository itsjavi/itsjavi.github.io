import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, basicSetup } from "codemirror";

const languages = ["html", "css", "js"] as const;
type Language = (typeof languages)[number];
type DocumentState = Record<Language | "title", string>;

function isDocument(value: unknown): value is DocumentState {
  return (
    typeof value === "object" &&
    value !== null &&
    ["title", ...languages].every((key) => typeof Reflect.get(value, key) === "string")
  );
}

class LiveCodeEditor extends HTMLElement {
  private views: EditorView[] = [];
  private cleanup?: () => void;

  connectedCallback() {
    if (this.views.length) return;
    const form = this.querySelector("form")!;
    const payload = this.querySelector<HTMLInputElement>('input[name="data"]')!;
    const title = this.querySelector<HTMLInputElement>(".preview-title")!;
    const preview = this.querySelector("iframe")!;
    const editors = this.querySelector<HTMLElement>(".editors")!;
    const toggle = this.querySelector<HTMLButtonElement>(".toggle-editors")!;
    const status = this.querySelector<HTMLElement>(".storage-status")!;
    const tabs = [...this.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    const controller = new AbortController();
    const options = { signal: controller.signal };
    let documentState: DocumentState = JSON.parse(payload.value);
    let dirty = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    function showStatus(message: string) {
      status.textContent = message;
      status.hidden = false;
    }

    try {
      const saved = localStorage.getItem("editor_code");
      if (saved !== null) {
        const parsed: unknown = JSON.parse(saved);
        if (isDocument(parsed)) documentState = parsed;
        else showStatus("Saved code could not be read. Editing will replace the saved copy.");
      }
    } catch {
      showStatus("Saved code is unavailable. You can still edit and export to CodePen.");
    }
    title.value = documentState.title;

    const save = () => {
      if (!dirty) return;
      try {
        localStorage.setItem("editor_code", JSON.stringify(documentState));
        status.hidden = true;
        dirty = false;
      } catch {
        showStatus(
          "Your changes could not be saved in this browser. Export to CodePen to keep them.",
        );
      }
    };

    const render = () => {
      payload.value = JSON.stringify(documentState);
      // User code runs in an opaque sandbox origin, without access to the host page or its storage.
      preview.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${documentState.css}</style></head><body>${documentState.html}<script type="module">${documentState.js.replace(/<\/script/gi, "<\\/script")}</script></body></html>`;
      save();
    };

    const changed = () => {
      dirty = true;
      payload.value = JSON.stringify(documentState);
      clearTimeout(timer);
      timer = setTimeout(render, 200);
    };

    const extensions = { html: html(), css: css(), js: javascript() };
    for (const language of languages) {
      const panel = this.querySelector<HTMLElement>(`[data-editor="${language}"]`)!;
      panel.replaceChildren();
      this.views.push(
        new EditorView({
          parent: panel,
          doc: documentState[language],
          extensions: [
            basicSetup,
            extensions[language],
            EditorView.lineWrapping,
            EditorView.contentAttributes.of({ "aria-label": `${language.toUpperCase()} editor` }),
            EditorView.theme({
              "&": { height: "100%", backgroundColor: "#111827" },
              ".cm-scroller": {
                fontFamily: "ui-monospace, monospace",
                fontSize: "14px",
                overflow: "auto",
              },
              ".cm-gutters": { backgroundColor: "#111827" },
            }),
            oneDark,
            EditorView.updateListener.of((update) => {
              if (!update.docChanged) return;
              documentState[language] = update.state.doc.toString();
              changed();
            }),
          ],
        }),
      );
    }

    const selectTab = (selected: HTMLButtonElement) => {
      for (const tab of tabs) {
        const active = tab === selected;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        this.querySelector<HTMLElement>(`[data-editor="${tab.dataset.language}"]`)!.hidden =
          !active;
      }
      this.views[languages.indexOf(selected.dataset.language as Language)]?.requestMeasure();
    };
    for (const tab of tabs) {
      tab.addEventListener("click", () => selectTab(tab), options);
      tab.addEventListener(
        "keydown",
        (event) => {
          const index = tabs.indexOf(tab);
          const next =
            event.key === "ArrowRight"
              ? (index + 1) % tabs.length
              : event.key === "ArrowLeft"
                ? (index + tabs.length - 1) % tabs.length
                : event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? tabs.length - 1
                    : -1;
          if (next < 0) return;
          event.preventDefault();
          selectTab(tabs[next]!);
          tabs[next]!.focus();
        },
        options,
      );
    }
    title.addEventListener(
      "input",
      () => {
        documentState.title = title.value;
        changed();
      },
      options,
    );
    title.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          title.blur();
        }
      },
      options,
    );
    toggle.addEventListener(
      "click",
      () => {
        editors.hidden = !editors.hidden;
        form.toggleAttribute("data-collapsed", editors.hidden);
        toggle.setAttribute("aria-expanded", String(!editors.hidden));
        if (!editors.hidden) for (const view of this.views) view.requestMeasure();
      },
      options,
    );
    form.addEventListener(
      "submit",
      () => {
        payload.value = JSON.stringify(documentState);
        save();
      },
      options,
    );
    window.addEventListener("pagehide", save, options);
    this.cleanup = () => {
      clearTimeout(timer);
      save();
      controller.abort();
      for (const view of this.views) view.destroy();
      this.views = [];
    };
    render();
  }

  disconnectedCallback() {
    this.cleanup?.();
    this.cleanup = undefined;
  }
}

if (!customElements.get("live-code-editor"))
  customElements.define("live-code-editor", LiveCodeEditor);
