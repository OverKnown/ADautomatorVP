import { t } from "./i18n";
import type * as BlocklyTypes from "blockly/core";
import Blockly from "./blockly-runtime";
import { types, type Command } from "./compiler";
import { parseScript } from "./parser";

export const STORAGE_KEY = "ad-automator-studio:project:v1";
export interface Project {
  format: "ad-automator-studio";
  version: 1;
  name: string;
  workspace: Record<string, unknown>;
}
export const makeProject = (
  name: string,
  workspace: BlocklyTypes.Workspace,
): Project => ({
  format: "ad-automator-studio",
  version: 1,
  name,
  workspace: Blockly.serialization.workspaces.save(workspace),
});
const record = (value: unknown): value is Record<string, any> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseProject(source: string): Project {
  if (source.length > 2_000_000)
    throw new Error(t("The file is too large: the limit is 2 MB."));
  let data: unknown;
  try {
    data = JSON.parse(source);
  } catch {
    throw new Error(t("invalid JSON"));
  }
  if (
    !record(data) ||
    data.format !== "ad-automator-studio" ||
    data.version !== 1
  )
    throw new Error(
      t(
        "This is not an Automator Studio version 1 project. Open a project JSON file rather than script text.",
      ),
    );
  if (
    typeof data.name !== "string" ||
    !data.name.trim() ||
    data.name.length > 100
  )
    throw new Error(t("Invalid project name."));
  if (
    !record(data.workspace) ||
    !record(data.workspace.blocks) ||
    !Array.isArray(data.workspace.blocks.blocks)
  )
    throw new Error(t("The file contains no workspace."));
  let count = 0;
  const ids = new Set<string>();
  function cleanBlock(value: unknown, depth: number): Record<string, unknown> {
    if (++count > 500 || depth > 80)
      throw new Error(
        t("The project has too many blocks or too much nesting."),
      );
    if (!record(value) || !types.includes(value.type))
      throw new Error(t("The project contains an unknown block type."));
    const out: Record<string, any> = {
      type: value.type,
      id: Blockly.utils.idGenerator.genUid(),
    };
    if (typeof value.id === "string" && value.id.length <= 100) {
      if (ids.has(value.id))
        throw new Error(t("The project contains duplicate block IDs."));
      ids.add(value.id);
      out.id = value.id;
    }
    for (const key of ["x", "y"])
      if (
        typeof value[key] === "number" &&
        Number.isFinite(value[key]) &&
        Math.abs(value[key]) < 100000
      )
        out[key] = value[key];
    if (record(value.fields)) {
      out.fields = Object.create(null);
      for (const [key, field] of Object.entries(value.fields)) {
        if (
          !/^[A-Z_]+$/.test(key) ||
          !["string", "number", "boolean"].includes(typeof field) ||
          String(field).length > 10000
        )
          throw new Error(t("Invalid block parameters."));
        out.fields[key] = field;
      }
    }
    // Upgrade the original combined auto block without changing generated commands.
    if (out.type === "auto" && out.fields) {
      if (out.fields.MODE === "AMOUNT") {
        out.type = "auto_amount";
        delete out.fields.MODE;
      } else if (["ON", "OFF"].includes(out.fields.MODE)) {
        delete out.fields.VALUE;
      }
    }
    if (value.next !== undefined) {
      if (!record(value.next) || !record(value.next.block))
        throw new Error(t("The block chain is damaged."));
      out.next = { block: cleanBlock(value.next.block, depth) };
    }
    if (value.inputs !== undefined) {
      if (
        !record(value.inputs) ||
        Object.keys(value.inputs).some((key) => key !== "BODY")
      )
        throw new Error(t("Invalid block nesting."));
      if (value.inputs.BODY) {
        if (
          !["if", "while", "until"].includes(value.type) ||
          !record(value.inputs.BODY) ||
          !record(value.inputs.BODY.block)
        )
          throw new Error(t("Invalid condition or loop body."));
        out.inputs = {
          BODY: { block: cleanBlock(value.inputs.BODY.block, depth + 1) },
        };
      }
    }
    return out;
  }
  const workspace = {
    blocks: {
      languageVersion: 0,
      blocks: data.workspace.blocks.blocks.map((b: unknown) =>
        cleanBlock(b, 0),
      ),
    },
  };
  const scratch = new Blockly.Workspace();
  try {
    Blockly.serialization.workspaces.load(workspace, scratch);
    if (
      scratch.getAllBlocks(false).filter((b) => b.type === "start").length !==
        1 ||
      !scratch.getTopBlocks(false).some((b) => b.type === "start")
    )
      throw new Error(t("The project needs one root “Script start” block."));
    // Verify fields before loading into the live workspace. Dropdowns otherwise silently replace invalid values.
    function verify(raw: Record<string, any>) {
      const block = raw.id ? scratch.getBlockById(raw.id) : null;
      if (block && raw.fields)
        for (const [name, value] of Object.entries(raw.fields)) {
          const field = block.getField(name);
          if (
            !field ||
            String(field.getValue()).toUpperCase() !==
              String(value).toUpperCase()
          )
            throw new Error(t("Invalid value for field {name}.", { name }));
        }
      if (raw.next) verify(raw.next.block);
      if (raw.inputs?.BODY) verify(raw.inputs.BODY.block);
    }
    workspace.blocks.blocks.forEach(verify);
    return {
      format: "ad-automator-studio",
      version: 1,
      name: data.name.trim(),
      workspace,
    };
  } finally {
    scratch.dispose();
  }
}

