const express = require('express');
const axios = require('axios');
const config = require('../config/services');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /debug-order
 * Diagnostic endpoint to test stock service connectivity
 */
router.get('/debug-order', async (req, res) => {
  const diagnostics = {
    timestamp: new Date().toISOString(),
    stockServiceConfig: {
      url: config.stockService.url,
      timeout: config.stockService.timeout,
    },
    tests: {},
  };

  try {
    // Test 1: Health check
    try {
      const healthResponse = await axios.get(`${config.stockService.url}/health`, {
        timeout: 5000,
      });
      diagnostics.tests.health = {
        success: true,
        status: healthResponse.status,
        data: healthResponse.data,
      };
    } catch (error) {
      diagnostics.tests.health = {
        success: false,
        error: error.message,
        code: error.code,
        status: error.response?.status,
      };
    }

    // Test 2: Check stock endpoint
    try {
      const checkResponse = await axios.post(
        `${config.stockService.url}/api/internal/stock/check`,
        { items: [{ id: '1', quantity: 1 }] },
        {
          timeout: config.stockService.timeout,
          headers: {
            'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'dev-key',
          },
        }
      );
      diagnostics.tests.checkStock = {
        success: true,
        status: checkResponse.status,
        data: checkResponse.data,
      };
    } catch (error) {
      diagnostics.tests.checkStock = {
        success: false,
        error: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      };
    }

    // Test 3: Reserve stock endpoint
    try {
      const testOrderId = `TEST-${Date.now()}`;
      const reserveResponse = await axios.post(
        `${config.stockService.url}/api/internal/stock/reserve`,
        { 
          order_id: testOrderId, 
          items: [{ id: '1', quantity: 1 }] 
        },
        {
          timeout: config.stockService.timeout,
          headers: {
            'X-Internal-API-Key': process.env.INTERNAL_API_KEY || 'dev-key',
          },
        }
      );
      diagnostics.tests.reserveStock = {
        success: true,
        status: reserveResponse.status,
        data: reserveResponse.data,
      };
    } catch (error) {
      diagnostics.tests.reserveStock = {
        success: false,
        error: error.message,
        code: error.code,
        status: error.response?.status,
        data: error.response?.data,
      };
    }

    res.status(200).json({
      success: true,
      diagnostics,
    });
  } catch (error) {
    logger.error('Debug endpoint failed', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
      diagnostics,
    });
  }
});

module.exports = router;
