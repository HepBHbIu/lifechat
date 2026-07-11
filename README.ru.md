# EchoChat - Русский

Децентрализованная, федеративная, с шифрованием система чата.

## Возможности

- **Децентрализованная федерация** - Несколько серверов, автоматический поиск пиров
- **E2E шифрование** - X25519 + AES-256-GCM
- **Приватность** - Каждый сервер хранит только свои данные
- **Автопоиск** - Серверы находят друг друга автоматически
- **Политики хранения** - Настраиваемая очистка данных

## Быстрый старт

```bash
# Клонируем
git clone https://github.com/HepBHbIu/echocat.git
cd echocat

# Устанавливаем
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Настраиваем
cp backend/.env.example backend/.env
# Редактируем backend/.env

# Запускаем
npm run dev
```

## Настройка федерации

```bash
# Сервер A (твой)
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-a.com
FEDERATION_NAME=EchoChat A
SEED_PEERS=

# Сервер B (друга)
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-b.com
FEDERATION_NAME=EchoChat B
SEED_PEERS=http://server-a.com:3001
```

## Технологии

- Бэкенд: Node.js + Express + SQLite
- Фронтенд: React + Vite + TypeScript
- Федерация: P2P протокол
- Шифрование: X25519 + AES-256-GCM
