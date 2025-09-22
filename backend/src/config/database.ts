import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../utils/logger.js';

// Database instance
let db: Database.Database | null = null;

/**
 * Initialize the database connection
 */
export function initializeDatabase(): Database.Database {
  if (db) {
    return db;
  }

  try {
    const dbPath = path.join(process.cwd(), 'data', 'storymagic.db');

    // Ensure data directory exists
    const fs = require('fs');
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    db = new Database(dbPath);

    // Enable foreign keys
    db.pragma('foreign_keys = ON');

    // Create tables
    createTables(db);

    logger.info('Database initialized successfully');
    return db;
  } catch (error) {
    logger.error('Failed to initialize database', { error });
    throw new Error('Database initialization failed');
  }
}

/**
 * Get the database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database connection closed');
  }
}

/**
 * Create database tables
 */
function createTables(db: Database.Database): void {
  // Stories table - stores the root story information
  db.exec(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      child_profile_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      estimated_duration INTEGER NOT NULL,
      energy_level TEXT NOT NULL CHECK (energy_level IN ('high', 'medium', 'calming')),
      content_tags TEXT NOT NULL, -- JSON array of tags
      preview TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Story segments table - stores individual story content pieces
  db.exec(`
    CREATE TABLE IF NOT EXISTS story_segments (
      id TEXT PRIMARY KEY,
      story_id TEXT NOT NULL,
      parent_segment_id TEXT, -- NULL for root segment
      content TEXT NOT NULL,
      choice_text TEXT, -- The choice that led to this segment (NULL for root)
      choice_id TEXT, -- The choice ID that was selected (NULL for root)
      segment_order INTEGER NOT NULL, -- Order within the story branch
      has_choices BOOLEAN NOT NULL DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
      FOREIGN KEY (parent_segment_id) REFERENCES story_segments(id) ON DELETE CASCADE
    )
  `);

  // Choice points table - stores choice information within segments
  db.exec(`
    CREATE TABLE IF NOT EXISTS choice_points (
      id TEXT PRIMARY KEY,
      segment_id TEXT NOT NULL,
      choice_text TEXT NOT NULL,
      choice_order INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (segment_id) REFERENCES story_segments(id) ON DELETE CASCADE
    )
  `);

  // Choice options table - stores individual choice options (A, B, etc.)
  db.exec(`
    CREATE TABLE IF NOT EXISTS choice_options (
      id TEXT PRIMARY KEY,
      choice_point_id TEXT NOT NULL,
      option_id TEXT NOT NULL, -- 'A', 'B', etc.
      option_text TEXT NOT NULL,
      option_order INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (choice_point_id) REFERENCES choice_points(id) ON DELETE CASCADE
    )
  `);

  // User preferences table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY DEFAULT 'default_user',
      theme TEXT NOT NULL DEFAULT 'light',
      volume REAL NOT NULL DEFAULT 0.8,
      text_size REAL NOT NULL DEFAULT 1.0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Child profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS child_profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL DEFAULT 'default_user',
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      favorite_animal TEXT,
      favorite_color TEXT,
      best_friend TEXT,
      current_interest TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
    CREATE INDEX IF NOT EXISTS idx_stories_child_profile_id ON stories(child_profile_id);
    CREATE INDEX IF NOT EXISTS idx_story_segments_story_id ON story_segments(story_id);
    CREATE INDEX IF NOT EXISTS idx_story_segments_parent ON story_segments(parent_segment_id);
    CREATE INDEX IF NOT EXISTS idx_choice_points_segment ON choice_points(segment_id);
    CREATE INDEX IF NOT EXISTS idx_choice_options_choice_point ON choice_options(choice_point_id);
  `);

  logger.info('Database tables created successfully');
}

/**
 * Reset database (for development/testing)
 */
export function resetDatabase(): void {
  if (!db) return;

  try {
    db.exec(`
      DROP TABLE IF EXISTS choice_options;
      DROP TABLE IF EXISTS choice_points;
      DROP TABLE IF EXISTS story_segments;
      DROP TABLE IF EXISTS stories;
      DROP TABLE IF EXISTS user_preferences;
      DROP TABLE IF EXISTS child_profiles;
    `);

    createTables(db);
    logger.info('Database reset successfully');
  } catch (error) {
    logger.error('Failed to reset database', { error });
    throw error;
  }
}
