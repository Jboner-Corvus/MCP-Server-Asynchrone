import { expect, vi, test } from 'vitest';
import { debugContextTool } from './debugContext.tool.js';
import { createMockContext } from './testUtils.js';

const mockContext = {
  ...createMockContext(),
  reportProgress: vi.fn(),
  streamContent: vi.fn(),
};

test('debugContextTool should return a string with context information', async () => {
  const result = await debugContextTool.execute({}, mockContext);
  expect(result).toContain(`Rapport de l'Outil de Débogage de Contexte:`);
  expect(result).toContain('ID Applicatif: test-session-id');
});
