'use client';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ComposedChart,
  Scatter
} from 'recharts';
import { ChartConfig } from '@/types/dashboard';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart2,
  LineChart as LineIcon,
  Table as TableIcon,
  Download,
  Maximize2,
  Info,
  EyeOff,
  RefreshCw,
  Grid,
  Activity,
  Target,
  Award,
  MoreVertical,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Calendar,
  TrendingDown,
  Globe,
  Package,
  Users,
  DollarSign,
  ShoppingCart,
  Heart,
  Star,
  Zap,
  Shield,
  Crown,
  AlertCircle
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';

interface ChartRendererProps {
  config: ChartConfig;
  className?: string;
  insights?: string[];
  onExport?: () => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}

// Premium color palette
const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#a855f7'
];

// Gradient definitions for each chart type
const GRADIENTS = {
  bar: [
    ['#6366f1', '#8b5cf6'],
    ['#ec4899', '#f43f5e'],
    ['#f97316', '#eab308'],
    ['#10b981', '#14b8a6'],
    ['#06b6d4', '#0ea5e9'],
    ['#a855f7', '#d946ef']
  ],
  line: ['#6366f1', '#8b5cf6', '#ec4899'],
  area: ['#6366f1', '#8b5cf6', '#ec4899'],
  pie: ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#10b981']
};

