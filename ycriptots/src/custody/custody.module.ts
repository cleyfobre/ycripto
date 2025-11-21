import { Module } from '@nestjs/common';
import { CustodyService } from './custody.service';
import { CustodyController } from './custody.controller';
import { DatabaseService } from './database.service';

@Module({
  controllers: [CustodyController],
  providers: [CustodyService, DatabaseService],
  exports: [CustodyService, DatabaseService],
})
export class CustodyModule {}
