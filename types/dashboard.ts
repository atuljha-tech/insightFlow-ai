// ===========================================
// Chart Types
// ===========================================

/**
 * Represents a single data point in a chart
 */
export interface ChartData {
  /** The label/category name (e.g., "East", "Laptop", "January") */
  name: string;
  
  /** Revenue value (optional - depends on dataset) */
  revenue?: number;
  
  /** Profit value (optional - depends on dataset) */
  profit?: number;
  
  /** Customer count (optional - depends on dataset) */
  customers?: number;
  
  /** Generic value for charts that don't have specific metrics */
  value?: number;
  
  /** Allow any additional dynamic properties */
  [key: string]: string | number | undefined;
}

/**
 * Configuration for rendering a chart
 */
export interface ChartConfig {
  unit: string;
  /** Type of chart to render */
  type: 'bar' | 'line' | 'pie' | 'area' | 'metric' | 'table';
  
  /** Title displayed above the chart */
  title: string;
  
  /** Data to be visualized */
  data: ChartData[];
  
  /** Column to use for x-axis (optional) */
  xAxis?: string;
  
  /** Column to use for y-axis (optional) */
  yAxis?: string;
  
  /** Optional description of what this chart shows */
  description?: string;
  
  /** Optional footer text or additional information */
  footer?: string;
}

// ===========================================
// Insight Types
// ===========================================

/**
 * Type of insight for visual styling and prioritization
 */
export type InsightType = 'positive' | 'negative' | 'neutral' | 'warning';

/**
 * AI-generated insight about the data
 */
export interface Insight {
  /** Unique identifier */
  id: string;
  
  /** Type determines color and icon (positive=green, warning=yellow, etc.) */
  type: InsightType;
  
  /** Short, catchy title for the insight */
  title: string;
  
  /** Detailed explanation of the insight */
  description: string;
  
  /** Confidence score from 0-1 (how reliable is this insight) */
  confidence: number;
  
  /** Key metric value (e.g., "$68.0K", "23.5%") */
  metric?: string;
  
  /** Percentage change if applicable */
  change?: number;
  
  /** Category of insight (e.g., 'trend', 'anomaly', 'distribution') */
  category?: string;
  
  /** Source of insight ('ai', 'statistical', 'system') */
  source?: string;
  
  /** Whether this insight is newly generated */
  isNew?: boolean;
  
  /** Business impact assessment (optional) */
  impact?: 'high' | 'medium' | 'low';
  
  /** Additional details or context */
  details?: string;
  
  /** Timestamp when insight was generated */
  timestamp?: Date;
}

// ===========================================
// Dashboard State Types
// ===========================================

/**
 * Represents the complete state of the dashboard
 */
export interface DashboardState {
  /** Array of charts to display */
  charts: ChartConfig[];
  
  /** Array of insights generated from the data */
  insights: Insight[];
  
  /** Whether the dashboard is currently loading */
  isLoading: boolean;
  
  /** Current user query being processed */
  currentQuery: string;
  
  /** Optional timestamp of last update */
  lastUpdated?: Date;
  
  /** Optional error message if something went wrong */
  error?: string;
}

// ===========================================
// AI Query Types
// ===========================================

/**
 * Result from the AI query processing
 */
export interface AIQueryResult {
  /** Original user question */
  original: string;
  
  /** Enhanced query with context (if applicable) */
  enhanced?: string;
  
  /** Structured plan from AI (dimensions, metrics, filters) */
  plan: AIQueryPlan;
  
  /** Generated SQL query */
  sql: string;
  
  /** Human-readable explanation of what the query does */
  explanation: string;
  
  /** Whether this was a follow-up query */
  isFollowUp?: boolean;
  
  /** Confidence score for the interpretation */
  confidence?: number;
}

/**
 * Structured plan from AI for query execution
 */
export interface AIQueryPlan {
  /** Main intent of the query */
  intent: 'analysis' | 'comparison' | 'trend' | 'ranking' | 'distribution';
  
