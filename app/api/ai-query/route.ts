import { NextRequest, NextResponse } from 'next/server';
import { queryEngine } from '@/lib/server/queryEngine';
import { groqServerClient } from '@/lib/server/groq';
import { schemaAnalyzer } from '@/lib/server/schema';
import { dbManager } from '@/lib/server/db';

// List of supported models in order of preference
const SUPPORTED_MODELS = [
  'llama-3.3-70b-versatile',  // Best for SQL (as of 2026)
  'llama-3.1-70b-versatile',   // Good fallback
  'mixtral-8x7b-32768',       // Also good at SQL
  'llama-3.2-3b-preview'       // Fast fallback for simple queries
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, context } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log('🔍 Processing query:', query);

    // Initialize database
    await queryEngine.initialize();


// Get the active table (the one that was uploaded)
let activeTable = dbManager.getActiveTable();

// If no active table or it's a default table, find the most recently uploaded table
if (!activeTable || activeTable === 'sales' || activeTable === 'employees') {
  try {
    const tables = dbManager.getTables();
    console.log('📋 Available tables:', tables);
    
    // Filter out system tables
    const uploadedTables = tables.filter(t => 
      t !== 'sales' && 
      t !== 'sqlite_sequence'
    );
    
    if (uploadedTables.length > 0) {
      // Sort tables by creation time (assuming newer tables have timestamps)
      // This will work with your table naming convention: data_filename_timestamp
      const sortedTables = uploadedTables.sort((a, b) => {
        // Extract timestamp from table names if they follow data_filename_timestamp format
        const timestampA = a.split('_').pop() || '0';
        const timestampB = b.split('_').pop() || '0';
        return parseInt(timestampB) - parseInt(timestampA);
      });
      
      // Use the most recent table
      activeTable = sortedTables[0];
      console.log(`📌 Using most recent uploaded table: ${activeTable}`);
    } else {
      // No uploaded tables found, use sales as fallback
      activeTable = 'sales';
      console.log('📌 No uploaded tables found, using sales as fallback');
    }
  } catch (e) {
    console.log('Could not check for uploaded tables:', e);
    activeTable = 'sales';
  }
}

console.log(`📊 Final selected table: ${activeTable}`);

if (!activeTable) {
  return NextResponse.json(
    { error: 'No active table found. Please upload a CSV first.' },
    { status: 400 }
  );
}

const tableSchema = await schemaAnalyzer.getTableSchema(activeTable);
const tableName = tableSchema.name;



    // Log schema analysis for debugging
    console.log('📊 Schema Analysis:');
    console.log('  📈 Metric columns:', tableSchema.columns.filter(c => c.isNumeric && !c.isId).map(c => c.name));
    console.log('  📁 Category columns:', tableSchema.columns.filter(c => c.isCategorical).map(c => c.name));
    console.log('  📅 Date columns:', tableSchema.columns.filter(c => c.isDate).map(c => c.name));
    console.log('  ⚠️ ID columns:', tableSchema.columns.filter(c => c.isId).map(c => c.name));

    // Build a comprehensive schema description for the AI with clear instructions
    const columnDescriptions = tableSchema.columns.map(col => {
      let description = `- ${col.name} (${col.type})`;
      
      // Add sample values
      if (col.sampleValues && col.sampleValues.length > 0) {
        description += `\n  Sample values: ${col.sampleValues.slice(0, 5).map(v => `"${v}"`).join(', ')}`;
      }
      
      // Add detailed data characteristics with clear usage instructions
      if (col.isNumeric && !col.isId) {
        description += `\n  ✅ METRIC column - USE for calculations: SUM, AVG, MIN, MAX`;
        if (col.min !== undefined && col.max !== undefined) {
          description += ` (values range from ${col.min} to ${col.max})`;
        }
      }
      else if (col.isCategorical) {
        description += `\n  📊 CATEGORY column - USE for: GROUP BY, filters, breakdowns`;
        description += `\n  Has ${col.uniqueValues} unique values`;
        if (col.sampleValues.length > 0) {
          description += ` including: ${col.sampleValues.slice(0, 3).map(v => `"${v}"`).join(', ')}`;
        }
      }
      else if (col.isDate) {
        description += `\n  📅 DATE column - USE for: time trends, monthly/yearly analysis`;
      }
      else if (col.isId) {
        description += `\n  ⚠️ ID column - DO NOT USE for calculations (SUM, AVG, etc.)`;
        description += `\n  Only use for COUNT DISTINCT or as reference`;
      }
      else {
        description += `\n  ℹ️ TEXT column - USE for: labels, filters, display`;
      }
      
      return description;
    }).join('\n\n');

    // Get some actual data samples
    const dataSamples = queryEngine.executeQuery(`SELECT * FROM ${tableName} LIMIT 3`).data;

    // Let AI decide everything with better instructions
    const aiPrompt = `You are an expert SQL query generator. Analyze the user's question and the database schema to generate the perfect SQL query.

DATABASE SCHEMA:
Table name: ${tableName}

COLUMN DETAILS:
${columnDescriptions}

SAMPLE DATA (first 3 rows):
${JSON.stringify(dataSamples, null, 2)}

USER QUESTION: "${query}"

PREVIOUS CONTEXT: ${context ? JSON.stringify(context) : 'None'}

IMPORTANT RULES:
1. NEVER use ID columns (marked with ⚠️) for SUM, AVG, MAX, MIN calculations
2. For questions about "total", "sum", "revenue" - use METRIC columns (marked with ✅)
3. For questions about "by region", "by category" - use CATEGORY columns (marked with 📊) with GROUP BY
4. For questions about "trend", "monthly", "over time" - use DATE columns (marked with 📅)
5. If the user asks a simple question like "show by category", use a METRIC column with GROUP BY category

Return a JSON object with this exact structure:
{
  "sql": "the SQL query to execute",
  "explanation": "brief explanation of what you're showing",
  "chartType": "metric" or "bar" or "line" or "pie" or "table",
  "title": "descriptive title for the visualization",
  "confidence": 0.0 to 1.0,
  "xAxis": "column name for x-axis",
  "yAxis": "column name for y-axis"
}

IMPORTANT: Return ONLY valid JSON, no other text.`;

    console.log('🤖 Asking AI to analyze query...');
    
   let aiResponse: string | null = null; // Change this line
