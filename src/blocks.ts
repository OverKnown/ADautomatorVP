import type * as BlocklyTypes from "blockly/core";
import Blockly from "./blockly-runtime";
import * as Ru from "blockly/msg/ru";
import {
  currencies,
  operators,
  type Command,
  type Kind,
  compile,
} from "./compiler";

Blockly.setLocale(
  Object.fromEntries(
    Object.entries(Reflect.get(Ru, "default") ?? Ru).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  ),
);
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
Blockly.Extensions.register("layer_colour", function () {
  const field = this.getField("LAYER")!;
  field.setValidator((value: string) => {
    this.setColour(layerColours[value as Layer]);
    return value;
  });
  this.setColour(layerColours[field.getValue() as Layer]);
});
const condition = () => [
  dropdown("RESOURCE", currencies),
  dropdown("OP", operators),
  text("VALUE", "1e100"),
];
const definitions = [
  {
    type: "start",
    message0: "▶  Начало скрипта",
    args0: [],
    colour: "#51458a",
    previousStatement: undefined,
    tooltip: "Соедините все команды в одну цепочку под этим блоком.",
  },
  {
    type: "wait",
    message0: "Ждать  %1 %2 %3",
    args0: condition(),
    colour: "#5d6c9c",
    tooltip: "Ждать, пока сравнение станет истинным. WAIT",
  },
  ...(["if", "while", "until"] as const).map((type, i) => ({
    type,
    message0: `${["Если", "Пока", "До выполнения"][i]}  %1 %2 %3`,
    args0: condition(),
    message1: "выполнять %1",
    args1: [{ type: "input_statement", name: "BODY" }],
    colour: "#5d6c9c",
    tooltip: [
      "Выполнить вложенные команды один раз, если условие истинно.",
      "Повторять вложенные команды, пока условие истинно.",
      "Повторять вложенные команды, пока условие не станет истинным.",
    ][i],
  })),
  {
    type: "auto",
    message0: "Автосброс  %1 %2",
    args0: [
      layer(),
      dropdown("MODE", [
        ["включить", "ON"],
        ["выключить", "OFF"],
      ]),
    ],
    colour: layerColours.INFINITY,
    extensions: ["layer_colour"],
    tooltip:
      "AUTO ON/OFF. Включить или выключить автосброс, не меняя текущий порог.",
  },
  {
    type: "auto_amount",
    message0: "Автосброс  %1  по количеству %2",
    args0: [layer(), text("VALUE", "1e10")],
    colour: layerColours.INFINITY,
    extensions: ["layer_colour"],
    tooltip:
      "AUTO по количеству. Ресурс порога зависит от слоя: IP, EP или RM.",
  },
  {
    type: "pause",
    message0: "Пауза  %1 %2",
    args0: [
      text("VALUE", "1"),
      dropdown("UNIT", [
        ["сек", "SEC"],
        ["мс", "MS"],
        ["мин", "MIN"],
      ]),
    ],
    colour: "#5d6c9c",
    tooltip: "Пауза по реальному времени. PAUSE",
  },
  {
    type: "prestige",
    message0: "Сброс  %1",
    args0: [layer()],
    message1: "не ждать %1  respec %2",
    args1: [checkbox("NOWAIT"), checkbox("RESPEC")],
    colour: layerColours.INFINITY,
    extensions: ["layer_colour"],
    tooltip:
      "По умолчанию ждёт доступности сброса. RESPEC: исследования для Eternity, глифы для Reality; недоступен для Infinity.",
  },
  {
    type: "studies",
    message0: "Купить исследования  %1",
    args0: [text("VALUE", "11,21,31")],
    message1: "не ждать %1",
    args1: [checkbox("NOWAIT")],
    colour: layerColours.ETERNITY,
    tooltip:
      "STUDIES PURCHASE. Номера через запятую; без NOWAIT ждёт покупки всех исследований.",
  },
  {
    type: "load",
    message0: "Загрузить пресет исследований  %1",
    args0: [dropdown("SLOT", ["1", "2", "3", "4", "5", "6"])],
    message1: "не ждать %1",
    args1: [checkbox("NOWAIT")],
    colour: layerColours.ETERNITY,
    tooltip:
      "STUDIES LOAD ID. Использует пресет, сохранённый в игре, а не в конструкторе.",
  },
  {
    type: "study_respec",
    message0: "Сбросить исследования при Eternity",
    args0: [],
    colour: layerColours.ETERNITY,
    tooltip:
      "STUDIES RESPEC: отмечает исследования для сброса при следующей Eternity.",
  },
  {
    type: "unlock",
    message0: "Открыть  %1  не ждать %2",
    args0: [
      dropdown("TARGET", [
        "DILATION",
        ...Array.from({ length: 12 }, (_, i) => `EC${i + 1}`),
      ]),
      checkbox("NOWAIT"),
    ],
    colour: layerColours.ETERNITY,
    tooltip: "UNLOCK: купить открытие испытания или Dilation.",
  },
  {
    type: "start_ec",
    message0: "Начать испытание Eternity  %1",
    args0: [
      dropdown(
        "EC",
        Array.from({ length: 12 }, (_, i) => String(i + 1)),
      ),
    ],
    colour: layerColours.ETERNITY,
    tooltip: "START EC. Испытание должно быть открыто.",
  },
  {
    type: "dilation",
    message0: "Начать Dilation",
    args0: [],
    colour: layerColours.ETERNITY,
    tooltip: "START DILATION",
  },
  {
    type: "bh",
    message0: "Чёрная дыра  %1",
    args0: [
      dropdown("MODE", [
        ["включить", "ON"],
        ["выключить", "OFF"],
      ]),
    ],
    colour: layerColours.REALITY,
    tooltip: "BLACK HOLE ON/OFF. Требует открытия чёрной дыры в игре.",
  },
  {
    type: "comment",
    message0: "Комментарий  %1",
    args0: [text("TEXT", "Мой сценарий")],
    colour: "#747782",
    tooltip: "Пояснение в коде, не выполняется.",
  },
  {
    type: "raw",
    message0: "Свой код  %1",
    args0: [text("TEXT", "WAIT EP >= 1e100")],
    colour: "#8c6264",
    tooltip: "Одна строка кода Automator. Синтаксис не проверяется.",
  },
  {
    type: "notify",
    message0: "Уведомление  %1",
    args0: [text("TEXT", "Готово")],
    colour: "#747782",
    tooltip: "NOTIFY: показать уведомление в игре.",
  },
  {
    type: "stop",
    message0: "■  Остановить скрипт",
    args0: [],
    colour: "#8c6264",
    tooltip: "STOP: остановить выполнение Automator.",
  },
];

