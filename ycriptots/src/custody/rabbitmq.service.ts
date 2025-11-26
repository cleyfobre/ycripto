import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect } from 'amqplib';

export interface DepositNotification {
  memberId: number;
  coinId: number;
  address: string;
  amount: string;
  txHash: string;
  fromAddress: string;
  blockNumber: number;
  timestamp: string;
}

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private connection: any = null;
  private channel: any = null;
  private readonly queueName: string;

  constructor(private configService: ConfigService) {
    this.queueName = this.configService.get<string>('RABBITMQ_QUEUE') || 'deposit_notifications';
  }

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      const rabbitmqUrl = this.configService.get<string>('RABBITMQ_URL');

      if (!rabbitmqUrl) {
        console.warn('[RabbitMQ] URL not configured, skipping connection');
        return;
      }

      this.connection = await connect(rabbitmqUrl);
      this.channel = await this.connection.createChannel();

      // 큐 선언 (없으면 자동 생성)
      await this.channel.assertQueue(this.queueName, {
        durable: true // 서버 재시작 후에도 큐 유지
      });

      console.log(`[RabbitMQ] Connected to ${rabbitmqUrl}, queue: ${this.queueName}`);
    } catch (error) {
      console.error('[RabbitMQ] Connection failed:', error);
      this.connection = null;
      this.channel = null;
    }
  }

  async sendDepositNotification(notification: DepositNotification): Promise<boolean> {
    if (!this.channel) {
      console.warn('[RabbitMQ] Channel not available, skipping notification');
      return false;
    }

    try {
      const message = JSON.stringify(notification);

      this.channel.sendToQueue(
        this.queueName,
        Buffer.from(message),
        {
          persistent: true, // 메시지 영속화
          contentType: 'application/json'
        }
      );

      console.log(`[RabbitMQ] Sent notification for tx: ${notification.txHash}`);
      return true;
    } catch (error) {
      console.error('[RabbitMQ] Failed to send notification:', error);
      return false;
    }
  }

  private async disconnect(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log('[RabbitMQ] Disconnected');
    } catch (error) {
      console.error('[RabbitMQ] Error during disconnect:', error);
    }
  }

  // 연결 상태 확인
  isConnected(): boolean {
    return this.connection !== null && this.channel !== null;
  }

  // 큐 메시지 소비
  async consumeMessages(
    callback: (notification: DepositNotification) => void | Promise<void>
  ): Promise<void> {
    if (!this.channel) {
      console.warn('[RabbitMQ] Channel not available, cannot consume messages');
      return;
    }

    try {
      await this.channel.consume(
        this.queueName,
        async (msg: any) => {
          if (!msg) return;

          try {
            const content = msg.content.toString();
            const notification: DepositNotification = JSON.parse(content);

            console.log(`[RabbitMQ] Received message: ${notification.txHash}`);

            // 콜백 실행
            await callback(notification);

            // 메시지 처리 완료 확인 (ACK)
            this.channel.ack(msg);
          } catch (error) {
            console.error('[RabbitMQ] Error processing message:', error);
            // 처리 실패 시 재큐잉 (requeue)
            this.channel.nack(msg, false, true);
          }
        },
        {
          noAck: false // 수동 ACK 모드
        }
      );

      console.log(`[RabbitMQ] Started consuming from queue: ${this.queueName}`);
    } catch (error) {
      console.error('[RabbitMQ] Failed to start consumer:', error);
    }
  }

  // 큐에 있는 메시지 개수 조회
  async getQueueMessageCount(): Promise<number> {
    if (!this.channel) {
      return 0;
    }

    try {
      const queueInfo = await this.channel.checkQueue(this.queueName);
      return queueInfo.messageCount;
    } catch (error) {
      console.error('[RabbitMQ] Failed to get queue info:', error);
      return 0;
    }
  }
}