type BlockState = {
  type: string;
  fields?: Record<string, string>;
  next?: { block: BlockState };
  inputs?: Record<string, { block: BlockState }>;
  x?: number;
  y?: number;
};
const chain = (blocks: BlockState[]): BlockState =>
  blocks.reduceRight<BlockState | undefined>(
    (next, block) => ({ ...block, ...(next ? { next: { block: next } } : {}) }),
    undefined,
  )!;
const block = (type: string, fields?: Record<string, string>): BlockState => ({
  type,
  fields,
});
export function example(key: string): Project {
  let name = t("New script");
  let blocks: BlockState[] = [];
  if (key === "starter") {
    name = t("First Eternity");
    blocks = [
      block("comment", {
        TEXT: t("Example: wait for the reward and perform Eternity"),
      }),
      block("auto", { LAYER: "INFINITY", MODE: "ON" }),
      block("wait", { RESOURCE: "PENDING EP", OP: ">=", VALUE: "1e100" }),
      block("prestige", {
        LAYER: "ETERNITY",
        NOWAIT: "FALSE",
        RESPEC: "FALSE",
      }),
      block("notify", { TEXT: t("Eternity complete") }),
    ];
  } else if (key === "loop") {
    name = t("Eternity loop");
    blocks = [
      block("comment", {
        TEXT: t(
          "Repeat Eternity to accumulate EP; adjust thresholds to your save",
        ),
      }),
      {
        type: "until",
        fields: { RESOURCE: "EP", OP: ">=", VALUE: "1e1000" },
        inputs: {
          BODY: {
            block: chain([
              block("wait", {
                RESOURCE: "PENDING EP",
                OP: ">=",
                VALUE: "1e100",
              }),
              block("prestige", {
                LAYER: "ETERNITY",
                NOWAIT: "FALSE",
                RESPEC: "FALSE",
              }),
            ]),
          },
        },
      },
      block("notify", { TEXT: t("Target reached") }),
      block("stop"),
    ];
  } else if (key === "dilation") {
    name = t("Dilation run");
    blocks = [
      block("comment", {
        TEXT: t("Preset 1 must contain the studies required for Dilation"),
      }),
      block("load", { SLOT: "1", NOWAIT: "FALSE" }),
      block("unlock", { TARGET: "DILATION", NOWAIT: "FALSE" }),
      block("dilation"),
      block("wait", { RESOURCE: "PENDING TP", OP: ">=", VALUE: "1e6" }),
      block("prestige", {
        LAYER: "ETERNITY",
        NOWAIT: "FALSE",
        RESPEC: "FALSE",
      }),
    ];
  }
  return {
    format: "ad-automator-studio",
    version: 1,
    name,
    workspace: {
      blocks: {
        languageVersion: 0,
        blocks: [{ ...chain([block("start"), ...blocks]), x: 45, y: 40 }],
      },
    },
  };
}

// The same Command tree is used by the text parser and the block compiler.
export function commandsToProject(commands: Command[], name: string): Project {
  function convert(node: Command): BlockState {
    return {
      type: node.type,
      fields: node.fields,
      ...(node.children?.length
        ? { inputs: { BODY: { block: chain(node.children.map(convert)) } } }
        : {}),
    };
  }
  return parseProject(
    JSON.stringify({
      format: "ad-automator-studio",
      version: 1,
      name: name.trim().slice(0, 100) || t("Imported script"),
      workspace: {
        blocks: {
          languageVersion: 0,
          blocks: [
            {
              ...chain([block("start"), ...commands.map(convert)]),
              x: 45,
              y: 40,
            },
          ],
        },
      },
    }),
  );
}
export function scriptToProject(
  source: string,
  name = t("Imported script"),
): Project {
  return commandsToProject(parseScript(source), name);
}
