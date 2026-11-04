import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Blockly from "../src/blockly-runtime";
import {
  compileWorkspace,
  createToolbox,
  registerLocalizedBlocks,
  relocalizeWorkspace,
} from "../src/blocks";
import { types } from "../src/compiler";
import {
  example,
  makeProject,
  parseProject,
  scriptToProject,
} from "../src/project";
import {
  getLanguage,
  readLanguage,
  setLanguage,
  t,
  type Message,
} from "../src/i18n";

test("English is the default; only an explicit saved Russian preference selects Russian", () => {
  assert.equal(getLanguage(), "en");
  for (const saved of [null, "en", "fr", "", "RU"])
    assert.equal(readLanguage({ getItem: () => saved }), "en");
  assert.equal(readLanguage(undefined), "en");
  assert.equal(
    readLanguage({
      getItem: () => {
        throw new Error("Storage blocked");
      },
    }),
    "en",
  );
  assert.equal(readLanguage({ getItem: () => "ru" }), "ru");
});

test("every page label, tooltip, and accessibility annotation has a translation", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  try {
    for (const language of ["en", "ru"] as const) {
      setLanguage(language);
      for (const [, key] of html.matchAll(
        /data-i18n(?:-aria-label|-title|-content)?="([^"]+)"/g,
      ))
        assert.equal(typeof t(key as Message), "string", `${language}: ${key}`);
    }
    assert.equal(
      t("Invalid value for field {name}.", { name: "$&{count}" }),
      "Недопустимое значение поля $&{count}.",
    );
  } finally {
    setLanguage("en");
  }
});

test("switching language preserves every block, field, ID and generated line", () => {
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(example("loop").workspace, workspace);
    for (const type of types.filter((type) => type !== "start"))
      workspace.newBlock(type);
    const auto = workspace
      .getAllBlocks(false)
      .find((b) => b.type === "auto_amount")!;
    auto.setFieldValue("ETERNITY", "LAYER");
    auto.setFieldValue("TIME", "SETTING");
    auto.setFieldValue("MIN", "UNIT");
    auto.setFieldValue("1e100", "VALUE");
    const before = makeProject("Мой проект / My project", workspace);
    const code = compileWorkspace(workspace).code;
    for (const language of ["ru", "en", "ru", "en"] as const) {
      setLanguage(language);
      relocalizeWorkspace(workspace);
      assert.deepEqual(makeProject(before.name, workspace), before);
      assert.equal(compileWorkspace(workspace).code, code);
      const translated = workspace.getBlockById(auto.id)!;
      assert.equal(translated.getField("UNIT")!.isVisible(), true);
      assert.equal(
        translated.getField("SETTING")!.getText(),
        language === "ru" ? "через время" : "after time",
      );
      assert.equal(
        createToolbox().contents[0].name,
        language === "ru"
          ? "Ожидание, условия и циклы"
          : "Wait, conditions & loops",
      );
      assert.match(
        compileWorkspace(workspace).issues[0].message,
        language === "ru" ? /Блок не подключён/ : /disconnected/,
      );
      assert.equal(Blockly.Msg.UNDO, language === "ru" ? "Отменить" : "Undo");
    }
  } finally {
    workspace.dispose();
    setLanguage("en");
    registerLocalizedBlocks();
  }
});

test("undo and redo still refer to the same fields after a language switch", async () => {
  const workspace = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(
      example("starter").workspace,
      workspace,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
    workspace.clearUndo();
    const wait = workspace.getAllBlocks(false).find((b) => b.type === "wait")!;
    wait.setFieldValue("1e250", "VALUE");
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(workspace.getUndoStack().length, 1);
    setLanguage("ru");
    relocalizeWorkspace(workspace);
    workspace.undo(false);
    assert.equal(
      workspace.getBlockById(wait.id)!.getFieldValue("VALUE"),
      "1e100",
    );
    setLanguage("en");
    relocalizeWorkspace(workspace);
    workspace.undo(true);
    assert.equal(
      workspace.getBlockById(wait.id)!.getFieldValue("VALUE"),
      "1e250",
    );
  } finally {
    workspace.dispose();
    setLanguage("en");
    registerLocalizedBlocks();
  }
});

test("Russian projects import in English without translating their contents", () => {
  const workspace = new Blockly.Workspace();
  try {
    setLanguage("ru");
    registerLocalizedBlocks();
    const russian = example("starter");
    Blockly.serialization.workspaces.load(russian.workspace, workspace);
    const original = compileWorkspace(workspace).code;
    const json = JSON.stringify(makeProject(russian.name, workspace));
    setLanguage("en");
    relocalizeWorkspace(workspace);
    const parsed = parseProject(json);
    Blockly.serialization.workspaces.load(parsed.workspace, workspace);
    assert.equal(parsed.name, "Первый Eternity");
    assert.equal(compileWorkspace(workspace).code, original);
    assert.match(original, /Eternity завершена/);
    assert.throws(() => parseProject("{"), /invalid JSON/);
  } finally {
    workspace.dispose();
    setLanguage("en");
    registerLocalizedBlocks();
  }
});

test("TXT import localizes its name and line errors while preserving script text", () => {
  const workspace = new Blockly.Workspace();
  const source = '# Мой код\nNOTIFY "Готово"\nSTOP';
  try {
    for (const language of ["en", "ru"] as const) {
      setLanguage(language);
      registerLocalizedBlocks();
      const imported = scriptToProject(source);
      assert.equal(
        imported.name,
        language === "en" ? "Imported script" : "Импортированный скрипт",
      );
      Blockly.serialization.workspaces.load(imported.workspace, workspace);
      assert.equal(compileWorkspace(workspace).code, source);
      assert.throws(() => scriptToProject("STOP\n}"), {
        message:
          language === "en"
            ? "Line 2: Unexpected closing brace }."
            : "Строка 2: Лишняя закрывающая скобка }.",
      });
      assert.throws(() => scriptToProject("WAIT EP > invalid"), {
        message:
          language === "en"
            ? "Line 1: Enter a non-negative number, such as 100 or 1e1000."
            : "Строка 1: Укажите неотрицательное число, например 100 или 1e1000.",
      });
    }
  } finally {
    workspace.dispose();
    setLanguage("en");
    registerLocalizedBlocks();
  }
});