Blockly.defineBlocksWithJsonArray(
  definitions.map((def) => ({
    previousStatement: null,
    nextStatement: null,
    inputsInline: true,
    ...def,
  })),
);
export const theme = Blockly.Theme.defineTheme("antimatter", {
  name: "antimatter",
  base: Blockly.Themes.Classic,
  componentStyles: {
    workspaceBackgroundColour: "#f7f7f5",
    toolboxBackgroundColour: "#ffffff",
    toolboxForegroundColour: "#343441",
    flyoutBackgroundColour: "#eeedf4",
    flyoutForegroundColour: "#343441",
    flyoutOpacity: 0.97,
    scrollbarColour: "#c9c7d3",
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
export const toolbox = {
  kind: "categoryToolbox",
  contents: [
    category("Ожидание, условия и циклы", "#5d6c9c", [
      "wait", "pause", "if", "while", "until",
    ]),
    category("Сбросы", "#46766b", ["prestige", "auto", "auto_amount"]),
    category("Eternity", layerColours.ETERNITY, [
      "studies",
      "load",
      "study_respec",
      "unlock",
      "start_ec",
      "dilation",
    ]),
    category("Reality", layerColours.REALITY, ["bh"]),
    category("Другое", "#747782", ["comment", "notify", "raw", "stop"]),
  ],
};

export function blockToCommand(block: BlocklyTypes.Block): Command {
  const fields: Record<string, string> = {};
  for (const input of block.inputList)
    for (const field of input.fieldRow)
      if (field.name) fields[field.name] = String(field.getValue());
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
      message: "В проекте должен быть ровно один блок «Начало скрипта».",
    });
  for (const block of roots.filter((block) => block !== starts[0]))
    result.issues.push({
      id: block.id,
      severity: "error",
      message:
        "Блок не подключён к началу скрипта. Соедините его с основной цепочкой.",
    });
  if (!commands.length)
    result.issues.push({
      id: starts[0]?.id ?? "",
      severity: "warning",
      message: "Добавьте команды под блок «Начало скрипта».",
    });
  return result;
}
