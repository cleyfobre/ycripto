import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Solana USDT Wallet API Server (NestJS)`);
  console.log(`📡 Network: ${process.env.SOLANA_NETWORK || 'mainnet-beta'}`);
  console.log(`🌐 Server running on http://localhost:${port}`);
  console.log(`\n📚 Available endpoints:`);
  console.log(`  GET  /api/health - Health check`);
  console.log(`  POST /api/wallet/create - Create new wallet`);
  console.log(`  GET  /api/wallet/:address/balance - Get balance`);
  console.log(`  POST /api/wallet/withdraw - Withdraw SOL/USDT`);
  console.log(`  GET  /api/transaction/:signature/status - Get transaction status`);
  console.log(`  POST /api/wallet/:address/monitor - Monitor deposits`);
}

bootstrap();
