# EchoChat

A decentralized, federated, end-to-end encrypted chat system.

## Features

- **Decentralized Federation** - Multiple servers, automatic peer discovery
- **E2E Encryption** - X25519 + AES-256-GCM
- **Privacy** - Each server stores only its own data
- **Auto-Discovery** - Servers find each other automatically
- **Retention Policies** - Configurable data cleanup

## Quick Start

```bash
# Clone
git clone https://github.com/HepBHbIu/echocat.git
cd echocat

# Install
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Configure
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

# Run
npm run dev
```

## Federation Setup

```bash
# Server A (your server)
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-a.com
FEDERATION_NAME=EchoChat A
SEED_PEERS=

# Server B (friend's server)
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-b.com
FEDERATION_NAME=EchoChat B
SEED_PEERS=http://server-a.com:3001
```

## API Endpoints

- `GET /federation/info` - Server info
- `GET /federation/peers` - List peers
- `POST /federation/register` - Register server
- `GET /registry/servers` - Public server list
- `POST /api/e2ee/keys/generate` - Generate encryption keys

## Tech Stack

- Backend: Node.js + Express + SQLite
- Frontend: React + Vite + TypeScript
- Federation: Custom P2P protocol
- E2E: X25519 + AES-256-GCM
