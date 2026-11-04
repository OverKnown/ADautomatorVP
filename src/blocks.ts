import { getLanguage, t } from "./i18n";
import type * as BlocklyTypes from "blockly/core";
import Blockly from "./blockly-runtime";
import * as Ru from "blockly/msg/ru";
import * as En from "blockly/msg/en";
import {
  currencies,
  operators,
  type Command,
  type Kind,
  compile,
} from "./compiler";

const dropdown = (name: string, values: string[] | string[][]) => ({
  type: "field_dropdown",
  name,
  options: values.map((v) => (typeof v === "string" ? [v, v] : v)),
});
const text = (name: string, value: string) => ({
  type: "field_input",
  name,
  text: value,
  spellcheck: false,
});
const checkbox = (name: string) => ({
  type: "field_checkbox",
  name,
  checked: false,
});
const layerColours = {
  INFINITY: "#b67f33",
  ETERNITY: "#b341e0",
  REALITY: "#0ba00e",
};
type Layer = keyof typeof layerColours;
const layer = () => dropdown("LAYER", Object.keys(layerColours));
const autoSettings = (): [string, string][] => [
  [t("by amount"), "AMOUNT"],
  [t("after time"), "TIME"],
  [t("× highest reward"), "MULTIPLIER"],
];
Blockly.Extensions.register("layer_colour", function () {
  const field = this.getField("LAYER")!;
  const update = (value: string) => {
    this.setColour(layerColours[value as Layer]);
    if (this.type === "prestige") {
      this.getField("RESPEC")!.setVisible(value !== "INFINITY");
      this.getField("RESPEC_LABEL")!.setVisible(value !== "INFINITY");
    }
    if (this.type === "auto_amount") {
      const setting = this.getField("SETTING") as BlocklyTypes.FieldDropdown;
      const previous = setting.getValue();
      setting.setOptions(
        value === "REALITY" ? autoSettings().slice(0, 1) : autoSettings(),
      );
      setting.setValue(value === "REALITY" ? "AMOUNT" : previous);
      this.getField("UNIT")!.setVisible(setting.getValue() === "TIME");
    }
    return value;
  };
  field.setValidator(update);
  if (this.type === "auto_amount")
    this.getField("SETTING")!.setValidator((value: string) => {
      this.getField("UNIT")!.setVisible(value === "TIME");
      return value;
    });
  update(field.getValue());
});
const condition = () => [
  dropdown("RESOURCE", currencies),
  dropdown("OP", operators),
  text("VALUE", "1e100"),
];
const definitions = () => [
  {
    type: "start",
    message0: t("▶  Script start"),
    args0: [],
    colour: "#51458a",
    previousStatement: undefined,
    tooltip: t("Connect all commands in a single chain below this block."),
  },
  {
    type: "wait",
    message0: t("Wait  %1 %2 %3"),
    args0: condition(),
    colour: "#5d6c9c",
    tooltip: t("Wait until the comparison is true. WAIT"),
  },
  ...(["if", "while", "until"] as const).map((type, i) => ({
    type,
    message0: `${[t("If"), t("While"), t("Until")][i]}  %1 %2 %3`,
    args0: condition(),
    message1: t("do %1"),
    args1: [{ type: "input_statement", name: "BODY" }],
    colour: "#5d6c9c",
    tooltip: [
      t("Run nested commands once if the condition is true."),
      t("Repeat nested commands while the condition is true."),
      t("Repeat nested commands until the condition becomes true."),
    ][i],
  })),
  {
    type: "auto",
    message0: t("Auto prestige  %1 %2"),
    args0: [
      layer(),
      dropdown("MODE", [
        [t("on"), "ON"],
        [t("off"), "OFF"],
      ]),
    ],
    colour: layerColours.INFINITY,
    extensions: ["layer_colour"],
    tooltip: t(
      "AUTO ON/OFF. Enable or disable auto prestige without changing its current threshold.",
    ),
  },
  {
    type: "auto_amount",
    message0: t("Auto prestige  %1  %2 %3 %4"),
    args0: [
      layer(),
      dropdown("SETTING", autoSettings()),
      text("VALUE", "1e10"),
      dropdown("UNIT", [
        [t("sec"), "SEC"],
        [t("ms"), "MS"],
        [t("min"), "MIN"],
      ]),
    ],
    colour: layerColours.INFINITY,
    extensions: ["layer_colour"],
    tooltip: t(
      "AUTO: IP/EP/RM amount, time, or a multiplier of the highest reward. Time and multiplier modes require in-game unlocks for Infinity and Eternity.",
    ),
  },
  {
    type: "pause",
    message0: t("Pause  %1 %2"),
    args0: [
      text("VALUE", "1"),
      dropdown("UNIT", [
        [t("sec"), "SEC"],
        [t("ms"), "MS"],
        [t("min"), "MIN"],
      ]),
    ],
    colour: "#5d6c9c",
    tooltip: t("Pause for a real-time duration. PAUSE"),
  },
  {
    type: "prestige",
    message0: t("Prestige  %1"),
    args0: [layer()],
    message1: t("nowait %1  %2 %3"),
    args1: [
      checkbox("NOWAIT"),
      { type: "field_label", name: "RESPEC_LABEL", text: "respec" },
      checkbox("RESPEC"),
    ],
    colour: layerColours.INFINITY,
    extensions: ["layer_colour"],
    tooltip: t(
      "Waits for prestige to become available by default. RESPEC resets studies for Eternity or glyphs for Reality; unavailable for Infinity.",
    ),
  },
  {
    type: "studies",
    message0: t("Buy studies  %1"),
    args0: [text("VALUE", "11,21,31")],
    message1: t("nowait %1"),
    args1: [checkbox("NOWAIT")],
    colour: layerColours.ETERNITY,
    tooltip: t(
      "STUDIES PURCHASE. Comma-separated IDs; waits until all studies are bought unless NOWAIT is enabled.",
    ),
  },
  {
    type: "load",
    message0: t("Load study preset  %1"),
    args0: [dropdown("SLOT", ["1", "2", "3", "4", "5", "6"])],
    message1: t("nowait %1"),
    args1: [checkbox("NOWAIT")],
    colour: layerColours.ETERNITY,
    tooltip: t("STUDIES LOAD ID. Uses a preset saved in the game."),
  },
  {
    type: "study_respec",
    message0: t("Respec studies on Eternity"),
    args0: [],
    colour: layerColours.ETERNITY,
    tooltip: t(
      "STUDIES RESPEC: marks studies for respec on the next Eternity.",
    ),
  },
  {
    type: "unlock",
    message0: t("Unlock  %1  nowait %2"),
    args0: [
      dropdown("TARGET", [
        "DILATION",
        ...Array.from({ length: 12 }, (_, i) => `EC${i + 1}`),
      ]),
      checkbox("NOWAIT"),
    ],
    colour: layerColours.ETERNITY,
    tooltip: t("UNLOCK: purchase a challenge or Dilation unlock."),
  },
  {
    type: "start_ec",
    message0: t("Start Eternity Challenge  %1"),
    args0: [
      dropdown(
        "EC",
        Array.from({ length: 12 }, (_, i) => String(i + 1)),
      ),
    ],
    colour: layerColours.ETERNITY,
    tooltip: t("START EC. The challenge must already be unlocked."),
  },
  {
    type: "dilation",
    message0: t("Start Dilation"),
    args0: [],
    colour: layerColours.ETERNITY,
    tooltip: "START DILATION",
  },
  {
    type: "bh",
    message0: t("Black Hole  %1"),
    args0: [
      dropdown("MODE", [
        [t("on"), "ON"],
        [t("off"), "OFF"],
      ]),
    ],
    colour: layerColours.REALITY,
    tooltip: t(
      "BLACK HOLE ON/OFF. Requires the Black Hole to be unlocked in the game.",
    ),
  },
  {
    type: "comment",
    message0: t("Comment  %1"),
    args0: [text("TEXT", t("My script"))],
    colour: "#747782",
    tooltip: t("A note in the code; not executed."),
  },
  {
    type: "raw",
    message0: t("Custom code  %1"),
    args0: [text("TEXT", "WAIT EP >= 1e100")],
    colour: "#8c6264",
    tooltip: t("One line of Automator code. Syntax is not checked."),
  },
  {
    type: "notify",
    message0: t("Notification  %1"),
    args0: [text("TEXT", t("Done"))],
    colour: "#747782",
    tooltip: t("NOTIFY: show an in-game notification."),
  },
  {
    type: "stop",
    message0: t("■  Stop script"),
    args0: [],
    colour: "#8c6264",
    tooltip: t("STOP: stop Automator execution."),
  },
];

