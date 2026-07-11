# EchoChat

<p align="center">
  <a href="README.md">English</a> •
  <a href="README.ru.md">Русский</a> •
  <a href="README.zh.md">中文</a>
</p>

A decentralized, federated, end-to-end encrypted chat system.

## Overview

EchoChat is a peer-to-peer chat platform where anyone can run their own server and connect to the global network. No central authority, no single point of failure.

## Features

| Feature | Description |
|---------|-------------|
| **Federation** | Multiple servers, automatic peer discovery |
| **E2E Encryption** | X25519 + AES-256-GCM |
| **Privacy** | Each server stores only its own data |
| **Auto-Discovery** | Servers find each other automatically |
| **Retention Policies** | Configurable data cleanup |

## Quick Start

```bash
git clone https://github.com/HepBHbIu/echocat.git
cd echocat
npm install
cd backend && npm install && cd ../frontend && npm install && cd ..
cp backend/.env.example backend/.env
npm run dev
```

## Federation Setup

```bash
# Server A
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-a.com
SEED_PEERS=

# Server B
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-b.com
SEED_PEERS=http://server-a.com:3001
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/federation/info` | Server info |
| GET | `/federation/peers` | List peers |
| POST | `/federation/register` | Register server |
| GET | `/registry/servers` | Public server list |
| POST | `/api/e2ee/keys/generate` | Generate encryption keys |

## Tech Stack

- **Backend**: Node.js + Express + SQLite
- **Frontend**: React + Vite + TypeScript
- **Federation**: Custom P2P protocol
- **Encryption**: X25519 + AES-256-GCM

## Donation

If you find EchoChat useful, consider supporting:

| Currency | Address |
|----------|---------|
| **Bitcoin** | `1NxFhq7HoiQvBTRRusnsZfoCLpaFdDc3Mm` |
| **Toncoin** | `UQDDiCjIbIJ7JdsiPpavuKdHAhNjHKJ-Hu9YA3ZIH-Rwg2DQ` |
| **Ethereum** | `0x5e736750e1C809C027888E409Cb96c54e331538f` |

## Contact

**Telegram**: [@Figment_of_the_imagination](https://t.me/Figment_of_the_imagination)

## License

MIT License
