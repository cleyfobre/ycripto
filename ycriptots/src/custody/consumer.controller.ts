import { Controller, Post, Get, Query } from '@nestjs/common';
import { ConsumerService } from './consumer.service';

@Controller('api/consumer')
export class ConsumerController {
  constructor(private readonly consumerService: ConsumerService) {}

  // Consumer 시작
  @Post('start')
  async startConsumer() {
    await this.consumerService.startConsuming();
    return {
      success: true,
      message: 'Consumer started successfully'
    };
  }

  // Consumer 상태 조회
  @Get('status')
  getConsumerStatus() {
    return this.consumerService.getConsumerStatus();
  }

  // 최근 처리된 메시지 조회
  @Get('messages/recent')
  getRecentMessages(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return {
      messages: this.consumerService.getRecentMessages(limitNum)
    };
  }

  // 큐 정보 조회
  @Get('queue/info')
  async getQueueInfo() {
    return await this.consumerService.getQueueInfo();
  }
}
