import fs from 'fs';
import path from 'path';
import { parse } from 'papaparse';

type BetterSqlite3Statement = {
  all: (...params: any[]) => any[];
  get: (...params: any[]) => any;
  run: (...params: any[]) => any;
};

type BetterSqlite3Database = {
  exec: (sql: string) => void;
  prepare: (sql: string) => BetterSqlite3Statement;
  transaction: <T extends (...args: any[]) => any>(fn: T) => T;
  close: () => void;
};

type BetterSqlite3Constructor = {
  new (filename: string, options?: Record<string, any>): BetterSqlite3Database;
};

const Database = require('better-sqlite3') as BetterSqlite3Constructor;

export interface QueryResult {
  data: any[];
  columns: string[];
  rowCount: number;
}

class DatabaseManager {
  private db: BetterSqlite3Database;
  private initialized = false;
  private activeTable: string = 'sales';

  constructor() {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'analytics.db');
    this.db = new Database(dbPath);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Create sales table if it doesn't exist
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        region TEXT,
        product TEXT,
        category TEXT,
        revenue REAL,
        quantity INTEGER,
        customers INTEGER,
        profit_margin REAL
      );
    `);

    // Check if sales table is empty
    const count = this.db.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };
    if (count.count === 0) {
      await this.loadSampleData();
    }

    this.initialized = true;
    console.log('✅ Database initialized successfully');
  }

  private async loadSampleData(): Promise<void> {
    const csvPath = path.join(process.cwd(), 'data', 'sales.csv');
    
    if (fs.existsSync(csvPath)) {
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const parsed = parse(csvContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
      });

      const data = Array.isArray(parsed.data) ? parsed.data as any[] : [];
      
      if (data.length > 0) {
        const columns = Object.keys(data[0]);
        const placeholders = columns.map(() => '?').join(', ');
        const insertSQL = `INSERT INTO sales (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
        
        const insertStmt = this.db.prepare(insertSQL);
        
        for (const row of data) {
          const values = columns.map(col => row[col] ?? null);
          insertStmt.run(...values);
        }
        
        console.log(`✅ Loaded ${data.length} sample records`);
      }
    } else {
      // Create sample data
      const sampleData = [
        ['2025-07-01', 'East', 'Laptop', 'Electronics', 12000, 8, 12, 0.25],
        ['2025-07-02', 'West', 'Phone', 'Electronics', 8000, 10, 15, 0.30],
        ['2025-07-03', 'North', 'Chair', 'Furniture', 3000, 15, 8, 0.40],
      ];

      const insertStmt = this.db.prepare(`
        INSERT INTO sales (date, region, product, category, revenue, quantity, customers, profit_margin)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const record of sampleData) {
        insertStmt.run(...record);
      }
      
      console.log(`✅ Created ${sampleData.length} sample records`);
    }
  }

  // Set the active table for queries
  setActiveTable(tableName: string): void {
    this.activeTable = tableName;
    console.log(`🔄 Active table set to: ${tableName}`);
  }

  // Get the active table
  getActiveTable(): string {
    return this.activeTable;
  }

  // Get all table names
  getTables(): string[] {
    const result = this.db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `).all();
    
    return result.map((r: any) => r.name);
  }

  // Check if a table exists
  tableExists(tableName: string): boolean {
    const result = this.db.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`
    ).get(tableName);
    
    return !!result;
  }

  query(sql: string, params: any[] = []): QueryResult {
  try {
    const stmt = this.db.prepare(sql);
    
    // Check if it's a SELECT query
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const data = stmt.all(...params);
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      return {
        data,
        columns,
        rowCount: data.length,
      };
    } else {
      // For INSERT, UPDATE, DELETE, CREATE TABLE, etc.
      const result = stmt.run(...params);
      return {
        data: [{ changes: result.changes, lastInsertRowid: result.lastInsertRowid }],
        columns: ['changes', 'lastInsertRowid'],
        rowCount: 1,
      };
    }
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}
  // Execute a query on a specific table (or active table)
  queryOnTable(tableName: string, sql: string, params: any[] = []): QueryResult {
    // Replace any placeholder with actual table name if needed
    const finalSql = sql.replace(/FROM\s+(\w+)/i, (match, p1) => {
      if (p1 === '?table?' || p1 === 'current_table') {
        return `FROM ${tableName}`;
      }
      return match;
    });
    
    return this.query(finalSql, params);
  }

  getTableInfo(tableName?: string): any[] {
    const targetTable = tableName || this.activeTable;
    return this.db.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`).all(targetTable);
  }

  getStats(tableName?: string): any {
    const targetTable = tableName || this.activeTable;
    
    try {
      // Get count
      const countResult = this.db.prepare(`SELECT COUNT(*) as count FROM ${targetTable}`).get() as { count: number };
      
      // Try to find numeric columns
      const tableInfo = this.db.prepare(`PRAGMA table_info(${targetTable})`).all() as any[];
      const numericColumns = tableInfo
        .filter(col => col.type === 'REAL' || col.type === 'INTEGER')
        .map(col => col.name);
      
      const stats: any = {
        totalRecords: countResult.count || 0,
      };
      
      // Add sum of first numeric column if exists
      if (numericColumns.length > 0) {
        const sumResult = this.db.prepare(`SELECT SUM(${numericColumns[0]}) as total FROM ${targetTable}`).get() as { total: number };
        stats.totalValue = sumResult.total || 0;
        stats.mainMetric = numericColumns[0];
      }
      
      // Get unique counts for text columns
      const textColumns = tableInfo
        .filter(col => col.type === 'TEXT')
        .slice(0, 3)
        .map(col => col.name);
      
      for (const col of textColumns) {
        const uniqueResult = this.db.prepare(`SELECT COUNT(DISTINCT ${col}) as count FROM ${targetTable}`).get() as { count: number };
        stats[`unique_${col}`] = uniqueResult.count || 0;
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        totalRecords: 0,
        error: String(error)
      };
    }
  }

  // FIXED: Proper transaction method
  transaction<T>(fn: () => T): T {
    const result = this.db.transaction(fn)();
    return result;
  }

  close(): void {
    this.db.close();
  }
}

export const dbManager = new DatabaseManager();