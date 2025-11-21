import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustodyModule } from './custody/custody.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CustodyModule,
  ],
})
export class AppModule {}
