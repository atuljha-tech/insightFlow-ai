import { groqServerClient, GroqMessage } from './groq';

// Define the query plan structure
export interface QueryPlan {
  intent: 'analysis' | 'comparison' | 'trend' | 'top' | 'bottom' | 'aggregation';
  metrics: string[];
  dimensions: string[];
  filters?: {
    column: string;
    operator: '=' | '>' | '<' | '>=' | '<=' | '!=' | 'LIKE' | 'IN';
    value: any;
  }[];
  timeRange?: {
    column: string;
    start?: string;
    end?: string;
    granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  aggregation?: {
    type: 'sum' | 'avg' | 'count' | 'min' | 'max';
    column: string;
  };
  sort?: {
    column: string;
    direction: 'ASC' | 'DESC';
    limit?: number;
  };
  confidence: number; // 0-1 score of how confident the AI is
}

export interface SchemaInfo {
  tables: {
    name: string;
    columns: {
      name: string;
      type: 'string' | 'number' | 'date' | 'boolean';
      description?: string;
    }[];
  }[];
}

class AIQueryPlanner {
  private schema: SchemaInfo;

  constructor(schema: SchemaInfo) {
    this.schema = schema;
  }

  /**
   * Generate system prompt with schema context
   */
  private getSystemPrompt(): string {
    const tables = this.schema.tables.map(table => {
      const columns = table.columns.map(col => 
        `- ${col.name} (${col.type}): ${col.description || 'No description'}`
      ).join('\n');

      return `Table: ${table.name}\nColumns:\n${columns}`;
    }).join('\n\n');

    return `You are an AI query planner for a business intelligence dashboard. Your task is to analyze natural language questions and convert them into structured query plans.

Available Database Schema:
${tables}

Rules:
1. Identify the user's intent (analysis, comparison, trend, top/bottom, aggregation)
2. Extract relevant metrics (numeric columns to analyze)
3. Extract dimensions (categorical columns to group by)
4. Identify any filters or conditions
5. Detect time-based queries and suggest appropriate granularity
6. Return ONLY valid JSON matching the QueryPlan interface
7. Set confidence score based on how well you understood the query

Example Output:
{
  "intent": "analysis",
  "metrics": ["revenue"],
  "dimensions": ["region"],
  "filters": [
    {
      "column": "category",
      "operator": "=",
      "value": "Electronics"
    }
  ],
  "aggregation": {
    "type": "sum",
    "column": "revenue"
  },
  "confidence": 0.95
}`;
  }

  /**
   * Plan a query from natural language
   */
  async planQuery(userQuery: string): Promise<QueryPlan> {
    try {
      // Check if Groq client is available
      if (!groqServerClient.isReady()) {
        console.warn('Groq client not available, using fallback planner');
        return this.createFallbackPlan(userQuery);
      }

      const messages: GroqMessage[] = [
        {
          role: 'system',
          content: this.getSystemPrompt()
        },
        {
          role: 'user',
          content: `Convert this question into a query plan: "${userQuery}"`
        }
      ];

      const response = await groqServerClient.complete(messages, {
        temperature: 0.1, // Low temperature for consistent results
        maxTokens: 1024
      });

      if (!response) {
        console.warn('No response from AI, using fallback planner');
        return this.createFallbackPlan(userQuery);
      }

      // Parse the JSON response
      try {
        const plan = this.parseQueryPlan(response);
        
        // Validate the plan
        this.validateQueryPlan(plan);
        
        return plan;
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        return this.createFallbackPlan(userQuery);
      }
      
    } catch (error) {
      console.error('Query planning failed:', error);
      
      // Return a fallback plan with low confidence
      return this.createFallbackPlan(userQuery);
    }
  }

  /**
   * Parse AI response into QueryPlan
   */
  private parseQueryPlan(response: string): QueryPlan {
    // Extract JSON from response (in case AI adds extra text)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : response;
    
    const plan = JSON.parse(jsonStr) as QueryPlan;
    
    // Ensure required fields
    plan.intent = plan.intent || 'analysis';
    plan.metrics = plan.metrics || [];
    plan.dimensions = plan.dimensions || [];
    plan.confidence = plan.confidence || 0.5;
    
    return plan;
  }

