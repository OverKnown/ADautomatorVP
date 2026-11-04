import {
  getLanguage,
  setLanguage,
  t,
  translatePage,
  LANGUAGE_STORAGE_KEY,
  type Message,
} from "./i18n";
import Blockly from "./blockly-runtime";
import {
  compileWorkspace,
  theme,
  createToolbox,
  relocalizeWorkspace,
} from "./blocks";
import {
  example,
  makeProject,
  parseProject,
  scriptToProject,
  STORAGE_KEY,
  type Project,
} from "./project";
import "./style.css";
import { mobileLayout, setupMobileUI } from "./mobile";

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
translatePage();
const languageSelect = el<HTMLSelectElement>("language");
languageSelect.value = getLanguage();
const nameInput = el<HTMLInputElement>("project-name");
const workspace = Blockly.inject("blockly", {
  toolbox: createToolbox(),
  theme,
  renderer: "zelos",
  media: `${import.meta.env.BASE_URL}blockly-media/`,
  sounds: false,
  trashcan: true,
  maxBlocks: 500,
  grid: { spacing: 24, length: 2, colour: "#41414f", snap: false },
  zoom: {
    controls: true,
    pinch: true,
    wheel: true,
    startScale: mobileLayout.matches ? 0.75 : 0.85,
    maxScale: 1.5,
    minScale: 0.35,
    scaleSpeed: 1.1,
  },
  move: { scrollbars: true, drag: true, wheel: true },
});
let result = compileWorkspace(workspace);
let loading = false,
  saveBlocked = false,
  saveTimer: ReturnType<typeof setTimeout>,
  toastTimer: ReturnType<typeof setTimeout>;
