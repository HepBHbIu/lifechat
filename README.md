# Telegram Chat

A full-featured web chat application inspired by Telegram, with personal and group chats, file/image/audio sharing, and an admin panel.

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: SQLite (via better-sqlite3)
- **Real-time**: WebSocket (ws)
- **File Storage**: Local filesystem (uploads/)

## Quick Start

```bash
# 1. Install dependencies
cd telegram-chat
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Start both backend and frontend
npm run dev
```

Or start separately:

```bash
# Terminal 1 - Backend (port 3001)
cd backend && npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend && npm run dev
```

## First Login

1. Open http://localhost:5173
2. Enter the admin token: `admin-secret-token-change-me`
3. You are now logged in as admin

The admin token is set in `backend/.env`. Change it before deploying.

## How to Create a User

1. Log in as admin
2. Click the gear icon (top-right)
3. Go to "Users" tab
4. Enter a username, select role, click "Create"
5. Copy the generated token
6. Share the token with the user

## How to Login as a User

1. Open the app
2. Enter the token given by admin
3. You're in

## Features

- Private chats between two users
- Group chats (admin creates, adds members)
- Text messages via WebSocket (real-time)
- Image uploads with preview
- File uploads with download
- Audio/voice messages with player
- Message history persisted in SQLite
- Admin panel: manage users, tokens, groups, messages
- Responsive design (mobile + desktop)
- Unread message counters

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Backend port |
| ADMIN_TOKEN | admin-secret-token-change-me | Token for admin login |
| JWT_SECRET | jwt-secret-change-me-in-production | JWT signing secret |
| UPLOAD_DIR | ./uploads | File storage directory |
| MAX_FILE_SIZE | 52428800 | Max upload size (50MB) |

## Project Structure

```
telegram-chat/
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server entry
│   │   ├── config.ts         # Configuration
│   │   ├── database.ts       # SQLite setup & migrations
│   │   ├── auth.ts           # JWT auth middleware
│   │   ├── websocket.ts      # WebSocket handler
│   │   └── routes/
│   │       ├── auth.ts       # Login/logout
│   │       ├── users.ts      # User listing
│   │       ├── admin.ts      # Admin CRUD
│   │       ├── chats.ts      # Chat operations
│   │       ├── messages.ts   # Message CRUD
│   │       └── files.ts      # File download
│   ├── uploads/              # Stored files
│   └── database.db           # SQLite database
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── api/client.ts     # API client
│       ├── contexts/         # Auth context
│       ├── hooks/            # WebSocket hook
│       ├── components/       # UI components
│       └── types/            # TypeScript types
├── .env.example
└── README.md
```

## File Types Allowed

Images: jpg, jpeg, png, webp, gif
Documents: pdf, doc, docx, xls, xlsx, zip
Audio: mp3, wav, ogg, m4a

Blocked: exe, bat, cmd, sh, js, php, html, dll

## Notes

- Messages are stored in SQLite and persist across restarts
- Files are stored in `backend/uploads/`
- WebSocket provides real-time message delivery
- The admin panel is accessible via the gear icon in the chat list header
