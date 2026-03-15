import { useState, useEffect } from 'react';

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'neutral' | 'warning' | 'discovery';
  title: string;
  description: string;
  metric?: string;
  change?: number;
  confidence: number;
}

export function useInsights(data: any[], query: string) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't run if no data
    if (!data || data.length === 0) {
      setInsights([]);
      return;
    }

    const fetchInsights = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            data: data.slice(0, 100), // Limit data size for API
            query: query || 'data analysis' 
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && Array.isArray(result.insights)) {
          setInsights(result.insights);
        } else {
          // Fallback to client-side insights
          setInsights(generateClientInsights(data));
        }
      } catch (err) {
        console.error('Failed to fetch insights:', err);
        setError(err instanceof Error ? err.message : 'Failed to load insights');
        // Fallback to client-side insights
        setInsights(generateClientInsights(data));
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [data, query]); // Re-run when data or query changes

  // Client-side fallback insights generator
  const generateClientInsights = (data: any[]): Insight[] => {
    const insights: Insight[] = [];
    
    if (data.length === 0) return insights;

    try {
      // Get sample row to identify columns
      const sampleRow = data[0];
      const columns = Object.keys(sampleRow);
      
      // Find numeric columns
      const numericColumns = columns.filter(key => 
        typeof sampleRow[key] === 'number'
      );

      if (numericColumns.length > 0) {
        const col = numericColumns[0];
        
        // Calculate total
        const total = data.reduce((sum, row) => sum + (Number(row[col]) || 0), 0);
        
        insights.push({
          id: `client-${Date.now()}-1`,
          type: 'neutral',
          title: `Total ${col}`,
          description: `Total ${col} is ${formatNumber(total)}`,
          metric: formatNumber(total),
          confidence: 0.8
        });

        // Find maximum
        const maxRow = data.reduce((max, row) => {
          const val = Number(row[col]) || 0;
          const maxVal = Number(max[col]) || 0;
          return val > maxVal ? row : max;
        }, data[0]);
        
        const maxName = maxRow.name || maxRow[Object.keys(maxRow)[0]] || 'Item';
        const maxValue = Number(maxRow[col]) || 0;
        
        insights.push({
          id: `client-${Date.now()}-2`,
          type: 'positive',
          title: `Top ${col}`,
          description: `${maxName} leads with ${formatNumber(maxValue)}`,
          metric: formatNumber(maxValue),
          confidence: 0.8
        });

        // Calculate average
        const avg = total / data.length;
        insights.push({
          id: `client-${Date.now()}-3`,
          type: 'neutral',
          title: `Average ${col}`,
          description: `Average ${col} is ${formatNumber(avg)}`,
          metric: formatNumber(avg),
          confidence: 0.8
        });
      }

      // Find categorical columns for distribution insights
      const categoricalColumns = columns.filter(key => 
        typeof sampleRow[key] === 'string' && 
        !key.toLowerCase().includes('date') &&
        !key.toLowerCase().includes('id')
      );

      if (categoricalColumns.length > 0 && numericColumns.length > 0) {
        const catCol = categoricalColumns[0];
        const numCol = numericColumns[0];
        
        // Count unique categories
        const categories = new Set(data.map(row => row[catCol]).filter(Boolean));
        
        if (categories.size > 1 && categories.size <= 10) {
          insights.push({
            id: `client-${Date.now()}-4`,
            type: 'discovery',
            title: 'Category Distribution',
            description: `Data spans ${categories.size} different ${catCol} categories`,
            metric: categories.size.toString(),
            confidence: 0.7
          });
        }
      }
    } catch (error) {
      console.error('Error generating client insights:', error);
    }

    return insights;
  };

  // Helper to format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}K`;
    return `$${num.toFixed(0)}`;
  };

  return { insights, loading, error };
}