import type { D1Database } from '@cloudflare/workers-types';

/**
 * Service class for handling database operations with Cloudflare D1
 * Provides methods for executing queries and retrieving data
 */
class DatabaseService {
  private db: D1Database | undefined;
  private currentBinding: string = 'DB';

  constructor(db?: D1Database, bindingName: string = 'DB') {
    this.db = db;
    this.currentBinding = bindingName;
  }

  public setDb(db: D1Database, bindingName: string = 'DB') {
    this.db = db;
    this.currentBinding = bindingName;
  }

  public getCurrentBinding(): string {
    return this.currentBinding;
  }

  public initFromContext(context: any, bindingName: string = 'DB'): boolean {
    if (context?.cloudflare?.env?.[bindingName]) {
      this.db = context.cloudflare.env[bindingName];
      this.currentBinding = bindingName;
      return true;
    }
    return false;
  }

  public async executeQuery(query: string, params: any[] = []) {
    if (!this.db) {
      console.warn(`Attempted to execute query without database (${this.currentBinding}): ${query}`);
      throw new Error(`Database not available: ${this.currentBinding}`);
    }
    try {
      if (params.length > 0) {
        const statement = this.db.prepare(query);
        return await statement.bind(...params).run();
      } else {
        return await this.db.exec(query);
      }
    } catch (error) {
      console.error(`Database (${this.currentBinding}) query error:`, error);
      throw error;
    }
  }

  public async getAllRows(query: string, params: any[] = []) {
    if (!this.db) {
      console.warn(`Attempted to get all rows without database (${this.currentBinding}): ${query}`);
      throw new Error(`Database not available: ${this.currentBinding}`);
    }
    try {
      const statement = this.db.prepare(query);
      if (params.length > 0) {
        return await statement.bind(...params).all();
      } else {
        return await statement.all();
      }
    } catch (error) {
      console.error(`Database (${this.currentBinding}) query error:`, error);
      throw error;
    }
  }

  public async getFirstRow(query: string, params: any[] = []) {
    if (!this.db) {
      console.warn(`Attempted to get first row without database (${this.currentBinding}): ${query}`);
      throw new Error(`Database not available: ${this.currentBinding}`);
    }
    try {
      const statement = this.db.prepare(query);
      if (params.length > 0) {
        return await statement.bind(...params).first();
      } else {
        return await statement.first();
      }
    } catch (error) {
      console.error(`Database (${this.currentBinding}) query error:`, error);
      throw error;
    }
  }

  public async createTableIfNotExists(tableName: string, schema: string) {
    return this.executeQuery(`CREATE TABLE IF NOT EXISTS ${tableName} (${schema})`);
  }

  public async updateSetting(tableName: string, key: string, value: any) {
    return this.executeQuery(
      `INSERT OR REPLACE INTO ${tableName} (key, value, updated_at) VALUES (?, ?, ?)`,
      [key, String(value), Date.now()]
    );
  }

  public async getSetting(tableName: string, key: string) {
    return this.getFirstRow(`SELECT value FROM ${tableName} WHERE key = ?`, [key]);
  }

  public async getAllSettings(tableName: string) {
    return this.getAllRows(`SELECT key, value, updated_at FROM ${tableName}`);
  }

  public async initSettingsTable(tableName: string) {
    return this.createTableIfNotExists(
      tableName,
      'key TEXT PRIMARY KEY, value TEXT, updated_at INTEGER'
    );
  }
}

const dbService = new DatabaseService();
export default dbService;
