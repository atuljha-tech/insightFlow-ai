'use client';

import { Insight } from '@/types/dashboard';
import { 
  TrendingUp, TrendingDown, AlertTriangle, Info, 
  Sparkles, ChevronRight, Zap, Target, Award,
  ArrowUpRight, ArrowDownRight, Minus, Circle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface InsightCardProps {
  insight: Insight;
  priority?: 'high' | 'medium' | 'low';
  expanded?: boolean;
  onAction?: () => void;
}

export default function InsightCard({ 
  insight, 
  priority = 'medium',
  expanded = false,
  onAction 
}: InsightCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(expanded);

  const getIcon = () => {
    switch (insight.type) {
      case 'positive':
        return <TrendingUp className="w-5 h-5" />;
      case 'negative':
        return <TrendingDown className="w-5 h-5" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getIconBackground = () => {
    switch (insight.type) {
      case 'positive':
        return 'bg-green-500/20 text-green-400 group-hover:bg-green-500/30 group-hover:scale-110';
      case 'negative':
        return 'bg-red-500/20 text-red-400 group-hover:bg-red-500/30 group-hover:scale-110';
      case 'warning':
        return 'bg-yellow-500/20 text-yellow-400 group-hover:bg-yellow-500/30 group-hover:scale-110';
      default:
        return 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30 group-hover:scale-110';
    }
  };

  const getGradient = () => {
    switch (insight.type) {
      case 'positive':
        return 'from-green-500/10 via-green-500/5 to-emerald-500/10';
      case 'negative':
        return 'from-red-500/10 via-red-500/5 to-rose-500/10';
      case 'warning':
        return 'from-yellow-500/10 via-yellow-500/5 to-amber-500/10';
      default:
        return 'from-blue-500/10 via-blue-500/5 to-purple-500/10';
    }
  };

  const getBorderColor = () => {
    switch (insight.type) {
      case 'positive':
        return 'border-green-500/20 group-hover:border-green-500/40';
      case 'negative':
        return 'border-red-500/20 group-hover:border-red-500/40';
      case 'warning':
        return 'border-yellow-500/20 group-hover:border-yellow-500/40';
      default:
        return 'border-blue-500/20 group-hover:border-blue-500/40';
    }
  };

  const getPriorityBadge = () => {
    switch (priority) {
      case 'high':
        return {
          bg: 'bg-red-500/20',
          text: 'text-red-400',
          border: 'border-red-500/30',
          label: 'High Priority',
          icon: <Zap className="w-3 h-3" />
        };
      case 'medium':
        return {
          bg: 'bg-yellow-500/20',
          text: 'text-yellow-400',
          border: 'border-yellow-500/30',
          label: 'Medium Priority',
          icon: <Target className="w-3 h-3" />
        };
      case 'low':
        return {
          bg: 'bg-blue-500/20',
          text: 'text-blue-400',
          border: 'border-blue-500/30',
          label: 'Low Priority',
          icon: <Circle className="w-3 h-3" />
        };
    }
  };

  // Fixed: Convert string impact to numeric value for display
  const getImpactValue = (impact?: 'high' | 'medium' | 'low'): number => {
    switch (impact) {
      case 'high':
        return 85; // 85% for high impact
      case 'medium':
        return 60; // 60% for medium impact
      case 'low':
        return 30; // 30% for low impact
      default:
        return 0;
    }
  };

  // Fixed: Get impact color based on string value
  const getImpactColor = (impact?: 'high' | 'medium' | 'low'): string => {
    switch (impact) {
      case 'high':
        return 'text-red-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  // Fixed: Get impact bar color based on string value
  const getImpactBarColor = (impact?: 'high' | 'medium' | 'low'): string => {
    switch (impact) {
      case 'high':
        return 'bg-red-400';
      case 'medium':
        return 'bg-yellow-400';
      case 'low':
        return 'bg-green-400';
      default:
        return 'bg-blue-400';
    }
  };

  const priorityBadge = getPriorityBadge();
  const impactValue = getImpactValue(insight.impact);

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-6",
        "border transition-all duration-300 hover:shadow-2xl",
        "hover:scale-[1.02] cursor-pointer",
        getBorderColor()
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsExpanded(!isExpanded)}
    >
      {/* Animated background gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500",
        getGradient()
      )} />
      
      {/* Shine effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

      {/* Decorative corner accent */}
      <div className={cn(
        "absolute top-0 right-0 w-20 h-20 bg-gradient-to-br opacity-0 group-hover:opacity-20 transition-opacity duration-500 rounded-bl-full",
        insight.type === 'positive' && 'from-green-500 to-emerald-500',
        insight.type === 'negative' && 'from-red-500 to-rose-500',
        insight.type === 'warning' && 'from-yellow-500 to-amber-500',
        insight.type === 'neutral' && 'from-blue-500 to-purple-500'
      )} />

      <div className="relative space-y-4">
        {/* Header with icon and priority */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-xl transition-all duration-300",
              getIconBackground()
            )}>
              {getIcon()}
            </div>
            
            {/* Priority badge */}
            <div className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
              priorityBadge.bg,
              priorityBadge.text,
              priorityBadge.border
            )}>
              {priorityBadge.icon}
              <span>{priorityBadge.label}</span>
            </div>
          </div>

          {/* Confidence indicator */}
          {insight.confidence && (
            <div className="flex items-center gap-2">
              <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    insight.type === 'positive' && 'bg-green-400',
                    insight.type === 'negative' && 'bg-red-400',
                    insight.type === 'warning' && 'bg-yellow-400',
                    insight.type === 'neutral' && 'bg-blue-400'
                  )}
                  style={{ width: `${insight.confidence * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400">
                {Math.round(insight.confidence * 100)}% confidence
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-white flex items-center gap-2">
              {insight.title}
              {insight.isNew && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-400 rounded-full border border-blue-500/30">
                  NEW
                </span>
              )}
            </h4>
            
            {/* Metric with change */}
            {insight.metric && (
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-white">{insight.metric}</span>
                {insight.change !== undefined && (
                  <div className={cn(
                    "flex items-center gap-0.5 text-sm font-medium px-1.5 py-0.5 rounded",
                    insight.change > 0 ? 'bg-green-500/20 text-green-400' :
                    insight.change < 0 ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  )}>
                    {insight.change > 0 ? <ArrowUpRight className="w-3 h-3" /> :
                     insight.change < 0 ? <ArrowDownRight className="w-3 h-3" /> :
                     <Minus className="w-3 h-3" />}
                    <span>{Math.abs(insight.change)}%</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <p className={cn(
            "text-gray-400 text-sm leading-relaxed transition-all duration-300",
            !isExpanded && "line-clamp-2"
          )}>
            {insight.description}
          </p>

          {/* Fixed: Impact meter with string values */}
          {insight.impact && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Impact</span>
                <span className={getImpactColor(insight.impact)}>
                  {insight.impact.charAt(0).toUpperCase() + insight.impact.slice(1)}
                </span>
              </div>
              <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    getImpactBarColor(insight.impact)
                  )}
                  style={{ width: `${impactValue}%` }}
                />
              </div>
            </div>
          )}

          {/* Expanded content */}
          {isExpanded && insight.details && (
            <div className="mt-4 p-4 bg-gray-800/50 rounded-xl border border-gray-700 animate-in slide-in-from-top-2 duration-300">
              <p className="text-sm text-gray-300">{insight.details}</p>
              
              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction?.();
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-xs font-medium"
                >
                  <Zap className="w-3 h-3" />
                  Take Action
                </button>
                <button className="flex items-center gap-1 px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-xs font-medium">
                  <Info className="w-3 h-3" />
                  Learn More
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer with metadata */}
        <div className="flex items-center justify-between pt-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-gray-500">Source:</span>
            <span className="text-gray-300">{insight.source || 'AI Analysis'}</span>
          </div>
          
          {/* Timestamp */}
          {insight.timestamp && (
            <div className="flex items-center gap-1 text-gray-500">
              <span className="w-1 h-1 bg-gray-500 rounded-full" />
              <span>{new Date(insight.timestamp).toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {/* Expand/Collapse indicator */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ChevronRight className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
            isExpanded && "rotate-90"
          )} />
        </div>

        {/* Sparkline decoration */}
        <div className="absolute bottom-0 left-0 right-0 h-1 flex gap-0.5 px-6">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={cn(
                "flex-1 h-full rounded-full transition-all duration-300",
                insight.type === 'positive' && 'bg-green-400/30',
                insight.type === 'negative' && 'bg-red-400/30',
                insight.type === 'warning' && 'bg-yellow-400/30',
                insight.type === 'neutral' && 'bg-blue-400/30'
              )}
              style={{ 
                height: `${Math.sin(i * 0.5) * 50 + 50}%`,
                opacity: isHovered ? 0.5 : 0.2
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}