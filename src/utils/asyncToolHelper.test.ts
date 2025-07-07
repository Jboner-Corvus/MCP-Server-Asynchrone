import { expect, test, vi } from 'vitest';
import { enqueueTask } from './asyncToolHelper.js';
import { taskQueue } from '../queue.js';

vi.mock('../queue.js', () => ({
  taskQueue: {
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
  },
}));

vi.mock('../logger.js', () => ({
  default: {
    child: vi.fn(() => ({
      info: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

test('enqueueTask should add a task to the queue', async () => {
  const mockAuthData = {
    id: 'test-auth-id',
    type: 'Bearer',
    authenticatedAt: Date.now(),
    clientIp: '127.0.0.1',
    appAuthId: 'test-app-auth-id',
    n8nSessionId: 'test-n8n-session-id',
    userId: 'test-user-id',
  };

  const toolName = 'test-tool';
  const params = { data: 'test' };
  const taskId = 'test-task-id';
  const cbUrl = undefined;

  await enqueueTask({ toolName, params, auth: mockAuthData, taskId, cbUrl });

  expect(taskQueue.add).toHaveBeenCalledWith(
    toolName,
    {
      toolName,
      params,
      auth: mockAuthData,
      taskId,
      cbUrl,
    },
    {
      jobId: taskId,
    }
  );
});
