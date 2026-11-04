import test from "node:test";
import assert from "node:assert/strict";
import type * as BlocklyTypes from "blockly/core";
import Blockly from "../src/blockly-runtime";
import { blockToCommand, compileWorkspace } from "../src/blocks";
import { compile, validNumber, types, type Command } from "../src/compiler";
import { example, makeProject, parseProject } from "../src/project";

const command = (
  type: Command["type"],
  fields: Record<string, string> = {},
  children?: Command[],
): Command => ({ id: type, type, fields, children });
function withExample(
  key: string,
  run: (workspace: BlocklyTypes.Workspace) => void,
) {
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(example(key).workspace, workspace);
    run(workspace);
  } finally {
    workspace.dispose();
  }
}
test("starter generates commands in connected order, using pending EP", () =>
  withExample("starter", (workspace) => {
    const result = compileWorkspace(workspace);
    assert.deepEqual(result.issues, []);
    assert.equal(
      result.code,
      '# Example: wait for the reward and perform Eternity\nAUTO INFINITY ON\nWAIT PENDING EP >= 1e100\nETERNITY\nNOTIFY "Eternity complete"',
    );
    assert.equal(result.lineIds.length, 5);
  }));
test("loop example generates nested Automator syntax", () =>
  withExample("loop", (workspace) => {
    const result = compileWorkspace(workspace);
    assert.deepEqual(result.issues, []);
    assert.match(
      result.code,
      /UNTIL EP >= 1e1000 \{\n  WAIT PENDING EP >= 1e100\n  ETERNITY\n\}/,
    );
  }));
test("all examples survive JSON export and import without changing code", () => {
  for (const key of ["starter", "loop", "dilation", "empty"])
    withExample(key, (workspace) => {
      const before = compileWorkspace(workspace).code;
      const data = parseProject(JSON.stringify(makeProject("Тест", workspace)));
      const copy = new Blockly.Workspace();
      try {
        Blockly.serialization.workspaces.load(data.workspace, copy);
        assert.equal(compileWorkspace(copy).code, before);
      } finally {
        copy.dispose();
      }
    });
});
test("every block type can be created and serialized", () => {
  const workspace = new Blockly.Workspace();
  try {
    types.forEach((type) => workspace.newBlock(type));
    assert.equal(workspace.getAllBlocks(false).length, types.length);
    assert.doesNotThrow(() => makeProject("Все блоки", workspace));
  } finally {
    workspace.dispose();
  }
});
test("disconnected blocks produce an actionable error", () =>
  withExample("starter", (workspace) => {
    const loose = workspace.newBlock("wait");
    assert.ok(
      compileWorkspace(workspace).issues.some(
        (issue) => issue.id === loose.id && issue.severity === "error",
      ),
    );
  }));
