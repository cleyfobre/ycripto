import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Connection,
  PublicKey,
  Keypair,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  clusterApiUrl,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  transfer,
  getAccount
} from '@solana/spl-token';
import bs58 from 'bs58';
import { DatabaseService } from './database.service';
import { RabbitMQService } from './rabbitmq.service';

// USDT 토큰 주소 (Solana Mainnet)
const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');

@Injectable()
export class CustodyService {
  private connection: Connection;

  constructor(
    private configService: ConfigService,
    private databaseService: DatabaseService,
    private rabbitmqService: RabbitMQService
  ) {
    // Helius RPC URL 우선 사용, 없으면 public RPC 사용
    const rpcUrl = this.configService.get<string>('SOLANA_RPC_URL');

    if (rpcUrl) {
      this.connection = new Connection(rpcUrl, 'confirmed');
    } else {
      // Fallback to public RPC
      const network = this.configService.get<'mainnet-beta' | 'devnet'>('SOLANA_NETWORK') || 'mainnet-beta';
      this.connection = new Connection(clusterApiUrl(network), 'confirmed');
      console.warn('[Warning] Using public RPC. Consider using Helius for better rate limits.');
    }
  }

  // 1. 지갑 생성
  createWallet(): { publicKey: string; privateKey: string } {
    const keypair = Keypair.generate();
    return {
      publicKey: keypair.publicKey.toBase58(),
      privateKey: bs58.encode(keypair.secretKey)
    };
  }

  // 2. Private Key로 Keypair 복원
  private getKeypairFromPrivateKey(privateKey: string): Keypair {
    const secretKey = bs58.decode(privateKey);
    return Keypair.fromSecretKey(secretKey);
  }