  /** Metrics to calculate (e.g., ['revenue', 'quantity']) */
  metrics: string[];
  
  /** Dimensions to group by (e.g., ['region', 'category']) */
  dimensions: string[];
  
  /** Any filters to apply */
  filters?: Array<{
    column: string;
    operator: '=' | '>' | '<' | '>=' | '<=' | '!=' | 'LIKE' | 'IN';
    value: any;
  }>;
  
  /** Time range for temporal queries */
  timeRange?: {
    column: string;
    start?: string;
    end?: string;
    granularity?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  };
  
  /** Aggregation method */
  aggregation?: {
    type: 'sum' | 'avg' | 'count' | 'min' | 'max';
    column: string;
  };
  
  /** Sorting configuration */
  sort?: {
    column: string;
    direction: 'ASC' | 'DESC';
    limit?: number;
  };
  
  /** Confidence score for this plan */
  confidence: number;
}

// ===========================================
// Visualization Types
// ===========================================

/**
 * Configuration for how to visualize the data
 */
export interface VisualizationConfig {
  /** Type of visualization recommended */
  type: 'bar' | 'line' | 'pie' | 'area' | 'metric' | 'table';
  
  /** Detailed configuration for the visualization */
  config: {
    /** Title for the chart */
    title: string;
    
    /** Column to use for x-axis/categories */
    xAxis: string;
    
    /** Column to use for y-axis/values */
    yAxis: string;
    
    /** Optional secondary axis or additional config */
    secondaryAxis?: string;
    
    /** Whether to show legend */
    showLegend?: boolean;
    
    /** Whether to enable tooltips */
    tooltips?: boolean;
    
    /** Custom color scheme */
    colors?: string[];
  };
  
  /** Insights specific to this visualization */
  insights?: string[];
}

// ===========================================
// Schema & Column Types
// ===========================================

/**
 * Information about a database column
 */
export interface ColumnInfo {
  /** Column name */
  name: string;
  
  /** Detected data type */
  type: 'string' | 'number' | 'date' | 'boolean';
  
  /** Sample values from the column */
  sampleValues: any[];
  
  /** Whether this is a numeric column (for metrics) */
  isNumeric: boolean;
  
  /** Whether this is a categorical column (for grouping) */
  isCategorical: boolean;
  
  /** Whether this is a date column (for trends) */
  isDate: boolean;
  
  /** Whether this is an ID column (should be ignored for calculations) */
  isId: boolean;
  
  /** Number of unique values in this column */
  uniqueValues?: number;
  
  /** Minimum value (for numeric columns) */
  min?: number;
  
  /** Maximum value (for numeric columns) */
  max?: number;
}

/**
 * Complete database schema information
 */
export interface TableSchema {
  /** Table name */
  name: string;
  
  /** Array of column information */
  columns: ColumnInfo[];
}

// ===========================================
// API Response Types
// ===========================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  /** Whether the request was successful */
  success: boolean;
  
  /** Response data (if successful) */
  data?: T;
  
  /** Error message (if unsuccessful) */
  error?: string;
  
  /** Additional error details */
  details?: string;
  
  /** Metadata about the response */
  metadata?: {
    timestamp: Date;
    duration?: number;
    rowCount?: number;
  };
}

/**
 * Query API response
 */
export interface QueryResponse {
  success: boolean;
  data: any[];
  columns: string[];
  rowCount: number;
  metadata?: {
    numericColumns?: string[];
    categoricalColumns?: string[];
    dateColumns?: string[];
  };
}

/**
 * AI Query API response
 */
export interface AIQueryResponse extends QueryResponse {
  query: {
    original: string;
    sql: string;
    explanation: string;
    plan: AIQueryPlan;
  };
  visualization: VisualizationConfig;
  schema?: {
    categoricalColumns: string[];
    numericColumns: string[];
    dateColumns: string[];
  };
}