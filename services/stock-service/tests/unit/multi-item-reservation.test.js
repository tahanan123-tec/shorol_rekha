const { expect } = require('chai');
const sinon = require('sinon');
const stockService = require('../../src/services/stock.service');
const { pool } = require('../../src/config/database');

/**
 * Unit tests for multi-item stock reservation
 * Tests the batch query optimization that fixes the 503 error
 */

describe('Stock Service - Multi-Item Reservation', () => {
  let clientStub;
  let queryStub;
  let poolConnectStub;

  beforeEach(() => {
    // Create stubs for database operations
    queryStub = sinon.stub();
    clientStub = {
      query: queryStub,
      release: sinon.stub(),
    };
    poolConnectStub = sinon.stub(pool, 'connect').resolves(clientStub);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('reserveStock - Batch Query Optimization', () => {
    it('should use single batch query for multiple items', async () => {
      const orderId = 'TEST-ORDER-001';
      const items = [
        { id: '1', quantity: 2 },
        { id: '2', quantity: 1 },
        { id: '3', quantity: 3 }
      ];

      // Mock BEGIN transaction
      queryStub.onCall(0).resolves();

      // Mock batch SELECT FOR UPDATE (single query for all items)
      queryStub.onCall(1).resolves({
        rows: [
          { id: 1, item_id: '1', item_name: 'Item 1', quantity: 10, reserved_quantity: 0, version: 1, price: 10.00 },
          { id: 2, item_id: '2', item_name: 'Item 2', quantity: 20, reserved_quantity: 0, version: 1, price: 15.00 },
          { id: 3, item_id: '3', item_name: 'Item 3', quantity: 30, reserved_quantity: 0, version: 1, price: 20.00 }
        ]
      });

      // Mock UPDATE queries (one per item)
      queryStub.onCall(2).resolves({
        rows: [{ id: 1, item_id: '1', item_name: 'Item 1', quantity: 10, reserved_quantity: 2, version: 2 }]
      });
      queryStub.onCall(3).resolves(); // INSERT transaction

      queryStub.onCall(4).resolves({
        rows: [{ id: 2, item_id: '2', item_name: 'Item 2', quantity: 20, reserved_quantity: 1, version: 2 }]
      });
      queryStub.onCall(5).resolves(); // INSERT transaction

      queryStub.onCall(6).resolves({
        rows: [{ id: 3, item_id: '3', item_name: 'Item 3', quantity: 30, reserved_quantity: 3, version: 2 }]
      });
      queryStub.onCall(7).resolves(); // INSERT transaction

      // Mock COMMIT
      queryStub.onCall(8).resolves();

      const result = await stockService.reserveStock(orderId, items);

      // Verify single batch query was used
      const selectQuery = queryStub.getCall(1);
      expect(selectQuery.args[0]).to.include('ANY($1)');
      expect(selectQuery.args[1]).to.deep.equal([['1', '2', '3']]);

      // Verify result
      expect(result.success).to.be.true;
      expect(result.reservations).to.have.lengthOf(3);
    });

    it('should fail entire order if one item has insufficient stock', async () => {
      const orderId = 'TEST-ORDER-002';
      const items = [
        { id: '1', quantity: 2 },
        { id: '2', quantity: 999 } // Insufficient stock
      ];

      // Mock BEGIN
      queryStub.onCall(0).resolves();

      // Mock batch SELECT
      queryStub.onCall(1).resolves({
        rows: [
          { id: 1, item_id: '1', item_name: 'Item 1', quantity: 10, reserved_quantity: 0, version: 1, price: 10.00 },
          { id: 2, item_id: '2', item_name: 'Item 2', quantity: 5, reserved_quantity: 0, version: 1, price: 15.00 }
        ]
      });

      // Mock ROLLBACK
      queryStub.onCall(2).resolves();

      try {
        await stockService.reserveStock(orderId, items);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).to.equal(409);
        expect(error.message).to.include('Insufficient stock');
        expect(error.details).to.be.an('array');
        expect(error.details[0].item_id).to.equal('2');
      }

      // Verify ROLLBACK was called
      expect(queryStub.getCall(2).args[0]).to.equal('ROLLBACK');
    });

    it('should handle item not found error', async () => {
      const orderId = 'TEST-ORDER-003';
      const items = [
        { id: '1', quantity: 2 },
        { id: '999', quantity: 1 } // Non-existent item
      ];

      // Mock BEGIN
      queryStub.onCall(0).resolves();

      // Mock batch SELECT - only returns item 1
      queryStub.onCall(1).resolves({
        rows: [
          { id: 1, item_id: '1', item_name: 'Item 1', quantity: 10, reserved_quantity: 0, version: 1, price: 10.00 }
        ]
      });

      // Mock ROLLBACK
      queryStub.onCall(2).resolves();

      try {
        await stockService.reserveStock(orderId, items);
        expect.fail('Should have thrown error');
      } catch (error) {
        expect(error.statusCode).to.equal(404);
        expect(error.message).to.include('Item 999 not found');
      }
    });
  });

  describe('checkStock - Batch Query', () => {
    it('should check multiple items in single query', async () => {
      const items = [
        { id: '1', quantity: 2 },
        { id: '2', quantity: 1 },
        { id: '3', quantity: 3 }
      ];

      // Mock batch query
      sinon.stub(pool, 'query').resolves({
        rows: [
          { item_id: '1', item_name: 'Item 1', quantity: 10, reserved_quantity: 0 },
          { item_id: '2', item_name: 'Item 2', quantity: 20, reserved_quantity: 0 },
          { item_id: '3', item_name: 'Item 3', quantity: 30, reserved_quantity: 0 }
        ]
      });

      const result = await stockService.checkStock(items);

      expect(result.available).to.be.true;
      expect(result.items).to.have.lengthOf(3);

      // Verify batch query was used
      const queryCall = pool.query.getCall(0);
      expect(queryCall.args[0]).to.include('ANY($1)');
    });

    it('should return unavailable items when stock insufficient', async () => {
      const items = [
        { id: '1', quantity: 2 },
        { id: '2', quantity: 999 }
      ];

      sinon.stub(pool, 'query').resolves({
        rows: [
          { item_id: '1', item_name: 'Item 1', quantity: 10, reserved_quantity: 0 },
          { item_id: '2', item_name: 'Item 2', quantity: 5, reserved_quantity: 0 }
        ]
      });

      const result = await stockService.checkStock(items);

      expect(result.available).to.be.false;
      expect(result.unavailable).to.have.lengthOf(1);
      expect(result.unavailable[0].id).to.equal('2');
      expect(result.unavailable[0].available).to.equal(5);
      expect(result.unavailable[0].requested).to.equal(999);
    });
  });

  describe('Performance Characteristics', () => {
    it('should complete 10-item reservation in reasonable time', async () => {
      const orderId = 'TEST-ORDER-PERF';
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: String(i + 1),
        quantity: 1
      }));

      // Mock BEGIN
      queryStub.onCall(0).resolves();

      // Mock batch SELECT (single query for all 10 items)
      const mockRows = items.map((item, i) => ({
        id: i + 1,
        item_id: item.id,
        item_name: `Item ${item.id}`,
        quantity: 100,
        reserved_quantity: 0,
        version: 1,
        price: 10.00
      }));

      queryStub.onCall(1).resolves({ rows: mockRows });

      // Mock UPDATE and INSERT for each item (20 queries total)
      for (let i = 0; i < 10; i++) {
        queryStub.onCall(2 + i * 2).resolves({
          rows: [{
            id: i + 1,
            item_id: String(i + 1),
            item_name: `Item ${i + 1}`,
            quantity: 100,
            reserved_quantity: 1,
            version: 2
          }]
        });
        queryStub.onCall(3 + i * 2).resolves(); // INSERT transaction
      }

      // Mock COMMIT
      queryStub.onCall(22).resolves();

      const startTime = Date.now();
      const result = await stockService.reserveStock(orderId, items);
      const duration = Date.now() - startTime;

      expect(result.success).to.be.true;
      expect(result.reservations).to.have.lengthOf(10);
      
      // With batch query, should be very fast (< 100ms in tests)
      console.log(`10-item reservation completed in ${duration}ms`);
      expect(duration).to.be.lessThan(1000);
    });
  });
});