  /**
   * Validate query plan structure
   */
  private validateQueryPlan(plan: QueryPlan): void {
    // Get all valid columns from schema
    const allColumns = this.schema.tables.flatMap(t => t.columns);
    
    // Check if metrics exist in schema
    if (plan.metrics.length > 0) {
      const validMetrics = allColumns
        .filter(c => c.type === 'number')
        .map(c => c.name);
      
      plan.metrics = plan.metrics.filter(m => validMetrics.includes(m));
      
      // If no valid metrics left, add a default
      if (plan.metrics.length === 0 && validMetrics.length > 0) {
        plan.metrics = [validMetrics[0]];
      }
    }

    // Check if dimensions exist in schema
    if (plan.dimensions.length > 0) {
      const validDimensions = allColumns
        .filter(c => c.type === 'string' || c.type === 'date')
        .map(c => c.name);
      
      plan.dimensions = plan.dimensions.filter(d => validDimensions.includes(d));
    }

    // Set default aggregation if none provided and metrics exist
    if (!plan.aggregation && plan.metrics.length > 0) {
      plan.aggregation = {
        type: 'sum',
        column: plan.metrics[0]
      };
    }

    // Ensure confidence is within range
    plan.confidence = Math.max(0, Math.min(1, plan.confidence));
  }

  /**
   * Create a fallback plan when AI fails
   */
  private createFallbackPlan(query: string): QueryPlan {
    // Simple keyword-based fallback
    const queryLower = query.toLowerCase();
    
    // Get available columns from schema
    const allColumns = this.schema.tables.flatMap(t => t.columns);
    const numericColumns = allColumns
      .filter(c => c.type === 'number')
      .map(c => c.name);
    const categoricalColumns = allColumns
      .filter(c => c.type === 'string')
      .map(c => c.name);
    const dateColumns = allColumns
      .filter(c => c.type === 'date')
      .map(c => c.name);

    const plan: QueryPlan = {
      intent: 'analysis',
      metrics: numericColumns.length > 0 ? [numericColumns[0]] : [],
      dimensions: [],
      confidence: 0.3
    };

    // If no numeric columns found, use a default
    if (plan.metrics.length === 0) {
      plan.metrics = ['revenue'];
    }

    // Try to detect dimensions from query
    categoricalColumns.forEach(col => {
      if (queryLower.includes(col.toLowerCase())) {
        plan.dimensions.push(col);
      }
    });

    // If no dimensions detected from keywords, try common terms
    if (plan.dimensions.length === 0) {
      const commonDimensions = ['region', 'category', 'product', 'department', 'country'];
      commonDimensions.forEach(dim => {
        if (queryLower.includes(dim) && categoricalColumns.includes(dim)) {
          plan.dimensions.push(dim);
        }
      });
    }

    // Check for time-based queries
    const timeIndicators = ['month', 'year', 'quarter', 'daily', 'weekly', 'trend', 'over time'];
    if (timeIndicators.some(word => queryLower.includes(word)) && dateColumns.length > 0) {
      plan.dimensions.push(dateColumns[0]);
      plan.timeRange = {
        column: dateColumns[0],
        granularity: queryLower.includes('month') ? 'month' : 
                     queryLower.includes('year') ? 'year' : 
                     queryLower.includes('quarter') ? 'quarter' : 'month'
      };
    }

    // Detect intent
    if (queryLower.includes('compare') || queryLower.includes('vs') || queryLower.includes('versus')) {
      plan.intent = 'comparison';
    }
    else if (queryLower.includes('trend') || queryLower.includes('over time') || queryLower.includes('monthly')) {
      plan.intent = 'trend';
    }
    else if (queryLower.includes('top') || queryLower.includes('best') || queryLower.includes('highest')) {
      plan.intent = 'top';
      plan.sort = {
        column: plan.metrics[0],
        direction: 'DESC',
        limit: 5
      };
    }
    else if (queryLower.includes('bottom') || queryLower.includes('worst') || queryLower.includes('lowest')) {
      plan.intent = 'bottom';
      plan.sort = {
        column: plan.metrics[0],
        direction: 'ASC',
        limit: 5
      };
    }

    // Detect filters
    const filterPatterns = [
      { pattern: /for\s+(\w+)/i, operator: '=' },
      { pattern: /where\s+(\w+)\s+is\s+(\w+)/i, operator: '=' },
      { pattern: /in\s+(\w+)/i, operator: '=' }
    ];

    filterPatterns.forEach(({ pattern, operator }) => {
      const match = query.match(pattern);
      if (match && match[1] && categoricalColumns.includes(match[1])) {
        if (!plan.filters) plan.filters = [];
        plan.filters.push({
          column: match[1],
          operator: operator as any,
          value: match[2] || match[1]
        });
      }
    });

    return plan;
  }