test("large numbers are kept verbatim and cannot inject new commands", () => {
  const result = compile([
    command("wait", { RESOURCE: "EP", OP: ">=", VALUE: "1e1000" }),
  ]);
  assert.equal(result.code, "WAIT EP >= 1e1000");
  assert.deepEqual(result.issues, []);
  for (const value of [
    "Infinity",
    "NaN",
    "1e",
    "01",
    "-1",
    "1\nSTOP",
    "1;STOP",
    "1e1000foo",
  ])
    assert.equal(validNumber(value), false, value);
});
test("unsupported respec and empty loops are errors", () => {
  assert.ok(
    compile([
      command("prestige", { LAYER: "INFINITY", RESPEC: "TRUE" }),
    ]).issues.some((i) => i.severity === "error"),
  );
  assert.ok(
    compile([
      command("while", { RESOURCE: "EP", OP: "<", VALUE: "100" }, []),
    ]).issues.some((i) => i.severity === "error"),
  );
});
test("currency auto modes choose the resource for their prestige layer", () => {
  const result = compile(
    ["INFINITY", "ETERNITY", "REALITY"].map((LAYER) =>
      command("auto", { LAYER, MODE: "AMOUNT", VALUE: "1e1000" }),
    ),
  );
  assert.equal(
    result.code,
    "AUTO INFINITY 1e1000 IP\nAUTO ETERNITY 1e1000 EP\nAUTO REALITY 1e1000 RM",
  );
  assert.deepEqual(result.issues, []);
});
test("dedicated amount blocks select the currency for each layer", () => {
  const result = compile(
    ["INFINITY", "ETERNITY", "REALITY"].map((LAYER) =>
      command("auto_amount", { LAYER, VALUE: "1e1000" }),
    ),
  );
  assert.equal(result.code,
    "AUTO INFINITY 1e1000 IP\nAUTO ETERNITY 1e1000 EP\nAUTO REALITY 1e1000 RM");
  assert.deepEqual(result.issues, []);
  assert.ok(compile([command("auto_amount", { LAYER: "REALITY", VALUE: "bad" })])
    .issues.some((issue) => issue.severity === "error"));
});
test("advanced auto settings generate time and multiplier commands only for supported layers", () => {
  for (const LAYER of ["INFINITY", "ETERNITY"]) {
    for (const UNIT of ["SEC", "MS", "MIN"]) {
      const result = compile([command("auto_amount", { LAYER, SETTING: "TIME", UNIT, VALUE: "30" })]);
      assert.equal(result.code, `AUTO ${LAYER} 30 ${UNIT}`);
      assert.deepEqual(result.issues, []);
    }
    const result = compile([command("auto_amount", { LAYER, SETTING: "MULTIPLIER", VALUE: "1e1000" })]);
    assert.equal(result.code, `AUTO ${LAYER} 1e1000 X HIGHEST`);
    assert.deepEqual(result.issues, []);
  }
  for (const SETTING of ["TIME", "MULTIPLIER"])
    assert.ok(compile([command("auto_amount", { LAYER: "REALITY", SETTING, UNIT: "SEC", VALUE: "10" })])
      .issues.some((issue) => issue.severity === "error"));
});
test("auto settings hide unsupported options and round-trip selected modes", () => {
  const workspace = new Blockly.Workspace();
  try {
    const start = workspace.newBlock("start");
    const block = workspace.newBlock("auto_amount");
    start.nextConnection!.connect(block.previousConnection!);
    assert.equal(block.getField("UNIT")!.isVisible(), false);
    block.setFieldValue("ETERNITY", "LAYER");
    block.setFieldValue("TIME", "SETTING");
    block.setFieldValue("5", "VALUE");
    block.setFieldValue("MIN", "UNIT");
    assert.equal(block.getField("UNIT")!.isVisible(), true);
    const parsed = parseProject(JSON.stringify(makeProject("Тест", workspace)));
    Blockly.serialization.workspaces.load(parsed.workspace, workspace);
    const restored = workspace.getAllBlocks(false).find(b => b.type === "auto_amount")!;
    assert.equal(compileWorkspace(workspace).code, "AUTO ETERNITY 5 MIN");
    assert.equal(restored.getField("UNIT")!.isVisible(), true);
    restored.setFieldValue("MULTIPLIER", "SETTING");
    assert.equal(restored.getField("UNIT")!.isVisible(), false);
    restored.setFieldValue("REALITY", "LAYER");
    assert.equal(restored.getFieldValue("SETTING"), "AMOUNT");
    assert.deepEqual((restored.getField("SETTING") as BlocklyTypes.FieldDropdown).getOptions(false), [["by amount", "AMOUNT"]]);
    assert.equal(compile([blockToCommand(restored)]).code, "AUTO REALITY 5 RM");
    restored.setFieldValue("INFINITY", "LAYER");
    assert.equal((restored.getField("SETTING") as BlocklyTypes.FieldDropdown).getOptions(false).length, 3);
  } finally { workspace.dispose(); }
});
test("old auto blocks import into compact blocks without changing code", () => {
  const data = example("empty") as any;
  data.workspace.blocks.blocks[0].next = {
    block: {
      type: "auto", fields: { LAYER: "INFINITY", MODE: "ON", VALUE: "1e10" },
      next: { block: {
        type: "auto", fields: { LAYER: "ETERNITY", MODE: "AMOUNT", VALUE: "1e1000" },
        next: { block: {
          type: "auto", fields: { LAYER: "REALITY", MODE: "OFF", VALUE: "5" },
        } },
      } },
    },
  };
  const workspace = new Blockly.Workspace();
  try {
    const parsed = parseProject(JSON.stringify(data));
    Blockly.serialization.workspaces.load(parsed.workspace, workspace);
    const result = compileWorkspace(workspace);
    assert.equal(result.code, "AUTO INFINITY ON\nAUTO ETERNITY 1e1000 EP\nAUTO REALITY OFF");
    assert.deepEqual(result.issues, []);
    const auto = workspace.getAllBlocks(false).find((block) => block.type === "auto")!;
    assert.equal(auto.getField("VALUE"), null);
    assert.ok(workspace.getAllBlocks(false).some((block) => block.type === "auto_amount"));
    const saved = parseProject(JSON.stringify(makeProject("Тест", workspace)));
    Blockly.serialization.workspaces.load(saved.workspace, workspace);
    assert.equal(compileWorkspace(workspace).code, result.code);
  } finally {
    workspace.dispose();
  }
});
test("NOWAIT is placed before PURCHASE, LOAD, and RESPEC", () => {
  assert.equal(
    compile([
      command("studies", { VALUE: "11,21,31", NOWAIT: "TRUE" }),
      command("load", { SLOT: "6", NOWAIT: "TRUE" }),
      command("prestige", {
        LAYER: "ETERNITY",
        NOWAIT: "TRUE",
        RESPEC: "TRUE",
      }),
    ]).code,
    "STUDIES NOWAIT PURCHASE 11,21,31\nSTUDIES NOWAIT LOAD ID 6\nETERNITY NOWAIT RESPEC",
  );
});
test("invalid studies, duration and notification parameters are rejected", () => {
  for (const node of [
    command("studies", { VALUE: "999" }),
    command("studies", { VALUE: "11\nSTOP" }),
    command("pause", { VALUE: "1e1000", UNIT: "SEC" }),
    command("notify", { TEXT: 'x"\nSTOP' }),
  ])
    assert.ok(compile([node]).issues.some((i) => i.severity === "error"));
});
test("raw code carries a warning and comments cannot create commands", () => {
  const result = compile([
    command("raw", { TEXT: "WAIT EP >= 1e100" }),
    command("comment", { TEXT: "one\nSTOP" }),
  ]);
  assert.equal(result.issues[0].severity, "warning");
  assert.equal(result.code, "WAIT EP >= 1e100\n# one\n# STOP");
});
test("nested lines map to the right block for error navigation", () => {
  const result = compile([
    command("if", { RESOURCE: "EP", OP: ">", VALUE: "1" }, [
      command("pause", { VALUE: "5", UNIT: "SEC" }),
    ]),
  ]);
  assert.deepEqual(result.lineIds, ["if", "pause", "if"]);
});
test("import rejects foreign formats, versions, oversized and malformed projects", () => {
  for (const data of [
    "{}",
    "{",
    JSON.stringify({ ...example("starter"), version: 9 }),
    " ".repeat(2_000_001),
  ])
    assert.throws(() => parseProject(data));
  const unsupported = example("empty") as any;
  unsupported.workspace.blocks.blocks[0].type = "javascript_eval";
  assert.throws(() => parseProject(JSON.stringify(unsupported)), /unknown/);
});
test("invalid dropdown fields are rejected even if the file has no block ids", () => {
  const data = example("starter") as any;
  data.workspace.blocks.blocks[0].next.block.next.block.fields.LAYER = "BAD";
  assert.throws(
    () => parseProject(JSON.stringify(data)),
    /Invalid value/,
  );
});
test("rejected import leaves the current workspace untouched", () =>
  withExample("starter", (workspace) => {
    const before = JSON.stringify(makeProject("Работа", workspace));
    assert.throws(() => parseProject('{"version":2}'));
    assert.equal(JSON.stringify(makeProject("Работа", workspace)), before);
  }));
test("start block has no previous connection and conditions accept nested commands", () =>
  withExample("loop", (workspace) => {
    const start = workspace.getTopBlocks(false)[0];
    assert.equal(start.previousConnection, null);
    assert.equal(
      workspace
        .getAllBlocks(false)
        .find((b) => b.type === "until")!
        .getInputTargetBlock("BODY")!.type,
      "wait",
    );
  }));
