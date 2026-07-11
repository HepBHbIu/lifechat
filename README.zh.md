# EchoChat - 中文

去中心化、联邦式、端到端加密聊天系统。

## 功能特点

- **去中心化联邦** - 多服务器，自动节点发现
- **端到端加密** - X25519 + AES-256-GCM
- **隐私保护** - 每个服务器只存储自己的数据
- **自动发现** - 服务器自动互相找到
- **数据保留策略** - 可配置的数据清理

## 快速开始

```bash
git clone https://github.com/HepBHbIu/echocat.git
cd echocat
npm install
cd backend && npm install && cd ../frontend && npm install && cd ..
cp backend/.env.example backend/.env
npm run dev
```

## 联邦设置

```bash
# 服务器A
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-a.com
SEED_PEERS=

# 服务器B
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-b.com
SEED_PEERS=http://server-a.com:3001
```

## 捐赠

如果您觉得EchoChat有用，请考虑支持：

**比特币:** `1NxFhq7HoiQvBTRRusnsZfoCLpaFdDc3Mm`
**Toncoin:** `UQDDiCjIbIJ7JdsiPpavuKdHAhNjHKJ-Hu9YA3ZIH-Rwg2DQ`
**以太坊:** `0x5e736750e1C809C027888E409Cb96c54e331538f`

## 联系方式

**Telegram:** [@Figment_of_the_imagination](https://t.me/Figment_of_the_imagination)

## 技术栈

- 后端：Node.js + Express + SQLite
- 前端：React + Vite + TypeScript
- 联邦：自定义P2P协议
- 加密：X25519 + AES-256-GCM
