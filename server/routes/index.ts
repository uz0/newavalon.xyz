/**
 * @file API routes configuration
 */

import { gameRoutes } from './game.js';
import { contentRoutes } from './content.js';
import { healthRoutes } from './health.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Setup all API routes
 */
export function setupRoutes(app: any) {
  const isProduction = process.env.NODE_ENV === 'production' || __dirname.includes('dist-server');

  // Note: Static files are served in index.ts, not here

  // Health check routes
  app.use('/api/health', healthRoutes);

  // Game management routes
  app.use('/api/games', gameRoutes);

  // Content routes
  app.use('/api/content', contentRoutes);

  console.log('API routes configured');
}