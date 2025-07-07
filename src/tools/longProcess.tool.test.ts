import { expect, test, vi } from 'vitest';
import { longProcessTool, doWorkSpecific } from './longProcess.tool.js';
import { enqueueTask } from '../utils/asyncToolHelper.js';
import { createMockContext } from './testUtils.js';

vi.mock('../utils/asyncToolHelper.js', () => ({
  enqueueTask: vi.fn(),
}));

const mockContext = {
  ...createMockContext(),
  reportProgress: vi.fn(),
  streamContent: vi.fn(),
};

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
  await longProcessTool.execute(args, mockContext);
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
  const result = await doWorkSpecific(params, mockContext.session, 'test-task-id');
  expect(result.calcRes).toBe(15);
});
