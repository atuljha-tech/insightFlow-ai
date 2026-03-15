import { dbManager } from './db';

export interface TableSchema {
  name: string;
  columns: {
    name: string;
    type: string;
    sampleValues: any[];
    isNumeric: boolean;
    isCategorical: boolean;
    isDate: boolean;
    isId: boolean;
    uniqueValues?: number;
    min?: number;
    max?: number;
  }[];
}

class SchemaAnalyzer {
  async getTableSchema(tableName?: string): Promise<TableSchema> {
    const targetTable = tableName || dbManager.getActiveTable();
    
    try {
      // Check if table exists
      if (!dbManager.tableExists(targetTable)) {
        console.log(`Table ${targetTable} does not exist, using sales`);
        return this.getTableSchema('sales');
      }
      
      // Get table info
      const tableInfo = dbManager.query(`PRAGMA table_info(${targetTable})`);
      
      // Get all data to analyze columns properly
      const allData = dbManager.query(`SELECT * FROM ${targetTable} LIMIT 100`).data;
      
      if (allData.length === 0) {
        return {
          name: targetTable,
          columns: []
        };
      }

      // Analyze each column
      const columns = await Promise.all(tableInfo.data.map(async (col: any) => {
        const colName = col.name;
        
        // SAFETY CHECK - if colName is undefined or null, skip
        if (!colName) {
          return null;
        }
        
        // Get all non-null values for this column
        const allValues = allData
          .map(row => row[colName])
          .filter(v => v !== null && v !== undefined && v !== '');
        
        // Get sample values
        const samples = allValues.slice(0, 5);
        
        // Determine if numeric
        const isNumeric = allValues.length > 0 && allValues.every(v => !isNaN(Number(v)) && v !== '');
        
        // Check if ID column - WITH PROPER NULL CHECK
        const colNameLower = colName.toLowerCase();
        const isId = colNameLower === 'id' || 
                     colNameLower === 'employee_id' ||
                     colNameLower.includes('_id') ||
                     (isNumeric && allValues.length > 0 && 
                      new Set(allValues).size === allValues.length && 
                      allValues.every(v => Number.isInteger(Number(v))));
        
        // Check if date
        const isDate = !isNumeric && allValues.length > 0 && 
                       allValues.every(v => !isNaN(Date.parse(String(v))));
        
        // Get unique values count
        const uniqueValues = new Set(allValues.map(v => String(v))).size;
        
        // Determine if categorical
        const isCategorical = !isNumeric && !isDate && !isId && 
                             (uniqueValues < 20 || allValues.some(v => typeof v === 'string'));
        
        // Get min/max for numeric columns
        let min, max;
        if (isNumeric && !isId) {
          const numbers = allValues.map(v => Number(v));
          min = Math.min(...numbers);
          max = Math.max(...numbers);
        }

        return {
          name: colName,
          type: col.type,
          sampleValues: samples,
          isNumeric: isNumeric && !isId,
          isCategorical,
          isDate,
          isId,
          uniqueValues,
          min,
          max
        };
      }));

      // Filter out any null values
      const validColumns = columns.filter(col => col !== null);

      return {
        name: targetTable,
        columns: validColumns
      };

    } catch (error) {
      console.error('Error getting schema:', error);
      return {
        name: targetTable,
        columns: []
      };
    }
  }

  async identifyMainColumns(tableName?: string): Promise<{
    metricColumns: string[];
    categoryColumns: string[];
    dateColumns: string[];
    idColumns: string[];
  }> {
    const schema = await this.getTableSchema(tableName);
    
    // Common metric keywords
    const metricKeywords = ['salary', 'revenue', 'sales', 'amount', 'price', 'cost', 'profit', 'age', 'years', 'rating', 'score'];
    
    const metricColumns = schema.columns
      .filter(col => {
        if (col.isNumeric && !col.isId) return true;
        
        const nameLower = col.name.toLowerCase();
        return metricKeywords.some(keyword => nameLower.includes(keyword));
      })
      .map(col => col.name);
    
    // Common category keywords
    const categoryKeywords = ['department', 'category', 'region', 'type', 'status', 'job', 'title', 'name', 'role', 'remote'];
    
    const categoryColumns = schema.columns
      .filter(col => {
        if (col.isCategorical) return true;
        
        const nameLower = col.name.toLowerCase();
        return categoryKeywords.some(keyword => nameLower.includes(keyword));
      })
      .map(col => col.name);
    
    const dateColumns = schema.columns
      .filter(col => col.isDate)
      .map(col => col.name);
    
    const idColumns = schema.columns
      .filter(col => col.isId)
      .map(col => col.name);
    
    return {
      metricColumns,
      categoryColumns,
      dateColumns,
      idColumns
    };
  }

  async getDatabaseSummary(tableName?: string): Promise<string> {
    const schema = await this.getTableSchema(tableName);
    const { metricColumns, categoryColumns, dateColumns, idColumns } = await this.identifyMainColumns(tableName);
    
    let summary = `Database Schema:\nTable: ${schema.name}\n\n`;
    
    if (metricColumns.length > 0) {
      summary += `📊 METRIC COLUMNS (for calculations):\n`;
      metricColumns.slice(0, 5).forEach(col => {
        const colInfo = schema.columns.find(c => c.name === col);
        summary += `  - ${col}`;
        if (colInfo?.min !== undefined && colInfo?.max !== undefined) {
          summary += ` (range: ${colInfo.min} to ${colInfo.max})`;
        }
        summary += `\n`;
      });
    }
    
    if (categoryColumns.length > 0) {
      summary += `\n📁 CATEGORY COLUMNS (for grouping):\n`;
      categoryColumns.slice(0, 5).forEach(col => {
        const colInfo = schema.columns.find(c => c.name === col);
        summary += `  - ${col}`;
        if (colInfo?.uniqueValues) {
          summary += ` (${colInfo.uniqueValues} unique values)`;
        }
        if (colInfo?.sampleValues && colInfo.sampleValues.length > 0) {
          summary += ` e.g., ${colInfo.sampleValues.slice(0, 3).join(', ')}`;
        }
        summary += `\n`;
      });
    }
    
    if (dateColumns.length > 0) {
      summary += `\n📅 DATE COLUMNS (for trends):\n`;
      dateColumns.forEach(col => {
        summary += `  - ${col}\n`;
      });
    }
    
    if (idColumns.length > 0) {
      summary += `\n⚠️ ID COLUMNS (ignore for calculations):\n`;
      idColumns.slice(0, 3).forEach(col => {
        summary += `  - ${col}\n`;
      });
    }
    
    return summary;
  }
}

export const schemaAnalyzer = new SchemaAnalyzer();