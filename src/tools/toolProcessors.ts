import { debugContextTool } from './debugContext.tool.js';
import { longProcessTool } from './longProcess.tool.js';
import { synchronousExampleTool } from './synchronousExample.tool.js';

import type { AuthData, ToolContext } from '../types.js';

export type ToolProcessor = (
  args: unknown,
  context: ToolContext<AuthData>
) => Promise<string | void | object>;

export const toolProcessors: Record<string, ToolProcessor> = {
  [debugContextTool.name]: debugContextTool.execute,
  [longProcessTool.name]: longProcessTool.execute,
  [synchronousExampleTool.name]: synchronousExampleTool.execute,
};
