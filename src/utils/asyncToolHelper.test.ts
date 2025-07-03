import { expect, test, vi } from 'vitest';
import { enqueueTask } from './asyncToolHelper';
import { taskQueue } from '../queue.js';

vi.mock('../queue.js', () => ({
  taskQueue: {
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
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
      // Assuming DEFAULT_BULLMQ_JOB_OPTIONS are merged here, if not, they should be mocked or included.
    }
  );
});