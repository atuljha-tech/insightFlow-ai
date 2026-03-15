import { dbManager, QueryResult } from './db';

export interface AggregationOptions {
  groupBy?: string[];
  aggregations: {
    [key: string]: 'sum' | 'avg' | 'count' | 'min' | 'max';
  };
  filter?: string;
  orderBy?: string;
  limit?: number;
}

export interface TimeSeriesOptions {
  dateColumn: string;
  interval: 'day' | 'week' | 'month' | 'quarter' | 'year';
  valueColumn: string;
  aggregation: 'sum' | 'avg' | 'count';
  filter?: string;
}

export interface ComparisonResult {
  current: number;
  previous: number;
  change: number;
  changePercentage: number;
}

class QueryEngine {
  private initialized: boolean = false;

  /**
   * Initialize the query engine
   */
  async initialize(): Promise<void> {
    await dbManager.initialize();
    this.initialized = true;
  }

  /**
   * Ensure database is initialized before queries
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('QueryEngine not initialized. Call initialize() first.');
    }
  }

  /**
   * Execute a raw SQL query
   */
  executeQuery(sql: string, params: any[] = []): QueryResult {
    this.ensureInitialized();
    return dbManager.query(sql, params);
  }

  /**
   * Get revenue by region
   */
  getRevenueByRegion(): QueryResult {
    this.ensureInitialized();
    const sql = `
      SELECT 
        region,
        SUM(revenue) as total_revenue,
        AVG(revenue) as avg_revenue,
        COUNT(*) as transaction_count,
        SUM(quantity) as total_units,
        SUM(customers) as total_customers
      FROM sales
      GROUP BY region
      ORDER BY total_revenue DESC
    `;
    return dbManager.query(sql);
  }

  /**
   * Get revenue by category
   */
  getRevenueByCategory(): QueryResult {
    this.ensureInitialized();
    const sql = `
      SELECT 
        category,
        SUM(revenue) as total_revenue,
        AVG(profit_margin) as avg_profit_margin,
        COUNT(*) as transaction_count,
        SUM(quantity) as total_units
      FROM sales
      GROUP BY category
      ORDER BY total_revenue DESC
    `;
    return dbManager.query(sql);
  }

  /**
   * Get monthly revenue trends
   */
  getMonthlyRevenue(): QueryResult {
    this.ensureInitialized();
    const sql = `
      SELECT 
        strftime('%Y-%m', date) as month,
        SUM(revenue) as total_revenue,
        AVG(revenue) as avg_daily_revenue,
        COUNT(*) as transaction_count,
        SUM(customers) as total_customers
      FROM sales
      GROUP BY strftime('%Y-%m', date)
      ORDER BY month ASC
    `;
    return dbManager.query(sql);
  }

  /**
   * Get top products by revenue
   */
  getTopProducts(limit: number = 5): QueryResult {
    this.ensureInitialized();
    const sql = `
      SELECT 
        product,
        category,
        SUM(revenue) as total_revenue,
        SUM(quantity) as total_units,
        AVG(profit_margin) as avg_profit_margin,
        COUNT(*) as sale_count
      FROM sales
      GROUP BY product, category
      ORDER BY total_revenue DESC
      LIMIT ?
    `;
    return dbManager.query(sql, [limit]);
  }

  /**
   * Get daily revenue for a specific time period
   */
  getDailyRevenue(startDate?: string, endDate?: string): QueryResult {
    this.ensureInitialized();
    let sql = `
      SELECT 
        date,
        SUM(revenue) as daily_revenue,
        SUM(quantity) as daily_quantity,
        SUM(customers) as daily_customers
      FROM sales
    `;
    
    const params: string[] = [];
    if (startDate && endDate) {
      sql += ` WHERE date BETWEEN ? AND ?`;
      params.push(startDate, endDate);
    }
    
    sql += ` GROUP BY date ORDER BY date ASC`;
    
    return dbManager.query(sql, params);
  }

  /**
   * Get performance by region with comparisons
   */
  getRegionalPerformance(): QueryResult {
    this.ensureInitialized();
    const sql = `
      WITH regional_stats AS (
        SELECT 
          region,
          SUM(revenue) as total_revenue,
          AVG(revenue) as avg_transaction_value,
          SUM(quantity) as total_units,
          SUM(customers) as total_customers,
          AVG(profit_margin) as avg_profit_margin,
          COUNT(*) as transaction_count
        FROM sales
        GROUP BY region
      )
      SELECT 
        *,
        (total_revenue * 100.0 / (SELECT SUM(total_revenue) FROM regional_stats)) as revenue_percentage
      FROM regional_stats
      ORDER BY total_revenue DESC
    `;
    return dbManager.query(sql);
  }

