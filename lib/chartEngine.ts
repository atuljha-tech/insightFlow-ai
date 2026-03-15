import { ChartConfig, ChartData } from '@/types/dashboard';

export interface ChartSuggestion {
  type: 'bar' | 'line' | 'pie' | 'area' | 'metric' | 'table';
  title: string;
  description: string;
  confidence: number;
  reasoning: string;
}

export interface ChartDataConfig {
  data: any[];
  columns: string[];
  queryIntent?: string;
  dimensions?: string[];
  metrics?: string[];
}

class ChartIntelligenceEngine {
  /**
   * Analyze data and suggest the best chart type
   */
  suggestChartType(config: ChartDataConfig): ChartSuggestion {
    const { data, columns, queryIntent, dimensions, metrics } = config;
    
    if (!data || data.length === 0) {
      return this.getFallbackSuggestion('No data available');
    }

    // Analyze data characteristics
    const numericColumns = this.getNumericColumns(data[0], columns);
    const categoricalColumns = this.getCategoricalColumns(data[0], columns);
    const dateColumns = this.getDateColumns(data[0], columns);
    
    // Check if it's time series data
    const hasTimeData = dateColumns.length > 0 || 
                       columns.some(col => col.toLowerCase().includes('date') || 
                                          col.toLowerCase().includes('month') ||
                                          col.toLowerCase().includes('year'));

    // Check data cardinality
    const uniqueValues = this.getUniqueValueCounts(data, categoricalColumns);

    // Apply chart selection rules
    return this.applyChartRules({
      data,
      numericColumns,
      categoricalColumns,
      dateColumns,
      hasTimeData,
      uniqueValues,
      queryIntent,
      dimensions,
      metrics,
      rowCount: data.length
    });
  }

  /**
   * Get numeric columns from data
   */
  private getNumericColumns(sampleRow: any, allColumns: string[]): string[] {
    return allColumns.filter(col => {
      const value = sampleRow[col];
      return typeof value === 'number' || 
             (typeof value === 'string' && !isNaN(Number(value)) && value !== '');
    });
  }

  /**
   * Get categorical columns from data
   */
  private getCategoricalColumns(sampleRow: any, allColumns: string[]): string[] {
    return allColumns.filter(col => {
      const value = sampleRow[col];
      return typeof value === 'string' && isNaN(Number(value)) && !this.isDate(value);
    });
  }

  /**
   * Get date columns from data
   */
  private getDateColumns(sampleRow: any, allColumns: string[]): string[] {
    return allColumns.filter(col => {
      const value = sampleRow[col];
      return this.isDate(value) || 
             col.toLowerCase().includes('date') || 
             col.toLowerCase().includes('time');
    });
  }

