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
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';
import bs58 from 'bs58';

// USDT 토큰 주소 (Solana Mainnet)
const USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');

class SolanaUSDTWallet {
  private connection: Connection;

  constructor(network: 'mainnet-beta' | 'devnet' = 'mainnet-beta') {
    this.connection = new Connection(clusterApiUrl(network), 'confirmed');
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
      // SOL은 9자리 decimals (lamports)
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
        Keypair.generate(), // 읽기 전용이므로 임시 keypair
        USDT_MINT,
        publicKey
      );

      const accountInfo = await getAccount(this.connection, tokenAccount.address);
      // USDT는 6자리 decimals
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

  async monitorSOLDeposit(
    walletAddress: string,
    callback: (amount: string, signature: string) => void
  ): Promise<void> {
    const pubkey = new PublicKey(walletAddress);
    const currentSlot = await this.connection.getSlot('confirmed');

    // 2. 트랜잭션 시그니처 조회 (마지막 체크 이후)
    const signatures = await this.connection.getSignaturesForAddress(pubkey, {
      limit: 100
    });

    for (const sig of signatures.reverse()) {
      console.log('Checking signature:', sig);
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

    // SOL은 9자리 decimals (lamports)
    const lamports = Math.floor(parseFloat(amount) * LAMPORTS_PER_SOL);

    // 트랜잭션 생성
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPublicKey,
        lamports
      })
    );

    // 트랜잭션 전송 및 확인
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

    // USDT는 6자리 decimals
    const transferAmount = BigInt(Math.floor(parseFloat(amount) * 1e6));

    // 발신자 토큰 계정
    const fromTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      fromKeypair,
      USDT_MINT,
      fromKeypair.publicKey
    );

    // 수신자 토큰 계정
    const toTokenAccount = await getOrCreateAssociatedTokenAccount(
      this.connection,
      fromKeypair,
      USDT_MINT,
      toPublicKey
    );

    // 전송 실행
    const signature = await transfer(
      this.connection,
      fromKeypair,
      fromTokenAccount.address,
      toTokenAccount.address,
      fromKeypair.publicKey,
      transferAmount
    );

    // 트랜잭션 확인 대기
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
}

export default SolanaUSDTWallet;