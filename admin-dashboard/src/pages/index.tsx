import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import {
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Settings,
  Zap,
  Server,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { ServiceHealthCard } from '@/components/ServiceHealthCard';
import { MetricCard } from '@/components/MetricCard';
import { MetricsChart } from '@/components/MetricsChart';
import { ChaosPanel } from '@/components/ChaosPanel';
import { Navigation } from '@/components/Navigation';
import { useDashboardStore } from '@/lib/store';
import { useAdminAuth } from '@/lib/auth';
import {
  checkAllServicesHealth,
  getAverageLatency,
  getRequestRate,
  getOrderThroughput,
  getErrorRate,
  killService,
  SERVICES,
  HealthStatus,
} from '@/lib/api';

interface ServiceMetrics {
  [key: string]: {
    latency: number;
    requestRate: number;
    errorRate: number;
  };
}

interface TimeSeriesData {
  timestamp: number;
  latency: number;
  throughput: number;
  requests: number;
}

export default function AdminDashboard() {
  useAdminAuth(); // Protect this route
  
  const {
    healthStatuses,
    setHealthStatuses,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    chaosMode,
    setChaosMode,
  } = useDashboardStore();

  const [serviceMetrics, setServiceMetrics] = useState<ServiceMetrics>({});
  const [orderThroughput, setOrderThroughput] = useState<number>(0);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  // Fetch health status
  const fetchHealthStatus = async () => {
    try {
      const statuses = await checkAllServicesHealth();
      setHealthStatuses(statuses);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching health status:', error);
      toast.error('Failed to fetch health status');
    }
  };

  // Fetch metrics for all services
  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const metrics: ServiceMetrics = {};

      for (const service of SERVICES) {
        const [latency, requestRate, errorRate] = await Promise.all([
          getAverageLatency(service.name),
          getRequestRate(service.name),
          getErrorRate(service.name),
        ]);

        metrics[service.name] = { latency, requestRate, errorRate };
      }

      setServiceMetrics(metrics);

      // Fetch order throughput
      const throughput = await getOrderThroughput();
      setOrderThroughput(throughput);

      // Add to time series
      const avgLatency =
        Object.values(metrics).reduce((sum, m) => sum + m.latency, 0) /
        Object.values(metrics).length;
      const totalRequests = Object.values(metrics).reduce(
        (sum, m) => sum + m.requestRate,
        0
      );

      setTimeSeriesData((prev) => {
        const newData = [
          ...prev,
          {
            timestamp: Date.now(),
            latency: avgLatency,
            throughput,
            requests: totalRequests,
          },
        ];
        // Keep last 20 data points
        return newData.slice(-20);
      });
    } catch (error) {
      console.error('Error fetching metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all data
  const refreshData = async () => {
    await Promise.all([fetchHealthStatus(), fetchMetrics()]);
  };

  // Handle kill service
  const handleKillService = async (serviceName: string) => {
    if (!confirm(`Are you sure you want to kill ${serviceName}?`)) {
      return;
    }

    try {
      await killService(serviceName);
      toast.success(`Service ${serviceName} killed (simulated)`);
      
      // Update health status immediately
      setTimeout(() => {
        fetchHealthStatus();
      }, 1000);
    } catch (error) {
      toast.error(`Failed to kill service ${serviceName}`);
    }
  };

  // Mount effect
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!mounted) return;
    
    refreshData();

    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [mounted, autoRefresh, refreshInterval]);

  // Calculate overall health
  const healthyCount = healthStatuses.filter((h) => h.status === 'healthy').length;
  const totalServices = healthStatuses.length;
  const overallHealth = totalServices > 0 ? (healthyCount / totalServices) * 100 : 0;

  // Calculate average latency
  const avgLatency =
    Object.values(serviceMetrics).length > 0
      ? Object.values(serviceMetrics).reduce((sum, m) => sum + m.latency, 0) /
        Object.values(serviceMetrics).length
      : 0;

  // Calculate total request rate
  const totalRequestRate = Object.values(serviceMetrics).reduce(
    (sum, m) => sum + m.requestRate,
    0
  );

  // Calculate average error rate
  const avgErrorRate =
    Object.values(serviceMetrics).length > 0
      ? Object.values(serviceMetrics).reduce((sum, m) => sum + m.errorRate, 0) /
        Object.values(serviceMetrics).length
      : 0;

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-600" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-sm text-gray-500">System Health Monitoring</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Chaos Mode Toggle */}
              <button
                onClick={() => {
                  setChaosMode(!chaosMode);
                  toast(chaosMode ? 'Chaos mode disabled' : 'Chaos mode enabled ⚡', {
                    icon: chaosMode ? '🛡️' : '⚡',
                  });
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  chaosMode
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Zap className="w-4 h-4" />
                <span>Chaos Mode</span>
              </button>

              {/* Auto-refresh Toggle */}
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  autoRefresh
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                <span>Auto-refresh</span>
              </button>

              {/* Manual Refresh */}
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh now"
              >
                <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Last Update */}
          <div className="mt-2 text-xs text-gray-500">
            {lastUpdate ? (
              <>
                Last updated: {lastUpdate.toLocaleTimeString()} • Next refresh in{' '}
                {autoRefresh ? `${refreshInterval / 1000}s` : 'manual'}
              </>
            ) : (
              'Loading...'
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Overall Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="System Health"
            value={overallHealth.toFixed(0)}
            unit="%"
            icon={Server}
            color={overallHealth === 100 ? 'green' : overallHealth >= 80 ? 'yellow' : 'red'}
            trend={overallHealth === 100 ? 'up' : 'down'}
            trendValue={`${healthyCount}/${totalServices}`}
          />

          <MetricCard
            title="Avg Latency"
            value={avgLatency.toFixed(2)}
            unit="ms"
            icon={Clock}
            color="blue"
          />

          <MetricCard
            title="Order Throughput"
            value={orderThroughput.toFixed(1)}
            unit="/min"
            icon={TrendingUp}
            color="purple"
          />

          <MetricCard
            title="Request Rate"
            value={totalRequestRate.toFixed(1)}
            unit="/s"
            icon={Activity}
            color="green"
          />
        </div>

        {/* Service Health Grid */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Server className="w-5 h-5 mr-2" />
            Service Health Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {healthStatuses.map((health) => (
              <ServiceHealthCard
                key={health.service}
                health={health}
                latency={serviceMetrics[health.service]?.latency}
                requestRate={serviceMetrics[health.service]?.requestRate}
                errorRate={serviceMetrics[health.service]?.errorRate}
                onKill={() => handleKillService(health.service)}
                chaosMode={chaosMode}
              />
            ))}
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <MetricsChart
            data={timeSeriesData}
            title="Average Latency Over Time"
            dataKey="latency"
            color="#2563eb"
            unit="ms"
          />

          <MetricsChart
            data={timeSeriesData}
            title="Order Throughput Over Time"
            dataKey="throughput"
            color="#7c3aed"
            unit="/min"
          />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <MetricsChart
            data={timeSeriesData}
            title="Total Request Rate Over Time"
            dataKey="requests"
            color="#10b981"
            unit="/s"
          />
        </div>

        {/* Chaos Engineering Panel */}
        {chaosMode && (
          <div className="mb-8">
            <ChaosPanel
              services={SERVICES.map((s) => s.name)}
              onExperimentStart={() => {
                toast('Chaos experiment started - monitoring system resilience', {
                  icon: '⚡',
                });
                setTimeout(fetchHealthStatus, 2000);
              }}
            />
          </div>
        )}

        {/* Warnings */}
        {avgErrorRate > 0 && (
          <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">High Error Rate Detected</span>
            </div>
            <p className="text-sm text-red-700 mt-2">
              Average error rate across services: {avgErrorRate.toFixed(2)}%
            </p>
          </div>
        )}

        {healthyCount < totalServices && (
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 text-yellow-800">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-semibold">Service Degradation</span>
            </div>
            <p className="text-sm text-yellow-700 mt-2">
              {totalServices - healthyCount} service(s) are unhealthy or unreachable
            </p>
          </div>
        )}
      </main>
      <Toaster position="top-right" />
    </div>
  );
}
