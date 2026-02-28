import { useState } from 'react';
import { Zap, AlertTriangle, Activity, Clock, X } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  killService,
  restartService,
  injectLatency,
  simulateBrokerFailure,
  getChaosStatus,
  stopAllChaos,
} from '@/lib/api';

interface ChaosExperiment {
  id: string;
  type: string;
  service: string;
  startTime: number;
  duration: number | null;
  elapsed: number;
  remaining: number | null;
  [key: string]: any;
}

interface ChaosPanelProps {
  services: string[];
  onExperimentStart?: () => void;
}

export const ChaosPanel = ({ services, onExperimentStart }: ChaosPanelProps) => {
  const [activeExperiments, setActiveExperiments] = useState<ChaosExperiment[]>([]);
  const [selectedService, setSelectedService] = useState<string>(services[0] || '');
  const [latencyMs, setLatencyMs] = useState<number>(1000);
  const [duration, setDuration] = useState<number>(30000);
  const [isLoading, setIsLoading] = useState(false);

  const refreshStatus = async () => {
    try {
      const status = await getChaosStatus();
      setActiveExperiments(status.active || []);
    } catch (error) {
      console.error('Error refreshing chaos status:', error);
    }
  };

  const handleKillService = async () => {
    if (!confirm(`Are you sure you want to kill ${selectedService}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await killService(selectedService, duration);
      if (success) {
        toast.success(`Service ${selectedService} killed`);
        onExperimentStart?.();
        await refreshStatus();
      } else {
        toast.error('Failed to kill service');
      }
    } catch (error) {
      toast.error('Error killing service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestartService = async () => {
    setIsLoading(true);
    try {
      const success = await restartService(selectedService);
      if (success) {
        toast.success(`Service ${selectedService} restarted`);
        await refreshStatus();
      } else {
        toast.error('Failed to restart service');
      }
    } catch (error) {
      toast.error('Error restarting service');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInjectLatency = async () => {
    if (!confirm(`Inject ${latencyMs}ms latency to ${selectedService}?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await injectLatency(selectedService, latencyMs, duration);
      if (success) {
        toast.success(`Latency ${latencyMs}ms injected to ${selectedService}`);
        onExperimentStart?.();
        await refreshStatus();
      } else {
        toast.error('Failed to inject latency');
      }
    } catch (error) {
      toast.error('Error injecting latency');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrokerFailure = async () => {
    if (!confirm('Simulate message broker failure? This will affect all services.')) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await simulateBrokerFailure(duration);
      if (success) {
        toast.success('Message broker failure simulated');
        onExperimentStart?.();
        await refreshStatus();
      } else {
        toast.error('Failed to simulate broker failure');
      }
    } catch (error) {
      toast.error('Error simulating broker failure');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopAll = async () => {
    if (!confirm('Stop all active chaos experiments?')) {
      return;
    }

    setIsLoading(true);
    try {
      const success = await stopAllChaos();
      if (success) {
        toast.success('All chaos experiments stopped');
        await refreshStatus();
      } else {
        toast.error('Failed to stop chaos experiments');
      }
    } catch (error) {
      toast.error('Error stopping chaos');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Zap className="w-6 h-6 text-red-600" />
          <h2 className="text-xl font-bold text-gray-900">Chaos Engineering</h2>
        </div>
        {activeExperiments.length > 0 && (
          <button
            onClick={handleStopAll}
            disabled={isLoading}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
            <span>Stop All</span>
          </button>
        )}
      </div>

      {/* Active Experiments */}
      {activeExperiments.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-900">
              Active Experiments ({activeExperiments.length})
            </h3>
          </div>
          <div className="space-y-2">
            {activeExperiments.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between text-sm bg-white p-3 rounded"
              >
                <div>
                  <span className="font-medium">{exp.type}</span>
                  <span className="text-gray-600 ml-2">on {exp.service}</span>
                </div>
                <div className="flex items-center space-x-4 text-gray-600">
                  <span>Elapsed: {Math.floor(exp.elapsed / 1000)}s</span>
                  {exp.remaining && (
                    <span>Remaining: {Math.floor(exp.remaining / 1000)}s</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="space-y-6">
        {/* Service Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Target Service
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            {services.map((service) => (
              <option key={service} value={service}>
                {service}
              </option>
            ))}
          </select>
        </div>

        {/* Duration */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration (seconds)
          </label>
          <input
            type="number"
            value={duration / 1000}
            onChange={(e) => setDuration(Number(e.target.value) * 1000)}
            min="5"
            max="300"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Kill Service */}
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Service Failure</h3>
          <div className="flex space-x-3">
            <button
              onClick={handleKillService}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Zap className="w-5 h-5" />
              <span>Kill Service</span>
            </button>
            <button
              onClick={handleRestartService}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Activity className="w-5 h-5" />
              <span>Restart Service</span>
            </button>
          </div>
        </div>

        {/* Latency Injection */}
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Latency Injection</h3>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Latency (ms)
            </label>
            <input
              type="number"
              value={latencyMs}
              onChange={(e) => setLatencyMs(Number(e.target.value))}
              min="100"
              max="10000"
              step="100"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleInjectLatency}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <Clock className="w-5 h-5" />
            <span>Inject Latency</span>
          </button>
        </div>

        {/* Broker Failure */}
        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Message Broker Failure</h3>
          <button
            onClick={handleBrokerFailure}
            disabled={isLoading}
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            <AlertTriangle className="w-5 h-5" />
            <span>Simulate Broker Failure</span>
          </button>
        </div>
      </div>

      {/* Warning */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div className="text-sm text-yellow-800">
            <p className="font-semibold mb-1">Warning</p>
            <p>
              Chaos experiments will affect system availability and performance. Use only
              in testing environments or during planned chaos engineering sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
