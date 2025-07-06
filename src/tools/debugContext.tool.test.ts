import { expect, test } from 'vitest';
import { debugContextTool } from './debugContext.tool';
import { createMockContext } from './testUtils';

const mockContext = createMockContext();

test('debugContextTool should return a string with context information', async () => {
  const result = await debugContextTool.execute({}, mockContext);
  expect(result).toContain(`Rapport de l'Outil de Débogage de Contexte:`);
  expect(result).toContain('ID Applicatif: test-session-id');
});
