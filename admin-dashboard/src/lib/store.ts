import { create } from 'zustand';
import { HealthStatus } from './api';

interface DashboardState {
  healthStatuses: HealthStatus[];
  setHealthStatuses: (statuses: HealthStatus[]) => void;
  
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  
  chaosMode: boolean;
  setChaosMode: (enabled: boolean) => void;
}

export const useDashboardStore = create<DashboardState>()((set) => ({
  healthStatuses: [],
  setHealthStatuses: (statuses) => set({ healthStatuses: statuses }),
  
  autoRefresh: true,
  setAutoRefresh: (enabled) => set({ autoRefresh: enabled }),
  
  refreshInterval: 5000, // 5 seconds
  setRefreshInterval: (interval) => set({ refreshInterval: interval }),
  
  chaosMode: false,
  setChaosMode: (enabled) => set({ chaosMode: enabled }),
}));
