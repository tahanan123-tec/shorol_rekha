const passwordService = require('../../src/services/password.service');

describe('Password Service', () => {
  describe('hashPassword', () => {
    it('should hash a password successfully', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should generate different hashes for the same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await passwordService.hashPassword(password);
      const hash2 = await passwordService.hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('comparePassword', () => {
    it('should return true for matching password', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);
      
      const isMatch = await passwordService.comparePassword(password, hash);
      expect(isMatch).toBe(true);
    });

    it('should return false for non-matching password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hash = await passwordService.hashPassword(password);
      
      const isMatch = await passwordService.comparePassword(wrongPassword, hash);
      expect(isMatch).toBe(false);
    });

    it('should be case sensitive', async () => {
      const password = 'TestPassword123!';
      const hash = await passwordService.hashPassword(password);
      
      const isMatch = await passwordService.comparePassword('testpassword123!', hash);
      expect(isMatch).toBe(false);
    });
  });
});
