import { NextRequest, NextResponse } from 'next/server';
import { queryEngine } from '@/lib/server/queryEngine';
import { schemaAnalyzer } from '@/lib/server/schema';

// Initialize query engine
let initialized = false;

async function ensureInitialized() {
  if (!initialized) {
    await queryEngine.initialize();
    initialized = true;
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureInitialized();
    
    const body = await request.json();
    const { query, params } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Execute any SQL query dynamically
    const result = queryEngine.executeQuery(query, params || []);
    
    return NextResponse.json({
      success: true,
      data: result.data,
      columns: result.columns,
      rowCount: result.rowCount
    });
  } catch (error) {
    console.error('Query execution error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to execute query',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await ensureInitialized();
    
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');

    // Get dynamic schema information
    const tableSchema = await schemaAnalyzer.getTableSchema();
    const allColumns = tableSchema.columns.map(col => col.name);
    
    // Identify column types dynamically
    const numericColumns = tableSchema.columns
      .filter(col => col.isNumeric && !col.isId)
      .map(col => col.name);
    
    const categoricalColumns = tableSchema.columns
      .filter(col => col.isCategorical)
      .map(col => col.name);
    
    const dateColumns = tableSchema.columns
      .filter(col => col.isDate)
      .map(col => col.name);
    
    const idColumns = tableSchema.columns
      .filter(col => col.isId)
      .map(col => col.name);

    // If no specific type requested, return schema info
    if (!type) {
      return NextResponse.json({
        success: true,
        schema: {
          tables: [{
            name: 'sales',
            columns: allColumns,
            numericColumns,
            categoricalColumns,
            dateColumns,
            idColumns,
            sampleData: queryEngine.executeQuery('SELECT * FROM sales LIMIT 3').data
          }]
        }
      });
    }

    // Handle different request types dynamically
    let result;
    
    switch (type) {
      case 'stats':
        // Build dynamic stats query based on available columns
        const statsQueries = [];
        
        // Total records always works
        statsQueries.push('COUNT(*) as total_records');
        
        // Add sum for first numeric column if available
        if (numericColumns.length > 0) {
          statsQueries.push(`SUM(${numericColumns[0]}) as total_${numericColumns[0]}`);
          statsQueries.push(`AVG(${numericColumns[0]}) as avg_${numericColumns[0]}`);
        }
        
        // Add distinct counts for categorical columns (limited to 3)
        categoricalColumns.slice(0, 3).forEach(col => {
          statsQueries.push(`COUNT(DISTINCT ${col}) as unique_${col}`);
        });
        
        const statsSql = `SELECT ${statsQueries.join(', ')} FROM sales`;
        const statsResult = queryEngine.executeQuery(statsSql);
        result = { data: statsResult.data, columns: statsResult.columns, rowCount: 1 };
        break;
        
      case 'breakdown':
        // Generic breakdown by a categorical column
        const breakdownBy = searchParams.get('by') || categoricalColumns[0] || 'id';
        const metricForBreakdown = searchParams.get('metric') || numericColumns[0] || '*';
        
        if (breakdownBy && categoricalColumns.includes(breakdownBy)) {
          const breakdownSql = `SELECT ${breakdownBy}, ${metricForBreakdown === '*' ? 'COUNT(*)' : `SUM(${metricForBreakdown}) as total`} FROM sales GROUP BY ${breakdownBy} ORDER BY 2 DESC`;
          result = queryEngine.executeQuery(breakdownSql);
        } else {
          throw new Error(`Invalid breakdown column: ${breakdownBy}`);
        }
        break;
        
      case 'trend':
        // Generic trend analysis
        const trendDate = searchParams.get('date') || dateColumns[0];
        const trendMetric = searchParams.get('metric') || numericColumns[0];
        const trendGranularity = searchParams.get('granularity') || 'month';
        
        if (trendDate && dateColumns.includes(trendDate)) {
          let dateFormat;
          switch (trendGranularity) {
            case 'year': dateFormat = "'%Y'"; break;
            case 'month': dateFormat = "'%Y-%m'"; break;
            case 'day': dateFormat = "'%Y-%m-%d'"; break;
            default: dateFormat = "'%Y-%m'";
          }
          
          const trendSql = `SELECT strftime(${dateFormat}, ${trendDate}) as period, SUM(${trendMetric}) as total FROM sales GROUP BY period ORDER BY period`;
          result = queryEngine.executeQuery(trendSql);
        } else {
          throw new Error(`Invalid date column: ${trendDate}`);
        }
        break;
        
      case 'top':
        // Generic top N query
        const topCategory = searchParams.get('by') || categoricalColumns[0] || 'id';
        const topMetric = searchParams.get('metric') || numericColumns[0] || '*';
        const topLimit = parseInt(searchParams.get('limit') || '5');
        
        const topSql = `SELECT ${topCategory}, ${topMetric === '*' ? 'COUNT(*)' : `SUM(${topMetric}) as total`} FROM sales GROUP BY ${topCategory} ORDER BY 2 DESC LIMIT ${topLimit}`;
        result = queryEngine.executeQuery(topSql);
        break;
        
      case 'insights':
        // Generate dynamic insights based on actual data
        const insights = [];
        
        // Insight 1: Top category
        if (categoricalColumns.length > 0 && numericColumns.length > 0) {
          const topCatSql = `SELECT ${categoricalColumns[0]}, SUM(${numericColumns[0]}) as total FROM sales GROUP BY ${categoricalColumns[0]} ORDER BY total DESC LIMIT 1`;
          const topCat = queryEngine.executeQuery(topCatSql).data[0];
          if (topCat) {
            insights.push({
              type: 'positive',
              title: `Top ${categoricalColumns[0]}`,
              description: `${topCat[categoricalColumns[0]]} leads with ${topCat.total} in ${numericColumns[0]}`,
              metric: topCat.total
            });
          }
        }
        
        // Insight 2: Total
        if (numericColumns.length > 0) {
          const totalSql = `SELECT SUM(${numericColumns[0]}) as total FROM sales`;
          const total = queryEngine.executeQuery(totalSql).data[0]?.total;
          insights.push({
            type: 'neutral',
            title: `Total ${numericColumns[0]}`,
            description: `Total ${numericColumns[0]} is ${total?.toLocaleString()}`,
            metric: total
          });
        }
        
        // Insight 3: Record count
        const countSql = 'SELECT COUNT(*) as count FROM sales';
        const count = queryEngine.executeQuery(countSql).data[0]?.count;
        insights.push({
          type: 'neutral',
          title: 'Total Records',
          description: `Dataset contains ${count} records`,
          metric: count
        });
        
        return NextResponse.json({
          success: true,
          insights
        });
        
      default:
        // If type is a column name, return distribution for that column
        if (allColumns.includes(type)) {
          const columnInfo = tableSchema.columns.find(c => c.name === type);
          
          if (columnInfo?.isNumeric && !columnInfo.isId) {
            // Numeric column - show min, max, avg
            const statsSql = `SELECT MIN(${type}) as min, MAX(${type}) as max, AVG(${type}) as avg, COUNT(*) as count FROM sales WHERE ${type} IS NOT NULL`;
            result = queryEngine.executeQuery(statsSql);
          } else {
            // Categorical column - show distribution
            const distSql = `SELECT ${type}, COUNT(*) as count FROM sales GROUP BY ${type} ORDER BY count DESC LIMIT 20`;
            result = queryEngine.executeQuery(distSql);
          }
        } else {
          return NextResponse.json(
            { error: 'Invalid query type', availableTypes: ['stats', 'breakdown', 'trend', 'top', 'insights', ...allColumns] },
            { status: 400 }
          );
        }
    }

    return NextResponse.json({
      success: true,
      data: result.data,
      columns: result.columns,
      rowCount: result.rowCount,
      metadata: {
        numericColumns,
        categoricalColumns,
        dateColumns,
        idColumns
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}