  // 3-1. SOL 잔액 조회
  async getSOLBalance(walletAddress: string): Promise<string> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      return (balance / 1e9).toFixed(9);
    } catch (error) {
      return '0.000000000';
    }
  }

  // 3-2. USDT 잔액 조회
  async getUSDTBalance(walletAddress: string): Promise<string> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        this.connection,
        Keypair.generate(),
        USDT_MINT,
        publicKey
      );

      const accountInfo = await getAccount(this.connection, tokenAccount.address);
      return (Number(accountInfo.amount) / 1e6).toFixed(6);
    } catch (error) {
      return '0.000000';
    }
  }

  // 4. USDT 입금 모니터링
  async monitorDeposit(
    walletAddress: string,
    callback: (amount: string, signature: string) => void
  ): Promise<void> {
    const publicKey = new PublicKey(walletAddress);

    this.connection.onLogs(
      publicKey,
      async (logs) => {
        if (logs.logs.some(log => log.includes('Transfer'))) {
          const balance = await this.getUSDTBalance(walletAddress);
          callback(balance, logs.signature);
        }
      },
      'confirmed'
    );
  }

  // SOL 입금 모니터링
  async monitorSOLDeposit(
    walletAddress: string,
    callback: (amount: string, signature: string) => void
  ): Promise<void> {
    const pubkey = new PublicKey(walletAddress);

    // 지갑 정보 조회
    const walletInfo = await this.databaseService.getWalletInfo(walletAddress);
    if (!walletInfo) {
      console.error(`[Monitor] Wallet not found: ${walletAddress}`);
      return;
    }

    // 마지막으로 확인한 시그니처 조회
    const lastCheckedSignature = await this.databaseService.getLastCheckedSignature(walletAddress);

    console.log("lastCheckedSignature:", lastCheckedSignature);

    // until 파라미터로 마지막 시그니처 이후의 트랜잭션만 조회
    const signatures = await this.connection.getSignaturesForAddress(pubkey, {
      limit: 20,
      until: lastCheckedSignature || undefined
    });

    if (signatures.length === 0) {
      console.log(`[Monitor] No new transactions for ${walletAddress}`);
      return;
    }

    console.log(`[Monitor] Found ${signatures.length} new transactions`);

    let maxSlot = 0;
    let latestSignature = '';

    // 오래된 것부터 처리 (reverse)
    for (const sig of signatures.reverse()) {
      console.log('Processing signature:', sig.signature, 'slot:', sig.slot);

      const tx = await this.connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0
      });

      if (!tx || !tx.meta) continue;

      const accountIndex = tx.transaction.message.accountKeys.findIndex(
        (key) => key.pubkey.toBase58() === walletAddress
      );

      if (accountIndex === -1) continue;

      const preBalance = tx.meta.preBalances[accountIndex];
      const postBalance = tx.meta.postBalances[accountIndex];
      const balanceChange = postBalance - preBalance;

      // 입금인 경우 (잔액 증가)
      if (balanceChange > 0) {
        const amount = (balanceChange / LAMPORTS_PER_SOL).toFixed(9);

        // 송신자 주소 찾기
        const senderIndex = tx.transaction.message.accountKeys.findIndex(
          (_key, idx) => idx !== accountIndex && tx.meta!.preBalances[idx] > tx.meta!.postBalances[idx]
        );
        const fromAddress = senderIndex !== -1
          ? tx.transaction.message.accountKeys[senderIndex].pubkey.toBase58()
          : 'unknown';

        // DB에 입금 처리
        try {
          await this.databaseService.processDeposit(
            walletInfo.memberId,
            walletInfo.coinId,
            amount,
            sig.signature,
            fromAddress,
            walletAddress,
            sig.slot
          );

          // RabbitMQ 알림 전송
          await this.rabbitmqService.sendDepositNotification({
            memberId: walletInfo.memberId,
            coinId: walletInfo.coinId,
            address: walletAddress,
            amount: amount,
            txHash: sig.signature,
            fromAddress: fromAddress,
            blockNumber: sig.slot,
            timestamp: new Date().toISOString()
          });

          // callback(amount, sig.signature);
        } catch (error) {
          // 이미 처리된 트랜잭션이면 무시
          console.log(`[Monitor] Transaction already processed or error: ${sig.signature}`);
        }
      }

      // 최대 슬롯과 최신 시그니처 업데이트
      if (sig.slot > maxSlot) {
        maxSlot = sig.slot;
        latestSignature = sig.signature;
      }
    }

    // 마지막 체크 슬롯 및 시그니처 업데이트
    if (maxSlot > 0 && latestSignature) {
      await this.databaseService.updateLastChecked(walletAddress, maxSlot, latestSignature);
      console.log(`[Monitor] Updated last_checked to slot: ${maxSlot}, signature: ${latestSignature}`);
    }
  }

  // 5-1. SOL 출금
  async withdrawSOL(
    fromPrivateKey: string,
    toAddress: string,
    amount: string
  ): Promise<string> {
    const fromKeypair = this.getKeypairFromPrivateKey(fromPrivateKey);
    const toPublicKey = new PublicKey(toAddress);

    const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports
      })
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [fromKeypair]
    );

    return signature;
  }

  // 5-2. USDT 출금
  async withdrawUSDT(
    fromPrivateKey: string,
    toAddress: string,
    amount: string
  ): Promise<string> {
    const fromKeypair = this.getKeypairFromPrivateKey(fromPrivateKey);
    const toPublicKey = new PublicKey(toAddress);

    const transferAmount = BigInt(Math.floor(parseFloat(amount) * 1e6));

    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      fromKeypair,
      USDT_MINT,
      fromKeypair.publicKey
    );

    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      fromKeypair,
      USDT_MINT,
      toPublicKey
    );

    const signature = await transfer(
      this.connection,
      fromKeypair,
      fromTokenAccount.address,
      toTokenAccount.address,
      fromKeypair.publicKey,
      transferAmount
    );

    await this.connection.confirmTransaction(signature, 'confirmed');

    return signature;
  }

  // 6. 트랜잭션 상태 확인
  async getTransactionStatus(signature: string): Promise<'confirmed' | 'finalized' | 'failed'> {
    const status = await this.connection.getSignatureStatus(signature);

    if (status.value?.confirmationStatus === 'finalized') {
      return 'finalized';
    } else if (status.value?.confirmationStatus === 'confirmed') {
      return 'confirmed';
    }
    return 'failed';
  }

  // Network 정보 반환
  getNetwork(): string {
    return this.configService.get<string>('SOLANA_NETWORK') || 'mainnet-beta';
  }

  // Rate limit 준수를 위한 sleep
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 여러 지갑 배치 모니터링 (Rate limit 고려)
  async monitorMultipleWallets(
    wallets: Array<{ address: string }>,
    callback: (address: string, amount: string, signature: string) => void
  ): Promise<void> {
    console.log(`[Monitor] Starting batch monitoring for ${wallets.length} wallets`);

    for (const wallet of wallets) {
      try {
        await this.monitorSOLDeposit(wallet.address, (amount, signature) => {
          callback(wallet.address, amount, signature);
        });

        // Helius Free: 10 req/sec 제한 준수
        // 100ms 딜레이 = 초당 10개 (안전하게 여유있게)
        await this.sleep(100);
      } catch (error) {
        console.error(`[Monitor] Error monitoring ${wallet.address}:`, error);
      }
    }

    console.log(`[Monitor] Batch monitoring completed`);
  }
}
