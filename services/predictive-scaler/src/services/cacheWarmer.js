const axios = require('axios');
const Redis = require('redis');
const logger = require('../utils/logger');

class CacheWarmer {
  constructor() {
    this.redisClient = Redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });
    
    this.redisClient.on('error', (err) => logger.error('Redis error:', err));
    this.redisClient.connect();

    this.services = {
      orderGateway: process.env.ORDER_GATEWAY_URL || 'http://order-gateway-service:3002',
      stockService: process.env.STOCK_SERVICE_URL || 'http://stock-service:3003',
    };
  }

  // Warm up all caches
  async warmupAll() {
    try {
      logger.info('Starting cache warm-up...');

      const results = await Promise.allSettled([
        this.warmupMenuCache(),
        this.warmupStockCache(),
        this.warmupPopularItems(),
      ]);

      const summary = {
        menu: results[0].status === 'fulfilled' ? results[0].value : { error: results[0].reason },
        stock: results[1].status === 'fulfilled' ? results[1].value : { error: results[1].reason },
        popular: results[2].status === 'fulfilled' ? results[2].value : { error: results[2].reason },
        timestamp: new Date().toISOString(),
      };

      logger.info('Cache warm-up completed:', summary);
      return summary;
    } catch (error) {
      logger.error('Error in cache warm-up:', error);
      throw error;
    }
  }

  // Warm up menu cache
  async warmupMenuCache() {
    try {
      logger.info('Warming up menu cache...');

      // Fetch menu from order gateway
      const response = await axios.get(`${this.services.orderGateway}/api/menu`, {
        timeout: 10000,
      });

      const menu = response.data;

      // Cache menu items
      const cacheKey = 'menu:all';
      await this.redisClient.setEx(
        cacheKey,
        300, // 5 minutes TTL
        JSON.stringify(menu)
      );

      // Cache individual items
      if (menu.items && Array.isArray(menu.items)) {
        for (const item of menu.items) {
          const itemKey = `menu:item:${item.id}`;
          await this.redisClient.setEx(
            itemKey,
            300,
            JSON.stringify(item)
          );
        }
      }

      logger.info(`Menu cache warmed up: ${menu.items?.length || 0} items`);
      
      return {
        status: 'success',
        itemsCount: menu.items?.length || 0,
      };
    } catch (error) {
      logger.error('Error warming up menu cache:', error);
      return {
        status: 'failed',
        error: error.message,
      };
    }
  }

  // Warm up stock cache
  async warmupStockCache() {
    try {
      logger.info('Warming up stock cache...');

      // Fetch stock levels
      const response = await axios.get(`${this.services.stockService}/api/stock`, {
        timeout: 10000,
      });

      const stockData = response.data;

      // Cache stock levels
      if (stockData.items && Array.isArray(stockData.items)) {
        for (const item of stockData.items) {
          const stockKey = `stock:${item.itemId}`;
          await this.redisClient.setEx(
            stockKey,
            30, // 30 seconds TTL
            JSON.stringify({
              available: item.available,
              reserved: item.reserved,
              lastUpdated: new Date().toISOString(),
            })
          );
        }
      }

      logger.info(`Stock cache warmed up: ${stockData.items?.length || 0} items`);
      
      return {
        status: 'success',
        itemsCount: stockData.items?.length || 0,
      };
    } catch (error) {
      logger.error('Error warming up stock cache:', error);
      return {
        status: 'failed',
        error: error.message,
      };
    }
  }

  // Warm up popular items cache
  async warmupPopularItems() {
    try {
      logger.info('Warming up popular items cache...');

      // Fetch popular items (most ordered)
      const response = await axios.get(
        `${this.services.orderGateway}/api/analytics/popular`,
        { timeout: 10000 }
      );

      const popularItems = response.data;

      // Cache popular items list
      const cacheKey = 'popular:items';
      await this.redisClient.setEx(
        cacheKey,
        600, // 10 minutes TTL
        JSON.stringify(popularItems)
      );

      // Pre-fetch and cache details for top 10 items
      if (popularItems.items && Array.isArray(popularItems.items)) {
        const top10 = popularItems.items.slice(0, 10);
        
        for (const item of top10) {
          try {
            // Fetch item details
            const itemResponse = await axios.get(
              `${this.services.orderGateway}/api/menu/${item.id}`,
              { timeout: 5000 }
            );

            // Cache item details
            const itemKey = `menu:item:${item.id}:details`;
            await this.redisClient.setEx(
              itemKey,
              300,
              JSON.stringify(itemResponse.data)
            );
          } catch (err) {
            logger.warn(`Failed to cache item ${item.id}:`, err.message);
          }
        }
      }

      logger.info(`Popular items cache warmed up: ${popularItems.items?.length || 0} items`);
      
      return {
        status: 'success',
        itemsCount: popularItems.items?.length || 0,
      };
    } catch (error) {
      logger.error('Error warming up popular items cache:', error);
      return {
        status: 'failed',
        error: error.message,
      };
    }
  }

  // Warm up user sessions (for frequent users)
  async warmupUserSessions() {
    try {
      logger.info('Warming up user sessions...');

      // Get list of active users from last 7 days
      const activeUsersKey = 'analytics:active_users:7d';
      const activeUsers = await this.redisClient.get(activeUsersKey);

      if (!activeUsers) {
        logger.info('No active users data available');
        return { status: 'skipped', reason: 'No data' };
      }

      const users = JSON.parse(activeUsers);
      let warmedCount = 0;

      // Pre-load session data for top 100 users
      const top100 = users.slice(0, 100);
      
      for (const userId of top100) {
        try {
          // Fetch user preferences
          const response = await axios.get(
            `${this.services.orderGateway}/api/users/${userId}/preferences`,
            { timeout: 3000 }
          );

          // Cache user preferences
          const prefKey = `user:${userId}:preferences`;
          await this.redisClient.setEx(
            prefKey,
            3600, // 1 hour TTL
            JSON.stringify(response.data)
          );

          warmedCount++;
        } catch (err) {
          logger.warn(`Failed to cache user ${userId}:`, err.message);
        }
      }

      logger.info(`User sessions warmed up: ${warmedCount} users`);
      
      return {
        status: 'success',
        usersCount: warmedCount,
      };
    } catch (error) {
      logger.error('Error warming up user sessions:', error);
      return {
        status: 'failed',
        error: error.message,
      };
    }
  }

  // Clear all caches
  async clearAll() {
    try {
      logger.info('Clearing all caches...');
      await this.redisClient.flushDb();
      logger.info('All caches cleared');
      return { status: 'success' };
    } catch (error) {
      logger.error('Error clearing caches:', error);
      throw error;
    }
  }
}

module.exports = new CacheWarmer();
