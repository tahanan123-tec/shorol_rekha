const cacheService = require('../../src/services/cache.service');

// Mock Redis client
jest.mock('../../src/config/redis', () => ({
  getRedisClient: jest.fn(() => ({
    get: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
  })),
}));

const { getRedisClient } = require('../../src/config/redis');

describe('Cache Service', () => {
  let mockRedisClient;

  beforeEach(() => {
    mockRedisClient = getRedisClient();
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached data when available', async () => {
      const testData = { id: '123', quantity: 10 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test:key');

      expect(result).toEqual(testData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('test:key');
    });

    it('should return null when cache miss', async () => {
      mockRedisClient.get.mockResolvedValue(null);

      const result = await cacheService.get('test:key');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('test:key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should cache data with TTL', async () => {
      const testData = { id: '123', quantity: 10 };
      mockRedisClient.setEx.mockResolvedValue('OK');

      const result = await cacheService.set('test:key', testData, 60);

      expect(result).toBe(true);
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test:key',
        60,
        JSON.stringify(testData)
      );
    });

    it('should handle errors gracefully', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.set('test:key', {}, 60);

      expect(result).toBe(false);
    });
  });

  describe('getStock', () => {
    it('should get stock from cache', async () => {
      const stockData = { quantity: 50 };
      mockRedisClient.get.mockResolvedValue(JSON.stringify(stockData));

      const result = await cacheService.getStock('item-123');

      expect(result).toEqual(stockData);
      expect(mockRedisClient.get).toHaveBeenCalledWith('stock:item-123');
    });
  });

  describe('invalidateStock', () => {
    it('should delete multiple stock cache keys', async () => {
      mockRedisClient.del.mockResolvedValue(2);

      const result = await cacheService.invalidateStock(['item-1', 'item-2']);

      expect(result).toBe(true);
      expect(mockRedisClient.del).toHaveBeenCalledWith(['stock:item-1', 'stock:item-2']);
    });
  });
});
