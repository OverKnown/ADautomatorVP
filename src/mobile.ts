import type { WorkspaceSvg } from "blockly/core";
import Blockly from "./blockly-runtime";
import { createToolbox } from "./blocks";
import { t, type Message } from "./i18n";

// Keep in sync with the mobile media queries in style.css, including landscape phones.
export const mobileLayout = window.matchMedia(
  "(max-width: 800px), (max-width: 1000px) and (max-height: 500px) and (pointer: coarse)",
);

const blockNames: Record<string, Message> = {
  wait: "Wait for condition",
  pause: "Pause",
  if: "If — run commands",
  while: "While — repeat commands",
  until: "Repeat until condition",
  prestige: "Prestige Infinity / Eternity / Reality",
  auto: "Toggle auto prestige",
  auto_amount: "Configure auto prestige threshold",
  studies: "Buy studies",
  load: "Load study preset",
  study_respec: "Respec studies on Eternity",
  unlock: "Unlock challenge / Dilation",
  start_ec: "Start Eternity Challenge",
  dilation: "Start Dilation",
  bh: "Toggle Black Hole",
  comment: "Comment",
  notify: "Notification",
  raw: "Custom code",
  stop: "Stop script",
};

export function setupMobileUI(
  workspace: WorkspaceSvg,
  toast: (message: string) => void,
) {
  const el = <T extends HTMLElement = HTMLElement>(id: string) =>
    document.getElementById(id) as T;
  const mobile = mobileLayout;
  const menuToggle = el<HTMLButtonElement>("project-menu-toggle");
  const actions = el("project-actions");
  const catalog = el<HTMLDialogElement>("blocks-dialog");

  function closeMenu() {
    const wasOpen = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", "false");
    if (wasOpen && mobile.matches && actions.contains(document.activeElement)) {
      menuToggle.focus();
    }
  }
  function showView(view: "blocks" | "code") {
    closeMenu();
    Blockly.hideChaff();
    document.body.dataset.mobileView = view;
    el("show-blocks").setAttribute("aria-pressed", String(view === "blocks"));
    el("show-code").setAttribute("aria-pressed", String(view === "code"));
    if (view === "blocks") Blockly.svgResize(workspace);
  }
  function focusBlock(id: string) {
    if (!mobile.matches) return false;
    showView("blocks");
    const block = workspace.getBlockById(id);
    if (block) {
      const { x, y } = block.getRelativeToSurfaceXY();
      // Align the block's leading edge. Centering a wide block hides its fields.
      workspace.scroll(16 - x * workspace.scale, 24 - y * workspace.scale);
    }
    return true;
  }
  el("show-blocks").addEventListener("click", () => showView("blocks"));
  el("show-code").addEventListener("click", () => showView("code"));
  menuToggle.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!open));
  });
  actions.addEventListener("click", (event) => {
    if ((event.target as HTMLElement).closest("button")) closeMenu();
  });
  document.addEventListener("click", (event) => {
    const target = event.target as Node;
    if (!actions.contains(target) && !menuToggle.contains(target)) closeMenu();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  el("add-block").addEventListener("click", () => {
    Blockly.hideChaff();
    catalog.showModal();
  });

  function appendBlock(type: string) {
    if (workspace.remainingCapacity() < 1) {
      toast(t("Project limit reached: 500 blocks."));
      return;
    }
    // Keep creation and connection together so one Undo removes the new command.
    Blockly.Events.setGroup(true);
    let block;
    try {
      block = workspace.newBlock(type);
      block.initSvg();
      block.render();
      let tail = workspace.getBlocksByType("start", false)[0];
      while (tail?.getNextBlock()) tail = tail.getNextBlock()!;
      if (tail?.nextConnection && block.previousConnection) {
        tail.nextConnection.connect(block.previousConnection);
      }
    } finally {
      Blockly.Events.setGroup(false);
    }
    catalog.close();
    block.select();
    focusBlock(block.id);
  }
  function refresh() {
    el("mobile-catalog").replaceChildren();
    for (const category of createToolbox().contents) {
      const section = document.createElement("section");
      const heading = document.createElement("h3");
      heading.textContent = category.name;
      section.style.setProperty("--category-colour", category.colour);
      section.append(heading);
      for (const { type } of category.contents) {
        const button = document.createElement("button");
        button.textContent = t(blockNames[type]);
        button.addEventListener("click", () => appendBlock(type));
        section.append(button);
      }
      el("mobile-catalog").append(section);
    }
  }
  refresh();

  function syncLayout() {
    Blockly.hideChaff();
    closeMenu();
    if (catalog.open) catalog.close();
    workspace.getToolbox()?.setVisible(!mobile.matches);
    if (el("blockly").clientWidth) Blockly.svgResize(workspace);
  }
  mobile.addEventListener("change", syncLayout);
  syncLayout();
  return {
    refresh,
    showBlocks: () => {
      if (mobile.matches) showView("blocks");
    },
    focusBlock,
    updateIssues: (count: number) => {
      el("mobile-issues").hidden = count === 0;
      el("mobile-issues").textContent = String(count);
      el("show-code").setAttribute(
        "aria-label",
        count ? t("Code, issues: {count}", { count }) : t("Code"),
      );
    },
  };
}
