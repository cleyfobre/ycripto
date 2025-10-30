import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { SolanaWalletService } from './services/SolanaWalletService';
import { UserService } from './services/UserService';

dotenv.config();

const app = express();
app.use(express.json());

// 헬스 체크
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', network: 'Solana', timestamp: new Date().toISOString() });
});

// 사용자 생성 및 지갑 생성
app.post('/api/users/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name, phone } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await UserService.createUserWithWallet(email, password, name, phone);

    res.status(201).json({
      success: true,
      userId: result.userId,
      walletAddress: result.walletAddress,
      network: 'Solana'
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 사용자 지갑 조회
app.get('/api/users/:userId/wallet', async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const wallet = await UserService.getUserWallet(userId);

    res.json({
      success: true,
      wallet: {
        address: wallet.address,
        balance: wallet.balance_usdt,
        createdAt: wallet.created_at,
        network: 'Solana'
      }
    });
  } catch (error: any) {
    console.error('Wallet fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 지갑 잔액 동기화
app.post('/api/wallets/:walletId/sync', async (req: Request, res: Response) => {
  try {
    const walletId = parseInt(req.params.walletId);
    const balances = await UserService.syncWalletBalance(walletId);

    res.json({
      success: true,
      balances: {
        sol: balances.sol,
        usdt: balances.usdt
      }
    });
  } catch (error: any) {
    console.error('Balance sync error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 지갑 주소로 잔액 조회 (블록체인에서 직접)
app.get('/api/wallets/:address/balance', async (req: Request, res: Response) => {
  try {
    const address = req.params.address;
    const solBalance = await SolanaWalletService.getSOLBalance(address);
    const usdtBalance = await SolanaWalletService.getUSDTBalance(address);

    res.json({
      success: true,
      address,
      balances: {
        sol: solBalance,
        usdt: usdtBalance
      },
      network: 'Solana'
    });
  } catch (error: any) {
    console.error('Balance fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 트랜잭션 상태 조회
app.get('/api/transactions/:signature', async (req: Request, res: Response) => {
  try {
    const signature = req.params.signature;
    const status = await SolanaWalletService.getTransactionStatus(signature);

    res.json({
      success: true,
      signature,
      status
    });
  } catch (error: any) {
    console.error('Transaction status error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 서버 시작
async function startServer() {
  try {
    // 1. 데이터베이스 연결 테스트
    const dbConnected = await testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // 2. 마스터 시드 초기화
    const masterSeed = process.env.MASTER_SEED_ENCRYPTED || SolanaWalletService.generateMasterSeed();
    
    if (!process.env.MASTER_SEED_ENCRYPTED) {
      console.log('\n⚠️  MASTER SEED 생성됨 (안전한 곳에 보관하세요):');
      console.log('═'.repeat(80));
      console.log(masterSeed);
      console.log('═'.repeat(80));
      console.log('⚠️  .env 파일에 MASTER_SEED_ENCRYPTED로 저장하세요\n');
    }
    
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    SolanaWalletService.initialize(masterSeed, rpcUrl);

    // 3. 서버 시작
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Solana USDT Wallet System`);
      console.log(`📡 Server running on port ${PORT}`);
      console.log(`🔗 RPC: ${rpcUrl}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

startServer();