function toast(message: string) {
  const node = el("toast");
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    node.hidden = true;
  }, 5000);
}
const mobileUI = setupMobileUI(workspace, toast);
function project() {
  return makeProject(nameInput.value.trim() || t("New script"), workspace);
}
function setSaveState(message: Message, error = false) {
  const node = el("save-state");
  node.dataset.i18n = message;
  node.textContent = t(message);
  node.classList.toggle("save-error", error);
}
function saveLocal() {
  if (saveBlocked) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project()));
    setSaveState("● Saved in this browser");
  } catch {
    setSaveState("Autosave unavailable — download JSON", true);
  }
}
function scheduleSave() {
  if (!saveBlocked) setSaveState("Saving…");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveLocal, 400);
}
function loadProject(data: Project, persist = true) {
  mobileUI.showBlocks();
  loading = true;
  Blockly.Events.disable();
  try {
    Blockly.serialization.workspaces.load(data.workspace, workspace);
    workspace
      .getAllBlocks(false)
      .filter((b) => b.type === "start")
      .forEach((b) => {
        b.setDeletable(false);
        b.setMovable(true);
      });
    nameInput.value = data.name;
    workspace.clearUndo();
  } finally {
    Blockly.Events.enable();
    loading = false;
  }
  update();
  const start = workspace.getBlocksByType("start", false)[0];
  if (!start || !mobileUI.focusBlock(start.id)) workspace.scrollCenter();
  if (persist) {
    saveBlocked = false;
    saveLocal();
  }
}
function focusBlock(id: string) {
  const block = workspace.getBlockById(id);
  if (!block) return;
  if (!mobileUI.focusBlock(id)) workspace.centerOnBlock(id);
  workspace.highlightBlock(id);
  setTimeout(() => workspace.highlightBlock(null), 1800);
}
function update() {
  result = compileWorkspace(workspace);
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");
  mobileUI.updateIssues(result.issues.length);
  el("block-count").textContent = t("{count} blocks", {
    count: Math.max(0, workspace.getAllBlocks(false).length - 1),
  });
  el("line-count").textContent = t("{count} lines", {
    count: result.lineIds.length,
  });
  const code = el("code");
  code.replaceChildren();
  if (!result.code) {
    const empty = document.createElement("p");
    empty.className = "code-placeholder";
    empty.textContent = t(
      "Connect the first command to “Script start” to see the code here.",
    );
    code.append(empty);
  } else
    result.code.split("\n").forEach((line, i) => {
      const row = document.createElement("div");
      row.className = "code-line";
      const number = document.createElement("span");
      number.className = "line-number";
      number.textContent = String(i + 1);
      const content = document.createElement("code");
      content.textContent = line;
      if (line.trim().startsWith("#")) content.className = "code-comment";
      row.append(number, content);
      row.addEventListener("click", () => focusBlock(result.lineIds[i]));
      code.append(row);
    });
  const status = el("validation-status");
  status.textContent = errors.length
    ? t("● Errors: {count}", { count: errors.length })
    : warnings.length
      ? t("◐ Warnings: {count}", { count: warnings.length })
      : t("✓ Structure looks good");
  status.className = errors.length
    ? "invalid"
    : warnings.length
      ? "warning"
      : "valid";
  const issues = el("issues");
  issues.replaceChildren();
  result.issues.forEach((issue) => {
    const button = document.createElement("button");
    button.className = `issue ${issue.severity}`;
    button.textContent = issue.message;
    button.addEventListener("click", () => focusBlock(issue.id));
    issues.append(button);
  });
  for (const id of ["copy", "download-code"]) {
    el<HTMLButtonElement>(id).disabled = errors.length > 0 || !result.code;
    el(id).title = errors.length ? t("Fix the block errors first") : "";
  }
  el<HTMLButtonElement>("undo").disabled =
    workspace.getUndoStack().length === 0;
  el<HTMLButtonElement>("redo").disabled =
    workspace.getRedoStack().length === 0;
}
workspace.addChangeListener((event) => {
  if (
    loading ||
    event.isUiEvent ||
    event.type === Blockly.Events.FINISHED_LOADING
  )
    return;
  update();
  scheduleSave();
});
nameInput.addEventListener("input", scheduleSave);
nameInput.addEventListener("blur", () => {
  if (!nameInput.value.trim()) {
    nameInput.value = t("New script");
    saveLocal();
  }
});
function filename(extension: string) {
  return (
    (project()
      .name.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
      .slice(0, 80) || "script") + extension
  );
}
function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadProject() {
  download(
    JSON.stringify(project(), null, 2),
    filename(".json"),
    "application/json",
  );
  toast(t("Project sent to your browser’s downloads"));
}
el("save-project").addEventListener("click", downloadProject);
el("download-code").addEventListener("click", () =>
  download(result.code + "\n", filename(".txt"), "text/plain;charset=utf-8"),
);
el("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(result.code);
    toast(t("Code copied. Paste it into the Automator text editor."));
  } catch {
    // Clipboard APIs can be unavailable in non-secure local previews.
    const text = document.createElement("textarea");
    text.value = result.code;
    text.style.position = "fixed";
    text.style.opacity = "0";
    document.body.append(text);
    text.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      /* Offer the file export below. */
    }
    text.remove();
    toast(
      copied
        ? t("Code copied")
        : t(
            "Your browser blocked copying. Download .txt or select the code on the right.",
          ),
    );
  }
});
el("undo").addEventListener("click", () => {
  workspace.undo(false);
  update();
});
el("redo").addEventListener("click", () => {
  workspace.undo(true);
  update();
});
el("check").addEventListener("click", () => {
  update();
  const issue = result.issues[0];
  if (issue) focusBlock(issue.id);
  toast(
    result.issues.some((i) => i.severity === "error")
      ? t("Fix the errors listed below the code.")
      : t(
          "Block validation complete. In-game conditions are checked by Automator.",
        ),
  );
});
function confirmReplace() {
  return window.confirm(
    t(
      "Replace the current project? To keep a separate copy, click “Save project” first.",
    ),
  );
}
el("new-project").addEventListener("click", () => {
  if (confirmReplace()) loadProject(example("empty"));
});
el("open-project").addEventListener("click", () =>
  el<HTMLInputElement>("file-input").click(),
);
el<HTMLInputElement>("file-input").addEventListener("change", async (event) => {
  const input = event.target as HTMLInputElement,
    file = input.files?.[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000)
      throw new Error(t("The file is too large: the limit is 2 MB."));
    const source = await file.text();
    const parsed = file.name.toLowerCase().endsWith(".json")
      ? parseProject(source)
      : scriptToProject(source, file.name.replace(/\.[^.]+$/, ""));
    if (confirmReplace()) {
      loadProject(parsed);
      toast(t("Project opened"));
    }
  } catch (error) {
    toast(
      t("Could not open: {message}", {
        message: error instanceof Error ? error.message : t("invalid JSON"),
      }),
    );
  } finally {
    input.value = "";
  }
});
el("paste-code").addEventListener("click", () => {
  el("import-error").textContent = "";
  el<HTMLDialogElement>("import-dialog").showModal();
  el<HTMLTextAreaElement>("import-source").focus();
});
el("import-submit").addEventListener("click", () => {
  el("import-error").textContent = "";
  try {
    const parsed = scriptToProject(
      el<HTMLTextAreaElement>("import-source").value,
    );
    if (!confirmReplace()) return;
    loadProject(parsed);
    el<HTMLDialogElement>("import-dialog").close();
    toast(t("Code converted to blocks. Review the warnings below the code."));
  } catch (error) {
    el("import-error").textContent =
      error instanceof Error ? error.message : t("Could not read the script");
  }
});
el("examples").addEventListener("click", () =>
  el<HTMLDialogElement>("examples-dialog").showModal(),
);
document
  .querySelectorAll<HTMLButtonElement>("[data-close]")
  .forEach((button) =>
    button.addEventListener("click", () => button.closest("dialog")!.close()),
  );
document
  .querySelectorAll<HTMLButtonElement>("[data-example]")
  .forEach((button) =>
    button.addEventListener("click", () => {
      if (!confirmReplace()) return;
      loadProject(example(button.dataset.example!));
      el<HTMLDialogElement>("examples-dialog").close();
    }),
  );
document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    downloadProject();
  }
});
window.addEventListener("pagehide", saveLocal);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") saveLocal();
});
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY || loading) return;
  saveBlocked = true;
  setSaveState("Project changed in another tab — save JSON and reload", true);
  toast(t("Autosave paused to avoid overwriting changes from another tab."));
});
new ResizeObserver(() => {
  if (el("blockly").clientWidth) Blockly.svgResize(workspace);
}).observe(el("blockly"));
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) loadProject(parseProject(saved));
  else loadProject(example("starter"));
} catch {
  saveBlocked = true;
  loadProject(example("starter"), false);
  setSaveState(
    "Autosave is unavailable or damaged. Download JSON backups.",
    true,
  );
  toast(
    t(
      "Existing data was preserved. Create a new project or open JSON to resume autosave.",
    ),
  );
}

languageSelect.addEventListener("change", () => {
  const language = languageSelect.value === "ru" ? "ru" : "en";
  Blockly.hideChaff();
  setLanguage(language);
  relocalizeWorkspace(workspace);
  workspace.updateToolbox(createToolbox());
  translatePage();
  mobileUI.refresh();
  el("toast").hidden = true;
  clearTimeout(toastTimer);
  update();
  Blockly.svgResize(workspace);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // The interface still switches when browser storage is unavailable.
  }
});