  /**
   * Suggest visualizations based on query plan
   */
  suggestVisualization(plan: QueryPlan): string {
    if (plan.dimensions.length === 0) {
      return 'metric'; // Single metric card
    }
    
    if (plan.dimensions.length === 1) {
      // Check if it's a time dimension
      const isTimeColumn = plan.dimensions[0].toLowerCase().includes('date') ||
                          plan.dimensions[0].toLowerCase().includes('month') ||
                          plan.dimensions[0].toLowerCase().includes('year') ||
                          plan.timeRange !== undefined;
      
      if (isTimeColumn) {
        return 'line'; // Time series
      }
      
      // Check number of unique values (would need data to determine)
      // Default to bar for categories
      return 'bar';
    }
    
    if (plan.dimensions.length === 2) {
      return 'grouped-bar'; // Two dimensions
    }
    
    if (plan.intent === 'top' || plan.intent === 'bottom') {
      return 'bar'; // Ranking
    }
    
    return 'table'; // Fallback to table
  }

  /**
   * Get a human-readable explanation of the plan
   */
  explainPlan(plan: QueryPlan): string {
    const parts = [];

    // Intent
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

    // Metrics
    if (plan.metrics.length > 0) {
      if (plan.aggregation) {
        parts.push(`${plan.aggregation.type} of ${plan.aggregation.column}`);
      } else {
        parts.push(plan.metrics.join(' and '));
      }
    }

    // Dimensions
    if (plan.dimensions.length > 0) {
      parts.push(`by ${plan.dimensions.join(' and ')}`);
    }

    // Filters
    if (plan.filters && plan.filters.length > 0) {
      const filterDesc = plan.filters.map(f => 
        `${f.column} ${f.operator} ${f.value}`
      ).join(' and ');
      parts.push(`where ${filterDesc}`);
    }

    // Time range
    if (plan.timeRange) {
      if (plan.timeRange.start && plan.timeRange.end) {
        parts.push(`from ${plan.timeRange.start} to ${plan.timeRange.end}`);
      } else if (plan.timeRange.start) {
        parts.push(`from ${plan.timeRange.start}`);
      } else if (plan.timeRange.end) {
        parts.push(`until ${plan.timeRange.end}`);
      }
    }

    // Sort/limit
    if (plan.sort && plan.sort.limit) {
      parts.push(`(top ${plan.sort.limit})`);
    }

    let explanation = parts.join(' ');
    explanation = explanation.charAt(0).toUpperCase() + explanation.slice(1);

    // Add confidence note
    if (plan.confidence < 0.5) {
      explanation += ' (low confidence - please verify)';
    }

    return explanation;
  }
}

// Export factory function to create planner with schema
export function createQueryPlanner(schema: SchemaInfo) {
  return new AIQueryPlanner(schema);
}

// Default schema for sales data
export const defaultSchema: SchemaInfo = {
  tables: [
    {
      name: 'sales',
      columns: [
        { name: 'date', type: 'date', description: 'Transaction date' },
        { name: 'region', type: 'string', description: 'Sales region (East, West, North, South)' },
        { name: 'product', type: 'string', description: 'Product name' },
        { name: 'category', type: 'string', description: 'Product category (Electronics, Furniture)' },
        { name: 'revenue', type: 'number', description: 'Revenue in dollars' },
        { name: 'quantity', type: 'number', description: 'Number of units sold' },
        { name: 'customers', type: 'number', description: 'Number of customers' },
        { name: 'profit_margin', type: 'number', description: 'Profit margin as decimal' },
      ],
    },
  ],
};