export const currencies = [
  "AM",
  "IP",
  "EP",
  "RM",
  "DT",
  "TP",
  "RG",
  "REP",
  "TT",
  "TOTAL TT",
  "SPENT TT",
  "PENDING IP",
  "PENDING EP",
  "PENDING RM",
  "PENDING TP",
  "PENDING GLYPH LEVEL",
  "INFINITIES",
  "ETERNITIES",
  "REALITIES",
  "TOTAL COMPLETIONS",
  "PENDING COMPLETIONS",
  ...Array.from({ length: 12 }, (_, i) => `EC${i + 1} COMPLETIONS`),
];
export const operators = [">=", ">", "<=", "<", "=="];
export const types = [
  "start",
  "wait",
  "if",
  "while",
  "until",
  "auto",
  "auto_amount",
  "pause",
  "prestige",
  "studies",
  "load",
  "study_respec",
  "unlock",
  "start_ec",
  "dilation",
  "bh",
  "comment",
  "raw",
  "notify",
  "stop",
] as const;
export type Kind = (typeof types)[number];
export type Command = {
  id: string;
  type: Kind;
  fields: Record<string, string>;
  children?: Command[];
};
export type Issue = {
  id: string;
  message: string;
  severity: "error" | "warning";
};
export type Compilation = {
  code: string;
  issues: Issue[];
  lineIds: string[];
  count: number;
};
const numberPattern = /^(0|[1-9]\d*)(\.\d+)?([eE][+-]?\d+)?$/;
export const validNumber = (value: string) =>
  numberPattern.test(value) && value.length <= 128;

