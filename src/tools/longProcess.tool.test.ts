
import { expect, test, vi } from 'vitest';
import { longProcessTool, doWorkSpecific } from './longProcess.tool';
import { enqueueTask } from '../utils/asyncToolHelper.js';
import { createMockContext } from './testUtils';

vi.mock('../utils/asyncToolHelper.js', () => ({
  enqueueTask: vi.fn(),
}));

const mockContext = createMockContext();

test('longProcessTool should enqueue a task', async () => {
  const args = {
    durationMs: 100,
    value1: 1,
    value2: 2,
    failTask: false,
    failOnInit: false,
    callbackUrl: undefined,
    streamIntervals: 3,
    userId: 'test-user',
  };
  await longProcessTool.execute(args, mockContext as any);
  expect(enqueueTask).toHaveBeenCalled();
});

test('doWorkSpecific should return the sum of two numbers', async () => {
  const params = {
    durationMs: 100,
    value1: 5,
    value2: 10,
    failTask: false,
    failOnInit: false,
    callbackUrl: undefined,
    streamIntervals: 3,
    userId: 'test-user',
  };
  const result = await doWorkSpecific(params, mockContext.session as any, 'test-task-id');
  expect(result.calcRes).toBe(15);
});
