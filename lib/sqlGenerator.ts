import { QueryPlan } from './server/aiPlanner';

export interface SQLQuery {
  sql: string;
  params: any[];
  explanation: string;
}

class SQLGenerator {
  /**
   * Convert query plan to SQL
   */
  generateSQL(plan: QueryPlan): SQLQuery {
    const tableName = 'sales'; // We'll use a single table for now
    
    // Build SELECT clause
    const selectClause = this.buildSelectClause(plan);
    
    // Build FROM clause
    const fromClause = `FROM ${tableName}`;
    
    // Build WHERE clause
    const whereClause = this.buildWhereClause(plan);
    
    // Build GROUP BY clause
    const groupByClause = this.buildGroupByClause(plan);
    
    // Build ORDER BY clause
    const orderByClause = this.buildOrderByClause(plan);
    
    // Build LIMIT clause
    const limitClause = this.buildLimitClause(plan);

    // Combine all clauses
    const sql = [
      selectClause,
      fromClause,
      whereClause ? `WHERE ${whereClause}` : '',
      groupByClause ? `GROUP BY ${groupByClause}` : '',
      orderByClause ? `ORDER BY ${orderByClause}` : '',
      limitClause ? `LIMIT ${limitClause}` : ''
    ].filter(Boolean).join(' ');

    // Generate explanation
    const explanation = this.generateExplanation(plan);

    return {
      sql,
      params: this.extractParams(plan),
      explanation
    };
  }

  /**
   * Build SELECT clause
   */
  private buildSelectClause(plan: QueryPlan): string {
    const selections: string[] = [];

    // Add dimensions
    if (plan.dimensions && plan.dimensions.length > 0) {
      selections.push(...plan.dimensions);
    }

    // Add metrics with aggregation
    if (plan.metrics && plan.metrics.length > 0) {
      if (plan.aggregation) {
        // Use specified aggregation
        selections.push(`${plan.aggregation.type}(${plan.aggregation.column}) as ${plan.aggregation.column}_${plan.aggregation.type}`);
      } else {
        // Default to sum for each metric
        plan.metrics.forEach(metric => {
          selections.push(`SUM(${metric}) as total_${metric}`);
        });
      }
    } else {
      // If no metrics, count records
      selections.push('COUNT(*) as record_count');
    }

    return `SELECT ${selections.join(', ')}`;
  }

  /**
   * Build WHERE clause
   */
  private buildWhereClause(plan: QueryPlan): string | null {
    const conditions: string[] = [];

    // Add explicit filters
    if (plan.filters && plan.filters.length > 0) {
      plan.filters.forEach(filter => {
        switch (filter.operator) {
          case 'LIKE':
            conditions.push(`${filter.column} LIKE '%${filter.value}%'`);
            break;
          case 'IN':
            conditions.push(`${filter.column} IN (${Array.isArray(filter.value) ? filter.value.join(', ') : filter.value})`);
            break;
          default:
            conditions.push(`${filter.column} ${filter.operator} ${typeof filter.value === 'string' ? `'${filter.value}'` : filter.value}`);
        }
      });
    }

    // Add time range filters
    if (plan.timeRange) {
      if (plan.timeRange.start) {
        conditions.push(`${plan.timeRange.column} >= '${plan.timeRange.start}'`);
      }
      if (plan.timeRange.end) {
        conditions.push(`${plan.timeRange.column} <= '${plan.timeRange.end}'`);
      }
    }

    return conditions.length > 0 ? conditions.join(' AND ') : null;
  }

  /**
   * Build GROUP BY clause
   */
  private buildGroupByClause(plan: QueryPlan): string | null {
    if (plan.dimensions && plan.dimensions.length > 0) {
      // Group by all dimensions
      return plan.dimensions.join(', ');
    }
    return null;
  }

  /**
   * Build ORDER BY clause
   */
  private buildOrderByClause(plan: QueryPlan): string | null {
    if (plan.sort) {
      return `${plan.sort.column} ${plan.sort.direction}`;
    }
    
    // Default sorting based on intent
    if (plan.intent === 'top' && plan.metrics.length > 0) {
      return `total_${plan.metrics[0]} DESC`;
    }
    if (plan.intent === 'bottom' && plan.metrics.length > 0) {
      return `total_${plan.metrics[0]} ASC`;
    }
    
    return null;
  }

  /**
   * Build LIMIT clause
   */
  private buildLimitClause(plan: QueryPlan): string | null {
    if (plan.sort && plan.sort.limit) {
      return plan.sort.limit.toString();
    }
    
    if (plan.intent === 'top' || plan.intent === 'bottom') {
      return '10'; // Default limit for top/bottom queries
    }
    
    return null;
  }

  /**
   * Extract parameters for prepared statement
   */
  private extractParams(plan: QueryPlan): any[] {
    const params: any[] = [];
    
    // Extract filter values
    if (plan.filters) {
      plan.filters.forEach(filter => {
        if (filter.operator !== 'LIKE' && filter.operator !== 'IN') {
          params.push(filter.value);
        }
      });
    }
    
    return params;
  }

  /**
   * Generate human-readable explanation
   */
  private generateExplanation(plan: QueryPlan): string {
    const parts: string[] = [];

    // Describe intent
    switch (plan.intent) {
      case 'analysis':
        parts.push('Analyzing');
        break;
      case 'comparison':
        parts.push('Comparing');
        break;
      case 'trend':
        parts.push('Showing trend of');
        break;
      case 'top':
        parts.push('Finding top');
        break;
      case 'bottom':
        parts.push('Finding bottom');
        break;
      default:
        parts.push('Showing');
    }

    // Describe metrics
    if (plan.metrics && plan.metrics.length > 0) {
      if (plan.aggregation) {
        parts.push(`${plan.aggregation.type} of ${plan.aggregation.column}`);
      } else {
        parts.push(plan.metrics.join(' and '));
      }
    } else {
      parts.push('data');
    }

    // Describe dimensions
    if (plan.dimensions && plan.dimensions.length > 0) {
      parts.push(`by ${plan.dimensions.join(' and ')}`);
    }

    // Describe filters
    if (plan.filters && plan.filters.length > 0) {
      const filterDesc = plan.filters.map(f => 
        `${f.column} ${f.operator} ${f.value}`
      ).join(' and ');
      parts.push(`where ${filterDesc}`);
    }

    // Describe time range
    if (plan.timeRange) {
      if (plan.timeRange.start && plan.timeRange.end) {
        parts.push(`from ${plan.timeRange.start} to ${plan.timeRange.end}`);
      } else if (plan.timeRange.start) {
        parts.push(`from ${plan.timeRange.start}`);
      } else if (plan.timeRange.end) {
        parts.push(`until ${plan.timeRange.end}`);
      }
    }

    // Add confidence note if low
    if (plan.confidence < 0.5) {
      parts.push('(low confidence - please verify)');
    }

    return parts.join(' ').charAt(0).toUpperCase() + parts.join(' ').slice(1);
  }
}

export const sqlGenerator = new SQLGenerator();