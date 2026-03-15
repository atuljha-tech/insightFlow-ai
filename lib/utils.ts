import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { ChartData, Insight } from '@/types/dashboard';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateMockData = (): ChartData[] => {
  return [
    { name: 'Jan', revenue: 45000, profit: 28000, customers: 120 },
    { name: 'Feb', revenue: 52000, profit: 32000, customers: 145 },
    { name: 'Mar', revenue: 48000, profit: 30000, customers: 132 },
    { name: 'Apr', revenue: 61000, profit: 38000, customers: 168 },
    { name: 'May', revenue: 58000, profit: 35000, customers: 154 },
    { name: 'Jun', revenue: 72000, profit: 45000, customers: 189 },
  ];
};

export const generateMockInsights = (): Insight[] => {
  return [
    {
      id: '1',
      type: 'positive',
      title: 'Revenue Growth',
      description: 'Revenue increased by 23.5% compared to last month',
      metric: '+23.5%',
      change: 23.5
    },
    {
      id: '2',
      type: 'warning',
      title: 'Customer Acquisition',
      description: 'Customer growth rate slowed to 8% this week',
      metric: '+8%',
      change: -2.3
    },
    {
      id: '3',
      type: 'neutral',
      title: 'Profit Margins',
      description: 'Profit margins remain stable at 62%',
      metric: '62%',
      change: 0.5
    },
    {
      id: '4',
      type: 'positive',
      title: 'Top Performance',
      description: 'June shows highest revenue of the year',
      metric: '$72K',
      change: 24.1
    }
  ];
};