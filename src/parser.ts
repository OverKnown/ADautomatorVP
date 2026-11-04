import { t } from "./i18n";
import { compile, type Command, type Kind } from "./compiler";

export class ScriptParseError extends Error {
  constructor(
    public line: number,
    message: string,
  ) {
    super(t("Line {line}: {message}", { line, message }));
    this.name = "ScriptParseError";
  }
}

// Comments and braces inside quoted strings are ordinary text, not syntax.
function splitLine(line: string): [string, string | undefined] {
  let quote = "";
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (quote) {
      if (char === quote) quote = "";
    } else if (char === '"' || char === "'") quote = char;
    else if (char === "#" || line.slice(i, i + 2) === "//")
      return [
        line.slice(0, i).trim(),
        line.slice(i + (char === "#" ? 1 : 2)).replace(/^ /, ""),
      ];
  }
  return [line.trim(), undefined];
}

export function parseScript(source: string): Command[] {
  if (source.length > 2_000_000)
    throw new ScriptParseError(1, t("The maximum size is 2 MB."));
  const commands: Command[] = [];
  const stack = [{ commands, line: 1 }];
  const locations = new Map<string, number>();
  let count = 0;
  let pendingBrace = false;
  const add = (
    type: Kind,
    fields: Record<string, string>,
    line: number,
  ): Command => {
    if (++count > 499)
      throw new ScriptParseError(
        line,
        t("The limit is 499 commands plus the start block."),
      );
    if (Object.values(fields).some((v) => v.length > 10000))
      throw new ScriptParseError(
        line,
        t("A parameter exceeds 10000 characters."),
      );
    const node: Command = { id: `import-${count}`, type, fields };
    locations.set(node.id, line);
    stack.at(-1)!.commands.push(node);
    return node;
  };
  const lines = source
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  lines.forEach((original, index) => {
    const line = index + 1;
    const [text, comment] = splitLine(original);
    let match: RegExpMatchArray | null;
    const flag = (v: unknown) => (v ? "TRUE" : "FALSE");
    if (!text) {
      if (comment !== undefined) add("comment", { TEXT: comment }, line);
      return;
    }
    if (pendingBrace) {
      if (text !== "{")
        throw new ScriptParseError(
          line,
          t("Expected an opening brace { on its own line."),
        );
      pendingBrace = false;
    } else if (text === "}") {
      if (stack.length === 1)
        throw new ScriptParseError(line, t("Unexpected closing brace }."));
      stack.pop();
    } else if ((match = text.match(/^(IF|WHILE|UNTIL)\s+(.+?)(\s*\{)?$/i))) {
      const condition = match[2]
        .trim()
        .match(/^(.+?)\s*(>=|<=|==|>|<|=)\s*(\S+)$/);
      if (!condition)
        throw new ScriptParseError(
          line,
          t("This condition requires the format “resource operator number”."),
        );
      const node = add(
        match[1].toLowerCase() as Kind,
        {
          RESOURCE: condition[1].trim().replace(/\s+/g, " ").toUpperCase(),
          OP: condition[2] === "=" ? "==" : condition[2],
          VALUE: condition[3],
        },
        line,
      );
      node.children = [];
      if (stack.length >= 81)
        throw new ScriptParseError(line, t("The limit is 80 nesting levels."));
      stack.push({ commands: node.children, line });
      pendingBrace = !match[3];
    } else if (
      (match = text.match(/^WAIT\s+(.+?)\s*(>=|<=|==|>|<|=)\s*(\S+)$/i))
    ) {
      add(
        "wait",
        {
          RESOURCE: match[1].trim().replace(/\s+/g, " ").toUpperCase(),
          OP: match[2] === "=" ? "==" : match[2],
          VALUE: match[3],
        },
        line,
      );
    } else if (
      (match = text.match(/^AUTO\s+(INFINITY|ETERNITY|REALITY)\s+(ON|OFF)$/i))
    ) {
      add(
        "auto",
        { LAYER: match[1].toUpperCase(), MODE: match[2].toUpperCase() },
        line,
      );
    } else if (
      (match = text.match(
        /^AUTO\s+(INFINITY|ETERNITY|REALITY)\s+(\S+)\s+(IP|EP|RM)$/i,
      ))
    ) {
      const layer = match[1].toUpperCase();
      if (
        { INFINITY: "IP", ETERNITY: "EP", REALITY: "RM" }[layer] !==
        match[3].toUpperCase()
      )
        throw new ScriptParseError(
          line,
          t("The resource does not match the auto prestige layer."),
        );
      add(
        "auto_amount",
        { LAYER: layer, SETTING: "AMOUNT", VALUE: match[2] },
        line,
      );
    } else if (
      (match = text.match(
        /^AUTO\s+(INFINITY|ETERNITY|REALITY)\s+(\S+)\s+(SEC|MS|MIN)$/i,
      ))
    ) {
      add(
        "auto_amount",
        {
          LAYER: match[1].toUpperCase(),
          SETTING: "TIME",
          VALUE: match[2],
          UNIT: match[3].toUpperCase(),
        },
        line,
      );
    } else if (
      (match = text.match(
        /^AUTO\s+(INFINITY|ETERNITY|REALITY)\s+(\S+)\s+X\s+HIGHEST$/i,
      ))
    ) {
      add(
        "auto_amount",
        {
          LAYER: match[1].toUpperCase(),
          SETTING: "MULTIPLIER",
          VALUE: match[2],
        },
        line,
      );
    } else if ((match = text.match(/^PAUSE\s+(\S+)\s+(SEC|MS|MIN)$/i))) {
      add("pause", { VALUE: match[1], UNIT: match[2].toUpperCase() }, line);
    } else if (
      (match = text.match(
        /^(INFINITY|ETERNITY|REALITY)(\s+NOWAIT)?(\s+RESPEC)?$/i,
      ))
    ) {
      add(
        "prestige",
        {
          LAYER: match[1].toUpperCase(),
          NOWAIT: flag(match[2]),
          RESPEC: flag(match[3]),
        },
        line,
      );
    } else if (
      (match = text.match(/^STUDIES(\s+NOWAIT)?\s+PURCHASE\s+([\d,\s]+)$/i))
    ) {
      add("studies", { NOWAIT: flag(match[1]), VALUE: match[2].trim() }, line);
    } else if (
      (match = text.match(/^STUDIES(\s+NOWAIT)?\s+LOAD\s+ID\s+(\S+)$/i))
    ) {
      add("load", { NOWAIT: flag(match[1]), SLOT: match[2] }, line);
    } else if (/^STUDIES\s+RESPEC$/i.test(text)) add("study_respec", {}, line);
    else if ((match = text.match(/^UNLOCK(\s+NOWAIT)?\s+(DILATION|EC\d+)$/i)))
      add(
        "unlock",
        { NOWAIT: flag(match[1]), TARGET: match[2].toUpperCase() },
        line,
      );
    else if ((match = text.match(/^START\s+EC(\d+)$/i)))
      add("start_ec", { EC: match[1] }, line);
    else if (/^START\s+DILATION$/i.test(text)) add("dilation", {}, line);
    else if ((match = text.match(/^BLACK\s+HOLE\s+(ON|OFF)$/i)))
      add("bh", { MODE: match[1].toUpperCase() }, line);
    else if ((match = text.match(/^NOTIFY\s+"([^"\r\n]*)"$/i)))
      add("notify", { TEXT: match[1] }, line);
    else if ((match = text.match(/^NOTIFY\s+'([^'"\r\n]*)'$/i)))
      add("notify", { TEXT: match[1] }, line);
    else if (/^STOP$/i.test(text)) add("stop", {}, line);
    else {
      // Never flatten an unrecognized structured statement into executable raw lines.
      const unquoted = text.replace(/"[^"\n]*"|'[^'\n]*'/g, "");
      if (/[{}]/.test(unquoted) || /^(IF|WHILE|UNTIL|ELSE)\b/i.test(text))
        throw new ScriptParseError(
          line,
          t(
            "Unsupported structure. Place braces and commands on separate lines.",
          ),
        );
      add("raw", { TEXT: text }, line);
    }
    if (comment !== undefined) add("comment", { TEXT: comment }, line);
  });
  if (stack.length > 1)
    throw new ScriptParseError(
      stack.at(-1)!.line,
      pendingBrace
        ? t("Missing opening brace {.")
        : t("Missing closing brace }."),
    );
  const error = compile(commands).issues.find(
    (issue) => issue.severity === "error",
  );
  if (error)
    throw new ScriptParseError(locations.get(error.id) ?? 1, error.message);
  return commands;
}
