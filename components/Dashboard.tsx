'use client';

import { useState, useEffect } from 'react';
import { DashboardState } from '@/types/dashboard';
import DashboardGenerator from './DashboardGenerator';
import DataStats from './DataStats';
import InsightCard from './InsightCard';
import { useInsights } from '@/hooks/useInsights';
import { exportUtils } from '@/lib/exportUtils';
import { chatContext } from '@/lib/chatContext.client';
import { 
  RefreshCw, Download, Filter, Calendar, Layout, 
  Share2, Camera, FileText, Copy, Sparkles,
  ChevronDown, ChevronUp, BarChart2, PieChart, DownloadCloud,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Info,
  Maximize2, Minimize2, Clock, Database, Activity,
  Layers, LineChart, Table as TableIcon, Grid3X3,
  Code
} from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DashboardProps {
  data?: any;
  query?: string;
}

export default function Dashboard({ data, query }: DashboardProps) {
  const [view, setView] = useState<'stats' | 'dashboard'>('dashboard');
  const [dashboardData, setDashboardData] = useState<any[]>([]);
  const [currentQuery, setCurrentQuery] = useState('');
  const [showInsights, setShowInsights] = useState(true);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const { insights, loading: insightsLoading } = useInsights(dashboardData, currentQuery);

  useEffect(() => {
    if (data?.rawData) {
      setDashboardData(data.rawData);
    } else if (data?.data) {
      setDashboardData(data.data);
    }
    
    if (query || data?.query?.original) {
      setCurrentQuery(query || data.query.original);
    }
  }, [data, query]);

  const handleExport = async (format: 'png' | 'pdf' | 'csv' | 'share' | 'json') => {
    try {
      const toastId = toast.loading(`Preparing ${format.toUpperCase()}...`);
      
      switch (format) {
        case 'png':
          await exportUtils.exportAsPNG('dashboard-content', `dashboard-${Date.now()}`);
          toast.success('PNG saved!', { id: toastId });
          break;
        case 'pdf':
          await exportUtils.exportAsPDF('dashboard-content', `dashboard-${Date.now()}`);
          toast.success('PDF saved!', { id: toastId });
          break;
        case 'csv':
          exportUtils.exportAsCSV(dashboardData, `data-${Date.now()}`);
          toast.success('CSV exported!', { id: toastId });
          break;
        case 'json':
          exportUtils.exportAsJSON(dashboardData, `data-${Date.now()}`);
          toast.success('JSON exported!', { id: toastId });
          break;
        case 'share':
          const shareLink = exportUtils.generateShareLink({
            data: dashboardData,
            query: currentQuery,
            insights
          });
          await exportUtils.copyToClipboard(shareLink);
          toast.success('Link copied!', { id: toastId, icon: '🔗' });
          break;
      }
    } catch (error) {
      toast.error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setExportMenuOpen(false);
    }
  };

  const getTopInsights = () => insights.slice(0, 3);

  const getInsightIcon = (type: string) => {
    switch(type) {
      case 'positive': return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
      case 'negative': return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
      case 'warning': return <AlertCircle className="w-3.5 h-3.5 text-amber-400" />;
      default: return <Info className="w-3.5 h-3.5 text-blue-400" />;
    }
  };

  const formatLastUpdated = () => {
    return new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div 
      className={cn(
        "space-y-6 transition-all duration-500",
        isFullscreen && "fixed inset-0 z-50 bg-[#0A0A0F] p-8 overflow-y-auto"
      )} 
      id="dashboard-content"
    >
      {/* Glass Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F0F17] via-[#0A0A0F] to-[#0F0F17] border border-[#1F2937] p-6 group">
        {/* Animated gradient orbs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse animation-delay-1000" />
        
        <div className="relative flex flex-col lg:flex-row items-start justify-between gap-4">
          {/* Title Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-white tracking-tight">
                    Analytics Dashboard
                  </h1>
                  <span className="px-2 py-1 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30 flex items-center gap-1">
                    <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" />
                    Live
                  </span>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  Last updated {formatLastUpdated()}
                </p>
              </div>
            </div>
            {currentQuery && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-lg border border-blue-500/20">
                <Activity className="w-3.5 h-3.5 text-blue-400" />
                <span className="text-xs text-blue-300">Query: "{currentQuery}"</span>
              </div>
            )}
          </div>

          {/* Controls Section */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Time Range Pills */}
            <div className="flex bg-[#111118] rounded-xl p-1 border border-[#1F2937]">
              {(['day', 'week', 'month', 'year'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-medium rounded-lg transition-all capitalize",
                    timeRange === range
                      ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25"
                      : "text-gray-500 hover:text-white"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Icon Buttons Group */}
            <div className="flex items-center gap-1">
              {/* Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setFilterMenuOpen(!filterMenuOpen)}
                  className="p-2 bg-[#111118] hover:bg-[#1F2937] rounded-xl transition-all border border-[#1F2937] group/btn"
                >
                  <Filter className="w-4 h-4 text-gray-500 group-hover/btn:text-blue-400" />
                </button>
                
                {filterMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#111118] rounded-xl border border-[#1F2937] shadow-2xl z-20 backdrop-blur-sm">
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-500 px-2 py-1">Filter by</p>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#1F2937] rounded-lg transition-colors">
                        Date Range
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#1F2937] rounded-lg transition-colors">
                        Category
                      </button>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#1F2937] rounded-lg transition-colors">
                        Value &gt; 1000
                      </button>
                      <div className="border-t border-[#1F2937] my-1" />
                      <button className="w-full px-3 py-2 text-left text-sm text-rose-400 hover:bg-[#1F2937] rounded-lg transition-colors">
                        Clear Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Calendar */}
              <button className="p-2 bg-[#111118] hover:bg-[#1F2937] rounded-xl transition-all border border-[#1F2937] group/btn">
                <Calendar className="w-4 h-4 text-gray-500 group-hover/btn:text-blue-400" />
              </button>

              {/* Fullscreen Toggle */}
              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 bg-[#111118] hover:bg-[#1F2937] rounded-xl transition-all border border-[#1F2937] group/btn"
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-gray-500 group-hover/btn:text-blue-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-gray-500 group-hover/btn:text-blue-400" />
                )}
              </button>

              {/* Export Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="p-2 bg-[#111118] hover:bg-[#1F2937] rounded-xl transition-all border border-[#1F2937] group/btn"
                >
                  <DownloadCloud className="w-4 h-4 text-gray-500 group-hover/btn:text-blue-400" />
                </button>
                
                {exportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#111118] rounded-xl border border-[#1F2937] shadow-2xl z-20 backdrop-blur-sm">
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-500 px-2 py-1">Export as</p>
                      <button onClick={() => handleExport('png')} className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#1F2937] rounded-lg transition-colors flex items-center gap-2">
                        <Camera className="w-4 h-4" /> PNG
                      </button>
                      <button onClick={() => handleExport('pdf')} className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#1F2937] rounded-lg transition-colors flex items-center gap-2">
                        <FileText className="w-4 h-4" /> PDF
                      </button>
                      <button onClick={() => handleExport('csv')} className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#1F2937] rounded-lg transition-colors flex items-center gap-2">
                        <Download className="w-4 h-4" /> CSV
                      </button>
                      <button onClick={() => handleExport('json')} className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#1F2937] rounded-lg transition-colors flex items-center gap-2">
                        <Code className="w-4 h-4" /> JSON
                      </button>
                      <div className="border-t border-[#1F2937] my-1" />
                      <button onClick={() => handleExport('share')} className="w-full px-3 py-2 text-left text-sm text-gray-300 hover:bg-[#1F2937] rounded-lg transition-colors flex items-center gap-2">
                        <Share2 className="w-4 h-4" /> Share Link
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Refresh Button */}
              <button className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-xl transition-all shadow-lg shadow-blue-500/25 group/btn">
                <RefreshCw className="w-4 h-4 text-white group-hover/btn:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* View Toggle & Quick Stats */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex bg-[#111118] rounded-xl p-1 border border-[#1F2937]">
          <button
            onClick={() => setView('stats')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              view === 'stats' 
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25" 
                : "text-gray-500 hover:text-white"
            )}
          >
            <Database className="w-4 h-4" />
            Statistics
          </button>
          <button
            onClick={() => setView('dashboard')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2",
              view === 'dashboard' 
                ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25" 
                : "text-gray-500 hover:text-white"
            )}
          >
            <Grid3X3 className="w-4 h-4" />
            Dashboard
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-[#111118] rounded-xl border border-[#1F2937]">
            <span className="text-xs text-gray-500">Records</span>
            <span className="ml-2 text-sm font-semibold text-white">{dashboardData.length.toLocaleString()}</span>
          </div>
          <div className="px-3 py-1.5 bg-[#111118] rounded-xl border border-[#1F2937]">
            <span className="text-xs text-gray-500">Columns</span>
            <span className="ml-2 text-sm font-semibold text-white">
              {dashboardData[0] ? Object.keys(dashboardData[0]).length : 0}
            </span>
          </div>
        </div>
      </div>

      {/* AI Insights Banner - Collapsible */}
      {insights.length > 0 && (
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
          <div className="relative bg-[#111118]/90 backdrop-blur-xl border border-[#1F2937] rounded-2xl overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl" />
            
            <div className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/25">
                    <Sparkles className="w-5 h-5 text-white" />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-white font-semibold">AI-Generated Insights</h3>
                      {insightsLoading && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-500/10 rounded-full">
                          <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
                          <span className="text-xs text-blue-300">Analyzing...</span>
                        </div>
                      )}
                      <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 rounded-full border border-blue-500/30">
                        {insights.length} insights
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {getTopInsights().map((insight, i) => (
                        <div 
                          key={insight.id || i} 
                          className="flex items-start gap-3 p-3 bg-[#1F2937]/50 rounded-xl hover:bg-[#1F2937] transition-colors group/insight"
                        >
                          <div className={cn(
                            "p-1.5 rounded-lg transition-transform group-hover/insight:scale-110",
                            insight.type === 'positive' ? 'bg-emerald-500/20' :
                            insight.type === 'negative' ? 'bg-rose-500/20' :
                            insight.type === 'warning' ? 'bg-amber-500/20' :
                            'bg-blue-500/20'
                          )}>
                            {getInsightIcon(insight.type || 'info')}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-gray-300 leading-relaxed">{insight.description}</p>
                            {insight.metric && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-gray-500">Value:</span>
                                <span className="text-xs font-semibold text-white bg-[#111118] px-2 py-0.5 rounded-md">
                                  {insight.metric}
                                </span>
                                {insight.change && (
                                  <span className={cn(
                                    "text-xs",
                                    insight.change > 0 ? 'text-emerald-400' : 'text-rose-400'
                                  )}>
                                    {insight.change > 0 ? '↑' : '↓'} {Math.abs(insight.change)}%
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {insights.length > 2 && (
                      <button 
                        onClick={() => setShowInsights(!showInsights)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-400 transition-colors"
                      >
                        <span>View {showInsights ? 'less' : `all ${insights.length} insights`}</span>
                        {showInsights ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setShowInsights(!showInsights)}
                  className="p-2 hover:bg-[#1F2937] rounded-lg transition-colors ml-4"
                >
                  {showInsights ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                </button>
              </div>

              {/* Expanded Insights */}
              {showInsights && insights.length > 2 && (
                <div className="mt-4 pt-4 border-t border-[#1F2937] grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {insights.slice(2).map((insight, i) => (
                    <div key={insight.id || i} className="flex items-start gap-2 p-2 bg-[#1F2937]/30 rounded-lg">
                      {getInsightIcon(insight.type || 'info')}
                      <span className="text-xs text-gray-400">{insight.description}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Statistics with Animation */}
      <div className="transition-all duration-300 hover:scale-[1.01]">
        <DataStats data={dashboardData} />
      </div>

      {/* Dynamic Content with Fade Animation */}
      <div className="transition-all duration-500 ease-in-out">
        {view === 'stats' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Data Summary Card */}
            <div className="group relative bg-gradient-to-br from-[#111118] to-[#0A0A0F] p-6 rounded-2xl border border-[#1F2937] hover:border-blue-500/30 transition-all hover:shadow-xl hover:shadow-blue-500/5">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                    <Database className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Data Summary</h3>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-[#1F2937]/30 rounded-xl group-hover:bg-[#1F2937]/50 transition-colors">
                    <span className="text-gray-400">Total Records</span>
                    <span className="text-xl font-bold text-white">{dashboardData.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#1F2937]/30 rounded-xl group-hover:bg-[#1F2937]/50 transition-colors">
                    <span className="text-gray-400">Total Columns</span>
                    <span className="text-xl font-bold text-white">
                      {dashboardData[0] ? Object.keys(dashboardData[0]).length : 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#1F2937]/30 rounded-xl group-hover:bg-[#1F2937]/50 transition-colors">
                    <span className="text-gray-400">Data Freshness</span>
                    <span className="text-sm font-medium text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                      Real-time
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Quick Actions Card */}
            <div className="group relative bg-gradient-to-br from-[#111118] to-[#0A0A0F] p-6 rounded-2xl border border-[#1F2937] hover:border-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/5">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
                    <Layers className="w-5 h-5 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: Download, label: 'Export', color: 'blue' },
                    { icon: Share2, label: 'Share', color: 'green' },
                    { icon: Copy, label: 'Duplicate', color: 'amber' },
                    { icon: FileText, label: 'Report', color: 'purple' },
                  ].map((action, i) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={i}
                        className="p-3 bg-[#1F2937]/30 hover:bg-[#1F2937] rounded-xl text-sm text-gray-300 transition-all flex flex-col items-center gap-1 group/btn"
                      >
                        <Icon className={cn(
                          "w-4 h-4 transition-transform group-hover/btn:scale-110",
                          action.color === 'blue' && 'text-blue-400',
                          action.color === 'green' && 'text-emerald-400',
                          action.color === 'amber' && 'text-amber-400',
                          action.color === 'purple' && 'text-purple-400',
                        )} />
                        <span className="text-xs">{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Performance Card */}
            <div className="group relative bg-gradient-to-br from-[#111118] to-[#0A0A0F] p-6 rounded-2xl border border-[#1F2937] hover:border-emerald-500/30 transition-all hover:shadow-xl hover:shadow-emerald-500/5">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
              
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                    <Activity className="w-5 h-5 text-emerald-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Performance</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Response Time</span>
                    <span className="text-white font-medium">124ms</span>
                  </div>
                  <div className="w-full bg-[#1F2937] rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-400 to-teal-400 h-1.5 rounded-full animate-pulse" style={{ width: '92%' }} />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Cache Hit Rate</span>
                    <span className="text-emerald-400 font-medium">94%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Query Speed</span>
                    <span className="text-blue-400 font-medium">0.3s</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <DashboardGenerator 
              data={dashboardData}
              query={currentQuery}
            />
          </div>
        )}
      </div>

      {/* Add animation keyframes to globals.css if not already present */}
      <style jsx>{`
        @keyframes slideInFromBottom {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-in {
          animation: slideInFromBottom 0.5s ease-out forwards;
        }
        .animation-delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </div>
  );
}