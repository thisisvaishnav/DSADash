import { createClient, RedisClientType } from 'redis';
import { REDIS_URL, isDevelopment } from '../../config/env.config';

class RedisManager {
  private client: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private isConnected = false;

  /** Initialize and connect the Redis client */
  connect = async (): Promise<RedisClientType> => {
    if (this.client && this.isConnected) return this.client;

    this.client = createClient({
      url: REDIS_URL,
      socket: {
        reconnectStrategy: (retries: number) => {
          if (retries > 10) {
            console.error('❌ Redis max reconnection attempts reached');
            return new Error('Max reconnection attempts reached');
          }
          const delay = Math.min(retries * 200, 5000);
          console.log(`🔄 Redis reconnecting in ${delay}ms (attempt ${retries})`);
          return delay;
        },
      },
    });

    this.client.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      if (isDevelopment) console.log('✅ Redis connected');
      this.isConnected = true;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });

    await this.client.connect();
    return this.client;
  };

  /** Get the Redis client (throws if not connected) */
  getClient = (): RedisClientType => {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis not connected. Call connect() first.');
    }
    return this.client;
  };

  /** Get a dedicated subscriber client for pub/sub */
  getSubscriber = async (): Promise<RedisClientType> => {
    if (this.subscriber) return this.subscriber;

    this.subscriber = this.client?.duplicate() as RedisClientType;
    if (!this.subscriber) {
      throw new Error('Redis client not initialized. Call connect() first.');
    }

    await this.subscriber.connect();
    return this.subscriber;
  };

  /** Check connection status */
  isReady = (): boolean => {
    return this.isConnected;
  };

  /** Graceful disconnect */
  disconnect = async (): Promise<void> => {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
    this.isConnected = false;
    console.log('🔌 Redis disconnected');
  };
}

export const redis = new RedisManager();
