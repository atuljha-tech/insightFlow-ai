import { createClient } from '@libsql/client';
import { parse } from 'papaparse';
import fs from 'fs';
import path from 'path';

export interface QueryResult {
  data: any[];
  columns: string[];
  rowCount: number;
}

class DatabaseManager {
  private client: any;
  private initialized = false;
  private activeTable: string = 'sales';
  private useLocalFallback: boolean = false;

  constructor() {
    // Initialize with Turso if credentials exist, otherwise fallback to local
    const url = process.env.TURSO_DATABASE_URL;
    const token = process.env.TURSO_AUTH_TOKEN;
    
    if (url && token) {
      try {
        this.client = createClient({ url, authToken: token });
        console.log('✅ Using Turso cloud database');
      } catch (error) {
        console.error('Failed to initialize Turso, falling back to local:', error);
        this.useLocalFallback = true;
        this.initLocalFallback();
      }
    } else {
      console.log('⚠️ No Turso credentials, using local SQLite database');
      this.useLocalFallback = true;
      this.initLocalFallback();
    }
  }

  private initLocalFallback() {
    // Only import better-sqlite3 when needed (for local development)
    const Database = require('better-sqlite3');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'analytics.db');
    this.client = new Database(dbPath);
    console.log('📁 Using local SQLite database');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      if (this.useLocalFallback) {
        await this.initializeLocal();
      } else {
        await this.initializeTurso();
      }
      this.initialized = true;
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  private async initializeTurso(): Promise<void> {
    // Create sales table if it doesn't exist
    await this.client.execute(`
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
    const result = await this.client.execute('SELECT COUNT(*) as count FROM sales');
    const count = result.rows[0]?.count || 0;
    
    if (count === 0) {
      await this.loadSampleDataTurso();
    }

    console.log('✅ Turso database initialized successfully');
  }

  private async initializeLocal(): Promise<void> {
    // Create sales table if it doesn't exist
    this.client.exec(`
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
    const count = this.client.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };
    if (count.count === 0) {
      await this.loadSampleDataLocal();
    }

    console.log('✅ Local database initialized successfully');
  }