export function compile(commands: Command[]): Compilation {
  const lines: string[] = [],
    lineIds: string[] = [],
    issues: Issue[] = [];
  let count = 0;
  function visit(node: Command, depth: number) {
    count++;
    const f = node.fields;
    const issue = (message: string, severity: Issue["severity"] = "error") =>
      issues.push({ id: node.id, message, severity });
    const emit = (line: string) => {
      lines.push("  ".repeat(depth) + line);
      lineIds.push(node.id);
    };
    const enumValue = (key: string, allowed: readonly string[]) => {
      const value = f[key] ?? "";
      if (!allowed.includes(value)) issue(`Недопустимое значение: ${key}.`);
      return value;
    };
    const numeric = (key: string) => {
      const value = (f[key] ?? "").trim();
      if (!validNumber(value))
        issue("Укажите неотрицательное число, например 100 или 1e1000.");
      return value;
    };
    const condition = () =>
      `${enumValue("RESOURCE", currencies)} ${enumValue("OP", operators)} ${numeric("VALUE")}`;
    const nowait = f.NOWAIT === "TRUE" ? " NOWAIT" : "";
    switch (node.type) {
      case "start":
        break;
      case "wait":
        emit(`WAIT ${condition()}`);
        break;
      case "if":
      case "while":
      case "until":
        emit(`${node.type.toUpperCase()} ${condition()} {`);
        if (!node.children?.length)
          issue("Добавьте хотя бы одну команду внутрь условия или цикла.");
        node.children?.forEach((child) => visit(child, depth + 1));
        emit("}");
        break;
      case "auto":
      case "auto_amount": {
        const layer = enumValue("LAYER", ["INFINITY", "ETERNITY", "REALITY"]);
        const mode = node.type === "auto_amount"
          ? (f.SETTING === undefined ? "AMOUNT" : enumValue("SETTING", ["AMOUNT", "TIME", "MULTIPLIER"]))
          : enumValue("MODE", ["ON", "OFF", "AMOUNT"]);
        const unit: Record<string, string> = {
          INFINITY: "IP",
          ETERNITY: "EP",
          REALITY: "RM",
        };
        if (mode === "TIME" || mode === "MULTIPLIER") {
          if (layer === "REALITY")
            issue("Reality не поддерживает автосброс по времени или множителю.");
          const value = numeric("VALUE");
          if (mode === "TIME") {
            const timeUnit = enumValue("UNIT", ["SEC", "MS", "MIN"]);
            if (!Number.isFinite(Number(value) * ({ SEC: 1000, MS: 1, MIN: 60000 }[timeUnit] ?? 1)))
              issue("Длительность автосброса слишком велика.");
            emit(`AUTO ${layer} ${value} ${timeUnit}`);
          } else emit(`AUTO ${layer} ${value} X HIGHEST`);
          break;
        }
        emit(
          `AUTO ${layer} ${mode === "AMOUNT" ? `${numeric("VALUE")} ${unit[layer]}` : mode}`,
        );
        break;
      }
      case "pause": {
        const value = numeric("VALUE");
        const unit = enumValue("UNIT", ["SEC", "MS", "MIN"]);
        const milliseconds =
          Number(value) * ({ SEC: 1000, MS: 1, MIN: 60000 }[unit] ?? 1);
        if (!Number.isFinite(milliseconds))
          issue("Длительность паузы слишком велика.");
        emit(`PAUSE ${value} ${unit}`);
        break;
      }
      case "prestige": {
        const layer = enumValue("LAYER", ["INFINITY", "ETERNITY", "REALITY"]);
        if (layer === "INFINITY" && f.RESPEC === "TRUE")
          issue("У Infinity нет RESPEC. Отключите сброс исследований.");
        emit(`${layer}${nowait}${f.RESPEC === "TRUE" ? " RESPEC" : ""}`);
        break;
      }
      case "studies": {
        const value = (f.VALUE ?? "").trim();
        if (!/^\d+(\s*,\s*\d+)*$/.test(value))
          issue(
            "Перечислите номера исследований через запятую, например 11,21,31.",
          );
        else if (value.split(",").some((id) => !studyIds.has(Number(id))))
          issue("В списке есть несуществующий номер Time Study.");
        emit(`STUDIES${nowait} PURCHASE ${value}`);
        break;
      }
      case "load":
        emit(
          `STUDIES${nowait} LOAD ID ${enumValue("SLOT", ["1", "2", "3", "4", "5", "6"])}`,
        );
        break;
      case "study_respec":
        emit("STUDIES RESPEC");
        break;
      case "unlock":
        emit(
          `UNLOCK${nowait} ${enumValue("TARGET", ["DILATION", ...Array.from({ length: 12 }, (_, i) => `EC${i + 1}`)])}`,
        );
        break;
      case "start_ec":
        emit(
          `START EC${enumValue(
            "EC",
            Array.from({ length: 12 }, (_, i) => String(i + 1)),
          )}`,
        );
        break;
      case "dilation":
        emit("START DILATION");
        break;
      case "bh":
        emit(`BLACK HOLE ${enumValue("MODE", ["ON", "OFF"])}`);
        break;
      case "comment":
        (f.TEXT ?? "").split(/\r?\n/).forEach((line) => emit(`# ${line}`));
        break;
      case "notify": {
        const text = f.TEXT ?? "";
        if (/["\r\n]/.test(text))
          issue(
            "В уведомлении нельзя использовать двойные кавычки или перенос строки.",
          );
        emit(`NOTIFY "${text}"`);
        break;
      }
      case "raw":
        if (!(f.TEXT ?? "").trim())
          issue("Введите текст команды в блоке «Свой код».");
        issue(
          "«Свой код» не проверяется. Проверьте его в Automator игры.",
          "warning",
        );
        (f.TEXT ?? "").split(/\r?\n/).forEach(emit);
        break;
      case "stop":
        emit("STOP");
        break;
      default:
        issue("Неизвестная команда.");
    }
  }
  commands.forEach((node) => visit(node, 0));
  return { code: lines.join("\n"), issues, lineIds, count };
}

// Normal Time Studies. Dilation studies use dedicated UNLOCK/START commands.
const studyIds = new Set([
  11, 21, 22, 31, 32, 33, 41, 42, 51, 61, 62, 71, 72, 73, 81, 82, 83, 91, 92,
  93, 101, 102, 103, 111, 121, 122, 123, 131, 132, 133, 141, 142, 143, 151, 161,
  162, 171, 181, 191, 192, 193, 201, 211, 212, 213, 214, 221, 222, 223, 224,
  225, 226, 227, 228, 231, 232, 233, 234,
]);
