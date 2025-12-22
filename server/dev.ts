/**
 * @file Development server with integrated Vite middleware.
 * Combines Express server with Vite dev server for unified development experience.
 */

import express from 'express';
import expressWs from 'express-ws';
import { fileURLToPath } from 'url';
import path from 'path';

import { setupRoutes } from './routes/index.js';
import { setupWebSocket } from './services/websocket.js';
import { initializeContent } from './services/content.js';
import { logger } from './utils/logger.js';
import { validateConfig } from './utils/config.js';

// Import Vite
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createDevServer() {
  // Create Express app and enable WebSocket
  const app = express();
  const wsInstance = expressWs(app);
  const wss = wsInstance.getWss();

  // Validate configuration
  validateConfig();

  // Initialize content database
  await initializeContent();

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    configFile: path.join(__dirname, '../vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'spa'
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  // Setup API routes after Vite middleware
  app.use(express.json({ limit: '10mb' }));
  setupRoutes(app);

  // Setup WebSocket handlers
  setupWebSocket(wss);

  // Start server
  const PORT = process.env.PORT || 8080;
  const server = app.listen(PORT, () => {
    logger.info(`🚀 Development server running on http://localhost:${PORT}`);
    logger.info(`📦 Vite middleware integrated`);
    logger.info(`🔌 WebSocket server ready`);
  });

  // Graceful shutdown
  const gracefulShutdown = (signal: string) => {
    logger.info(`${signal} received, shutting down gracefully`);
    vite.close();
    server.close(() => {
      logger.info('Process terminated');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return { app, wss, vite };
}

// Start the development server
createDevServer().catch((error) => {
  logger.error('Failed to start development server:', error);
  process.exit(1);
});

export { createDevServer };