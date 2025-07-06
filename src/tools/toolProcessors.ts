import { debugContextTool } from './debugContext.tool.js';
import { longProcessTool } from './longProcess.tool.js';
import { synchronousExampleTool } from './synchronousExample.tool.js';

import type { Tool } from 'fastmcp';

export type ToolProcessor = Tool['execute'];

export const toolProcessors: Record<string, ToolProcessor> = {
  [debugContextTool.name]: debugContextTool.execute,
  [longProcessTool.name]: longProcessTool.execute,
  [synchronousExampleTool.name]: synchronousExampleTool.execute,
};