let lastError = null;

for (const model of SUPPORTED_MODELS) {
  try {
    console.log(`🤖 Trying Groq model: ${model}`);
    
    const response = await groqServerClient.complete([
      { 
        role: 'system', 
        content: 'You are an expert SQL generator. Return only valid JSON, no explanations or markdown.' 
      },
      { role: 'user', content: aiPrompt }
    ], { 
      temperature: 0.1,
      maxTokens: 1000,
      model: model
    });

    if (response) {
      aiResponse = response; // Now this works - both are string | null
      console.log(`✅ Success with model: ${model}`);
      break;
    }
  } catch (error: any) {
    console.log(`⚠️ Model ${model} failed:`, error?.message || 'Unknown error');
    lastError = error;
  }
}

    if (!aiResponse) {
      console.warn('⚠️ All AI models failed, using fallback');
      // Use fallback decision based on query
      const fallbackDecision = generateFallbackDecision(query, tableSchema, tableName);
      return executeFallback(query, fallbackDecision, tableName, tableSchema);
    }

    console.log('🤖 Raw AI Response:', aiResponse);

    // Parse AI response with multiple fallback attempts
    let aiDecision;
    try {
      // First attempt: try to parse entire response as JSON
      aiDecision = JSON.parse(aiResponse);
    } catch (e1) {
      try {
        // Second attempt: extract JSON from markdown code blocks
        const jsonMatch = aiResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch && jsonMatch[1]) {
          aiDecision = JSON.parse(jsonMatch[1]);
        } else {
          // Third attempt: find any JSON-like object in the text
          const objectMatch = aiResponse.match(/\{[\s\S]*\}/);
          if (objectMatch) {
            aiDecision = JSON.parse(objectMatch[0]);
          } else {
            throw new Error('No valid JSON found');
          }
        }
      } catch (e2) {
        console.error('Failed to parse AI response:', e2);
        console.error('Raw response:', aiResponse);
        
        // Use intelligent fallback
        const fallbackDecision = generateFallbackDecision(query, tableSchema, tableName);
        return executeFallback(query, fallbackDecision, tableName, tableSchema);
      }
    }

    // Validate and sanitize AI decision
    aiDecision = {
      sql: aiDecision.sql || `SELECT * FROM ${tableName} LIMIT 10`,
      explanation: aiDecision.explanation || 'Analyzing your data',
      chartType: ['metric', 'bar', 'line', 'pie', 'table'].includes(aiDecision.chartType) 
        ? aiDecision.chartType 
        : 'table',
      title: aiDecision.title || 'Analysis Results',
      confidence: typeof aiDecision.confidence === 'number' 
        ? Math.min(1, Math.max(0, aiDecision.confidence)) 
        : 0.5,
      xAxis: aiDecision.xAxis || tableSchema.columns[0]?.name || 'category',
      yAxis: aiDecision.yAxis || tableSchema.columns[1]?.name || 'value'
    };

    console.log('🤖 Parsed AI Decision:', aiDecision);

    // Execute the AI-generated SQL with error handling
    console.log('⚡ Executing SQL:', aiDecision.sql);
    let result;
    try {
      result = queryEngine.executeQuery(aiDecision.sql);
    } catch (sqlError) {
      console.error('SQL execution failed:', sqlError);
      
      // Fallback to a safe query
      const fallbackDecision = generateFallbackDecision(query, tableSchema, tableName);
      return executeFallback(query, fallbackDecision, tableName, tableSchema);
    }

    // Format data based on chart type
    let formattedData = result.data;
    
    if (aiDecision.chartType === 'metric' && result.data.length === 1) {
      // Format for metric card - ensure we're using the right value
      const valueKey = Object.keys(result.data[0]).find(k => 
        !k.toLowerCase().includes('id') && typeof result.data[0][k] === 'number'
      ) || Object.keys(result.data[0])[0];
      
      const value = result.data[0][valueKey];
      formattedData = [{ 
        name: aiDecision.title || 'Value', 
        value: Number(value) || 0 
      }];
    }
    else if (aiDecision.chartType === 'pie' && result.data.length > 0) {
      // Format for pie chart - needs name/value pairs
      const keys = Object.keys(result.data[0]);
      const nameKey = keys.find(k => typeof result.data[0][k] === 'string') || keys[0];
      const valueKey = keys.find(k => typeof result.data[0][k] === 'number' && !k.toLowerCase().includes('id')) || keys[1] || keys[0];
      
      formattedData = result.data.map(row => ({
        name: String(row[nameKey] || 'Unknown'),
        value: Number(row[valueKey]) || 0
      }));
    }

    return NextResponse.json({
      success: true,
      query: {
        original: query,
        sql: aiDecision.sql,
        explanation: aiDecision.explanation,
        plan: {
          confidence: aiDecision.confidence,
          type: aiDecision.chartType
        }
      },
      data: formattedData,
      columns: result.columns,
      rowCount: result.rowCount,
      schema: {
        categoricalColumns: tableSchema.columns.filter(c => c.isCategorical).map(c => c.name),
        numericColumns: tableSchema.columns.filter(c => c.isNumeric && !c.isId).map(c => c.name),
        dateColumns: tableSchema.columns.filter(c => c.isDate).map(c => c.name),
        idColumns: tableSchema.columns.filter(c => c.isId).map(c => c.name)
      },
      visualization: {
        type: aiDecision.chartType,
        config: {
          title: aiDecision.title,
          xAxis: aiDecision.xAxis,
          yAxis: aiDecision.yAxis
        }
      }
    });

  } catch (error: any) {
    console.error('AI query error:', error);
    
    // Ultimate fallback - return a helpful error
    return NextResponse.json(
      { 
        error: 'Failed to process query',
        details: error instanceof Error ? error.message : 'Unknown error',
        suggestion: 'Please try rephrasing your question or upload a CSV file first.'
      },
      { status: 500 }
    );
  }
}

