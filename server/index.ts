/**
 * @file Main server entry point for the multiplayer card game.
 * Sets up Express app, WebSocket server, and starts the server.
 */

import express from 'express';
import expressWs from 'express-ws';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

import { setupRoutes } from './routes/index.js';
import { setupWebSocket } from './services/websocket.js';
import { initializeContent } from './services/content.js';
import { logger } from './utils/logger.js';
import { validateConfig } from './utils/config.js';
import { WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app and enable WebSocket
const app = express();
const wsInstance = expressWs(app);
const wss = wsInstance.getWss();

// Validate configuration
validateConfig();

// Initialize content database
await initializeContent();

// Setup middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../client/dist')));

// Setup routes
setupRoutes(app);

// Setup WebSocket handlers
setupWebSocket(wss);

// Start server
const PORT = process.env.PORT || 8822;
const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`WebSocket server ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

export { app, wss };