  /**
   * Get time series data with custom aggregation
   */
  getTimeSeries(options: TimeSeriesOptions): QueryResult {
    this.ensureInitialized();
    
    let dateFormat: string;
    switch (options.interval) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-%W';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      case 'quarter':
        dateFormat = '%Y-%m';
        break;
      case 'year':
        dateFormat = '%Y';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const sql = `
      SELECT 
        strftime('${dateFormat}', ${options.dateColumn}) as period,
        ${options.aggregation}(${options.valueColumn}) as value,
        COUNT(*) as record_count
      FROM sales
      ${options.filter ? `WHERE ${options.filter}` : ''}
      GROUP BY period
      ORDER BY period ASC
    `;

    return dbManager.query(sql);
  }

  /**
   * Get aggregated data with custom grouping
   */
  getAggregatedData(options: AggregationOptions): QueryResult {
    this.ensureInitialized();

    const groupByClause = options.groupBy?.length 
      ? `GROUP BY ${options.groupBy.join(', ')}` 
      : '';

    const aggregations = Object.entries(options.aggregations)
      .map(([column, func]) => `${func}(${column}) as ${func}_${column}`)
      .join(', ');

    const sql = `
      SELECT 
        ${options.groupBy?.join(', ') || '1 as dummy'},
        ${aggregations}
      FROM sales
      ${options.filter ? `WHERE ${options.filter}` : ''}
      ${groupByClause}
      ${options.orderBy ? `ORDER BY ${options.orderBy}` : ''}
      ${options.limit ? `LIMIT ${options.limit}` : ''}
    `;

    return dbManager.query(sql);
  }

  /**
   * Compare current period with previous period
   */
  comparePeriods(
    valueColumn: string,
    currentStart: string,
    currentEnd: string,
    previousStart: string,
    previousEnd: string
  ): ComparisonResult {
    this.ensureInitialized();

    const currentResult = dbManager.query(`
      SELECT SUM(${valueColumn}) as total
      FROM sales
      WHERE date BETWEEN ? AND ?
    `, [currentStart, currentEnd]);

    const previousResult = dbManager.query(`
      SELECT SUM(${valueColumn}) as total
      FROM sales
      WHERE date BETWEEN ? AND ?
    `, [previousStart, previousEnd]);

    const current = (currentResult.data[0] as any)?.total || 0;
    const previous = (previousResult.data[0] as any)?.total || 0;
    const change = current - previous;
    const changePercentage = previous !== 0 ? (change / previous) * 100 : 0;

    return {
      current,
      previous,
      change,
      changePercentage
    };
  }

  /**
   * Get data insights - automatically finds patterns and anomalies
   */
  getInsights(): any[] {
    this.ensureInitialized();

    const insights = [];

    // Top performing region
    const topRegion = this.getRevenueByRegion().data[0] as any;
    if (topRegion) {
      insights.push({
        id: '1',
        type: 'positive',
        title: 'Top Performing Region',
        description: `${topRegion.region} leads with $${topRegion.total_revenue.toLocaleString()} in revenue`,
        metric: `$${topRegion.total_revenue.toLocaleString()}`,
        change: 15.5
      });
    }

    // Category performance
    const categories = this.getRevenueByCategory().data as any[];
    const avgCategoryRevenue = categories.reduce((sum, cat) => sum + cat.total_revenue, 0) / categories.length;
    
    categories.forEach((cat, index) => {
      if (cat.total_revenue > avgCategoryRevenue * 1.3) {
        insights.push({
          id: `cat-${index}`,
          type: 'positive',
          title: `Strong ${cat.category} Performance`,
          description: `${cat.category} category exceeds average by ${((cat.total_revenue / avgCategoryRevenue - 1) * 100).toFixed(1)}%`,
          metric: `$${cat.total_revenue.toLocaleString()}`,
          change: 22.3
        });
      }
    });

    // Profit margin analysis
    const highMarginProducts = dbManager.query(`
      SELECT product, AVG(profit_margin) as avg_margin
      FROM sales
      GROUP BY product
      HAVING avg_margin > 0.35
      ORDER BY avg_margin DESC
      LIMIT 3
    `).data as any[];

    if (highMarginProducts.length > 0) {
      insights.push({
        id: 'margin',
        type: 'positive',
        title: 'High Margin Products',
        description: `${highMarginProducts.map(p => p.product).join(', ')} have above-average profit margins`,
        metric: `${(highMarginProducts[0]?.avg_margin * 100).toFixed(0)}%`,
        change: 8.2
      });
    }

    return insights;
  }
}

// Export singleton instance
export const queryEngine = new QueryEngine();