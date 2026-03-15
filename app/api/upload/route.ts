import { NextRequest, NextResponse } from 'next/server';
import { parse } from 'papaparse';
import { dbManager } from '@/lib/server/db';

// Configuration
const BATCH_SIZE = 50;
const PREVIEW_LIMIT = 5;
const MAX_COLUMNS_PREVIEW = 10;

interface CSVRow {
  [key: string]: string | number | boolean | null;
}

export async function POST(request: NextRequest) {
  console.log('🚀 Starting CSV upload process...');
  
  try {
    // ==================== FILE VALIDATION ====================
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      console.warn('❌ No file provided in request');
      return NextResponse.json(
        { 
          success: false,
          error: 'No file provided' 
        },
        { status: 400 }
      );
    }

    console.log(`📁 File received: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      console.warn(`❌ Invalid file type: ${file.name}`);
      return NextResponse.json(
        { 
          success: false,
          error: 'Only CSV files are allowed' 
        },
        { status: 400 }
      );
    }

    // ==================== FILE READING ====================
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const csvContent = buffer.toString('utf-8');

    console.log(`📄 CSV content size: ${csvContent.length} characters`);

    // ==================== CSV PARSING ====================
    const { data, errors, meta } = parse(csvContent, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transform: (value) => {
        return typeof value === 'string' ? value.trim() : value;
      }
    });

    if (errors.length > 0) {
      console.error('⚠️ CSV parsing warnings:', errors.slice(0, 5));
    }

    if (!data || data.length === 0) {
      console.warn('❌ CSV file is empty');
      return NextResponse.json(
        { 
          success: false,
          error: 'CSV file is empty' 
        },
        { status: 400 }
      );
    }

    console.log(`✅ Successfully parsed ${data.length} rows from CSV`);

    const firstRow = data[0] as CSVRow | undefined;
    if (!firstRow) {
      console.warn('❌ CSV has no valid data rows');
      return NextResponse.json(
        { 
          success: false,
          error: 'CSV has no valid data rows' 
        },
        { status: 400 }
      );
    }

    // ==================== COLUMN DETECTION ====================
    const columns = Object.keys(firstRow).filter(col => col.trim() !== '');
    
    if (columns.length === 0) {
      console.warn('❌ CSV has no columns');
      return NextResponse.json(
        { 
          success: false,
          error: 'CSV has no columns' 
        },
        { status: 400 }
      );
    }

    console.log(`📋 Detected ${columns.length} columns:`, columns);

    // ==================== TABLE NAME GENERATION ====================
    const baseName = file.name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toLowerCase()
      .substring(0, 50);
    
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    const tableName = `data_${baseName}_${timestamp}_${randomSuffix}`;

    console.log(`🏷️ Generated table name: ${tableName}`);

    // ==================== SCHEMA DETECTION ====================
    const columnDefinitions = columns.map(col => {
      const safeColName = col
        .replace(/[^a-zA-Z0-9_]/g, '_')
        .replace(/^_|_$/g, '')
        .substring(0, 50);
      
      const finalColName = safeColName || `column_${Math.random().toString(36).substring(2, 6)}`;
      
      let detectedType = 'TEXT';
      
      for (let i = 0; i < Math.min(5, data.length); i++) {
        const row = data[i] as CSVRow;
        if (!row) continue;
        
        const value = row[col];
        if (value === undefined || value === null) continue;
        
        if (typeof value === 'number') {
          detectedType = Number.isInteger(value) ? 'INTEGER' : 'REAL';
          break;
        } else if (typeof value === 'boolean') {
          detectedType = 'INTEGER';
          break;
        } else {
          const strValue = String(value);
          if (strValue.match(/^\d{4}-\d{2}-\d{2}/) || 
              strValue.match(/^\d{2}\/\d{2}\/\d{4}/) ||
              !isNaN(Date.parse(strValue))) {
            detectedType = 'DATE';
            break;
          }
        }
      }
      
      return {
        original: col,
        safe: finalColName,
        type: detectedType
      };
    });

    console.log('🔍 Column definitions:', columnDefinitions);

    // ==================== TABLE CREATION ====================
    const createColumnsSQL = columnDefinitions
      .map(col => `"${col.safe}" ${col.type}`)
      .join(', ');

    await dbManager.query(`DROP TABLE IF EXISTS "${tableName}"`);
    
    const createSQL = `
      CREATE TABLE "${tableName}" (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ${createColumnsSQL}
      )
    `;
    
    console.log('📝 Creating table with SQL:', createSQL);
    await dbManager.query(createSQL);
    console.log(`✅ Table created successfully`);

    // ==================== DATA INSERTION ====================
    const safeColumns = columnDefinitions.map(col => `"${col.safe}"`);
    const placeholders = columnDefinitions.map(() => '?').join(', ');
    const insertSQL = `INSERT INTO "${tableName}" (${safeColumns.join(', ')}) VALUES (${placeholders})`;

    let insertedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      
      if (!row) {
        failedCount++;
        continue;
      }
      
      const values = columnDefinitions.map(colDef => {
        const val = (row as CSVRow)[colDef.original];
        
        if (val === undefined || val === null) {
          return null;
        }
        
        if (colDef.type === 'INTEGER' && typeof val === 'boolean') {
          return val ? 1 : 0;
        }
        
        if (colDef.type === 'DATE' && typeof val === 'string') {
          const date = new Date(val);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
        }
        
        return val;
      });
      
      try {
        dbManager.query(insertSQL, values);
        insertedCount++;
      } catch (insertError) {
        console.warn(`⚠️ Failed to insert row ${i}:`, insertError);
        failedCount++;
      }

      if ((i + 1) % 10 === 0) {
        console.log(`📊 Inserted ${i + 1}/${data.length} rows...`);
      }
    }

    console.log(`✅ Data insertion complete: ${insertedCount} inserted, ${failedCount} failed`);

    // ==================== SET ACTIVE TABLE ====================
    dbManager.setActiveTable(tableName);
    console.log(`🎯 Active table set to: ${tableName}`);

    // ==================== VERIFY TABLE EXISTS ====================
    const checkTable = dbManager.query(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`);
    console.log('🔍 Table verification:', checkTable);

    // ==================== GENERATE PREVIEW ====================
    const preview = data.slice(0, PREVIEW_LIMIT).map((row, index) => {
      const previewRow: Record<string, any> = {};
      columnDefinitions.slice(0, MAX_COLUMNS_PREVIEW).forEach(colDef => {
        previewRow[colDef.safe] = (row as CSVRow)[colDef.original];
      });
      return previewRow;
    });

    const response = {
      success: true,
      message: 'File uploaded successfully',
      tableName,
      stats: {
        rowCount: data.length,
        insertedCount,
        failedCount,
        columnCount: columns.length,
        columns: columnDefinitions.slice(0, MAX_COLUMNS_PREVIEW).map(c => c.safe),
      },
      preview,
      active: true,
    };

    console.log('✨ Upload completed successfully');
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Fatal upload error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process CSV',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}