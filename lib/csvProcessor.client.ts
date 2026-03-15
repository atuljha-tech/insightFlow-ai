export interface ColumnInfo {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sample: any[];
}

export interface DatasetInfo {
  fileName: string;
  rowCount: number;
  columns: ColumnInfo[];
  summary: {
    totalRows: number;
    totalColumns: number;
    numericColumns: number;
    categoricalColumns: number;
    dateColumns: number;
  };
  preview: any[];
}

class CSVProcessorClient {
  /**
   * Upload CSV file to server for processing
   */
  async uploadCSV(file: File): Promise<{ dataset: DatasetInfo; suggestions: string[] }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.details || error.error || 'Upload failed');
    }

    const result = await response.json();
    return {
      dataset: result.dataset,
      suggestions: result.suggestions
    };
  }

  /**
   * Validate CSV file before upload
   */
  validateCSV(file: File): { valid: boolean; error?: string } {
    if (!file.name.endsWith('.csv')) {
      return { valid: false, error: 'Please upload a CSV file' };
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return { valid: false, error: 'File size too large (max 10MB)' };
    }

    return { valid: true };
  }

  /**
   * Get suggested queries based on dataset
   */
  getSuggestedQueries(dataset: DatasetInfo): string[] {
    const suggestions: string[] = [];
    const { numericColumns, categoricalColumns, dateColumns } = dataset.summary;

    if (numericColumns > 0 && categoricalColumns > 0) {
      const numericCol = dataset.columns.find(c => c.type === 'number')?.name || 'value';
      const categoricalCol = dataset.columns.find(c => c.type === 'string')?.name || 'category';
      suggestions.push(`Show me ${numericCol} by ${categoricalCol}`);
    }

    if (dateColumns > 0 && numericColumns > 0) {
      suggestions.push(`Show monthly trend of revenue`);
    }

    if (numericColumns > 1) {
      suggestions.push(`Compare ${dataset.columns.filter(c => c.type === 'number')[0]?.name} and ${dataset.columns.filter(c => c.type === 'number')[1]?.name}`);
    }

    if (categoricalColumns > 0 && numericColumns > 0) {
      suggestions.push(`Top 5 products by revenue`);
    }

    return suggestions.slice(0, 4);
  }
}

export const csvProcessorClient = new CSVProcessorClient();