import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'src', 'content', 'cfb', 'cfb.db');
const db = new Database(dbPath, { readonly: true });