// Helper function to generate intelligent fallback decisions
function generateFallbackDecision(query: string, tableSchema: any, tableName: string) {
  const queryLower = query.toLowerCase();
  
  // Find appropriate columns
  const metricCol = tableSchema.columns.find((c: any) => c.isNumeric && !c.isId)?.name || 'value';
  const categoryCol = tableSchema.columns.find((c: any) => c.isCategorical)?.name || 'category';
  const dateCol = tableSchema.columns.find((c: any) => c.isDate)?.name || 'date';
  
  // Generate intelligent fallback based on query keywords
  if (queryLower.includes('average') || queryLower.includes('avg')) {
    return {
      sql: `SELECT AVG(${metricCol}) as average FROM ${tableName}`,
      explanation: `Calculating average ${metricCol}`,
      chartType: 'metric',
      title: `Average ${metricCol}`,
      confidence: 0.4,
      xAxis: 'average',
      yAxis: 'value'
    };
  }
  else if (queryLower.includes('category') || queryLower.includes('breakdown') || queryLower.includes('by')) {
    return {
      sql: `SELECT ${categoryCol}, COUNT(*) as count, AVG(${metricCol}) as average FROM ${tableName} GROUP BY ${categoryCol} ORDER BY count DESC`,
      explanation: `Breakdown by ${categoryCol}`,
      chartType: 'bar',
      title: `Analysis by ${categoryCol}`,
      confidence: 0.4,
      xAxis: categoryCol,
      yAxis: 'average'
    };
  }
  else if (queryLower.includes('region')) {
    return {
      sql: `SELECT region, SUM(${metricCol}) as total FROM ${tableName} GROUP BY region ORDER BY total DESC`,
      explanation: 'Showing revenue by region',
      chartType: 'bar',
      title: 'Revenue by Region',
      confidence: 0.4,
      xAxis: 'region',
      yAxis: 'total'
    };
  }
  else if (queryLower.includes('product')) {
    return {
      sql: `SELECT product, SUM(${metricCol}) as total FROM ${tableName} GROUP BY product ORDER BY total DESC LIMIT 10`,
      explanation: 'Showing revenue by product',
      chartType: 'bar',
      title: 'Revenue by Product',
      confidence: 0.4,
      xAxis: 'product',
      yAxis: 'total'
    };
  }
  else if (queryLower.includes('total') || queryLower.includes('sum') || queryLower.includes('revenue')) {
    return {
      sql: `SELECT SUM(${metricCol}) as total FROM ${tableName}`,
      explanation: 'Calculating total revenue',
      chartType: 'metric',
      title: 'Total Revenue',
      confidence: 0.4,
      xAxis: 'total',
      yAxis: 'value'
    };
  }
  else if (queryLower.includes('trend') || queryLower.includes('month') || queryLower.includes('time')) {
    return {
      sql: `SELECT ${dateCol} as date, SUM(${metricCol}) as total FROM ${tableName} GROUP BY ${dateCol} ORDER BY date`,
      explanation: 'Showing trend over time',
      chartType: 'line',
      title: 'Trend Analysis',
      confidence: 0.4,
      xAxis: 'date',
      yAxis: 'total'
    };
  }
  else {
    // Default fallback
    return {
      sql: `SELECT * FROM ${tableName} LIMIT 10`,
      explanation: 'Showing sample data',
      chartType: 'table',
      title: 'Data Sample',
      confidence: 0.3,
      xAxis: categoryCol,
      yAxis: metricCol
    };
  }
}

