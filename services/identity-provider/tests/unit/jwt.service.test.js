const jwtService = require('../../src/services/jwt.service');

describe('JWT Service', () => {
  const mockPayload = {
    user_id: 1,
    student_id: 'STU12345',
    email: 'test@university.edu',
  };

  describe('generateAccessToken', () => {
    it('should generate a valid access token', () => {
      const token = jwtService.generateAccessToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should include correct payload in token', () => {
      const token = jwtService.generateAccessToken(mockPayload);
      const decoded = jwtService.decodeToken(token);
      
      expect(decoded.user_id).toBe(mockPayload.user_id);
      expect(decoded.student_id).toBe(mockPayload.student_id);
      expect(decoded.email).toBe(mockPayload.email);
      expect(decoded.type).toBe('access');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = jwtService.generateRefreshToken(mockPayload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should include correct type in token', () => {
      const token = jwtService.generateRefreshToken(mockPayload);
      const decoded = jwtService.decodeToken(token);
      
      expect(decoded.type).toBe('refresh');
      expect(decoded.user_id).toBe(mockPayload.user_id);
      expect(decoded.jti).toBeDefined(); // Unique identifier
    });

    it('should generate unique tokens', () => {
      const token1 = jwtService.generateRefreshToken(mockPayload);
      const token2 = jwtService.generateRefreshToken(mockPayload);
      
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = jwtService.generateAccessToken(mockPayload);
      const decoded = jwtService.verifyToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.user_id).toBe(mockPayload.user_id);
    });

    it('should throw error for invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => {
        jwtService.verifyToken(invalidToken);
      }).toThrow();
    });

    it('should throw error for tampered token', () => {
      const token = jwtService.generateAccessToken(mockPayload);
      const tamperedToken = token.slice(0, -5) + 'xxxxx';
      
      expect(() => {
        jwtService.verifyToken(tamperedToken);
      }).toThrow();
    });
  });

  describe('hashToken', () => {
    it('should hash a token consistently', () => {
      const token = 'test-token-123';
      const hash1 = jwtService.hashToken(token);
      const hash2 = jwtService.hashToken(token);
      
      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(token);
    });

    it('should generate different hashes for different tokens', () => {
      const token1 = 'test-token-123';
      const token2 = 'test-token-456';
      
      const hash1 = jwtService.hashToken(token1);
      const hash2 = jwtService.hashToken(token2);
      
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = jwtService.generateAccessToken(mockPayload);
      const decoded = jwtService.decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded.user_id).toBe(mockPayload.user_id);
    });

    it('should return null for invalid token', () => {
      const invalidToken = 'not-a-valid-token';
      const decoded = jwtService.decodeToken(invalidToken);
      
      expect(decoded).toBeNull();
    });
  });
});