export function registerLocalizedBlocks() {
  const locale = getLanguage() === "ru" ? Ru : En;
  Blockly.setLocale(
    Object.fromEntries(
      Object.entries(Reflect.get(locale, "default") ?? locale).filter(
        (entry): entry is [string, string] => typeof entry[1] === "string",
      ),
    ),
  );
  const localized = definitions();
  // Replace only our own definitions when the user changes language.
  for (const def of localized) delete Blockly.Blocks[def.type];
  Blockly.defineBlocksWithJsonArray(
    localized.map((def) => ({
      previousStatement: null,
      nextStatement: null,
      inputsInline: true,
      ...def,
    })),
  );
}
registerLocalizedBlocks();

// Recreate labels from localized definitions while retaining user fields, IDs,
// connections, positions, and undo/redo events that refer to those IDs.
export function relocalizeWorkspace(workspace: BlocklyTypes.Workspace) {
  const state = Blockly.serialization.workspaces.save(workspace);
  const undo = workspace.getUndoStack().slice();
  const redo = workspace.getRedoStack().slice();
  Blockly.Events.disable();
  try {
    registerLocalizedBlocks();
    Blockly.serialization.workspaces.load(state, workspace);
    workspace
      .getUndoStack()
      .splice(0, workspace.getUndoStack().length, ...undo);
    workspace
      .getRedoStack()
      .splice(0, workspace.getRedoStack().length, ...redo);
  } finally {
    Blockly.Events.enable();
  }
}

