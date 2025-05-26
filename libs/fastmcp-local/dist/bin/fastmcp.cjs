#!/usr/bin/env node
"use strict"; function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
// src/bin/fastmcp.ts
var _execa = require('execa');
var _yargs = require('yargs'); var _yargs2 = _interopRequireDefault(_yargs);
var _helpers = require('yargs/helpers');
await _yargs2.default.call(void 0, _helpers.hideBin.call(void 0, process.argv)).scriptName("fastmcp").command(
  "dev <file>",
  "Start a development server",
  (yargs2) => {
    return yargs2.positional("file", {
      demandOption: true,
      describe: "The path to the server file",
      type: "string"
    });
  },
  async (argv) => {
    try {
      await _execa.execa.call(void 0, {
        stderr: "inherit",
        stdin: "inherit",
        stdout: "inherit"
      })`npx @wong2/mcp-cli npx tsx ${argv.file}`;
    } catch (error) {
      console.error(
        "[FastMCP Error] Failed to start development server:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  }
).command(
  "inspect <file>",
  "Inspect a server file",
  (yargs2) => {
    return yargs2.positional("file", {
      demandOption: true,
      describe: "The path to the server file",
      type: "string"
    });
  },
  async (argv) => {
    try {
      await _execa.execa.call(void 0, {
        stderr: "inherit",
        stdout: "inherit"
      })`npx @modelcontextprotocol/inspector npx tsx ${argv.file}`;
    } catch (error) {
      console.error(
        "[FastMCP Error] Failed to inspect server:",
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  }
).help().parseAsync();
//# sourceMappingURL=fastmcp.cjs.map