// Helper function to execute fallback queries
async function executeFallback(originalQuery: string, fallbackDecision: any, tableName: string, tableSchema: any) {
  try {
    console.log('⚡ Executing fallback SQL:', fallbackDecision.sql);
    const result = queryEngine.executeQuery(fallbackDecision.sql);
    
    return NextResponse.json({
      success: true,
      query: {
        original: originalQuery,
        sql: fallbackDecision.sql,
        explanation: fallbackDecision.explanation,
        plan: {
          confidence: fallbackDecision.confidence,
          type: fallbackDecision.chartType
        }
      },
      data: result.data,
      columns: result.columns,
      rowCount: result.rowCount,
      schema: {
        categoricalColumns: tableSchema.columns.filter((c: any) => c.isCategorical).map((c: any) => c.name),
        numericColumns: tableSchema.columns.filter((c: any) => c.isNumeric && !c.isId).map((c: any) => c.name),
        dateColumns: tableSchema.columns.filter((c: any) => c.isDate).map((c: any) => c.name),
        idColumns: tableSchema.columns.filter((c: any) => c.isId).map((c: any) => c.name)
      },
      visualization: {
        type: fallbackDecision.chartType,
        config: {
          title: fallbackDecision.title,
          xAxis: fallbackDecision.xAxis,
          yAxis: fallbackDecision.yAxis
        }
      }
    });
  } catch (fallbackError) {
    console.error('Fallback query also failed:', fallbackError);
    
    // Absolute last resort
    return NextResponse.json(
      { 
        error: 'Failed to process query',
        details: 'Unable to generate a valid query. Please try rephrasing your question.',
        suggestion: 'Try asking something like "show me average revenue by category"'
      },
      { status: 500 }
    );
  }
}