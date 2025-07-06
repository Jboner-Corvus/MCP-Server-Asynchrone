import { debugContextTool } from './debugContext.tool.js';
import { longProcessTool } from './longProcess.tool.js';
import { synchronousExampleTool } from './synchronousExample.tool.js';
import type { ToolContext } from '../types.js';

export type ToolProcessor = (...args: any[]) => Promise<unknown>;

export const toolProcessors: Record<string, ToolProcessor> = {
  [debugContextTool.name]: debugContextTool.execute,
  [longProcessTool.name]: longProcessTool.execute,
  [synchronousExampleTool.name]: synchronousExampleTool.execute,
};
