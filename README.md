<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# New Avalon: Skirmish

A dynamic tactical duel card game played on a limited grid field. Deploy Units and Commands to capture control over key battle lines.

## Features

- **Tactical Grid Combat**: Position-based card game on dynamic board sizes (5x5, 6x6, 7x7)
- **Real-time Multiplayer**: WebSocket-based gameplay for 2-4 players
- **Multiple Game Modes**: Free-for-all, 2v2 team battles, and 3v1
- **Card Abilities**: Deploy, Setup, Commit, and Passive abilities
- **Dynamic Status System**: Support, Threat, and tactical positioning
- **Multi-language Support**: English, Russian, Serbian
- **Custom Decks**: Build and customize your own decks
- **Responsive Design**: Works on desktop and mobile

## Prerequisites

- Node.js 18+
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/uz0/NewAvalonSkirmish.git
cd NewAvalonSkirmish

# Install dependencies
npm install
```

## Running Locally

```bash
# Development mode (recommended - runs both server and client with HMR)
npm run dev

# Production build
npm run build
npm start
```

The game will be available at `http://localhost:8080`

## Docker Deployment

```bash
# Build the image
docker build -t newavalonskirmish .

# Run the container
docker run -d -p 8822:8080 --name newavalonskirmish newavalonskirmish
```

Access the game at `http://localhost:8822`

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines and workflow.

### Project Structure

```text
/
├── client/                   # React frontend
│   ├── components/          # UI components
│   ├── hooks/              # Custom React hooks
│   ├── locales/            # Translation files
│   ├── types/              # Client TypeScript types
│   └── utils/              # Client utilities
├── server/                  # Node.js backend
│   ├── handlers/           # WebSocket message handlers
│   ├── services/           # Core services
│   ├── types/              # Server TypeScript types
│   └── utils/              # Server utilities
```

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to the main branch.

## Support

For issues and questions, please use the GitHub issue tracker.
