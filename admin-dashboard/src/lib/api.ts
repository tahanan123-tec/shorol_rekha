import axios from 'axios';

const PROMETHEUS_URL = process.env.NEXT_PUBLIC_PROMETHEUS_URL || 'http://localhost:9090';
const SERVICES_BASE_URL = process.env.NEXT_PUBLIC_SERVICES_BASE_URL || 'http://localhost';

export interface ServiceConfig {
  name: string;
  displayName: string;
  port: number;
  healthEndpoint: string;
  metricsEndpoint: string;
}

export const SERVICES: ServiceConfig[] = [
  {
    name: 'identity-provider',
    displayName: 'Identity Provider',
    port: 3001,
    healthEndpoint: '/health',
    metricsEndpoint: '/metrics',
  },
  {
    name: 'order-gateway',
    displayName: 'Order Gateway',
    port: 3002,
    healthEndpoint: '/health',
    metricsEndpoint: '/metrics',
  },
  {
    name: 'stock-service',
    displayName: 'Stock Service',
    port: 3003,
    healthEndpoint: '/health',
    metricsEndpoint: '/metrics',
  },
  {
    name: 'kitchen-queue',
    displayName: 'Kitchen Queue',
    port: 3004,
    healthEndpoint: '/health',
    metricsEndpoint: '/metrics',
  },
  {
    name: 'notification-hub',
    displayName: 'Notification Hub',
    port: 3005,
    healthEndpoint: '/health',
    metricsEndpoint: '/metrics',
  },
];

const CHAOS_API_URL = process.env.NEXT_PUBLIC_CHAOS_API_URL || 'http://localhost:3006';

export interface HealthStatus {
  service: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  responseTime: number;
  timestamp: string;
  details?: any;
}

export interface MetricData {
  metric: Record<string, string>;
  value: [number, string];
}

export interface PrometheusResponse {
  status: string;
  data: {
    resultType: string;
    result: MetricData[];
  };
}

// Check health of a single service
export const checkServiceHealth = async (service: ServiceConfig): Promise<HealthStatus> => {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(
      `${SERVICES_BASE_URL}:${service.port}${service.healthEndpoint}`,
      { timeout: 5000 }
    );
    
    const responseTime = Date.now() - startTime;
    
    return {
      service: service.name,
      status: response.status === 200 ? 'healthy' : 'unhealthy',
      responseTime,
      timestamp: new Date().toISOString(),
      details: response.data,
    };
  } catch (error: any) {
    return {
      service: service.name,
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      details: { error: error.message },
    };
  }
};

// Check health of all services
export const checkAllServicesHealth = async (): Promise<HealthStatus[]> => {
  const healthChecks = SERVICES.map(service => checkServiceHealth(service));
  return Promise.all(healthChecks);
};

