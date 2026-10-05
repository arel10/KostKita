import Redis from 'ioredis';
import { env } from './env';

let isConnected = false;

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 2,
  retryStrategy(times) {
    // Retry with exponential backoff capped at 3s
    const delay = Math.min(times * 200, 3000);
    return delay;
  },
  enableOfflineQueue: false,
  lazyConnect: false,
});

redis.on('connect', () => {
  isConnected = true;
  console.log('✅ Redis connected successfully on:', env.REDIS_URL.replace(/:[^:@]+@/, ':***@'));
});

redis.on('ready', () => {
  isConnected = true;
});

redis.on('error', (err) => {
  isConnected = false;
  // Non-fatal warning so the app does not crash if Redis is temporarily unavailable
  console.warn('⚠️  Redis connection warning:', err.message);
});

redis.on('close', () => {
  isConnected = false;
});

export function isRedisReady(): boolean {
  return isConnected && redis.status === 'ready';
}

// ── Generic Caching Helpers ─────────────────────────────────────

export async function getCache<T>(key: string): Promise<T | null> {
  if (!isRedisReady()) return null;
  try {
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Redis getCache error for key "${key}":`, err);
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 300): Promise<boolean> {
  if (!isRedisReady()) return false;
  try {
    const serialized = JSON.stringify(value);
    await redis.set(key, serialized, 'EX', ttlSeconds);
    return true;
  } catch (err) {
    console.warn(`Redis setCache error for key "${key}":`, err);
    return false;
  }
}

export async function deleteCache(keyOrPattern: string): Promise<void> {
  if (!isRedisReady()) return;
  try {
    if (keyOrPattern.includes('*')) {
      const keys = await redis.keys(keyOrPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      await redis.del(keyOrPattern);
    }
  } catch (err) {
    console.warn(`Redis deleteCache error for "${keyOrPattern}":`, err);
  }
}

// ── User & Token Blacklist Helpers ──────────────────────────────

const BLACKLIST_USER_PREFIX = 'bl:user:';
const BLACKLIST_TOKEN_PREFIX = 'bl:token:';

/**
 * Blacklist a user (e.g. when suspended by Admin).
 * Default TTL is 30 days (longer than standard refresh token lifetime).
 */
export async function blacklistUser(userId: string, ttlSeconds: number = 30 * 24 * 3600): Promise<void> {
  if (!isRedisReady()) return;
  try {
    await redis.set(`${BLACKLIST_USER_PREFIX}${userId}`, 'suspended', 'EX', ttlSeconds);
  } catch (err) {
    console.warn(`Failed to blacklist user ${userId} in Redis:`, err);
  }
}

/**
 * Remove user from blacklist (e.g. when unsuspended by Admin).
 */
export async function unblacklistUser(userId: string): Promise<void> {
  if (!isRedisReady()) return;
  try {
    await redis.del(`${BLACKLIST_USER_PREFIX}${userId}`);
  } catch (err) {
    console.warn(`Failed to unblacklist user ${userId} in Redis:`, err);
  }
}

/**
 * Check if a user is currently blacklisted/suspended.
 */
export async function isUserBlacklisted(userId: string): Promise<boolean> {
  if (!isRedisReady()) return false;
  try {
    const res = await redis.exists(`${BLACKLIST_USER_PREFIX}${userId}`);
    return res === 1;
  } catch (err) {
    console.warn(`Error checking blacklist for user ${userId}:`, err);
    return false;
  }
}

/**
 * Blacklist a specific JWT token (e.g. on logout).
 */
export async function blacklistToken(token: string, ttlSeconds: number = 7 * 24 * 3600): Promise<void> {
  if (!isRedisReady()) return;
  try {
    await redis.set(`${BLACKLIST_TOKEN_PREFIX}${token}`, 'revoked', 'EX', ttlSeconds);
  } catch (err) {
    console.warn('Failed to blacklist token in Redis:', err);
  }
}

export async function isTokenBlacklisted(token: string): Promise<boolean> {
  if (!isRedisReady()) return false;
  try {
    const res = await redis.exists(`${BLACKLIST_TOKEN_PREFIX}${token}`);
    return res === 1;
  } catch {
    return false;
  }
}

// ── Health Check Helper ─────────────────────────────────────────

export async function getRedisHealth(): Promise<{
  connected: boolean;
  latencyMs: number;
  version?: string;
  usedMemoryHuman?: string;
}> {
  if (!isRedisReady()) {
    return { connected: false, latencyMs: -1 };
  }

  const start = Date.now();
  try {
    const pong = await redis.ping();
    const latencyMs = Date.now() - start;
    if (pong !== 'PONG') {
      return { connected: false, latencyMs: -1 };
    }

    const info = await redis.info('server');
    const versionMatch = info.match(/redis_version:([^\r\n]+)/);
    const version = versionMatch ? versionMatch[1] : undefined;

    const memInfo = await redis.info('memory');
    const memMatch = memInfo.match(/used_memory_human:([^\r\n]+)/);
    const usedMemoryHuman = memMatch ? memMatch[1] : undefined;

    return { connected: true, latencyMs, version, usedMemoryHuman };
  } catch (err) {
    return { connected: false, latencyMs: -1 };
  }
}
