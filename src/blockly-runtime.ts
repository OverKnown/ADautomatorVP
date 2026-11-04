import * as Core from "blockly/core";

// Blockly exposes named ESM exports in browsers and a CommonJS default in Node.
const Blockly = (Reflect.get(Core, "default") ?? Core) as typeof Core;
export default Blockly;