  private async loadSampleDataTurso(): Promise<void> {
    // Create sample data for Turso
    const sampleData = [
      ['2025-07-01', 'East', 'Laptop', 'Electronics', 12000, 8, 12, 0.25],
      ['2025-07-02', 'West', 'Phone', 'Electronics', 8000, 10, 15, 0.30],
      ['2025-07-03', 'North', 'Chair', 'Furniture', 3000, 15, 8, 0.40],
    ];

    for (const record of sampleData) {
      await this.client.execute({
        sql: `INSERT INTO sales (date, region, product, category, revenue, quantity, customers, profit_margin)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: record
      });
    }
    
    console.log(`✅ Created ${sampleData.length} sample records in Turso`);
  }

  private async loadSampleDataLocal(): Promise<void> {
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
        
        const insertStmt = this.client.prepare(insertSQL);
        
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

      const insertStmt = this.client.prepare(`
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
  async getTables(): Promise<string[]> {
    try {
      if (this.useLocalFallback) {
        const result = this.client.prepare(`
          SELECT name FROM sqlite_master 
          WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `).all();
        return result.map((r: any) => r.name);
      } else {
        const result = await this.client.execute(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
        );
        return result.rows.map((r: any) => r.name);
      }
    } catch (error) {
      console.error('Error getting tables:', error);
      return [];
    }
  }

  // Check if a table exists
  async tableExists(tableName: string): Promise<boolean> {
    try {
      if (this.useLocalFallback) {
        const result = this.client.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name = ?`
        ).get(tableName);
        return !!result;
      } else {
        const result = await this.client.execute({
          sql: "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
          args: [tableName]
        });
        return result.rows.length > 0;
      }
    } catch (error) {
      console.error('Error checking table existence:', error);
      return false;
    }
  }

  async query(sql: string, params: any[] = []): Promise<QueryResult> {
    try {
      if (this.useLocalFallback) {
        return this.queryLocal(sql, params);
      } else {
        return await this.queryTurso(sql, params);
      }
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  private queryLocal(sql: string, params: any[] = []): QueryResult {
    const stmt = this.client.prepare(sql);
    
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const data = stmt.all(...params);
      const columns = data.length > 0 ? Object.keys(data[0]) : [];
      return { data, columns, rowCount: data.length };
    } else {
      const result = stmt.run(...params);
      return {
        data: [{ changes: result.changes, lastInsertRowid: result.lastInsertRowid }],
        columns: ['changes', 'lastInsertRowid'],
        rowCount: 1,
      };
    }
  }

  private async queryTurso(sql: string, params: any[] = []): Promise<QueryResult> {
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      const result = await this.client.execute({ sql, args: params });
      return {
        data: result.rows || [],
        columns: result.columns || [],
        rowCount: result.rows?.length || 0,
      };
    } else {
      const result = await this.client.execute({ sql, args: params });
      return {
        data: [{ 
          changes: result.rowsAffected || 0, 
          lastInsertRowid: result.lastInsertRowid || null 
        }],
        columns: ['changes', 'lastInsertRowid'],
        rowCount: 1,
      };
    }
  }

  // Execute a query on a specific table (or active table)
  async queryOnTable(tableName: string, sql: string, params: any[] = []): Promise<QueryResult> {
    const finalSql = sql.replace(/FROM\s+(\w+)/i, (match, p1) => {
      if (p1 === '?table?' || p1 === 'current_table') {
        return `FROM ${tableName}`;
      }
      return match;
    });
    
    return this.query(finalSql, params);
  }

  async getTableInfo(tableName?: string): Promise<any[]> {
    const targetTable = tableName || this.activeTable;
    try {
      if (this.useLocalFallback) {
        return this.client.prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name = ?`).all(targetTable);
      } else {
        const result = await this.client.execute({
          sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name = ?",
          args: [targetTable]
        });
        return result.rows || [];
      }
    } catch (error) {
      console.error('Error getting table info:', error);
      return [];
    }
  }

  async getStats(tableName?: string): Promise<any> {
    const targetTable = tableName || this.activeTable;
    
    try {
      if (this.useLocalFallback) {
        return this.getStatsLocal(targetTable);
      } else {
        return await this.getStatsTurso(targetTable);
      }
    } catch (error) {
      console.error('Error getting stats:', error);
      return { totalRecords: 0, error: String(error) };
    }
  }

  private getStatsLocal(targetTable: string): any {
    // Get count
    const countResult = this.client.prepare(`SELECT COUNT(*) as count FROM ${targetTable}`).get() as { count: number };
    
    // Try to find numeric columns
    const tableInfo = this.client.prepare(`PRAGMA table_info(${targetTable})`).all() as any[];
    const numericColumns = tableInfo
      .filter((col: any) => col.type === 'REAL' || col.type === 'INTEGER')
      .map((col: any) => col.name);
    
    const stats: any = { totalRecords: countResult.count || 0 };
    
    // Add sum of first numeric column if exists
    if (numericColumns.length > 0) {
      const sumResult = this.client.prepare(`SELECT SUM(${numericColumns[0]}) as total FROM ${targetTable}`).get() as { total: number };
      stats.totalValue = sumResult.total || 0;
      stats.mainMetric = numericColumns[0];
    }
    
    // Get unique counts for text columns
    const textColumns = tableInfo
      .filter((col: any) => col.type === 'TEXT')
      .slice(0, 3)
      .map((col: any) => col.name);
    
    for (const col of textColumns) {
      const uniqueResult = this.client.prepare(`SELECT COUNT(DISTINCT ${col}) as count FROM ${targetTable}`).get() as { count: number };
      stats[`unique_${col}`] = uniqueResult.count || 0;
    }
    
    return stats;
  }

  private async getStatsTurso(targetTable: string): Promise<any> {
    // Get count
    const countResult = await this.client.execute(`SELECT COUNT(*) as count FROM ${targetTable}`);
    const count = countResult.rows[0]?.count || 0;
    
    // Get table info
    const tableInfo = await this.client.execute(`PRAGMA table_info(${targetTable})`);
    const numericColumns = tableInfo.rows
      .filter((col: any) => col.type === 'REAL' || col.type === 'INTEGER')
      .map((col: any) => col.name);
    
    const stats: any = { totalRecords: count };
    
    // Add sum of first numeric column if exists
    if (numericColumns.length > 0) {
      const sumResult = await this.client.execute(`SELECT SUM(${numericColumns[0]}) as total FROM ${targetTable}`);
      stats.totalValue = sumResult.rows[0]?.total || 0;
      stats.mainMetric = numericColumns[0];
    }
    
    // Get unique counts for text columns
    const textColumns = tableInfo.rows
      .filter((col: any) => col.type === 'TEXT')
      .slice(0, 3)
      .map((col: any) => col.name);
    
    for (const col of textColumns) {
      const uniqueResult = await this.client.execute(`SELECT COUNT(DISTINCT ${col}) as count FROM ${targetTable}`);
      stats[`unique_${col}`] = uniqueResult.rows[0]?.count || 0;
    }
    
    return stats;
  }

  async transaction<T>(fn: () => Promise<T>): Promise<T> {
    if (this.useLocalFallback) {
      const result = this.client.transaction(fn)();
      return result;
    } else {
      await this.client.execute('BEGIN TRANSACTION');
      try {
        const result = await fn();
        await this.client.execute('COMMIT');
        return result;
      } catch (error) {
        await this.client.execute('ROLLBACK');
        throw error;
      }
    }
  }

  async close(): Promise<void> {
    if (!this.useLocalFallback) {
      // Turso doesn't need explicit close
      console.log('Turso connection closed');
    } else {
      this.client.close();
    }
  }
}

export const dbManager = new DatabaseManager();