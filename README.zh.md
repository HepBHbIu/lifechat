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
# 克隆
git clone https://github.com/HepBHbIu/echocat.git
cd echocat

# 安装
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 配置
cp backend/.env.example backend/.env
# 编辑 backend/.env

# 运行
npm run dev
```

## 联邦设置

```bash
# 服务器A（你的服务器）
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-a.com
FEDERATION_NAME=EchoChat A
SEED_PEERS=

# 服务器B（朋友的服务器）
FEDERATION_ENABLED=true
FEDERATION_DOMAIN=server-b.com
FEDERATION_NAME=EchoChat B
SEED_PEERS=http://server-a.com:3001
```

## 技术栈

- 后端：Node.js + Express + SQLite
- 前端：React + Vite + TypeScript
- 联邦：自定义P2P协议
- 加密：X25519 + AES-256-GCM
