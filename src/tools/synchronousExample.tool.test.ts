import { expect, test } from 'vitest';
import { synchronousExampleTool } from './synchronousExample.tool';
import { createMockContext } from './testUtils';

const mockContext = createMockContext();

test('synchronousExampleTool should return a text content object', async () => {
  const args = {
    data: 'test-data',
    delayMs: 10,
    useClientLogger: false,
    userId: 'test-user',
  };
  const result = await synchronousExampleTool.execute(args, mockContext);
  expect(result.type).toBe('text');
  expect(result.text).toContain('PROCESSED: TEST-DATA');
});
