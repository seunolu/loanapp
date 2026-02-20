import { Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';

export type StreamMessage = {
  id: string;
  values: Record<string, string>;
};

export type StreamConsumerOptions = {
  consumerName: string;
  stream: string;
  group: string;
  blockMs?: number;
  count?: number;
};

export class StreamConsumerRunner {
  private readonly logger = new Logger(StreamConsumerRunner.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private stopped = false;
  private streamsUnsupported = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly options: StreamConsumerOptions,
    private readonly handler: (message: StreamMessage) => Promise<void>
  ) {}

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.stopped = false;
    let ready = false;
    try {
      ready = await this.ensureGroup();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown stream bootstrap error';
      this.logger.warn(
        `stream consumer disabled consumer=${this.options.consumerName} stream=${this.options.stream} error=${message}`
      );
      ready = false;
    }
    if (!ready) {
      this.running = false;
      this.stopped = true;
      return;
    }
    this.loop();
  }

  async stop(): Promise<void> {
    this.stopped = true;
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private loop(): void {
    this.timer = setTimeout(async () => {
      if (this.stopped) return;
      try {
        await this.pollOnce();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown stream consumer error';
        this.logger.error(
          `stream consumer tick failed consumer=${this.options.consumerName} stream=${this.options.stream} error=${message}`
        );
      } finally {
        if (!this.stopped) this.loop();
      }
    }, 10);
  }

  private async ensureGroup(): Promise<boolean> {
    const client = this.redis.getClient();
    try {
      await client.xgroup(
        'CREATE',
        this.options.stream,
        this.options.group,
        '$',
        'MKSTREAM'
      );
      return true;
    } catch (error) {
      if (this.isUnknownStreamCommandError(error, 'xgroup')) {
        this.markStreamsUnsupported();
        return false;
      }
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('BUSYGROUP')) {
        throw error;
      }
      return true;
    }
  }

  private async pollOnce(): Promise<void> {
    if (this.streamsUnsupported) {
      return;
    }
    const client = this.redis.getClient();
    const blockMs = this.options.blockMs ?? 2000;
    const count = this.options.count ?? 10;
    let rows: Array<[string, Array<[string, string[]]>]> | null = null;
    try {
      rows = (await client.xreadgroup(
        'GROUP',
        this.options.group,
        this.options.consumerName,
        'COUNT',
        count,
        'BLOCK',
        blockMs,
        'STREAMS',
        this.options.stream,
        '>'
      )) as Array<[string, Array<[string, string[]]>]> | null;
    } catch (error) {
      if (this.isUnknownStreamCommandError(error, 'xreadgroup')) {
        this.markStreamsUnsupported();
        return;
      }
      throw error;
    }

    if (!rows || rows.length === 0) {
      return;
    }

    for (const [, messages] of rows) {
      for (const [id, pairs] of messages) {
        const values: Record<string, string> = {};
        for (let i = 0; i < pairs.length; i += 2) {
          values[pairs[i] ?? ''] = pairs[i + 1] ?? '';
        }
        const msg: StreamMessage = { id, values };
        await this.processMessage(msg);
      }
    }
  }

  private async processMessage(message: StreamMessage): Promise<void> {
    const client = this.redis.getClient();
    try {
      await this.handler(message);
      try {
        await client.xack(this.options.stream, this.options.group, message.id);
      } catch (error) {
        if (this.isUnknownStreamCommandError(error, 'xack')) {
          this.markStreamsUnsupported();
          return;
        }
        throw error;
      }
      await (this.prisma as any).eventConsumerCheckpoint.upsert({
        where: { consumerName: this.options.consumerName },
        create: {
          consumerName: this.options.consumerName,
          stream: this.options.stream,
          group: this.options.group,
          lastMessageId: message.id
        },
        update: {
          stream: this.options.stream,
          group: this.options.group,
          lastMessageId: message.id
        }
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown consumer handler error';
      this.logger.error(
        `stream message failed consumer=${this.options.consumerName} id=${message.id} error=${msg}`
      );
    }
  }

  private markStreamsUnsupported(): void {
    if (this.streamsUnsupported) {
      return;
    }
    this.streamsUnsupported = true;
    this.stopped = true;
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.logger.warn(
      `redis streams unsupported; disabling consumer=${this.options.consumerName} stream=${this.options.stream}`
    );
  }

  private isUnknownStreamCommandError(error: unknown, commandName: string): boolean {
    const message = error instanceof Error ? error.message : '';
    const normalized = message.toLowerCase();
    return normalized.includes('unknown command') && normalized.includes(commandName.toLowerCase());
  }
}
