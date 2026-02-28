import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const MetricCard = ({
  title,
  value,
  unit = '',
  icon: Icon,
  color = 'blue',
  trend,
  trendValue,
}: MetricCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    red: 'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    purple: 'bg-purple-100 text-purple-600',
  };

  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && trendValue && (
          <span className={`text-sm font-medium ${trendColors[trend]}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </span>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-600 mb-1">{title}</p>
        <p className="text-3xl font-bold text-gray-900">
          {value}
          {unit && <span className="text-lg text-gray-600 ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
};
