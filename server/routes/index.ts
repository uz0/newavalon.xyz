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

  // Serve frontend for all other routes (SPA routing)
  app.get(/.*/, (req, res) => {
    if (isProduction) {
      // From dist-server/server/routes/ -> project/dist
      res.sendFile(path.join(__dirname, '../../../dist/index.html'));
    } else {
      // Development: from server/routes/ -> client/index.html
      res.sendFile(path.join(__dirname, '../../client/index.html'));
    }
  });

  console.log('API routes configured');
}