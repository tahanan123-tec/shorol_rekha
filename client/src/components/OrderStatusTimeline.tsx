import { Check, Clock, ChefHat, Package } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineStep {
  status: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const steps: TimelineStep[] = [
  {
    status: 'PENDING',
    label: 'Order Placed',
    icon: <Package className="w-5 h-5" />,
    description: 'Your order has been received',
  },
  {
    status: 'CONFIRMED',
    label: 'Stock Verified',
    icon: <Check className="w-5 h-5" />,
    description: 'Items are available',
  },
  {
    status: 'PROCESSING',
    label: 'In Kitchen',
    icon: <ChefHat className="w-5 h-5" />,
    description: 'Your order is being prepared',
  },
  {
    status: 'READY',
    label: 'Ready for Pickup',
    icon: <Check className="w-5 h-5" />,
    description: 'Your order is ready!',
  },
  {
    status: 'COMPLETED',
    label: 'Completed',
    icon: <Check className="w-5 h-5" />,
    description: 'Order delivered successfully',
  },
];

interface OrderStatusTimelineProps {
  currentStatus: string;
  createdAt?: string;
  completedAt?: string;
}

export const OrderStatusTimeline: React.FC<OrderStatusTimelineProps> = ({
  currentStatus,
  createdAt,
  completedAt,
}) => {
  const getCurrentStepIndex = () => {
    const index = steps.findIndex((step) => step.status === currentStatus);
    return index === -1 ? 0 : index;
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="space-y-6">
      {steps.map((step, index) => {
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        const isPending = index > currentStepIndex;

        return (
          <div key={step.status} className="relative flex items-start">
            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  'absolute left-4 top-10 w-0.5 h-12 -ml-px',
                  isCompleted || isCurrent ? 'bg-primary-600' : 'bg-gray-300'
                )}
              />
            )}

            {/* Icon Circle */}
            <div
              className={cn(
                'relative flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300',
                isCompleted && 'bg-primary-600 border-primary-600 text-white',
                isCurrent && 'bg-primary-100 border-primary-600 text-primary-600 animate-pulse',
                isPending && 'bg-white border-gray-300 text-gray-400'
              )}
            >
              {isCompleted ? <Check className="w-5 h-5" /> : step.icon}
            </div>

            {/* Content */}
            <div className="ml-4 flex-1">
              <h3
                className={cn(
                  'text-sm font-semibold',
                  (isCompleted || isCurrent) && 'text-gray-900',
                  isPending && 'text-gray-500'
                )}
              >
                {step.label}
              </h3>
              <p
                className={cn(
                  'text-xs mt-1',
                  (isCompleted || isCurrent) && 'text-gray-600',
                  isPending && 'text-gray-400'
                )}
              >
                {step.description}
              </p>
              {isCurrent && (
                <div className="mt-2 flex items-center text-xs text-primary-600">
                  <Clock className="w-3 h-3 mr-1" />
                  <span>In progress...</span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Completion Time */}
      {(currentStatus === 'READY' || currentStatus === 'COMPLETED') && completedAt && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-800">
            🎉 Order completed at {new Date(completedAt).toLocaleTimeString()}
          </p>
        </div>
      )}

      {/* Failed Status */}
      {currentStatus === 'FAILED' && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">
            ❌ Order failed. Please contact support.
          </p>
        </div>
      )}
    </div>
  );
};
