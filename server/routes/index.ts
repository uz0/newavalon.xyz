/**
 * @file API routes configuration
 */

import express from 'express';
import { gameRoutes } from './game.js';
import { contentRoutes } from './content.js';
import { healthRoutes } from './health.js';
import path from 'path';

/**
 * Setup all API routes
 */
export function setupRoutes(app: any) {
  const isDev = process.env.NODE_ENV !== 'production';

  // Serve static frontend files
  if (isDev) {
    // In development, Vite middleware handles serving static files
    app.use(express.static(path.resolve('../client')));
  } else {
    // In production, serve from dist folder
    app.use(express.static(path.resolve('../dist')));
  }

  // Health check routes
  app.use('/api/health', healthRoutes);

  // Game management routes
  app.use('/api/games', gameRoutes);

  // Content routes
  app.use('/api/content', contentRoutes);

  // Serve frontend for all other routes (SPA routing)
  app.get(/.*/, (req, res) => {
    if (isDev) {
      res.sendFile('index.html', { root: '../client' });
    } else {
      res.sendFile('index.html', { root: '../dist' });
    }
  });

  console.log('API routes configured');
}