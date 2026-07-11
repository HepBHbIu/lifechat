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
git clone https://github.com/HepBHbIu/echocat.git
cd echocat
npm install
cd backend && npm install && cd ../frontend && npm install && cd ..
cp backend/.env.example backend/.env
npm run dev
```

## Настройка федерации

```bash
# Сервер A
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-a.com
SEED_PEERS=

# Сервер B
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-b.com
SEED_PEERS=http://server-a.com:3001
```

## Пожертвования

Если EchoChat вам полезен, поддержите проект:

**Bitcoin:** `1NxFhq7HoiQvBTRRusnsZfoCLpaFdDc3Mm`
**Toncoin:** `UQDDiCjIbIJ7JdsiPpavuKdHAhNjHKJ-Hu9YA3ZIH-Rwg2DQ`
**Ethereum:** `0x5e736750e1C809C027888E409Cb96c54e331538f`

## Контакты

**Telegram:** [@Figment_of_the_imagination](https://t.me/Figment_of_the_imagination)

## Технологии

- Бэкенд: Node.js + Express + SQLite
- Фронтенд: React + Vite + TypeScript
- Федерация: P2P протокол
- Шифрование: X25519 + AES-256-GCM
