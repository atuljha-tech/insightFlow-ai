import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, query } = body;

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Data is required and must be an array' },
        { status: 400 }
      );
    }

    // Generate simple insights server-side
    const insights = generateInsights(data, query);

    return NextResponse.json({
      success: true,
      insights
    });

  } catch (error) {
    console.error('Insights generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate insights',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function generateInsights(data: any[], query: string): any[] {
  const insights: any[] = [];
  
  if (data.length === 0) return insights;

  try {
    const sampleRow = data[0];
    const columns = Object.keys(sampleRow);
    
    // Find numeric columns
    const numericColumns = columns.filter(key => 
      typeof sampleRow[key] === 'number'
    );

    if (numericColumns.length > 0) {
      const col = numericColumns[0];
      const total = data.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
      
      insights.push({
        id: `server-${Date.now()}-1`,
        type: 'neutral',
        title: `Total ${col}`,
        description: `Total ${col} is ${formatNumber(total)}`,
        metric: formatNumber(total),
        confidence: 0.9
      });

      // Find max
      const maxRow = data.reduce((max, row) => {
        const val = Number(row[col]) || 0;
        const maxVal = Number(max[col]) || 0;
        return val > maxVal ? row : max;
      }, data[0]);
      
      const maxName = maxRow.name || maxRow[Object.keys(maxRow)[0]] || 'Item';
      
      insights.push({
        id: `server-${Date.now()}-2`,
        type: 'positive',
        title: `Top Performer`,
        description: `${maxName} has highest ${col} at ${formatNumber(Number(maxRow[col]))}`,
        metric: formatNumber(Number(maxRow[col])),
        confidence: 0.9
      });
    }

    // Add query-based insight
    if (query) {
      insights.push({
        id: `server-${Date.now()}-3`,
        type: 'discovery',
        title: 'Query Analysis',
        description: `Analyzed ${data.length} records based on: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`,
        confidence: 0.7
      });
    }
  } catch (error) {
    console.error('Error generating insights:', error);
  }

  return insights;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
  return `$${num.toFixed(0)}`;
}