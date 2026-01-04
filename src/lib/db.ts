import Database from 'better-sqlite3';
import path from 'path';
import slugify from 'slugify';

const dbPath = path.resolve(process.cwd(), 'src', 'content', 'cfb.db');
const db = new Database(dbPath, { readonly: true });


export function getAllConferences() {
  return db.prepare(`
    SELECT DISTINCT c.name, c.classification
    FROM conferences c
    INNER JOIN teams_conferences tc ON c.id = tc.conference_id
    ORDER BY c.name
  `).all();
}

export function getActiveConferences() {
  return db.prepare(`
    SELECT DISTINCT c.name, c.classification
    FROM conferences c
    INNER JOIN teams_conferences tc ON c.id = tc.conference_id
    WHERE tc.year_left IS NULL
    ORDER BY c.name
  `).all();
}

export function getPastConferences() {
  return db.prepare(`
    SELECT DISTINCT c.name, c.classification
    FROM conferences c
    INNER JOIN teams_conferences tc ON c.id = tc.conference_id
    WHERE tc.year_left IS NOT NULL
      AND c.id NOT IN (
        SELECT conference_id 
        FROM teams_conferences 
        WHERE year_left IS NULL
      )
    ORDER BY c.name
  `).all();
}

export function getCurrentTeamsByConference(conferenceName: string) {
  return db.prepare(`
    SELECT 
      t.id,
      t.school,
      t.mascot,
      t.abbreviation,
      t.color,
      t.alt_color,
      v.latitude,
      v.longitude,
      v.name as venue_name,
      v.city,
      v.state,
      tc.year_joined
    FROM teams t
    INNER JOIN teams_conferences tc ON t.id = tc.team_id
    INNER JOIN conferences c ON tc.conference_id = c.id
    LEFT JOIN venues v ON t.venue_id = v.id
    WHERE c.name = ? AND tc.year_left IS NULL
    ORDER BY t.school
  `).all(conferenceName);
}

export function getPastTeamsByConference(conferenceName: string) {
  return db.prepare(`
    SELECT 
      t.id,
      t.school,
      t.mascot,
      t.abbreviation,
      t.color,
      t.alt_color,
      v.latitude,
      v.longitude,
      v.name as venue_name,
      v.city,
      v.state,
      tc.year_joined,
      tc.year_left
    FROM teams t
    INNER JOIN teams_conferences tc ON t.id = tc.team_id
    INNER JOIN conferences c ON tc.conference_id = c.id
    LEFT JOIN venues v ON t.venue_id = v.id
    WHERE c.name = ? AND tc.year_left IS NOT NULL
    ORDER BY t.school
  `).all(conferenceName);
}

export function getTeamById(teamId: number) {
  return db.prepare(`
    SELECT id, school, mascot, color, alt_color
    FROM teams
    WHERE id = ?
  `).get(teamId) ;
}

export function getAllConferenceSlugs() {
  const conferences = getAllConferences();
  
  return conferences.map(conf => ({
    params: { slug: slugify(conf.name, {lower: true}) },
    props: { conferenceName: conf.name, classification: conf.classification }
  }));
}