import Blockly from "./blockly-runtime";
import { compileWorkspace, theme, toolbox } from "./blocks";
import {
  example,
  makeProject,
  parseProject,
  STORAGE_KEY,
  type Project,
} from "./project";
import "./style.css";

const el = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T;
const nameInput = el<HTMLInputElement>("project-name");
const workspace = Blockly.inject("blockly", {
  toolbox,
  theme,
  renderer: "zelos",
  media: `${import.meta.env.BASE_URL}blockly-media/`,
  sounds: false,
  trashcan: true,
  maxBlocks: 500,
  grid: { spacing: 24, length: 2, colour: "#d9d7e0", snap: false },
  zoom: {
    controls: true,
    wheel: true,
    startScale: 0.85,
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
function project() {
  return makeProject(nameInput.value.trim() || "Новый скрипт", workspace);
}
function saveLocal() {
  if (saveBlocked) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(project()));
    el("save-state").textContent = "● Сохранено в этом браузере";
    el("save-state").classList.remove("save-error");
  } catch {
    el("save-state").textContent = "Автосохранение недоступно — скачайте JSON";
    el("save-state").classList.add("save-error");
  }
}
function scheduleSave() {
  if (!saveBlocked) el("save-state").textContent = "Сохраняем…";
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveLocal, 400);
}
function loadProject(data: Project, persist = true) {
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
  workspace.scrollCenter();
  if (persist) {
    saveBlocked = false;
    saveLocal();
  }
}
function focusBlock(id: string) {
  const block = workspace.getBlockById(id);
  if (!block) return;
  workspace.centerOnBlock(id);
  workspace.highlightBlock(id);
  setTimeout(() => workspace.highlightBlock(null), 1800);
}
function update() {
  result = compileWorkspace(workspace);
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");
  el("block-count").textContent =
    `${Math.max(0, workspace.getAllBlocks(false).length - 1)} блоков`;
  el("line-count").textContent = `${result.lineIds.length} строк`;
  const code = el("code");
  code.replaceChildren();
  if (!result.code) {
    const empty = document.createElement("p");
    empty.className = "code-placeholder";
    empty.textContent =
      "Соедини первую команду с блоком «Начало скрипта» — здесь появится код.";
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
    ? `● Ошибок: ${errors.length}`
    : warnings.length
      ? `◐ Замечаний: ${warnings.length}`
      : "✓ Структура в порядке";
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
    el(id).title = errors.length ? "Сначала исправьте ошибки блоков" : "";
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
    nameInput.value = "Новый скрипт";
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
  toast("Проект отправлен в загрузки браузера");
}
el("save-project").addEventListener("click", downloadProject);
el("download-code").addEventListener("click", () =>
  download(result.code + "\n", filename(".txt"), "text/plain;charset=utf-8"),
);
el("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(result.code);
    toast("Код скопирован. Вставьте его в текстовый редактор Automator.");
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
        ? "Код скопирован"
        : "Браузер запретил копирование. Скачайте .txt или выделите код справа.",
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
el("fit").addEventListener("click", () => workspace.zoomToFit());
el("check").addEventListener("click", () => {
  update();
  const issue = result.issues[0];
  if (issue) focusBlock(issue.id);
  toast(
    result.issues.some((i) => i.severity === "error")
      ? "Исправьте ошибки, перечисленные под кодом."
      : "Проверка блоков завершена. Игровые условия проверяются в Automator.",
  );
});
function confirmReplace() {
  return window.confirm(
    "Заменить текущий проект? Если нужна отдельная копия, сначала нажмите «Сохранить проект».",
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
      throw new Error("Файл слишком большой: максимум 2 МБ.");
    const parsed = parseProject(await file.text());
    if (confirmReplace()) {
      loadProject(parsed);
      toast("Проект открыт");
    }
  } catch (error) {
    toast(
      `Не удалось открыть: ${error instanceof Error ? error.message : "неверный JSON"}`,
    );
  } finally {
    input.value = "";
  }
});
for (const key of ["examples", "help"])
  el(key).addEventListener("click", () =>
    el<HTMLDialogElement>(`${key}-dialog`).showModal(),
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
  el("save-state").textContent =
    "Проект изменён в другой вкладке — сохраните JSON и обновите страницу";
  el("save-state").classList.add("save-error");
  toast(
    "Автосохранение приостановлено, чтобы не затереть изменения другой вкладки.",
  );
});
new ResizeObserver(() => Blockly.svgResize(workspace)).observe(el("blockly"));
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) loadProject(parseProject(saved));
  else loadProject(example("starter"));
} catch {
  saveBlocked = true;
  loadProject(example("starter"), false);
  el("save-state").textContent =
    "Автосохранение недоступно или повреждено. Скачивайте JSON.";
  el("save-state").classList.add("save-error");
  toast(
    "Старые данные не перезаписаны. Новый проект или открытие JSON возобновит автосохранение.",
  );
}