// Animation keyframes
const animations = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  @keyframes pulse-glow {
    0%, 100% { opacity: 1; filter: brightness(1); }
    50% { opacity: 0.8; filter: brightness(1.2); }
  }
  @keyframes slide-in {
    from { transform: translateX(-20px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes scale-in {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }
  @keyframes rotate-in {
    from { transform: rotate(-180deg) scale(0.8); opacity: 0; }
    to { transform: rotate(0) scale(1); opacity: 1; }
  }
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

export default function ChartRenderer({
  config,
  className,
  insights = [],
  onExport,
  onRefresh,
  isLoading = false
}: ChartRendererProps) {
  const [showGrid, setShowGrid] = useState(true);
  const [hiddenSeries, setHiddenSeries] = useState<string[]>([]);
  const [showInsights, setShowInsights] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Inject animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = animations;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const toggleSeries = (key: string) => {
    setHiddenSeries(prev =>
      prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key]
    );
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const formatLargeNumber = (value: number | null | undefined): string => {
    if (value === undefined || value === null || isNaN(value)) return '0';
    
    const num = Number(value);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const calculateChange = (current: number, previous: number): number => {
    if (!previous) return 0;
    return ((current - previous) / previous) * 100;
  };

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[450px] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border-2 border-dashed border-gray-700/50 backdrop-blur-sm">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center shadow-2xl">
          <AlertCircle className="w-14 h-14 text-gray-400" />
        </div>
      </div>
      <p className="text-gray-300 text-lg font-medium mb-2">No data available</p>
      <p className="text-gray-500 text-sm">Upload a dataset to start visualizing your insights</p>
    </div>
  );

  const renderLoadingState = () => (
    <div className="flex flex-col items-center justify-center h-full min-h-[450px]">
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="relative w-28 h-28 rounded-3xl bg-gradient-to-br from-gray-800 to-gray-700 flex items-center justify-center shadow-2xl">
          <div className="w-20 h-20 border-4 border-gray-600 border-t-blue-500 rounded-2xl animate-spin" />
        </div>
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full animate-ping" />
      </div>
      <p className="text-gray-400 text-base mt-6 font-medium">Loading visualization...</p>
    </div>
  );

  const renderChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-2xl shadow-2xl p-5 min-w-[240px] animate-in fade-in slide-in-from-bottom-2 duration-200">
        <p className="text-sm font-semibold text-gray-400 mb-3 pb-2 border-b border-gray-800">
          {label}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between gap-6 py-2 group">
            <div className="flex items-center gap-3">
              <div
                className="w-4 h-4 rounded-full shadow-lg"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-300 group-hover:text-white transition-colors font-medium">
                {entry.name}:
              </span>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              {typeof entry.value === 'number'
                ? formatLargeNumber(entry.value)
                : entry.value
              }
            </span>
          </div>
        ))}
        {payload.length > 1 && (
          <div className="mt-4 pt-3 border-t border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500 font-medium">Total</span>
              <span className="text-lg font-bold text-white">
                {formatLargeNumber(payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderLegend = (props: any) => {
    const { payload } = props;

    return (
      <ul className="flex flex-wrap justify-center gap-3 mt-8">
        {payload.map((entry: any, index: number) => (
          <li
            key={`item-${index}`}
            className={cn(
              "flex items-center gap-3 px-4 py-2 rounded-xl cursor-pointer transition-all duration-300",
              hiddenSeries.includes(entry.dataKey)
                ? "opacity-30 bg-gray-800/20"
                : "bg-gray-800/50 hover:bg-gray-800/70 border border-gray-700/50 hover:border-gray-600 hover:shadow-lg hover:scale-105"
            )}
            onClick={() => toggleSeries(entry.dataKey)}
            style={{
              animation: `slide-in 0.3s ease-out ${index * 0.1}s both`
            }}
          >
            <div
              className="w-3 h-3 rounded-full shadow-lg"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm font-medium text-gray-300">{entry.value}</span>
            {hiddenSeries.includes(entry.dataKey) && (
              <EyeOff className="w-3.5 h-3.5 text-gray-500 ml-1" />
            )}
          </li>
        ))}
      </ul>
    );
  };

  const renderBarChart = () => {
    const filteredData = config.data.map(item => {
      const newItem = { ...item };
      hiddenSeries.forEach(key => delete newItem[key]);
      return newItem;
    });

    const dataKeys = Object.keys(config.data[0] || {}).filter(key =>
      key !== 'name' && !hiddenSeries.includes(key)
    );

    const maxValue = Math.max(
      ...filteredData.flatMap(item =>
        dataKeys.map(key => Number(item[key]) || 0)
      )
    );

    return (
      <div className="relative w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={filteredData}
            margin={{ top: 30, right: 30, left: 30, bottom: 30 }}
            barGap={8}
            barSize={40}
          >
            <defs>
              {GRADIENTS.bar.map((gradient, idx) => (
                <linearGradient key={`bar-gradient-${idx}`} id={`bar-gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={gradient[0]} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={gradient[1]} stopOpacity={0.7} />
                </linearGradient>
              ))}
            </defs>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#374151"
                vertical={false}
                strokeOpacity={0.3}
              />
            )}
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 500 }}
              axisLine={{ stroke: '#374151', strokeWidth: 1 }}
              tickLine={{ stroke: '#374151' }}
              tickMargin={10}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 500 }}
              axisLine={{ stroke: '#374151', strokeWidth: 1 }}
              tickLine={{ stroke: '#374151' }}
              tickMargin={10}
              domain={[0, maxValue * 1.1]}
            />
            <Tooltip content={renderChartTooltip} cursor={{ fill: '#374151', opacity: 0.1 }} />
            <Legend content={renderLegend} />
            {dataKeys.map((key, index) => (
              <Bar
                key={key}
                dataKey={key}
                fill={`url(#bar-gradient-${index % GRADIENTS.bar.length})`}
                radius={[8, 8, 0, 0]}
                maxBarSize={60}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {filteredData.map((entry, idx) => (
                  <Cell
                    key={`cell-${idx}`}
                    className="transition-all duration-300 hover:opacity-80 hover:scale-105"
                    style={{ transformOrigin: 'bottom' }}
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderLineChart = () => {
    const filteredData = config.data.map(item => {
      const newItem = { ...item };
      hiddenSeries.forEach(key => delete newItem[key]);
      return newItem;
    });

    const dataKeys = Object.keys(config.data[0] || {}).filter(key =>
      key !== 'name' && !hiddenSeries.includes(key)
    );

    return (
      <div className="relative w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={filteredData}
            margin={{ top: 30, right: 30, left: 30, bottom: 30 }}
          >
            <defs>
              {GRADIENTS.line.map((color, idx) => (
                <linearGradient key={`line-gradient-${idx}`} id={`line-gradient-${idx}`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor={color} stopOpacity={0.9} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.6} />
                </linearGradient>
              ))}
            </defs>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#374151"
                vertical={false}
                strokeOpacity={0.3}
              />
            )}
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 500 }}
              axisLine={{ stroke: '#374151', strokeWidth: 1 }}
              tickLine={{ stroke: '#374151' }}
              tickMargin={10}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 500 }}
              axisLine={{ stroke: '#374151', strokeWidth: 1 }}
              tickLine={{ stroke: '#374151' }}
              tickMargin={10}
            />
            <Tooltip content={renderChartTooltip} />
            <Legend content={renderLegend} />
            {dataKeys.map((key, index) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={`url(#line-gradient-${index % GRADIENTS.line.length})`}
                strokeWidth={3}
                dot={({ cx, cy, payload, value }) => (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={6}
                    fill={COLORS[index % COLORS.length]}
                    stroke="#1f2937"
                    strokeWidth={2}
                    className="transition-all duration-300 hover:r-8 hover:filter hover:brightness-125"
                  />
                )}
                activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderPieChart = () => {
    const numericKey = Object.keys(config.data[0] || {}).find(key =>
      typeof config.data[0][key] === 'number' && key !== 'name'
    ) || 'value';

    const pieData = config.data.map((item, index) => ({
      name: item.name || `Item ${index + 1}`,
      value: Number(item[numericKey]) || 0,
      original: item
    }));

    const total = pieData.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="relative w-full h-full flex flex-col">
        <div className="flex-1 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
              <defs>
                {pieData.map((entry, index) => (
                  <radialGradient key={`pie-gradient-${index}`} id={`pie-gradient-${index}`}>
                    <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={1} />
                    <stop offset="70%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.8} />
                    <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6} />
                  </radialGradient>
                ))}
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3.5" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Outer ring for depth */}
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={100}
                outerRadius={140}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`outer-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    fillOpacity={0.3}
                  />
                ))}
              </Pie>

              {/* Main donut */}
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={80}
                outerRadius={120}
                paddingAngle={4}
                dataKey="value"
                label={({ name, percent }) => {
                  const percentage = percent || 0;
                  return `${name}: ${(percentage * 100).toFixed(0)}%`;
                }}
                labelLine={{
                  stroke: '#4b5563',
                  strokeWidth: 1.5,
                  strokeDasharray: '3 3'
                }}
                animationDuration={1500}
                animationEasing="ease-out"
                onMouseEnter={(_, index) => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                {pieData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#pie-gradient-${index})`}
                    stroke="#1f2937"
                    strokeWidth={2}
                    filter="url(#glow)"
                    className={cn(
                      "transition-all duration-300",
                      activeIndex === index && "transform scale-105 translate-y-[-5px]"
                    )}
                    style={{
                      filter: activeIndex === index ? 'drop-shadow(0 10px 8px rgba(0,0,0,0.5))' : 'none'
                    }}
                  />
                ))}
              </Pie>

              {/* Center decoration */}
              <circle
                cx="50%"
                cy="50%"
                r="40"
                fill="#1f2937"
                stroke="#374151"
                strokeWidth={2}
              />
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-2xl font-bold fill-white"
              >
                {formatLargeNumber(total)}
              </text>
              <text
                x="50%"
                y="58%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-xs fill-gray-400"
              >
                Total
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with percentages */}
        <div className="grid grid-cols-2 gap-3 mt-4 px-6 pb-4">
          {pieData.map((item, index) => {
            const percentage = ((item.value / total) * 100).toFixed(1);
            return (
              <div
                key={index}
                className={cn(
                  "flex items-center justify-between p-3 rounded-xl transition-all duration-300",
                  activeIndex === index
                    ? "bg-gray-800/80 scale-105 shadow-lg border border-gray-700"
                    : "bg-gray-800/30 hover:bg-gray-800/50"
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-gray-300">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-white">{percentage}%</span>
                  <span className="text-xs text-gray-500 ml-2">({formatLargeNumber(item.value)})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMetricChart = () => {
    const firstItem = config.data[0] || {};
    const numericKey = Object.keys(firstItem).find(key =>
      typeof firstItem[key] === 'number' && key !== 'name'
    ) || 'value';

    const currentValue = Number(firstItem[numericKey]) || 0;
    const secondItem = config.data[1];
    const previousValue = secondItem ? Number(secondItem[numericKey]) || 0 : 0;
    const change = calculateChange(currentValue, previousValue);

    // Historical data for sparkline
    const historicalData = config.data.slice(0, 10).map(item => ({
      value: Number(item[numericKey]) || 0,
      date: item.name || ''
    })).reverse();

    const getMetricIcon = () => {
      const iconProps = { className: "w-8 h-8 text-white" };
      
      if (config.title?.toLowerCase().includes('revenue')) return <DollarSign {...iconProps} />;
      if (config.title?.toLowerCase().includes('user')) return <Users {...iconProps} />;
      if (config.title?.toLowerCase().includes('order')) return <ShoppingCart {...iconProps} />;
      if (config.title?.toLowerCase().includes('product')) return <Package {...iconProps} />;
      if (config.title?.toLowerCase().includes('satisfaction')) return <Heart {...iconProps} />;
      if (config.title?.toLowerCase().includes('rating')) return <Star {...iconProps} />;
      return <Target {...iconProps} />;
    };

    const getTrendIcon = () => {
      const iconProps = { className: "w-5 h-5" };
      if (change > 0) return <ArrowUpRight {...iconProps} />;
      if (change < 0) return <ArrowDownRight {...iconProps} />;
      return <Minus {...iconProps} />;
    };

    const getTrendColor = () => {
      if (change > 0) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      if (change < 0) return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
    };

    return (
      <div className="relative w-full h-full flex flex-col p-6">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl" />

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-pink-500/20 to-orange-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

        {/* Content */}
        <div className="relative flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50" />
                <div className="relative p-4 bg-gradient-to-br from-gray-800 to-gray-700 rounded-2xl border border-gray-600">
                  {getMetricIcon()}
                </div>
              </div>
              <div>
                <p className="text-gray-400 text-sm font-medium">{config.title || 'Metric'}</p>
                {config.description && (
                  <p className="text-gray-500 text-xs mt-1">{config.description}</p>
                )}
              </div>
            </div>

            {/* Premium badge */}
            <div className="px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-full border border-amber-500/30">
              <span className="text-xs font-medium text-amber-300 flex items-center gap-1">
                <Crown className="w-3 h-3" />
                Premium Metric
              </span>
            </div>
          </div>

          {/* Main value */}
          <div className="relative mb-8">
            <div className="text-8xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent">
              {formatLargeNumber(currentValue)}
            </div>

            {/* Change indicator */}
            <div className={cn(
              "absolute top-0 right-0 flex items-center gap-3 px-6 py-3 rounded-2xl border",
              getTrendColor()
            )}>
              <div className={cn(
                "p-2 rounded-xl",
                change > 0 ? "bg-emerald-500/20" : change < 0 ? "bg-rose-500/20" : "bg-gray-700"
              )}>
                {getTrendIcon()}
              </div>
              <div>
                <div className={cn(
                  "text-2xl font-bold",
                  change > 0 ? "text-emerald-400" : change < 0 ? "text-rose-400" : "text-gray-400"
                )}>
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </div>
                <p className="text-xs text-gray-500">vs previous period</p>
              </div>
            </div>
          </div>

          {/* Sparkline chart */}
          {historicalData.length > 1 && (
            <div className="relative h-24 mt-auto">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="sparkline-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fill="url(#sparkline-gradient)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Additional insights */}
          {historicalData.length > 0 && (
            <div className="flex gap-4 mt-6 pt-6 border-t border-gray-800">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Average</p>
                <p className="text-lg font-semibold text-white">
                  {formatLargeNumber(historicalData.reduce((sum, item) => sum + item.value, 0) / historicalData.length)}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Peak</p>
                <p className="text-lg font-semibold text-white">
                  {formatLargeNumber(Math.max(...historicalData.map(d => d.value)))}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-1">Lowest</p>
                <p className="text-lg font-semibold text-white">
                  {formatLargeNumber(Math.min(...historicalData.map(d => d.value)))}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTableChart = () => {
    const columns = Object.keys(config.data[0] || {});
    const numericColumns = columns.filter(col =>
      config.data.some(row => typeof row[col] === 'number')
    );

    // Calculate totals for numeric columns
    const totals: Record<string, number> = {};
    numericColumns.forEach(col => {
      totals[col] = config.data.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
    });

    return (
      <div className="relative w-full h-full flex flex-col p-4">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/50 to-gray-800/50 rounded-2xl" />

        <div className="relative flex-1 overflow-auto rounded-xl border border-gray-800/50 bg-gray-900/30 backdrop-blur-sm">
          <table className="min-w-full divide-y divide-gray-800">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr>
                {columns.map((col, idx) => (
                  <th
                    key={col}
                    className={cn(
                      "px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider",
                      numericColumns.includes(col)
                        ? "text-blue-400"
                        : "text-gray-400"
                    )}
                    style={{
                      animation: `slide-in 0.3s ease-out ${idx * 0.05}s both`
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {col}
                      {numericColumns.includes(col) && (
                        <span className="px-1.5 py-0.5 bg-blue-500/20 rounded text-[10px] text-blue-300">
                          #
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {config.data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="hover:bg-gray-800/50 transition-all duration-200 group"
                  style={{
                    animation: `slide-in 0.3s ease-out ${rowIdx * 0.03}s both`
                  }}
                >
                  {columns.map((col, colIdx) => {
                    const isNumeric = numericColumns.includes(col);
                    const value = row[col];

                    return (
                      <td
                        key={col}
                        className={cn(
                          "px-6 py-4 text-sm transition-all duration-200",
                          isNumeric
                            ? "text-blue-300 font-medium group-hover:text-blue-200"
                            : "text-gray-300 group-hover:text-white"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {isNumeric && <span className="text-gray-500">#</span>}
                          {isNumeric ? formatLargeNumber(Number(value)) : value?.toString() || '-'}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            {numericColumns.length > 0 && (
              <tfoot className="bg-gray-800/30 border-t-2 border-gray-700">
                <tr>
                  {columns.map((col, idx) => {
                    const isNumeric = numericColumns.includes(col);
                    return (
                      <td
                        key={col}
                        className={cn(
                          "px-6 py-4 text-sm font-semibold",
                          isNumeric ? "text-blue-400" : "text-gray-500"
                        )}
                      >
                        {isNumeric ? formatLargeNumber(totals[col]) : '—'}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Table stats */}
        <div className="relative flex items-center justify-between mt-4 px-2">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">
                {config.data.length} rows
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">
                {columns.length} columns
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={toggleFullscreen}
              className="p-1.5 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Maximize2 className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAreaChart = () => {
    const filteredData = config.data.map(item => {
      const newItem = { ...item };
      hiddenSeries.forEach(key => delete newItem[key]);
      return newItem;
    });

    const dataKeys = Object.keys(config.data[0] || {}).filter(key =>
      key !== 'name' && !hiddenSeries.includes(key)
    );

    return (
      <div className="relative w-full h-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredData}
            margin={{ top: 30, right: 30, left: 30, bottom: 30 }}
          >
            <defs>
              {GRADIENTS.area.map((color, idx) => (
                <linearGradient key={`area-gradient-${idx}`} id={`area-gradient-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.8} />
                  <stop offset="80%" stopColor={color} stopOpacity={0.2} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {showGrid && (
              <CartesianGrid
                strokeDasharray="4 4"
                stroke="#374151"
                vertical={false}
                strokeOpacity={0.3}
              />
            )}
            <XAxis
              dataKey="name"
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 500 }}
              axisLine={{ stroke: '#374151', strokeWidth: 1 }}
              tickLine={{ stroke: '#374151' }}
              tickMargin={10}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 13, fontWeight: 500 }}
              axisLine={{ stroke: '#374151', strokeWidth: 1 }}
              tickLine={{ stroke: '#374151' }}
              tickMargin={10}
            />
            <Tooltip content={renderChartTooltip} />
            <Legend content={renderLegend} />
            {dataKeys.map((key, index) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={COLORS[index % COLORS.length]}
                strokeWidth={2}
                fill={`url(#area-gradient-${index % GRADIENTS.area.length})`}
                fillOpacity={0.8}
                animationDuration={1500}
                animationEasing="ease-out"
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderChart = () => {
    if (!config.data || config.data.length === 0) {
      return renderEmptyState();
    }

    if (isLoading) {
      return renderLoadingState();
    }

    switch (config.type) {
      case 'bar':
        return renderBarChart();
      case 'line':
        return renderLineChart();
      case 'pie':
        return renderPieChart();
      case 'area':
        return renderAreaChart();
      case 'metric':
        return renderMetricChart();
      case 'table':
        return renderTableChart();
      default:
        return (
          <div className="flex items-center justify-center h-full text-gray-400">
            Unsupported chart type
          </div>
        );
    }
  };

  const getChartIcon = () => {
    switch (config.type) {
      case 'bar': return <BarChart2 className="w-5 h-5" />;
      case 'line': return <LineIcon className="w-5 h-5" />;
      case 'pie': return <PieIcon className="w-5 h-5" />;
      case 'area': return <Activity className="w-5 h-5" />;
      case 'metric': return <Target className="w-5 h-5" />;
      case 'table': return <TableIcon className="w-5 h-5" />;
      default: return <BarChart2 className="w-5 h-5" />;
    }
  };

  const getChartTypeColor = () => {
    switch (config.type) {
      case 'bar': return 'from-blue-500 to-indigo-500';
      case 'line': return 'from-emerald-500 to-teal-500';
      case 'pie': return 'from-purple-500 to-pink-500';
      case 'area': return 'from-orange-500 to-amber-500';
      case 'metric': return 'from-cyan-500 to-blue-500';
      case 'table': return 'from-yellow-500 to-orange-500';
      default: return 'from-gray-500 to-gray-400';
    }
  };

  return (
    <div
      className={cn(
        "group relative bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl border border-gray-800/50 overflow-hidden transition-all duration-500 hover:shadow-2xl hover:shadow-blue-500/10 hover:border-gray-700",
        isFullscreen && "fixed inset-4 z-50",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        animation: 'scale-in 0.5s ease-out'
      }}
    >
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 delay-100" />
      </div>

      {/* Header */}
      <div className="relative flex items-center justify-between px-8 py-5 border-b border-gray-800/50 bg-gradient-to-r from-gray-900/80 to-gray-800/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className={cn(
            "relative p-3 rounded-xl bg-gradient-to-br shadow-xl",
            `bg-gradient-to-r ${getChartTypeColor()}`
          )}>
            <div className="absolute inset-0 bg-white/20 rounded-xl blur-sm" />
            {getChartIcon()}
          </div>
          <div>
            <h3 className="text-white font-bold text-xl tracking-tight">{config.title}</h3>
            {config.description && (
              <p className="text-gray-400 text-sm mt-1">{config.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Insights */}
          {insights.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowInsights(!showInsights)}
                className="relative p-2.5 rounded-xl hover:bg-gray-800/80 transition-all duration-200 group/btn"
              >
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full ring-2 ring-gray-900 animate-pulse" />
                <Sparkles className="w-4 h-4 text-gray-400 group-hover/btn:text-green-400 transition-colors" />
              </button>

              {showInsights && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-20">
                  <div className="px-5 py-4 bg-gradient-to-r from-gray-800 to-gray-800/50 border-b border-gray-700/50">
                    <p className="text-sm font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-green-400" />
                      AI-Powered Insights
                    </p>
                  </div>
                  <div className="p-4 max-h-96 overflow-y-auto">
                    {insights.map((insight, i) => (
                      <div
                        key={i}
                        className="p-4 mb-3 last:mb-0 rounded-xl bg-gray-800/30 border border-gray-700/30 text-sm text-gray-300 hover:bg-gray-800/50 transition-colors"
                      >
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Grid Toggle */}
          <button
            onClick={() => setShowGrid(!showGrid)}
            className={cn(
              "p-2.5 rounded-xl transition-all duration-200",
              showGrid
                ? "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                : "hover:bg-gray-800/80 text-gray-400 hover:text-white"
            )}
          >
            <Grid className="w-4 h-4" />
          </button>

          {/* Refresh */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl hover:bg-gray-800/80 text-gray-400 hover:text-blue-400 transition-all duration-200"
            >
              <RefreshCw className={cn(
                "w-4 h-4 transition-transform duration-500",
                isHovered && "rotate-180"
              )} />
            </button>
          )}

          {/* Export */}
          {onExport && (
            <button
              onClick={onExport}
              className="p-2.5 rounded-xl hover:bg-gray-800/80 text-gray-400 hover:text-green-400 transition-all duration-200"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl hover:bg-gray-800/80 text-gray-400 hover:text-white transition-all duration-200"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* More options */}
          <button className="p-2.5 rounded-xl hover:bg-gray-800/80 text-gray-400 hover:text-white transition-all duration-200">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className={cn(
        "relative p-8",
        isFullscreen && "h-[calc(100vh-200px)]"
      )}>
        <div className="w-full h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </div>

        {config.footer && (
          <div className="mt-6 flex items-center justify-between text-sm text-gray-500 border-t border-gray-800/50 pt-5">
            <span className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {config.footer}
            </span>
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Real-time updates
            </span>
          </div>
        )}
      </div>

      {/* Hover effect overlay */}
      <div className={cn(
        "absolute inset-0 pointer-events-none transition-opacity duration-500",
        isHovered ? "opacity-100" : "opacity-0"
      )}>
        <div className="absolute top-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl" />
      </div>
    </div>
  );
}