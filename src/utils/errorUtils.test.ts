// src/utils/errorUtils.test.ts
import { getErrDetails, AppErrorBase } from './errorUtils'; // Adjust path as needed

describe('ErrorUtils', () => {
  describe('getErrDetails', () => {
    it('should handle a standard Error', () => {
      const error = new Error('Test error message');
      const details = getErrDetails(error);
      expect(details.message).toBe('Test error message');
      expect(details.name).toBe('Error');
      expect(details.type).toBe('GenericError');
    });

    it('should handle an AppErrorBase', () => {
      const error = new AppErrorBase('Custom app error', 'CustomType', { extra: 'data' });
      const details = getErrDetails(error);
      expect(details.message).toBe('Custom app error');
      expect(details.name).toBe('AppErrorBase');
      expect(details.type).toBe('CustomType');
      expect(details.details).toEqual({ extra: 'data' });
    });

    // Add more tests for other cases (strings, plain objects, etc.)
  });
});
