'use client';

import { useEffect, useState } from 'react';
import { 
  Database, TrendingUp, Users, DollarSign, Package, 
  BarChart2, PieChart, Calendar, ArrowUp, ArrowDown, 
  Sparkles, Activity, Zap, Globe, Tag, Box, Clock,
  TrendingDown, AlertCircle, Upload
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataStatsProps {
  data?: any[];
}

interface Stats {
  totalRecords: number;
  totalRevenue?: number;
  avgRevenue?: number;
  uniqueRegions?: number;
  uniqueCategories?: number;
  uniqueProducts?: number;
  dateRange?: {
    start: string;
    end: string;
  };
  trends?: {
    revenue: number;
    records: number;
  };
  topPerformer?: {
    name: string;
    value: number;
  };
  mainMetric?: string;
}

export default function DataStats({ data }: DataStatsProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [animateCards, setAnimateCards] = useState(false);

  useEffect(() => {
    // Only calculate stats if we have real data
    if (data && data.length > 0) {
      calculateStats(data);
      setTimeout(() => setAnimateCards(true), 100);
    } else {
      // No data - set stats to null
      setStats(null);
    }
  }, [data]);

  const calculateStats = (data: any[]) => {
    try {
      if (data.length === 0) {
        setStats(null);
        return;
      }

      const sampleRow = data[0];
      const columns = Object.keys(sampleRow);
      
      // Find numeric columns
      const numericColumns = columns.filter(key => 
        typeof sampleRow[key] === 'number'
      );
      
      // Find categorical columns
      const categoricalColumns = columns.filter(key => 
        typeof sampleRow[key] === 'string' && 
        !key.toLowerCase().includes('date') &&
        !key.toLowerCase().includes('time') &&
        !key.toLowerCase().includes('id')
      );

      // Find date columns
      const dateColumn = columns.find(key => 
        key.toLowerCase().includes('date') || 
        key.toLowerCase().includes('time') ||
        key.toLowerCase().includes('month')
      );

      // Calculate totals
      let totalRevenue = 0;
      let revenueColumn = numericColumns.find(col => 
        col.toLowerCase().includes('revenue') || 
        col.toLowerCase().includes('sales') ||
        col.toLowerCase().includes('price') ||
        col.toLowerCase().includes('amount')
      );

      if (revenueColumn) {
        totalRevenue = data.reduce((acc, row) => acc + (Number(row[revenueColumn]) || 0), 0);
      } else if (numericColumns.length > 0) {
        // Use first numeric column as default metric
        totalRevenue = data.reduce((acc, row) => acc + (Number(row[numericColumns[0]]) || 0), 0);
      }

      // Get unique values for categorical columns
      const uniqueRegions = new Set();
      const uniqueCategories = new Set();
      const uniqueProducts = new Set();

      // Track top performer
      let topValue = 0;
      let topName = '';
      const metricColumn = revenueColumn || numericColumns[0];

      data.forEach(row => {
        // Check for region-like columns
        categoricalColumns.forEach(col => {
          const value = row[col];
          if (typeof value === 'string') {
            if (col.toLowerCase().includes('region') || col.toLowerCase().includes('country')) {
              uniqueRegions.add(value);
            }
            if (col.toLowerCase().includes('categor')) {
              uniqueCategories.add(value);
            }
            if (col.toLowerCase().includes('product') || col.toLowerCase().includes('item')) {
              uniqueProducts.add(value);
              // Track top product by revenue
              if (metricColumn) {
                const revenue = Number(row[metricColumn]) || 0;
                if (revenue > topValue) {
                  topValue = revenue;
                  topName = value;
                }
              }
            }
          }
        });
      });

      // Get date range if date column exists
      let dateRange;
      if (dateColumn) {
        const dates = data.map(row => row[dateColumn]).filter(Boolean).sort();
        if (dates.length > 0) {
          dateRange = {
            start: formatDate(dates[0]),
            end: formatDate(dates[dates.length - 1])
          };
        }
      }

      // Calculate mock trends (in real app, compare with previous period)
      const trends = {
        revenue: Math.random() * 20 - 5, // -5% to +15%
        records: Math.random() * 10 - 2   // -2% to +8%
      };

      setStats({
        totalRecords: data.length,
        totalRevenue: totalRevenue || undefined,
        avgRevenue: totalRevenue ? totalRevenue / data.length : undefined,
        uniqueRegions: uniqueRegions.size || undefined,
        uniqueCategories: uniqueCategories.size || undefined,
        uniqueProducts: uniqueProducts.size || undefined,
        dateRange,
        trends,
        mainMetric: revenueColumn || numericColumns[0],
        topPerformer: topName ? { name: topName, value: topValue } : undefined
      });
    } catch (error) {
      console.error('Error calculating stats:', error);
      setStats(null);
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
      }
    } catch (e) {
      // Ignore
    }
    return dateStr;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative overflow-hidden rounded-2xl bg-gray-800/50 border border-gray-700">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-700/50 to-transparent -translate-x-full animate-shimmer" />
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 bg-gray-700 rounded-xl" />
                <div className="w-16 h-4 bg-gray-700 rounded" />
              </div>
              <div className="space-y-2">
                <div className="w-24 h-6 bg-gray-700 rounded" />
                <div className="w-32 h-4 bg-gray-700 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Empty state - No data loaded
  if (!stats) {
    return (
      <div className="text-center py-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-800 rounded-2xl mb-4">
          <Upload className="w-8 h-8 text-gray-600" strokeWidth={1} />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">No Data Loaded</h3>
        <p className="text-sm text-gray-400 max-w-sm mx-auto mb-4">
          Upload a CSV file or ask a question to see your data statistics here.
        </p>
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            Waiting for data...
          </span>
        </div>
      </div>
    );
  }

const statCards = [
  {
    title: 'Total Records',
    value: stats.totalRecords,
    icon: Database,
    color: 'blue',
    description: 'Total data points',
    trend: stats.trends?.records,
    show: stats.totalRecords !== undefined,
    format: (v: number) => v?.toLocaleString() || '0'
  },
  {
    title: 'Total Revenue',
    value: stats.totalRevenue,
    icon: DollarSign,
    color: 'green',
    description: stats.mainMetric ? `Total ${stats.mainMetric}` : 'Gross revenue',
    trend: stats.trends?.revenue,
    show: stats.totalRevenue !== undefined,
    format: (v: number) => v ? `$${v.toLocaleString()}` : '$0'
  },
  {
    title: 'Average Revenue',
    value: stats.avgRevenue,
    icon: TrendingUp,
    color: 'purple',
    description: stats.mainMetric ? `Avg ${stats.mainMetric}` : 'Per transaction',
    trend: stats.trends?.revenue,
    show: stats.avgRevenue !== undefined,
    format: (v: number) => v ? `$${Math.round(v).toLocaleString()}` : '$0'
  },
  {
    title: 'Active Regions',
    value: stats.uniqueRegions,
    icon: Globe,
    color: 'yellow',
    description: 'Geographic reach',
    show: stats.uniqueRegions !== undefined,
    format: (v: number) => v?.toString() || '0'
  },
  {
    title: 'Categories',
    value: stats.uniqueCategories,
    icon: Tag,
    color: 'pink',
    description: 'Unique categories',
    show: stats.uniqueCategories !== undefined,
    format: (v: number) => v?.toString() || '0'
  },
  {
    title: 'Products',
    value: stats.uniqueProducts,
    icon: Box,
    color: 'orange',
    description: 'Active products',
    show: stats.uniqueProducts !== undefined,
    format: (v: number) => v?.toString() || '0'
  }
].filter(card => card.show);

  const getColorClasses = (color: string) => {
    const colors = {
      blue: {
        bg: 'from-blue-500/10 via-blue-500/5 to-transparent',
        border: 'border-blue-500/20',
        text: 'text-blue-400',
        icon: 'bg-blue-500/20 text-blue-400',
        gradient: 'from-blue-500 to-cyan-500'
      },
      green: {
        bg: 'from-green-500/10 via-green-500/5 to-transparent',
        border: 'border-green-500/20',
        text: 'text-green-400',
        icon: 'bg-green-500/20 text-green-400',
        gradient: 'from-green-500 to-emerald-500'
      },
      purple: {
        bg: 'from-purple-500/10 via-purple-500/5 to-transparent',
        border: 'border-purple-500/20',
        text: 'text-purple-400',
        icon: 'bg-purple-500/20 text-purple-400',
        gradient: 'from-purple-500 to-pink-500'
      },
      yellow: {
        bg: 'from-yellow-500/10 via-yellow-500/5 to-transparent',
        border: 'border-yellow-500/20',
        text: 'text-yellow-400',
        icon: 'bg-yellow-500/20 text-yellow-400',
        gradient: 'from-yellow-500 to-orange-500'
      },
      pink: {
        bg: 'from-pink-500/10 via-pink-500/5 to-transparent',
        border: 'border-pink-500/20',
        text: 'text-pink-400',
        icon: 'bg-pink-500/20 text-pink-400',
        gradient: 'from-pink-500 to-rose-500'
      },
      orange: {
        bg: 'from-orange-500/10 via-orange-500/5 to-transparent',
        border: 'border-orange-500/20',
        text: 'text-orange-400',
        icon: 'bg-orange-500/20 text-orange-400',
        gradient: 'from-orange-500 to-red-500'
      },
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl shadow-lg shadow-blue-500/25">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              Data Overview
              <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full border border-green-500/30 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Live
              </span>
            </h2>
            <p className="text-xs text-gray-400">
              Key metrics and performance indicators
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-gray-800/50 rounded-xl p-1 border border-gray-700">
          {(['day', 'week', 'month', 'year'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-all",
                selectedPeriod === period
                  ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
                  : "text-gray-400 hover:text-white"
              )}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

     {/* Stats Grid - Only shows cards with actual data */}
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
  {statCards.map((card, index) => {
    const Icon = card.icon;
    const colors = getColorClasses(card.color);
    
    // Skip rendering if value is undefined
    if (card.value === undefined || card.value === null) return null;
    
    return (
      <div
        key={index}
        className={cn(
          "relative group rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border p-5 overflow-hidden",
          "hover:scale-105 hover:shadow-xl transition-all duration-300",
          colors.border,
          animateCards && "animate-in fade-in-0 slide-in-from-bottom-4",
          `[animation-delay:${index * 100}ms]`
        )}
        style={{ animationFillMode: 'both' }}
      >
        {/* Background gradient */}
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
          colors.bg
        )} />
        
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

        <div className="relative">
          {/* Header with icon and trend */}
          <div className="flex items-start justify-between mb-3">
            <div className={cn(
              "p-2.5 rounded-xl backdrop-blur-sm transition-all group-hover:scale-110 group-hover:rotate-3",
              colors.icon
            )}>
              <Icon className="w-4 h-4" />
            </div>
            
            {card.trend !== undefined && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                card.trend > 0 
                  ? "bg-green-500/20 text-green-400" 
                  : "bg-red-500/20 text-red-400"
              )}>
                {card.trend > 0 ? (
                  <ArrowUp className="w-3 h-3" />
                ) : (
                  <ArrowDown className="w-3 h-3" />
                )}
                <span>{Math.abs(card.trend).toFixed(1)}%</span>
              </div>
            )}
          </div>

          {/* Value - With safe check */}
          <div className="space-y-1">
            <p className="text-2xl font-bold text-white">
              {card.format(card.value)}
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">{card.title}</p>
              <span className="text-[10px] text-gray-500">{card.description}</span>
            </div>
          </div>

          {/* Mini sparkline (decorative) */}
          <div className="mt-3 h-1 flex gap-0.5">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="flex-1 h-full rounded-full bg-current opacity-30"
                style={{ 
                  color: `var(--${card.color}-400)`,
                  height: `${Math.random() * 100 + 20}%`,
                  opacity: 0.2 + Math.random() * 0.3
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  })}
</div>

      {/* Additional Insights Row - Only shows if data exists */}
      {(stats.dateRange || stats.topPerformer) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Range Card */}
          {stats.dateRange && (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-4 hover:border-blue-500/30 transition-all group">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <Calendar className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Date Range</p>
                  <p className="text-sm font-semibold text-white">
                    {stats.dateRange.start} — {stats.dateRange.end}
                  </p>
                </div>
              </div>
              <div className="mt-3 w-full h-1 bg-gray-700 rounded-full overflow-hidden">
                <div className="w-3/4 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              </div>
            </div>
          )}

          {/* Top Performer Card */}
          {stats.topPerformer && (
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl border border-gray-700 p-4 hover:border-green-500/30 transition-all group">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-green-500/20 rounded-xl group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-400">Top Performer</p>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">
                      {stats.topPerformer.name}
                    </p>
                    <p className="text-sm font-bold text-green-400">
                      ${stats.topPerformer.value.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Sparkles className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-gray-400">
                  Highest revenue generating product
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats Footer - Only shows when data exists */}
      {stats && (
        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-800 pt-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last updated: {new Date().toLocaleTimeString()}
            </span>
            <span className="flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Data freshness: Real-time
            </span>
          </div>
          <button className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
            <BarChart2 className="w-3 h-3" />
            View detailed report
          </button>
        </div>
      )}
    </div>
  );
}