# EchoChat

去中心化、联邦式、端到端加密聊天系统。

## 概述

EchoChat 是一个点对点聊天平台，任何人都可以运行自己的服务器并连接到全球网络。没有中央权威，没有单点故障。

## 功能特点

| 功能 | 描述 |
|------|------|
| **联邦** | 多服务器，自动节点发现 |
| **端到端加密** | X25519 + AES-256-GCM |
| **隐私保护** | 每个服务器只存储自己的数据 |
| **自动发现** | 服务器自动互相找到 |
| **数据保留策略** | 可配置的数据清理 |

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

## API 端点

| 方法 | 端点 | 描述 |
|------|------|------|
| GET | `/federation/info` | 服务器信息 |
| GET | `/federation/peers` | 列出节点 |
| POST | `/federation/register` | 注册服务器 |
| GET | `/registry/servers` | 公共服务器列表 |
| POST | `/api/e2ee/keys/generate` | 生成加密密钥 |

## 技术栈

- **后端**: Node.js + Express + SQLite
- **前端**: React + Vite + TypeScript
- **联邦**: 自定义P2P协议
- **加密**: X25519 + AES-256-GCM

## 捐赠

如果您觉得EchoChat有用，请考虑支持：

| 货币 | 地址 |
|------|------|
| **比特币** | `1NxFhq7HoiQvBTRRusnsZfoCLpaFdDc3Mm` |
| **Toncoin** | `UQDDiCjIbIJ7JdsiPpavuKdHAhNjHKJ-Hu9YA3ZIH-Rwg2DQ` |
| **以太坊** | `0x5e736750e1C809C027888E409Cb96c54e331538f` |

## 联系方式

**Telegram**: [@Figment_of_the_imagination](https://t.me/Figment_of_the_imagination)

## 许可证

MIT 许可证