  /**
   * Check if a value is a date
   */
  private isDate(value: any): boolean {
    if (typeof value !== 'string') return false;
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{4}-\d{2}$/, // YYYY-MM
      /^\d{2}\/\d{4}$/ // MM/YYYY
    ];
    return datePatterns.some(pattern => pattern.test(value)) || 
           !isNaN(Date.parse(value));
  }

  /**
   * Get count of unique values for categorical columns
   */
  private getUniqueValueCounts(data: any[], categoricalColumns: string[]): Map<string, number> {
    const uniqueCounts = new Map<string, number>();
    
    categoricalColumns.forEach(col => {
      const uniqueValues = new Set(data.map(row => row[col]).filter(Boolean));
      uniqueCounts.set(col, uniqueValues.size);
    });
    
    return uniqueCounts;
  }

  /**
   * Apply chart selection rules
   */
  private applyChartRules(context: any): ChartSuggestion {
    const {
      data,
      numericColumns,
      categoricalColumns,
      dateColumns,
      hasTimeData,
      uniqueValues,
      queryIntent,
      dimensions,
      metrics,
      rowCount
    } = context;

    // Rule 1: Single metric card
    if (numericColumns.length === 1 && rowCount === 1) {
      return {
        type: 'metric',
        title: this.generateTitle('metric', dimensions, metrics),
        description: 'Single value metric',
        confidence: 1,
        reasoning: 'Data contains a single numeric value - best displayed as a metric card'
      };
    }

    // Rule 2: Time series data
    if (hasTimeData || dateColumns.length > 0) {
      // Check if we have enough data points for a meaningful trend
      if (rowCount >= 3) {
        return {
          type: 'line',
          title: this.generateTitle('trend', dimensions, metrics),
          description: 'Time series trend analysis',
          confidence: 0.95,
          reasoning: 'Data contains time-based information - line chart shows trends effectively'
        };
      } else {
        return {
          type: 'bar',
          title: this.generateTitle('comparison', dimensions, metrics),
          description: 'Time-based comparison',
          confidence: 0.8,
          reasoning: 'Limited time points - bar chart better for comparison'
        };
      }
    }

    // Rule 3: Pie chart for parts-of-whole
    if (categoricalColumns.length === 1 && numericColumns.length === 1) {
      const uniqueCatCount = uniqueValues.get(categoricalColumns[0]) || 0;
      
      if (uniqueCatCount <= 6 && uniqueCatCount > 1) {
        return {
          type: 'pie',
          title: this.generateTitle('distribution', dimensions, metrics),
          description: 'Category distribution analysis',
          confidence: 0.9,
          reasoning: `${uniqueCatCount} categories - pie chart shows proportional distribution well`
        };
      }
      
      if (uniqueCatCount > 6) {
        return {
          type: 'bar',
          title: this.generateTitle('comparison', dimensions, metrics),
          description: 'Multi-category comparison',
          confidence: 0.85,
          reasoning: `${uniqueCatCount} categories - bar chart better for comparing many items`
        };
      }
    }

    // Rule 4: Based on query intent
    if (queryIntent) {
      switch (queryIntent) {
        case 'trend':
          return {
            type: 'line',
            title: this.generateTitle('trend', dimensions, metrics),
            description: 'Trend analysis',
            confidence: 0.9,
            reasoning: 'Query intent is trend analysis - line chart is most appropriate'
          };
          
        case 'comparison':
          return {
            type: 'bar',
            title: this.generateTitle('comparison', dimensions, metrics),
            description: 'Comparative analysis',
            confidence: 0.9,
            reasoning: 'Query intent is comparison - bar chart shows differences clearly'
          };
          
        case 'distribution':
          if (numericColumns.length === 1 && categoricalColumns.length === 1) {
            const uniqueCount = uniqueValues.get(categoricalColumns[0]) || 0;
            if (uniqueCount <= 6) {
              return {
                type: 'pie',
                title: this.generateTitle('distribution', dimensions, metrics),
                description: 'Distribution analysis',
                confidence: 0.9,
                reasoning: 'Query intent is distribution - pie chart shows proportions'
              };
            }
          }
          break;
          
        case 'ranking':
          return {
            type: 'bar',
            title: this.generateTitle('ranking', dimensions, metrics),
            description: 'Ranking analysis',
            confidence: 0.95,
            reasoning: 'Query intent is ranking - bar chart with sorted data shows hierarchy'
          };
      }
    }

    // Rule 5: Default to bar chart for most comparisons
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      return {
        type: 'bar',
        title: this.generateTitle('analysis', dimensions, metrics),
        description: 'Multi-dimensional analysis',
        confidence: 0.7,
        reasoning: 'Standard comparison view - bar chart is safe default'
      };
    }

    // Rule 6: Table for complex/multi-dimensional data
    if (categoricalColumns.length > 1 && numericColumns.length > 1) {
      return {
        type: 'table',
        title: this.generateTitle('detailed', dimensions, metrics),
        description: 'Detailed data view',
        confidence: 0.8,
        reasoning: 'Multiple dimensions and metrics - table shows all data clearly'
      };
    }

    // Fallback
    return this.getFallbackSuggestion('Default visualization');
  }

  /**
   * Generate intelligent chart title
   */
  private generateTitle(
    type: string,
    dimensions?: string[],
    metrics?: string[]
  ): string {
    const dimensionStr = dimensions && dimensions.length > 0 
      ? dimensions.join(' and ') 
      : 'Categories';
    
    const metricStr = metrics && metrics.length > 0
      ? metrics.join(' vs ')
      : 'Values';

    switch (type) {
      case 'trend':
        return `${metricStr} Trend Over ${dimensionStr}`;
      case 'comparison':
        return `${metricStr} by ${dimensionStr}`;
      case 'distribution':
        return `${dimensionStr} Distribution of ${metricStr}`;
      case 'ranking':
        return `Top ${dimensionStr} by ${metricStr}`;
      case 'detailed':
        return `Detailed ${metricStr} Analysis by ${dimensionStr}`;
      default:
        return `${metricStr} Analysis by ${dimensionStr}`;
    }
  }

  /**
   * Get fallback suggestion
   */
  private getFallbackSuggestion(reason: string): ChartSuggestion {
    return {
      type: 'table',
      title: 'Data Overview',
      description: 'Complete data view',
      confidence: 0.5,
      reasoning: reason
    };
  }

  /**
   * Prepare data for specific chart type
   */
  prepareDataForChart(data: any[], chartType: string, config: any): ChartData[] {
    switch (chartType) {
      case 'pie':
        return this.preparePieData(data, config);
      case 'line':
        return this.prepareTimeSeriesData(data, config);
      case 'bar':
        return this.prepareComparisonData(data, config);
      case 'metric':
        return this.prepareMetricData(data, config);
      default:
        return data;
    }
  }

  /**
   * Prepare data for pie chart
   */
  private preparePieData(data: any[], config: any): ChartData[] {
    const { categoryColumn, valueColumn } = config;
    
    if (!categoryColumn || !valueColumn) return data;

    // Aggregate if needed
    const aggregated = new Map<string, number>();
    
    data.forEach(row => {
      const category = row[categoryColumn];
      const value = Number(row[valueColumn]) || 0;
      
      if (aggregated.has(category)) {
        aggregated.set(category, (aggregated.get(category) || 0) + value);
      } else {
        aggregated.set(category, value);
      }
    });

    return Array.from(aggregated.entries()).map(([name, value]) => ({
      name,
      value
    }));
  }

  /**
   * Prepare data for time series
   */
  private prepareTimeSeriesData(data: any[], config: any): ChartData[] {
    const { dateColumn, valueColumns } = config;
    
    if (!dateColumn) return data;

    // Sort by date
    return [...data]
      .sort((a, b) => new Date(a[dateColumn]).getTime() - new Date(b[dateColumn]).getTime())
      .map(row => {
        const newRow: ChartData = { name: row[dateColumn] };
        valueColumns?.forEach((col: string) => {
          newRow[col] = Number(row[col]) || 0;
        });
        return newRow;
      });
  }

  /**
   * Prepare data for comparison (bar chart)
   */
  private prepareComparisonData(data: any[], config: any): ChartData[] {
    const { categoryColumn, valueColumns } = config;
    
    if (!categoryColumn) return data;

    // Aggregate by category
    const aggregated = new Map<string, any>();
    
    data.forEach(row => {
      const category = row[categoryColumn];
      
      if (!aggregated.has(category)) {
        const newRow: any = { name: category };
        valueColumns?.forEach((col: string) => {
          newRow[col] = 0;
        });
        aggregated.set(category, newRow);
      }
      
      const current = aggregated.get(category);
      valueColumns?.forEach((col: string) => {
        current[col] = (current[col] || 0) + (Number(row[col]) || 0);
      });
    });

    return Array.from(aggregated.values());
  }

  /**
   * Prepare data for metric card
   */
  private prepareMetricData(data: any[], config: any): ChartData[] {
    const { metricColumn } = config;
    
    if (!metricColumn || data.length === 0) {
      return [{ name: 'Value', value: 0 }];
    }

    // Sum or average based on context
    const total = data.reduce((sum, row) => sum + (Number(row[metricColumn]) || 0), 0);
    
    return [{
      name: metricColumn,
      value: total
    }];
  }

  /**
   * Generate multiple chart suggestions from a single query
   */
  generateDashboardSuggestions(data: any[], query: string): ChartConfig[] {
    const suggestions: ChartConfig[] = [];
    
    // Get columns from first row
    if (data.length === 0) return suggestions;
    const columns = Object.keys(data[0]);

    // Get numeric columns
    const numericColumns = this.getNumericColumns(data[0], columns);
    const categoricalColumns = this.getCategoricalColumns(data[0], columns);
    const dateColumns = this.getDateColumns(data[0], columns);

    // 1. Main chart based on query
    const mainSuggestion = this.suggestChartType({
      data,
      columns,
      queryIntent: this.extractIntentFromQuery(query)
    });
    
    suggestions.push({
      type: mainSuggestion.type as any,
      title: mainSuggestion.title,
      data: this.prepareDataForChart(data, mainSuggestion.type, {
        categoryColumn: categoricalColumns[0],
        valueColumns: numericColumns.slice(0, 2),
        dateColumn: dateColumns[0],
        metricColumn: numericColumns[0]
      })
    });

    // 2. Secondary chart - distribution if applicable
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      suggestions.push({
        type: 'pie',
        title: `${categoricalColumns[0]} Distribution`,
        data: this.prepareDataForChart(data, 'pie', {
          categoryColumn: categoricalColumns[0],
          valueColumn: numericColumns[0]
        })
      });
    }

    // 3. Tertiary chart - trend if time data exists
    if (dateColumns.length > 0 && numericColumns.length > 0) {
      suggestions.push({
        type: 'line',
        title: `${numericColumns[0]} Over Time`,
        data: this.prepareDataForChart(data, 'line', {
          dateColumn: dateColumns[0],
          valueColumns: [numericColumns[0]]
        })
      });
    }

    return suggestions;
  }

  /**
   * Extract intent from query (simple version)
   */
  private extractIntentFromQuery(query: string): string {
    const q = query.toLowerCase();
    
    if (q.includes('trend') || q.includes('over time') || q.includes('monthly') || q.includes('daily')) {
      return 'trend';
    }
    if (q.includes('compare') || q.includes('vs') || q.includes('versus') || q.includes('versus')) {
      return 'comparison';
    }
    if (q.includes('distribut') || q.includes('breakdown') || q.includes('percentage')) {
      return 'distribution';
    }
    if (q.includes('top') || q.includes('best') || q.includes('worst') || q.includes('bottom')) {
      return 'ranking';
    }
    
    return 'analysis';
  }
}

export const chartEngine = new ChartIntelligenceEngine();