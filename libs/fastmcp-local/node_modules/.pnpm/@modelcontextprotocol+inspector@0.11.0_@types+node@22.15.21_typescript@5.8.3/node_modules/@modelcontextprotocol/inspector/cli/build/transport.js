import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { getDefaultEnvironment, StdioClientTransport, } from "@modelcontextprotocol/sdk/client/stdio.js";
import { findActualExecutable } from "spawn-rx";
function createSSETransport(options) {
    const baseUrl = new URL(options.url ?? "");
    const sseUrl = new URL("/sse", baseUrl);
    return new SSEClientTransport(sseUrl);
}
function createStdioTransport(options) {
    let args = [];
    if (options.args !== undefined) {
        args = options.args;
    }
    const processEnv = {};
    for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
            processEnv[key] = value;
        }
    }
    const defaultEnv = getDefaultEnvironment();
    const env = {
        ...processEnv,
        ...defaultEnv,
    };
    const { cmd: actualCommand, args: actualArgs } = findActualExecutable(options.command ?? "", args);
    return new StdioClientTransport({
        command: actualCommand,
        args: actualArgs,
        env,
        stderr: "pipe",
    });
}
export function createTransport(options) {
    const { transportType } = options;
    try {
        if (transportType === "stdio") {
            return createStdioTransport(options);
        }
        if (transportType === "sse") {
            return createSSETransport(options);
        }
        throw new Error(`Unsupported transport type: ${transportType}`);
    }
    catch (error) {
        throw new Error(`Failed to create transport: ${error instanceof Error ? error.message : String(error)}`);
    }
}
