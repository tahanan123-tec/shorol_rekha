import { AlertCircle, CheckCircle, XCircle, Zap } from 'lucide-react';
import { HealthStatus } from '@/lib/api';
import { useEffect, useState } from 'react';

interface ServiceHealthCardProps {
  health?: HealthStatus;
  latency?: number;
  requestRate?: number;
  errorRate?: number;
  onKill?: () => void;
  chaosMode?: boolean;
}

export const ServiceHealthCard = ({
  health,
  latency,
  requestRate,
  errorRate,
  onKill,
  chaosMode = false,
}: ServiceHealthCardProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  if (!health) {
    return (
      <div className="rounded-lg border-2 p-4 bg-gray-100 border-gray-300 text-gray-800">
        <div className="text-sm font-semibold">No health data available</div>
      </div>
    );
  }

  const status = health.status ?? 'unknown';
  const isHealthy = status === 'healthy';
  const isUnknown = status === 'unknown';

  const statusColor = isHealthy
    ? 'bg-green-100 border-green-300 text-green-800'
    : isUnknown
    ? 'bg-gray-100 border-gray-300 text-gray-800'
    : 'bg-red-100 border-red-300 text-red-800';

  const StatusIcon = isHealthy ? CheckCircle : isUnknown ? AlertCircle : XCircle;

  const formattedServiceName = health.service
    ? health.service
        .split('-')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ')
    : 'Unknown Service';

  const formattedTime = mounted && health.timestamp
    ? new Date(health.timestamp).toLocaleTimeString()
    : 'N/A';

  return (
    <div className={`rounded-lg border-2 p-4 transition-all ${statusColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <StatusIcon className="w-5 h-5" />
          <h3 className="font-semibold text-sm">{formattedServiceName}</h3>
        </div>

        {chaosMode && isHealthy && onKill && (
          <button
            onClick={onKill}
            className="p-1 hover:bg-red-200 rounded transition-colors"
            title="Kill service (Chaos Mode)"
          >
            <Zap className="w-4 h-4 text-red-600" />
          </button>
        )}
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="opacity-75">Status:</span>
          <span className="font-medium uppercase">{status}</span>
        </div>

        <div className="flex justify-between">
          <span className="opacity-75">Response:</span>
          <span className="font-medium">
            {health.responseTime ?? 0}ms
          </span>
        </div>

        {latency !== undefined && (
          <div className="flex justify-between">
            <span className="opacity-75">Avg Latency:</span>
            <span className="font-medium">{latency.toFixed(2)}ms</span>
          </div>
        )}

        {requestRate !== undefined && (
          <div className="flex justify-between">
            <span className="opacity-75">Req/sec:</span>
            <span className="font-medium">
              {requestRate.toFixed(2)}
            </span>
          </div>
        )}

        {errorRate !== undefined && errorRate > 0 && (
          <div className="flex justify-between">
            <span className="opacity-75">Error Rate:</span>
            <span className="font-medium text-red-600">
              {errorRate.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-current opacity-50">
        <div className="text-xs" suppressHydrationWarning>Last check: {formattedTime}</div>
      </div>
    </div>
  );
};