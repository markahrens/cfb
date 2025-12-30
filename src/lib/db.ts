import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'src', 'content', 'cfb.db');
const db = new Database(dbPath, { readonly: true });


export function getActiveConferences() {
  return db.prepare(`
    SELECT DISTINCT c.name, c.classification
    FROM conferences c
    INNER JOIN teams_conferences tc ON c.id = tc.conference_id
    ORDER BY c.name
  `).all();
}