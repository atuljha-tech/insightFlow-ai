// Update the import path if the file is actually at '../server/groq' or similar
// import { groqServerClient } from './server/groq';
import { groqServerClient } from '../server/groq';
import { dbManager } from './db';

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning' | 'discovery';
  title: string;
  description: string;
  metric?: string;
  change?: number;
  category?: string;
  confidence: number;
}

class AIInsightsGenerator {
  /**
   * Generate insights from query results
   */
  async generateInsights(data: any[], query: string, context?: string): Promise<Insight[]> {
    const insights: Insight[] = [];

    try {
      // Statistical insights (always available)
      insights.push(...this.generateStatisticalInsights(data));

      // Trend insights
      insights.push(...this.generateTrendInsights(data));

      // AI-powered insights (only if API available)
      if (groqServerClient.isReady()) {
        const aiInsights = await this.generateAIInsights(data, query, context);
        insights.push(...aiInsights);
      }

      return this.prioritizeInsights(insights);
    } catch (error) {
      console.error('Insight generation error:', error);
      return this.getFallbackInsights(data);
    }
  }

  /**
   * Generate statistical insights
   */
  private generateStatisticalInsights(data: any[]): Insight[] {
    const insights: Insight[] = [];
    if (data.length === 0) return insights;

    const columns = Object.keys(data[0]);
    const numericColumns = columns.filter(col => 
      typeof data[0][col] === 'number'
    );

    numericColumns.forEach(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
      if (values.length === 0) return;

      const total = values.reduce((a, b) => a + b, 0);
      const avg = total / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const maxItem = data.find(row => Number(row[col]) === max);

      // Total insight
      insights.push({
        id: `stat-total-${col}-${Date.now()}`,
        type: 'neutral',
        title: `Total ${col}`,
        description: `Total ${col} is ${this.formatNumber(total)}`,
        metric: this.formatNumber(total),
        confidence: 1,
        category: 'statistical'
      });

      // Top performer
      if (maxItem) {
        const topName = maxItem.name || maxItem[Object.keys(maxItem)[0]] || 'Top item';
        insights.push({
          id: `stat-max-${col}-${Date.now()}`,
          type: 'positive',
          title: `Top ${col} Performer`,
          description: `${topName} leads with ${this.formatNumber(max)} ${col}`,
          metric: this.formatNumber(max),
          confidence: 0.95,
          category: 'performance'
        });
      }
    });

    return insights;
  }

  /**
   * Generate trend insights
   */
  private generateTrendInsights(data: any[]): Insight[] {
    const insights: Insight[] = [];
    if (data.length < 3) return insights;

    const numericColumns = Object.keys(data[0]).filter(col => 
      typeof data[0][col] === 'number'
    );

    numericColumns.forEach(col => {
      const values = data.map(row => Number(row[col]));
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      
      if (firstHalf.length === 0 || secondHalf.length === 0) return;
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      const change = ((secondAvg - firstAvg) / firstAvg) * 100;

      if (Math.abs(change) > 10) {
        insights.push({
          id: `trend-${col}-${Date.now()}`,
          type: change > 0 ? 'positive' : 'negative',
          title: `${col} ${change > 0 ? 'Upward' : 'Downward'} Trend`,
          description: `${col} has ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}%`,
          metric: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
          change: change,
          confidence: 0.85,
          category: 'trend'
        });
      }
    });

    return insights;
  }

  /**
   * Generate AI-powered insights
   */
  private async generateAIInsights(data: any[], query: string, context?: string): Promise<Insight[]> {
    try {
      const dataSample = data.slice(0, 3);
      const columns = Object.keys(data[0] || {});

      const prompt = `Analyze this business data and provide 2 key insights:

Query: "${query}"
Data Sample: ${JSON.stringify(dataSample)}
Columns: ${columns.join(', ')}

Return as JSON array with objects containing:
- type: "positive"/"negative"/"neutral"/"warning"/"discovery"
- title: short title
- description: detailed insight
- metric: key number if applicable`;

      const response = await groqServerClient.complete([
        { role: 'system', content: 'You are a business analyst. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ]);

      if (!response) return [];

      try {
        const aiInsights = JSON.parse(response);
        return Array.isArray(aiInsights) ? aiInsights.map((insight, i) => ({
          ...insight,
          id: `ai-${i}-${Date.now()}`,
          confidence: 0.7,
          category: 'ai-generated'
        })) : [];
      } catch (e) {
        return [];
      }
    } catch (error) {
      return [];
    }
  }

  /**
   * Prioritize insights
   */
  private prioritizeInsights(insights: Insight[]): Insight[] {
    const priorityOrder = {
      'warning': 1,
      'positive': 2,
      'negative': 2,
      'discovery': 3,
      'neutral': 4
    };

    return insights
      .sort((a, b) => {
        const priorityA = priorityOrder[a.type] || 5;
        const priorityB = priorityOrder[b.type] || 5;
        if (priorityA !== priorityB) return priorityA - priorityB;
        return b.confidence - a.confidence;
      })
      .slice(0, 5);
  }

  /**
   * Get fallback insights
   */
  private getFallbackInsights(data: any[]): Insight[] {
    return [
      {
        id: `fallback-${Date.now()}`,
        type: 'neutral',
        title: 'Data Analysis Complete',
        description: `Analyzed ${data.length} records. Try more specific queries.`,
        confidence: 0.5,
        category: 'system'
      }
    ];
  }

  /**
   * Format numbers
   */
  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(0)}`;
  }
}

export const aiInsights = new AIInsightsGenerator();