import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatLatency(seconds: number): string {
  if (seconds < 0.001) {
    return `${(seconds * 1000000).toFixed(0)}μs`;
  } else if (seconds < 1) {
    return `${(seconds * 1000).toFixed(0)}ms`;
  } else {
    return `${seconds.toFixed(2)}s`;
  }
}

export function formatThroughput(requestsPerSecond: number): string {
  if (requestsPerSecond < 1) {
    return `${(requestsPerSecond * 60).toFixed(1)} req/min`;
  } else {
    return `${requestsPerSecond.toFixed(1)} req/s`;
  }
}

export function getStatusColor(status: 'healthy' | 'unhealthy' | 'unknown'): string {
  switch (status) {
    case 'healthy':
      return 'bg-green-500';
    case 'unhealthy':
      return 'bg-red-500';
    case 'unknown':
      return 'bg-gray-400';
  }
}
