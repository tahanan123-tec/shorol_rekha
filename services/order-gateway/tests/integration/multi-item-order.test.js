const request = require('supertest');
const { expect } = require('chai');

/**
 * Integration tests for multi-item order functionality
 * Tests the fix for 503 Service Unavailable errors when ordering multiple items
 */

const API_URL = process.env.API_URL || 'http://localhost';
const TEST_USER = {
  email: 'test@iut-dhaka.edu',
  password: 'Test123!@#',
};

describe('Multi-Item Order Tests', () => {
  let authToken;
  let testOrderId;

  before(async function() {
    this.timeout(10000);
    
    // Login to get auth token
    try {
      const loginResponse = await request(API_URL)
        .post('/auth/login')
        .send(TEST_USER);
      
      if (loginResponse.status === 200 && loginResponse.body.data?.token) {
        authToken = loginResponse.body.data.token;
        console.log('✓ Authentication successful');
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Setup failed:', error.message);
      throw error;
    }
  });

  describe('Single Item Order', () => {
    it('should successfully create order with 1 item', async function() {
      this.timeout(15000);

      const orderData = {
        items: [
          { id: '1', quantity: 1 }
        ]
      };

      const response = await request(API_URL)
        .post('/api/order')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      console.log('Single item response:', response.status, response.body);

      expect(response.status).to.equal(202);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('order_id');
      expect(response.body.data.status).to.equal('PENDING');
      
      testOrderId = response.body.data.order_id;
    });
  });

  describe('Multi-Item Order (3 items)', () => {
    it('should successfully create order with 3 items', async function() {
      this.timeout(15000);

      const orderData = {
        items: [
          { id: '1', quantity: 1 },
          { id: '2', quantity: 2 },
          { id: '3', quantity: 1 }
        ]
      };

      const startTime = Date.now();
      
      const response = await request(API_URL)
        .post('/api/order')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      const duration = Date.now() - startTime;
      console.log(`3-item order response time: ${duration}ms`);
      console.log('Response:', response.status, response.body);

      expect(response.status).to.equal(202);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('order_id');
      expect(response.body.data.status).to.equal('PENDING');
      expect(duration).to.be.lessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Multi-Item Order (5 items)', () => {
    it('should successfully create order with 5 items', async function() {
      this.timeout(15000);

      const orderData = {
        items: [
          { id: '1', quantity: 1 },
          { id: '2', quantity: 1 },
          { id: '3', quantity: 1 },
          { id: '4', quantity: 1 },
          { id: '5', quantity: 1 }
        ]
      };

      const startTime = Date.now();
      
      const response = await request(API_URL)
        .post('/api/order')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      const duration = Date.now() - startTime;
      console.log(`5-item order response time: ${duration}ms`);
      console.log('Response:', response.status, response.body);

      expect(response.status).to.equal(202);
      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('order_id');
      expect(duration).to.be.lessThan(5000); // Should complete in under 5 seconds
    });
  });

  describe('Multi-Item Order with Insufficient Stock', () => {
    it('should fail with 409 when one item is out of stock', async function() {
      this.timeout(15000);

      const orderData = {
        items: [
          { id: '1', quantity: 1 },
          { id: '2', quantity: 9999 } // Intentionally high quantity
        ]
      };

      const response = await request(API_URL)
        .post('/api/order')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      console.log('Insufficient stock response:', response.status, response.body);

      expect(response.status).to.equal(409);
      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('stock');
    });
  });

  describe('Performance Test', () => {
    it('should handle 10 items in under 2 seconds', async function() {
      this.timeout(15000);

      const orderData = {
        items: Array.from({ length: 10 }, (_, i) => ({
          id: String((i % 5) + 1), // Cycle through items 1-5
          quantity: 1
        }))
      };

      const startTime = Date.now();
      
      const response = await request(API_URL)
        .post('/api/order')
        .set('Authorization', `Bearer ${authToken}`)
        .send(orderData);

      const duration = Date.now() - startTime;
      console.log(`10-item order response time: ${duration}ms`);
      console.log('Response:', response.status, response.body);

      expect(response.status).to.equal(202);
      expect(duration).to.be.lessThan(2000); // Should complete in under 2 seconds
    });
  });

  describe('Order Status Check', () => {
    it('should retrieve order status successfully', async function() {
      this.timeout(10000);

      if (!testOrderId) {
        this.skip();
      }

      const response = await request(API_URL)
        .get(`/api/order/status/${testOrderId}`)
        .set('Authorization', `Bearer ${authToken}`);

      console.log('Order status response:', response.status, response.body);

      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.data.order_id).to.equal(testOrderId);
    });
  });
});
