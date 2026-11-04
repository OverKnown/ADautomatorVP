import test from "node:test";
import assert from "node:assert/strict";
import Blockly from "../src/blockly-runtime";
import { compileWorkspace } from "../src/blocks";
import { compile, types } from "../src/compiler";
import { parseScript, ScriptParseError } from "../src/parser";
import { example, makeProject, scriptToProject } from "../src/project";

function roundTrip(source: string) {
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(
      scriptToProject(source).workspace,
      workspace,
    );
    return compileWorkspace(workspace);
  } finally {
    workspace.dispose();
  }
}
test("every standard block survives blocks → TXT → blocks", () => {
  const workspace = new Blockly.Workspace();
  try {
    for (const type of types.filter((t) => !["start", "raw"].includes(t))) {
      const block = workspace.newBlock(type);
      if (["if", "while", "until"].includes(type)) {
        const child = workspace.newBlock("pause");
        block.getInput("BODY")!.connection!.connect(child.previousConnection!);
      }
      const start = workspace.newBlock("start");
      start.nextConnection!.connect(block.previousConnection!);
      const original = compileWorkspace(workspace);
      assert.deepEqual(original.issues, [], type);
      const imported = roundTrip(original.code);
      assert.equal(imported.code, original.code, type);
      assert.deepEqual(imported.issues, [], type);
      workspace.clear();
    }
  } finally {
    workspace.dispose();
  }
});
test("all examples round-trip through TXT", () => {
  const workspace = new Blockly.Workspace();
  try {
    for (const key of ["starter", "loop", "dilation", "empty"]) {
      Blockly.serialization.workspaces.load(example(key).workspace, workspace);
      const code = compileWorkspace(workspace).code;
      assert.equal(roundTrip(code).code, code);
    }
  } finally {
    workspace.dispose();
  }
});
test("nested commands, all option forms and huge numbers survive round-trip", () => {
  const code = `AUTO REALITY 1e1000 RM
AUTO ETERNITY OFF
AUTO INFINITY 100 IP
IF PENDING EP >= 1e1000 {
  WHILE EP < 1e2000 {
    UNTIL IP == 50 {
      PAUSE 500 MS
    }
    ETERNITY NOWAIT RESPEC
  }
}
STUDIES NOWAIT PURCHASE 11,21,31
STUDIES NOWAIT LOAD ID 6
UNLOCK NOWAIT EC12
START EC12
BLACK HOLE OFF
PAUSE 10 MIN`;
  assert.equal(roundTrip(code).code, code);
});
test("BOM, CRLF, case, comments and separate opening braces are accepted", () => {
  const result = roundTrip(
    "\ufeff// начало\r\nif pending ep = 1e100\r\n{\r\n  pause 1 sec # пауза\r\n}\r\n",
  );
  assert.equal(
    result.code,
    "# начало\nIF PENDING EP == 1e100 {\n  PAUSE 1 SEC\n  # пауза\n}",
  );
});
test("comment markers and braces in quoted strings do not change structure", () => {
  assert.equal(
    roundTrip('NOTIFY "https://game/#test { ok }"').code,
    'NOTIFY "https://game/#test { ok }"',
  );
  assert.equal(
    roundTrip("notify 'hello # world'").code,
    'NOTIFY "hello # world"',
  );
});
test("unsupported simple commands are preserved verbatim with warnings", () => {
  for (const source of [
    "WAIT REALITY",
    "STUDIES LOAD NAME My preset",
    "RESTART",
    "SOMETHING unknown",
  ]) {
    const result = roundTrip(source);
    assert.equal(result.code, source);
    assert.equal(result.issues[0].severity, "warning");
  }
});
test("structural errors and invalid recognized parameters identify source lines", () => {
  const cases: [string, number][] = [
    ["# comment\n}", 2],
    ["IF EP > 1 {\nSTOP", 1],
    ["IF EP > 1\nSTOP", 2],
    ["IF EP > 1 {\n}", 1],
    ["STOP\nAUTO ETERNITY 1 IP", 2],
    ["STOP\nWAIT EP >= invalid", 2],
    ["STUDIES PURCHASE 999", 1],
    ["START EC13", 1],
    ["INFINITY RESPEC", 1],
    ["IF EP > 1 { STOP }", 1],
    ["REPEAT {", 1],
    ["ELSE", 1],
  ];
  for (const [source, line] of cases)
    assert.throws(
      () => scriptToProject(source),
      (error: unknown) =>
        error instanceof ScriptParseError && error.line === line,
      source,
    );
});
test("rejected script import cannot modify the open project", () => {
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(
      example("starter").workspace,
      workspace,
    );
    const before = JSON.stringify(makeProject("Current", workspace));
    assert.throws(() => scriptToProject("IF EP > 1 {"));
    assert.equal(JSON.stringify(makeProject("Current", workspace)), before);
  } finally {
    workspace.dispose();
  }
});
test("limits apply before loading the live workspace; long sequential scripts are supported", () => {
  assert.equal(roundTrip(Array(150).fill("PAUSE 1 SEC").join("\n")).count, 150);
  assert.throws(() => parseScript(Array(500).fill("STOP").join("\n")), /499/);
  assert.throws(() => parseScript(" ".repeat(2_000_001)), /2 МБ/);
  assert.throws(() => parseScript("IF EP > 1 {\n".repeat(81)), /80/);
});
test("parser uses the shared compiler validation and retains exponent text", () => {
  const commands = parseScript("wait pending ep >= 1e1000");
  assert.equal(commands[0].fields.VALUE, "1e1000");
  assert.deepEqual(compile(commands).issues, []);
});

test("current auto settings retain time and multiplier modes as editable blocks", () => {
  for (const source of [
    "AUTO INFINITY 5 X HIGHEST",
    "AUTO ETERNITY 10 SEC",
    "AUTO INFINITY 300 MS",
    "AUTO ETERNITY 2 MIN",
  ]) {
    const commands = parseScript(source);
    assert.equal(commands[0].type, "auto_amount");
    const result = roundTrip(source);
    assert.equal(result.code, source);
    assert.deepEqual(result.issues, []);
  }
  assert.throws(() => scriptToProject("AUTO REALITY 5 SEC"), /Reality/);
  assert.throws(() => scriptToProject("AUTO REALITY 5 X HIGHEST"), /Reality/);
});
