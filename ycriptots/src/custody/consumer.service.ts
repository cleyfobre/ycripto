import { Injectable, OnModuleInit } from '@nestjs/common';
import { RabbitMQService, DepositNotification } from './rabbitmq.service';

@Injectable()
export class ConsumerService implements OnModuleInit {
  private processedMessages: DepositNotification[] = [];
  private isConsuming = false;

  constructor(private rabbitmqService: RabbitMQService) {}

  async onModuleInit() {
    // 서버 시작 시 자동으로 consumer 시작하지 않음
    // 필요 시 API로 수동 시작
  }

  // Consumer 시작
  async startConsuming(): Promise<void> {
    if (this.isConsuming) {
      console.log('[Consumer] Already consuming');
      return;
    }

    await this.rabbitmqService.consumeMessages(async (notification) => {
      await this.processNotification(notification);
    });

    this.isConsuming = true;
    console.log('[Consumer] Started consuming messages');
  }

  // 메시지 처리 로직
  private async processNotification(notification: DepositNotification): Promise<void> {
    console.log('[Consumer] Processing notification:', {
      memberId: notification.memberId,
      coinId: notification.coinId,
      amount: notification.amount,
      txHash: notification.txHash
    });

    // 여기에 실제 비즈니스 로직 추가
    // 예: 이메일 발송, 푸시 알림, 로그 기록 등

    // 처리된 메시지 저장 (최근 100개만 유지)
    this.processedMessages.push(notification);
    if (this.processedMessages.length > 100) {
      this.processedMessages.shift();
    }
  }

  // Consumer 상태 조회
  getConsumerStatus() {
    return {
      isConsuming: this.isConsuming,
      processedCount: this.processedMessages.length,
      isConnected: this.rabbitmqService.isConnected()
    };
  }

  // 최근 처리된 메시지 조회
  getRecentMessages(limit: number = 10): DepositNotification[] {
    return this.processedMessages.slice(-limit).reverse();
  }

  // 큐 정보 조회
  async getQueueInfo() {
    const messageCount = await this.rabbitmqService.getQueueMessageCount();
    return {
      queueName: 'deposit_notifications',
      messageCount,
      isConnected: this.rabbitmqService.isConnected()
    };
  }
}
