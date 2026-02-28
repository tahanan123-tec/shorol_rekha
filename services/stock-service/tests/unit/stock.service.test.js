const stockService = require('../../src/services/stock.service');
const { pool } = require('../../src/config/database');

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('../../src/services/queue.service');

describe('Stock Service - Unit Tests', () => {
  let mockClient;

  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    pool.connect = jest.fn().mockResolvedValue(mockClient);
    pool.query = jest.fn();
    jest.clearAllMocks();
  });

  describe('getStock', () => {
    it('should return stock information for an item', async () => {
      const mockStock = {
        item_id: 'item-001',
        item_name: 'Test Item',
        quantity: 100,
        reserved_quantity: 10,
        version: 1,
        price: '10.99',
        updated_at: new Date(),
      };

      pool.query.mockResolvedValue({ rows: [mockStock] });

      const result = await stockService.getStock('item-001');

      expect(result).toEqual({
        item_id: 'item-001',
        item_name: 'Test Item',
        quantity: 100,
        available_quantity: 90,
        reserved_quantity: 10,
        price: 10.99,
        version: 1,
        updated_at: mockStock.updated_at,
      });
    });

    it('should throw 404 error when item not found', async () => {
      pool.query.mockResolvedValue({ rows: [] });

      await expect(stockService.getStock('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
        message: 'Item not found',
      });
    });
  });

  describe('checkStock', () => {
    it('should return available when sufficient stock exists', async () => {
      const mockStockData = [
        { item_id: 'item-001', item_name: 'Item 1', quantity: 100, reserved_quantity: 10 },
        { item_id: 'item-002', item_name: 'Item 2', quantity: 50, reserved_quantity: 5 },
      ];

      pool.query.mockResolvedValue({ rows: mockStockData });

      const items = [
        { id: 'item-001', quantity: 50 },
        { id: 'item-002', quantity: 20 },
      ];

      const result = await stockService.checkStock(items);

      expect(result.available).toBe(true);
      expect(result.unavailable).toBeUndefined();
    });

    it('should return unavailable when insufficient stock', async () => {
      const mockStockData = [
        { item_id: 'item-001', item_name: 'Item 1', quantity: 100, reserved_quantity: 90 },
      ];

      pool.query.mockResolvedValue({ rows: mockStockData });

      const items = [{ id: 'item-001', quantity: 50 }];

      const result = await stockService.checkStock(items);

      expect(result.available).toBe(false);
      expect(result.unavailable).toHaveLength(1);
      expect(result.unavailable[0]).toMatchObject({
        id: 'item-001',
        available: 10,
        requested: 50,
      });
    });
  });

  describe('reserveStock - Optimistic Locking', () => {
    it('should reserve stock successfully on first attempt', async () => {
      const mockStock = {
        id: 1,
        item_id: 'item-001',
        item_name: 'Test Item',
        quantity: 100,
        reserved_quantity: 10,
        version: 1,
        price: '10.99',
      };

      const mockUpdatedStock = {
        ...mockStock,
        reserved_quantity: 20,
        version: 2,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockStock] }) // SELECT FOR UPDATE
        .mockResolvedValueOnce({ rows: [mockUpdatedStock] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }) // INSERT transaction
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const items = [{ id: 'item-001', quantity: 10 }];
      const result = await stockService.reserveStock('order-123', items);

      expect(result.success).toBe(true);
      expect(result.reservations).toHaveLength(1);
      expect(result.reservations[0].quantity_reserved).toBe(10);
    });

    it('should retry on optimistic lock conflict', async () => {
      const mockStock = {
        id: 1,
        item_id: 'item-001',
        item_name: 'Test Item',
        quantity: 100,
        reserved_quantity: 10,
        version: 1,
        price: '10.99',
      };

      // First attempt - version conflict
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockStock] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }) // UPDATE fails (version mismatch)
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      // Second attempt - success
      const mockUpdatedStock = { ...mockStock, reserved_quantity: 20, version: 2 };
      pool.connect
        .mockResolvedValueOnce(mockClient) // First attempt
        .mockResolvedValueOnce({
          query: jest.fn()
            .mockResolvedValueOnce({ rows: [] }) // BEGIN
            .mockResolvedValueOnce({ rows: [mockStock] }) // SELECT
            .mockResolvedValueOnce({ rows: [mockUpdatedStock] }) // UPDATE success
            .mockResolvedValueOnce({ rows: [] }) // INSERT
            .mockResolvedValueOnce({ rows: [] }), // COMMIT
          release: jest.fn(),
        });

      const items = [{ id: 'item-001', quantity: 10 }];
      const result = await stockService.reserveStock('order-123', items);

      expect(result.success).toBe(true);
    });

    it('should throw error when insufficient stock', async () => {
      const mockStock = {
        id: 1,
        item_id: 'item-001',
        item_name: 'Test Item',
        quantity: 100,
        reserved_quantity: 95,
        version: 1,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockStock] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const items = [{ id: 'item-001', quantity: 10 }];

      await expect(stockService.reserveStock('order-123', items)).rejects.toMatchObject({
        statusCode: 409,
        message: 'Insufficient stock',
      });
    });
  });

  describe('decrementStock - Idempotency', () => {
    it('should decrement stock successfully', async () => {
      const mockStock = {
        id: 1,
        item_id: 'item-001',
        item_name: 'Test Item',
        quantity: 100,
        reserved_quantity: 10,
        version: 1,
      };

      const mockUpdatedStock = {
        ...mockStock,
        quantity: 90,
        reserved_quantity: 0,
        version: 2,
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // Check existing transaction
        .mockResolvedValueOnce({ rows: [mockStock] }) // SELECT
        .mockResolvedValueOnce({ rows: [mockUpdatedStock] }) // UPDATE
        .mockResolvedValueOnce({ rows: [] }) // INSERT transaction
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      const items = [{ id: 'item-001', quantity: 10 }];
      const result = await stockService.decrementStock('order-123', items, 'txn-123');

      expect(result.success).toBe(true);
      expect(result.decrements).toHaveLength(1);
    });

    it('should be idempotent - return success if already processed', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // Check existing - found
        .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

      const items = [{ id: 'item-001', quantity: 10 }];
      const result = await stockService.decrementStock('order-123', items, 'txn-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Transaction already processed');
    });
  });
});
