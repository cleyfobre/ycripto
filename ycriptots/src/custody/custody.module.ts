import { Module } from '@nestjs/common';
import { CustodyService } from './custody.service';
import { CustodyController } from './custody.controller';
import { DatabaseService } from './database.service';
import { RabbitMQService } from './rabbitmq.service';
import { ConsumerService } from './consumer.service';
import { ConsumerController } from './consumer.controller';

@Module({
  controllers: [CustodyController, ConsumerController],
  providers: [CustodyService, DatabaseService, RabbitMQService, ConsumerService],
  exports: [CustodyService, DatabaseService, RabbitMQService, ConsumerService],
})
export class CustodyModule {}
