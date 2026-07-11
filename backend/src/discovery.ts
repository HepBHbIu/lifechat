import { getDb } from './database';
import { v4 as uuidv4 } from 'uuid';

// Hardcoded seed nodes (like Bitcoin's DNS seeds)
const HARDCODED_SEEDS = [
  'lifechat-seed1.com',
  'lifechat-seed2.com',
  'lifechat-seed3.com',
];

// Default seed IPs (fallback if DNS fails)
const DEFAULT_SEED_IPS = [
  // These would be maintained by the community
];

export interface NetworkPeer {
  id: string;
  url: string;
  name?: string;
  is_online: boolean;
  last_seen: string;
  last_ping: string;
  version?: string;
}

// Discover peers from DNS seeds
export async function discoverFromDNS(): Promise<string[]> {
  const discoveredUrls: string[] = [];

  for (const seed of HARDCODED_SEEDS) {
    try {
      // DNS lookup - in real implementation use dns.resolve
      const response = await fetch(`https://${seed}/federation/peers`, {
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const peers = await response.json() as any[];
        for (const peer of peers) {
          if (peer.url && !discoveredUrls.includes(peer.url)) {
            discoveredUrls.push(peer.url);
          }
        }
      }
    } catch {
      // DNS seed failed, try next
    }
  }

  return discoveredUrls;
}

// Discover peers from known peers
export async function discoverFromPeers(knownPeers: string[]): Promise<string[]> {
  const discoveredUrls: string[] = [];

  for (const peerUrl of knownPeers) {
    try {
      const response = await fetch(`${peerUrl}/federation/peers`, {
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        const peers = await response.json() as any[];
        for (const peer of peers) {
          if (peer.url && !discoveredUrls.includes(peer.url)) {
            discoveredUrls.push(peer.url);
          }
        }
      }
    } catch {
      // Peer unreachable
    }
  }

  return discoveredUrls;
}

// Full discovery process
export async function discoverNetwork(): Promise<string[]> {
  console.log('[Federation] Starting network discovery...');

  // Step 1: Try DNS seeds
  console.log('[Federation] Trying DNS seeds...');
  const dnsPeers = await discoverFromDNS();
  console.log(`[Federation] Found ${dnsPeers.length} peers from DNS`);

  // Step 2: Try hardcoded IPs
  // (would be implemented with actual IPs)

  // Step 3: Try known peers from database
  const db = getDb();
  const knownPeers = db.prepare('SELECT url FROM federation_servers WHERE is_online = 1').all() as any[];
  const knownUrls = knownPeers.map(p => p.url);

  console.log(`[Federation] Trying ${knownUrls.length} known peers...`);
  const peerPeers = await discoverFromPeers([...dnsPeers, ...knownUrls]);

  // Merge all discovered peers
  const allDiscovered = [...new Set([...dnsPeers, ...peerPeers])];

  console.log(`[Federation] Total discovered: ${allDiscovered.length} peers`);

  return allDiscovered;
}

// Register with discovered peers
export async function registerWithPeers(peers: string[], localUrl: string, serverInfo: any): Promise<void> {
  for (const peerUrl of peers) {
    if (peerUrl === localUrl) continue; // Don't register with self

    try {
      const response = await fetch(`${peerUrl}/federation/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: localUrl,
          name: serverInfo.name,
          publicKey: serverInfo.publicKey,
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const data = await response.json() as any;

        // Add peer to our database
        const db = getDb();
        db.prepare('INSERT OR IGNORE INTO federation_servers (id, url, name, is_online) VALUES (?, ?, ?, 1)').run(
          uuidv4(),
          peerUrl,
          data.server?.name || peerUrl
        );

        // Also add peers from their peer list
        if (data.peers) {
          for (const peer of data.peers) {
            if (peer.url && peer.url !== localUrl) {
              db.prepare('INSERT OR IGNORE INTO federation_servers (id, url, name, is_online) VALUES (?, ?, ?, 1)').run(
                uuidv4(),
                peer.url,
                peer.name || peer.url
              );
            }
          }
        }

        console.log(`[Federation] Registered with ${peerUrl}`);
      }
    } catch {
      // Failed to register
    }
  }
}

// Heartbeat - check if peers are alive
export async function heartbeatPeers(): Promise<void> {
  const db = getDb();
  const peers = db.prepare('SELECT * FROM federation_servers').all() as any[];

  for (const peer of peers) {
    try {
      const response = await fetch(`${peer.url}/federation/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: peer.url }),
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        db.prepare('UPDATE federation_servers SET is_online = 1, last_seen = datetime(\'now\') WHERE url = ?').run(peer.url);
      } else {
        db.prepare('UPDATE federation_servers SET is_online = 0 WHERE url = ?').run(peer.url);
      }
    } catch {
      db.prepare('UPDATE federation_servers SET is_online = 0 WHERE url = ?').run(peer.url);
    }
  }
}

// Initialize discovery on server start
export async function initDiscovery(localUrl: string, serverInfo: any): Promise<void> {
  console.log('[Federation] Initializing network discovery...');

  // Discover peers
  const peers = await discoverNetwork();

  // Register with discovered peers
  await registerWithPeers(peers, localUrl, serverInfo);

  // Start heartbeat interval
  setInterval(heartbeatPeers, 30000);

  console.log('[Federation] Discovery initialized');
}
