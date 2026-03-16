'use client';

import { useState, useEffect } from 'react';
import { ChartConfig } from '@/types/dashboard';
import ChartRenderer from './ChartRenderer';
import { chartEngine } from '@/lib/chartEngine';
import { 
  Layout, 
  Plus, 
  X, 
  Maximize2, 
  Minimize2, 
  Download, 
  RefreshCw, 
  Sparkles, 
  BarChart3, 
  PieChart, 
  LineChart, 
  TrendingUp,
  ChevronDown,
  Grid3X3,
  PanelRight,
  Eye,
  EyeOff,
  Settings2,
  Wand2,
  Brain,
  Zap,
  Shield,
  Rocket,
  Crown,
  Stars
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardGeneratorProps {
  data: any[];
  query: string;
  onRefresh?: () => void;
}

export default function DashboardGenerator({ data, query, onRefresh }: DashboardGeneratorProps) {
  const [charts, setCharts] = useState<ChartConfig[]>([]);
  const [layout, setLayout] = useState<'grid' | 'full'>('grid');
  const [selectedChart, setSelectedChart] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoveredChart, setHoveredChart] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showInsights, setShowInsights] = useState(true);

  useEffect(() => {
    if (data && data.length > 0) {
      generateDashboard();
    }
  }, [data, query]);

  const generateDashboard = () => {
    setLoading(true);
    
    // Simulate loading for better UX
    setTimeout(() => {
      const suggestions = chartEngine.generateDashboardSuggestions(data, query);
      setCharts(suggestions);
      setLoading(false);
    }, 800);
  };

  const removeChart = (index: number) => {
    setCharts(charts.filter((_, i) => i !== index));
  };

  const addChart = (type?: string) => {
    const columns = Object.keys(data[0] || {});
    const numericColumns = columns.filter(col => 
      typeof data[0][col] === 'number'
    );
    const categoricalColumns = columns.filter(col => 
      typeof data[0][col] === 'string'
    );

    const chartTypes = ['bar', 'line', 'pie', 'area'];
    const selectedType = type || chartTypes[Math.floor(Math.random() * chartTypes.length)];
const newChart: ChartConfig = {
  type: selectedType as any,
  title: `${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Analysis by ${categoricalColumns[0] || 'Category'}`,
  data: data.slice(0, 10),
  description: `Analysis of ${categoricalColumns[0] || 'categories'} showing distribution across ${data.length} records`,
  footer: undefined,
  unit: '' // Add this line - provide a default empty string or appropriate unit
};

    setCharts([...charts, newChart]);
    setShowAddMenu(false);
  };

  const getInsightsForChart = (chart: ChartConfig): string[] => {
    const insights: string[] = [];
    
    if (chart.data.length === 0) return insights;

    const numericColumns = Object.keys(chart.data[0]).filter(key => 
      typeof chart.data[0][key] === 'number' && key !== 'name'
    );

    numericColumns.forEach(col => {
      const values = chart.data.map(row => Number(row[col])).filter(v => !isNaN(v));
      if (values.length === 0) return;

      const max = Math.max(...values);
      const min = Math.min(...values);
      const avg = values.reduce((a, b) => a + b, 0) / values.length;

      if (chart.type === 'line') {
        const trend = values[values.length - 1] - values[0];
        if (Math.abs(trend) > 0) {
          const trendDirection = trend > 0 ? 'upward' : 'downward';
          insights.push(`${col} is trending ${trendDirection} by ${Math.abs(trend).toFixed(0)} units`);
        }
      }

      if (chart.type === 'bar') {
        const maxItem = chart.data.find(row => Number(row[col]) === max);
        if (maxItem) {
          insights.push(`Highest ${col}: ${maxItem.name || 'Item'} (${max.toFixed(0)})`);
        }
        
        if (values.length > 1) {
          const range = (max - min).toFixed(0);
          insights.push(`${col} range: ${range} (${min.toFixed(0)} - ${max.toFixed(0)})`);
        }
      }

      if (chart.type === 'pie') {
        const total = values.reduce((a, b) => a + b, 0);
        const percentages = values.map(v => ((v / total) * 100).toFixed(1));
        insights.push(`Total ${col}: ${total.toFixed(0)}`);
        insights.push(`Largest segment: ${percentages[0]}% of total`);
      }
    });

    return insights.slice(0, 3);
  };

  const getChartTypeIcon = (type: string) => {
    switch(type) {
      case 'bar': return <BarChart3 className="w-4 h-4" />;
      case 'line': return <TrendingUp className="w-4 h-4" />;
      case 'pie': return <PieChart className="w-4 h-4" />;
      case 'area': return <Layout className="w-4 h-4" />;
      default: return <BarChart3 className="w-4 h-4" />;
    }
  };

  const getChartTypeColor = (type: string) => {
    switch(type) {
      case 'bar': return 'from-blue-500 to-indigo-500';
      case 'line': return 'from-emerald-500 to-teal-500';
      case 'pie': return 'from-purple-500 to-pink-500';
      case 'area': return 'from-orange-500 to-amber-500';
      default: return 'from-gray-500 to-gray-400';
    }
  };

  const getChartTypeBadgeColor = (type: string) => {
    switch(type) {
      case 'bar': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'line': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'pie': return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'area': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  if (loading) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl border border-gray-800/50 p-16 shadow-2xl">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500/20 via-transparent to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent" />
        </div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)`,
          backgroundSize: '40px 40px'
        }} />
        
        <div className="relative flex flex-col items-center justify-center">
          {/* Animated circles with stars */}
          <div className="relative mb-10">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-pink-500/20 rounded-full blur-2xl animate-pulse delay-75" />
            
            <div className="relative flex items-center justify-center">
              {/* Outer rotating ring */}
              <div className="absolute w-32 h-32 border-2 border-blue-500/20 rounded-full animate-spin-slow" />
              <div className="absolute w-24 h-24 border-2 border-purple-500/20 rounded-full animate-spin-slow reverse" />
              
              {/* Inner spinning circle */}
              <div className="w-28 h-28 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 flex items-center justify-center backdrop-blur-sm">
                <div className="w-20 h-20 border-4 border-gray-700/50 border-t-blue-500 rounded-full animate-spin" />
              </div>
              
              {/* Center icon */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <Brain className="w-12 h-12 text-blue-400 animate-pulse" />
                  <Stars className="absolute -top-2 -right-2 w-4 h-4 text-yellow-400 animate-ping" />
                </div>
              </div>
            </div>
          </div>
          
          <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
            AI is Crafting Your Dashboard
          </h3>
          <p className="text-gray-400 text-sm mb-10 max-w-md text-center">
            Analyzing {data.length} data points with advanced algorithms to create intelligent visualizations
          </p>
          
          {/* Progress steps with animations */}
          <div className="w-96 space-y-4">
            <div className="relative">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-white">Analyzing data patterns</span>
                    <span className="text-xs text-blue-400">In progress</span>
                  </div>
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-shimmer" />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm opacity-70">
              <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-300">Generating chart suggestions</span>
                  <span className="text-xs text-gray-500">Pending</span>
                </div>
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm opacity-70">
              <div className="w-8 h-8 rounded-full bg-gray-700/50 flex items-center justify-center">
                <Layout className="w-4 h-4 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-300">Optimizing layout</span>
                  <span className="text-xs text-gray-500">Pending</span>
                </div>
                <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full w-0 bg-gradient-to-r from-pink-500 to-orange-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>
          
          {/* AI capabilities badges */}
          <div className="flex gap-3 mt-8">
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-400" />
              Real-time
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 flex items-center gap-1">
              <Shield className="w-3 h-3 text-green-400" />
              Secure
            </div>
            <div className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300 flex items-center gap-1">
              <Crown className="w-3 h-3 text-purple-400" />
              Premium
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Dashboard Header with Stats */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl border border-gray-800/50 shadow-2xl">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl opacity-30" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-pink-500/20 to-orange-500/20 rounded-full blur-3xl opacity-20" />
        </div>
        
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        
        <div className="relative p-8">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-6">
              {/* Icon with animated gradient */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur-xl opacity-50 animate-pulse" />
                <div className="relative p-4 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl border border-gray-700">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl" />
                  <Layout className="w-8 h-8 text-white relative z-10" />
                </div>
              </div>
              
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                    Analytics Dashboard
                  </h2>
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 backdrop-blur-sm">
                    <span className="text-xs font-medium text-blue-300 flex items-center gap-1">
                      <Brain className="w-3 h-3" />
                      AI Generated
                    </span>
                  </div>
                  <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-sm">
                    <span className="text-xs font-medium text-emerald-300 flex items-center gap-1">
                      <Rocket className="w-3 h-3" />
                      Live
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                      <span className="text-sm text-white">{charts.length}</span>
                      <span className="text-xs text-gray-400">charts</span>
                    </div>
                    
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm text-white">
                        {charts.reduce((acc, chart) => acc + getInsightsForChart(chart).length, 0)}
                      </span>
                      <span className="text-xs text-gray-400">insights</span>
                    </div>
                    
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-sm text-white">
                        {charts.filter(c => c.type === 'line').length}
                      </span>
                      <span className="text-xs text-gray-400">trends</span>
                    </div>
                  </div>
                  
                  {query && (
                    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <Brain className="w-4 h-4 text-purple-400" />
                      <span className="text-sm text-purple-300">"{query}"</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-gray-800/50 rounded-xl border border-gray-700/50 backdrop-blur-sm">
                <button
                  onClick={() => setLayout('grid')}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200 relative group",
                    layout === 'grid' 
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg" 
                      : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Grid view
                  </span>
                </button>
                <button
                  onClick={() => setLayout('full')}
                  className={cn(
                    "p-2 rounded-lg transition-all duration-200 relative group",
                    layout === 'full' 
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg" 
                      : "text-gray-400 hover:text-white hover:bg-gray-700/50"
                  )}
                >
                  <PanelRight className="w-4 h-4" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Full view
                  </span>
                </button>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Add Chart Button */}
                <div className="relative">
                  <button
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    className="relative p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all duration-200 group"
                  >
                    <Plus className="w-4 h-4 text-white" />
                    <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      Add chart
                    </span>
                  </button>
                  
                  {showAddMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-xl border border-gray-700 shadow-2xl z-20 backdrop-blur-xl overflow-hidden">
                      <div className="p-3 border-b border-gray-700">
                        <p className="text-xs font-medium text-gray-400">Add new chart</p>
                      </div>
                      <div className="p-2">
                        {[
                          { type: 'bar', icon: BarChart3, color: 'blue', label: 'Bar Chart' },
                          { type: 'line', icon: TrendingUp, color: 'emerald', label: 'Line Chart' },
                          { type: 'pie', icon: PieChart, color: 'purple', label: 'Pie Chart' },
                          { type: 'area', icon: Layout, color: 'orange', label: 'Area Chart' }
                        ].map((item) => (
                          <button
                            key={item.type}
                            onClick={() => addChart(item.type)}
                            className="w-full px-3 py-3 text-left rounded-lg hover:bg-gray-700/50 transition-all duration-200 group flex items-center gap-3"
                          >
                            <div className={cn(
                              "p-2 rounded-lg bg-gradient-to-r",
                              `from-${item.color}-500/20 to-${item.color}-600/20`,
                              "border border-white/5"
                            )}>
                              <item.icon className={cn(
                                "w-4 h-4",
                                `text-${item.color}-400`
                              )} />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                {item.label}
                              </span>
                              <p className="text-xs text-gray-500">Create new {item.type} visualization</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Settings Toggle */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all duration-200 border border-gray-700/50 backdrop-blur-sm group relative"
                >
                  <Settings2 className="w-4 h-4 text-gray-400 group-hover:text-white" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Settings
                  </span>
                </button>
                
                {/* Regenerate */}
                <button
                  onClick={generateDashboard}
                  className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all duration-200 border border-gray-700/50 backdrop-blur-sm group relative"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400 group-hover:text-blue-400 group-hover:rotate-180 transition-all duration-500" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Regenerate
                  </span>
                </button>
                
                {/* Download */}
                <button
                  className="p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-xl transition-all duration-200 border border-gray-700/50 backdrop-blur-sm group relative"
                >
                  <Download className="w-4 h-4 text-gray-400 group-hover:text-green-400" />
                  <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Download
                  </span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Settings Panel */}
          {showSettings && (
            <div className="mt-6 p-4 bg-gray-800/50 border border-gray-700/50 rounded-xl backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium text-white">Display Settings</h4>
                <button
                  onClick={() => setShowSettings(false)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      checked={showInsights}
                      onChange={(e) => setShowInsights(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-500 transition-all" />
                    <div className={cn(
                      "absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all",
                      showInsights && "translate-x-5"
                    )} />
                  </div>
                  <span className="text-sm text-gray-300">Show insights</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      defaultChecked
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-500 transition-all" />
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-5" />
                  </div>
                  <span className="text-sm text-gray-300">Auto-refresh</span>
                </label>
                
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      defaultChecked
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5 bg-gray-700 rounded-full peer peer-checked:bg-gradient-to-r peer-checked:from-blue-500 peer-checked:to-purple-500 transition-all" />
                    <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full transition-all peer-checked:translate-x-5" />
                  </div>
                  <span className="text-sm text-gray-300">Animations</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Charts Grid */}
      <div className={cn(
        "transition-all duration-500",
        layout === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 gap-8" 
          : "space-y-8"
      )}>
        {charts.map((chart, index) => (
          <div
            key={index}
            className={cn(
              "relative group bg-gradient-to-br from-gray-900/90 to-gray-800/90 rounded-2xl border transition-all duration-300 overflow-hidden backdrop-blur-sm",
              selectedChart === index 
                ? "border-blue-500/50 ring-4 ring-blue-500/20 shadow-2xl shadow-blue-500/20" 
                : "border-gray-800/50 hover:border-gray-700/50 hover:shadow-2xl hover:shadow-purple-500/5",
              hoveredChart === index && "scale-[1.02] -translate-y-1"
            )}
            onMouseEnter={() => setHoveredChart(index)}
            onMouseLeave={() => setHoveredChart(null)}
            onClick={() => setSelectedChart(index)}
          >
            {/* Gradient overlay on hover */}
            <div className={cn(
              "absolute inset-0 bg-gradient-to-br from-blue-500/0 via-purple-500/0 to-pink-500/0 transition-opacity duration-500",
              hoveredChart === index && "from-blue-500/5 via-purple-500/5 to-pink-500/5"
            )} />
            
            {/* Top accent line */}
            <div className={cn(
              "absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform scale-x-0 transition-transform duration-300",
              hoveredChart === index && "scale-x-100"
            )} />
            
            {/* Header with actions */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-gray-900/90 to-transparent z-10 pointer-events-none" />
            
            {/* Chart type badge */}
            <div className="absolute top-4 left-4 z-20">
              <div className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 backdrop-blur-md border shadow-lg",
                getChartTypeBadgeColor(chart.type)
              )}>
                <div className={cn(
                  "p-0.5 rounded",
                  `bg-gradient-to-r ${getChartTypeColor(chart.type)}`
                )}>
                  {getChartTypeIcon(chart.type)}
                </div>
                <span className="capitalize">{chart.type} chart</span>
              </div>
            </div>

            {/* Remove button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeChart(index);
              }}
              className="absolute top-4 right-4 p-2 bg-red-500/10 hover:bg-red-500/20 rounded-xl opacity-0 group-hover:opacity-100 transition-all z-20 border border-red-500/20 backdrop-blur-sm"
            >
              <X className="w-3.5 h-3.5 text-red-400" />
            </button>

            {/* Chart */}
            <div className="p-6 pt-16">
              <ChartRenderer 
                config={chart} 
                insights={showInsights ? getInsightsForChart(chart) : []}
              />
            </div>

            {/* Footer with insights and quick actions */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-20">
              {showInsights && getInsightsForChart(chart).length > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/90 backdrop-blur-md rounded-xl border border-gray-700/50">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-xs font-medium text-gray-300">
                    {getInsightsForChart(chart).length} insights available
                  </span>
                </div>
              )}
              
              <div className="flex items-center gap-2 ml-auto">
                <button className="p-1.5 bg-gray-800/90 backdrop-blur-md rounded-lg hover:bg-gray-700/90 transition-colors border border-gray-700/50">
                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                </button>
                <button className="p-1.5 bg-gray-800/90 backdrop-blur-md rounded-lg hover:bg-gray-700/90 transition-colors border border-gray-700/50">
                  <Maximize2 className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {charts.length === 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 rounded-2xl border border-gray-800/50 p-20 text-center shadow-2xl">
          {/* Animated background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent" />
          </div>
          
          <div className="relative">
            {/* Icon with rings */}
            <div className="relative w-32 h-32 mx-auto mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full animate-ping" />
              <div className="absolute inset-2 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full animate-pulse" />
              <div className="relative w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl flex items-center justify-center border border-gray-700">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-3xl" />
                <Brain className="w-16 h-16 text-blue-400 relative z-10" />
              </div>
            </div>
            
            <h3 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-3">
              No Charts Generated Yet
            </h3>
            <p className="text-gray-400 text-sm mb-10 max-w-lg mx-auto">
              Let our AI analyze your data and create intelligent visualizations automatically. 
              Get insights, trends, and patterns in seconds.
            </p>
            
            <button
              onClick={generateDashboard}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all shadow-2xl shadow-blue-500/25 group relative overflow-hidden"
            >
              <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Wand2 className="w-5 h-5 relative z-10 group-hover:rotate-12 transition-transform" />
              <span className="relative z-10 font-semibold">Generate Dashboard with AI</span>
              <Sparkles className="w-5 h-5 relative z-10 text-yellow-300" />
            </button>

            {/* Feature highlights */}
            <div className="flex justify-center gap-8 mt-12">
              {[
                { icon: Brain, text: 'AI-Powered', color: 'blue' },
                { icon: Zap, text: 'Real-time', color: 'yellow' },
                { icon: Shield, text: 'Secure', color: 'green' },
                { icon: Crown, text: 'Premium', color: 'purple' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10">
                  <item.icon className={cn(
                    "w-4 h-4",
                    `text-${item.color}-400`
                  )} />
                  <span className="text-xs text-gray-300">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Floating action bar when charts exist */}
      {charts.length > 0 && (
        <div className="sticky bottom-8 flex justify-center z-30">
          <div className="relative group">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur-xl opacity-50 group-hover:opacity-70 transition-opacity" />
            
            {/* Main bar */}
            <div className="relative bg-gray-900/90 backdrop-blur-xl border border-gray-700/50 rounded-full px-6 py-3 shadow-2xl">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
                    <span className="text-xs font-medium text-blue-300">{charts.length} charts</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {['bar', 'line', 'pie', 'area'].map(type => {
                      const count = charts.filter(c => c.type === type).length;
                      if (count === 0) return null;
                      return (
                        <div key={type} className={cn(
                          "px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1",
                          getChartTypeBadgeColor(type)
                        )}>
                          {getChartTypeIcon(type)}
                          <span>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div className="w-px h-6 bg-gray-700" />
                
                <button
                  onClick={generateDashboard}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 hover:from-blue-500/20 hover:to-purple-500/20 transition-all text-sm text-blue-400 hover:text-blue-300 border border-blue-500/20"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Regenerate
                </button>
                
                <button
                  onClick={() => addChart()}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 transition-all text-sm text-green-400 hover:text-green-300 border border-green-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Chart
                </button>
                
                <button
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20 transition-all text-sm text-purple-400 hover:text-purple-300 border border-purple-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}