export const theme = Blockly.Theme.defineTheme("antimatter", {
  name: "antimatter",
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: "#191a23",
    toolboxBackgroundColour: "#22232e",
    toolboxForegroundColour: "#e1dfeb",
    flyoutBackgroundColour: "#292a37",
    flyoutForegroundColour: "#e1dfeb",
    flyoutOpacity: 0.97,
    scrollbarColour: "#777487",
    insertionMarkerColour: "#8572d5",
    insertionMarkerOpacity: 0.5,
  },
  fontStyle: { family: "system-ui, sans-serif", size: 12, weight: "500" },
});
const category = (name: string, colour: string, blocks: string[]) => ({
  kind: "category",
  name,
  colour,
  contents: blocks.map((type) => ({ kind: "block", type })),
});
export const createToolbox = () => ({
  kind: "categoryToolbox",
  contents: [
    category(t("Wait, conditions & loops"), "#5d6c9c", [
      "wait",
      "pause",
      "if",
      "while",
      "until",
    ]),
    category(t("Prestige"), "#46766b", ["prestige", "auto", "auto_amount"]),
    category("Eternity", layerColours.ETERNITY, [
      "studies",
      "load",
      "study_respec",
      "unlock",
      "start_ec",
      "dilation",
    ]),
    category("Reality", layerColours.REALITY, ["bh"]),
    category(t("Other"), "#747782", ["comment", "notify", "raw", "stop"]),
  ],
});

export function blockToCommand(block: BlocklyTypes.Block): Command {
  const fields: Record<string, string> = {};
  for (const input of block.inputList)
    for (const field of input.fieldRow)
      if (field.name) fields[field.name] = String(field.getValue());
  if (block.type === "prestige" && fields.LAYER === "INFINITY")
    fields.RESPEC = "FALSE";
  const children: Command[] = [];
  for (
    let child = block.getInputTargetBlock("BODY");
    child;
    child = child.getNextBlock()
  )
    children.push(blockToCommand(child));
  return { id: block.id, type: block.type as Kind, fields, children };
}

export function compileWorkspace(workspace: BlocklyTypes.Workspace) {
  const roots = workspace.getTopBlocks(true);
  const starts = roots.filter((block) => block.type === "start");
  const commands: Command[] = [];
  for (
    let block = starts[0]?.getNextBlock();
    block;
    block = block.getNextBlock()
  )
    commands.push(blockToCommand(block));
  const result = compile(commands);
  if (starts.length !== 1)
    result.issues.unshift({
      id: starts[0]?.id ?? "",
      severity: "error",
      message: t("The project must contain exactly one “Script start” block."),
    });
  for (const block of roots.filter((block) => block !== starts[0]))
    result.issues.push({
      id: block.id,
      severity: "error",
      message: t(
        "This block is disconnected from the script start. Connect it to the main chain.",
      ),
    });
  if (!commands.length)
    result.issues.push({
      id: starts[0]?.id ?? "",
      severity: "warning",
      message: t("Add commands below the “Script start” block."),
    });
  return result;
}