// Query Prometheus
export const queryPrometheus = async (query: string): Promise<PrometheusResponse> => {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query`, {
      params: { query },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error('Prometheus query error:', error);
    throw error;
  }
};

// Query Prometheus range
export const queryPrometheusRange = async (
  query: string,
  start: number,
  end: number,
  step: string = '15s'
): Promise<any> => {
  try {
    const response = await axios.get(`${PROMETHEUS_URL}/api/v1/query_range`, {
      params: { query, start, end, step },
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error('Prometheus range query error:', error);
    throw error;
  }
};

// Get average latency for a service
export const getAverageLatency = async (serviceName: string): Promise<number> => {
  try {
    const query = `rate(http_request_duration_seconds_sum{service="${serviceName}"}[5m]) / rate(http_request_duration_seconds_count{service="${serviceName}"}[5m])`;
    const result = await queryPrometheus(query);
    
    if (result.data.result.length > 0) {
      return parseFloat(result.data.result[0].value[1]) * 1000; // Convert to ms
    }
    return 0;
  } catch (error) {
    console.error(`Error getting latency for ${serviceName}:`, error);
    return 0;
  }
};

// Get request rate for a service
export const getRequestRate = async (serviceName: string): Promise<number> => {
  try {
    const query = `rate(http_requests_total{service="${serviceName}"}[1m])`;
    const result = await queryPrometheus(query);
    
    if (result.data.result.length > 0) {
      return parseFloat(result.data.result[0].value[1]);
    }
    return 0;
  } catch (error) {
    console.error(`Error getting request rate for ${serviceName}:`, error);
    return 0;
  }
};

// Get order throughput
export const getOrderThroughput = async (): Promise<number> => {
  try {
    const query = `rate(orders_created_total[1m])`;
    const result = await queryPrometheus(query);
    
    if (result.data.result.length > 0) {
      return parseFloat(result.data.result[0].value[1]) * 60; // Orders per minute
    }
    return 0;
  } catch (error) {
    console.error('Error getting order throughput:', error);
    return 0;
  }
};

// Get error rate for a service
export const getErrorRate = async (serviceName: string): Promise<number> => {
  try {
    const query = `rate(http_requests_total{service="${serviceName}",status=~"5.."}[5m]) / rate(http_requests_total{service="${serviceName}"}[5m]) * 100`;
    const result = await queryPrometheus(query);
    
    if (result.data.result.length > 0) {
      return parseFloat(result.data.result[0].value[1]);
    }
    return 0;
  } catch (error) {
    console.error(`Error getting error rate for ${serviceName}:`, error);
    return 0;
  }
};

// Chaos engineering: Kill a service (Docker container)
export const killService = async (serviceName: string, duration?: number): Promise<boolean> => {
  try {
    const response = await axios.post(`${CHAOS_API_URL}/chaos/kill-service`, {
      serviceName,
      duration,
    });
    return response.data.success;
  } catch (error) {
    console.error(`Error killing service ${serviceName}:`, error);
    return false;
  }
};

// Restart a service
export const restartService = async (serviceName: string): Promise<boolean> => {
  try {
    const response = await axios.post(`${CHAOS_API_URL}/chaos/restart-service`, {
      serviceName,
    });
    return response.data.success;
  } catch (error) {
    console.error(`Error restarting service ${serviceName}:`, error);
    return false;
  }
};

// Inject latency
export const injectLatency = async (
  serviceName: string,
  latencyMs: number,
  duration?: number
): Promise<boolean> => {
  try {
    const response = await axios.post(`${CHAOS_API_URL}/chaos/inject-latency`, {
      serviceName,
      latencyMs,
      duration,
    });
    return response.data.success;
  } catch (error) {
    console.error(`Error injecting latency to ${serviceName}:`, error);
    return false;
  }
};

// Simulate broker failure
export const simulateBrokerFailure = async (duration?: number): Promise<boolean> => {
  try {
    const response = await axios.post(`${CHAOS_API_URL}/chaos/simulate-broker-failure`, {
      duration,
    });
    return response.data.success;
  } catch (error) {
    console.error('Error simulating broker failure:', error);
    return false;
  }
};

// Get chaos status
export const getChaosStatus = async (): Promise<any> => {
  try {
    const response = await axios.get(`${CHAOS_API_URL}/chaos/status`);
    return response.data.data;
  } catch (error) {
    console.error('Error getting chaos status:', error);
    return { active: [], count: 0 };
  }
};

// Stop all chaos experiments
export const stopAllChaos = async (): Promise<boolean> => {
  try {
    const response = await axios.post(`${CHAOS_API_URL}/chaos/stop-all`);
    return response.data.success;
  } catch (error) {
    console.error('Error stopping chaos:', error);
    return false;
  }
};

export default {
  checkServiceHealth,
  checkAllServicesHealth,
  queryPrometheus,
  queryPrometheusRange,
  getAverageLatency,
  getRequestRate,
  getOrderThroughput,
  getErrorRate,
  killService,
  restartService,
  injectLatency,
  simulateBrokerFailure,
  getChaosStatus,
  stopAllChaos,
};
