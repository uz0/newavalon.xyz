# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.0] - 2024-12-22

### Added
- Serbian (Српски) locale support with complete UI and rules translation
- Enabled language selector in Settings modal
- Language changes are saved to localStorage and persist across sessions

### Changed
- Updated locale system to include Serbian translation
- Language dropdown now functional (previously disabled)

## [0.2.0] - 2024-12-22

### Changed
- **BREAKING**: Complete project refactoring - split client/server architecture
- Moved frontend code to `/client/` directory
- Moved backend code to `/server/` directory
- Updated build system to use separate TypeScript configs
- Changed client build output from `/docs` to `/dist`
- Replaced tsx with ts-node for server execution

### Added
- Client TypeScript configuration (`tsconfig.client.json`)
- Server TypeScript configuration (`tsconfig.server.json`)
- Clean separation of client and server codebases
- Modular server architecture with routes, services, and utilities
- Vite proxy configuration for API calls during development

### Removed
- Old monolithic project structure
- Unused server-dev.js and old server.js files
- Shared directory - moved types to respective client/server directories

### Fixed
- Resolved TypeScript import paths after restructuring
- Fixed duplicate dependency declarations
- Cleaned up root directory to contain only configuration files

## [0.1.0] - 2024-12-20

### Added
- Initial project setup
- React frontend with TypeScript
- Express server with WebSocket support
- Basic game mechanics
- Card and token content database