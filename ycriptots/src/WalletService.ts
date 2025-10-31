import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import { Keypair, Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from '@solana/spl-token';
import * as bs58 from 'bs58';
import * as crypto from 'crypto';

export class SolanaWalletService {
  private static masterSeed: string | null = null;
  private static encryptionKey: Buffer;
  private static connection: Connection;

  // USDT on Solana (SPL Token)
  private static readonly USDT_MINT = new PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');

  // 초기화
  static initialize(masterSeed: string, rpcUrl: string) {
    this.masterSeed = masterSeed;
    this.encryptionKey = crypto.scryptSync(process.env.JWT_SECRET || 'default', 'salt', 32);
    this.connection = new Connection(rpcUrl, 'confirmed');
  }

  // 마스터 시드 생성 (최초 1회)
  static generateMasterSeed(): string {
    return bip39.generateMnemonic(256); // 24 단어
  }

  // 사용자별 HD Wallet 생성 (BIP44: m/44'/501'/account_index'/0')
  static async createUserWallet(accountIndex: number): Promise<{
    publicKey: string;
    privateKey: string;
    encryptedPrivateKey: string;
    derivationPath: string;
  }> {
    if (!this.masterSeed) {
      throw new Error('Master seed not initialized');
    }

    // BIP44 경로: m/44'/501'/account_index'/0' (501 = Solana)
    const derivationPath = `m/44'/501'/${accountIndex}'/0'`;
    
    // Seed 생성
    const seed = await bip39.mnemonicToSeed(this.masterSeed);
    
    // HD Key 파생
    const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
    
    // Keypair 생성
    const keypair = Keypair.fromSeed(derivedSeed);
    
    const publicKey = keypair.publicKey.toBase58();
    const privateKey = bs58.encode(keypair.secretKey);

    // Private Key 암호화
    const encryptedPrivateKey = this.encryptPrivateKey(privateKey);

    return {
      publicKey,
      privateKey, // 반환 후 즉시 메모리에서 제거
      encryptedPrivateKey,
      derivationPath
    };
  }

  // Private Key 암호화 (AES-256-GCM)
  private static encryptPrivateKey(privateKey: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  // Private Key 복호화
  static decryptPrivateKey(encryptedData: string): string {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  // SOL 잔액 조회
  static async getSOLBalance(publicKey: string): Promise<string> {
    try {
      const pubkey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubkey);
      
      // Lamports to SOL (1 SOL = 1,000,000,000 lamports)
      return (balance / 1_000_000_000).toString();
    } catch (error) {
      console.error('SOL balance fetch error:', error);
      return '0';
    }
  }

  // USDT (SPL Token) 잔액 조회
  static async getUSDTBalance(publicKey: string): Promise<string> {
    try {
      const pubkey = new PublicKey(publicKey);
      
      // Associated Token Account 주소 가져오기
      const ata = await getAssociatedTokenAddress(
        this.USDT_MINT,
        pubkey
      );

      // Token Account 정보 조회
      const tokenAccount = await getAccount(this.connection, ata);
      
      // USDT는 6 decimals
      const balance = Number(tokenAccount.amount) / 1_000_000;
      
      return balance.toString();
    } catch (error: any) {
      // Token Account가 없으면 잔액 0
      if (error.message?.includes('could not find account')) {
        return '0';
      }
      console.error('USDT balance fetch error:', error);
      return '0';
    }
  }

  // USDT 전송
  static async transferUSDT(
    encryptedPrivateKey: string,
    toPublicKey: string,
    amount: string
  ): Promise<string> {
    try {
      // Private Key 복호화
      const privateKeyBase58 = this.decryptPrivateKey(encryptedPrivateKey);
      const secretKey = bs58.decode(privateKeyBase58);
      const fromKeypair = Keypair.fromSecretKey(secretKey);

      const toPubkey = new PublicKey(toPublicKey);

      // Associated Token Accounts
      const fromAta = await getAssociatedTokenAddress(
        this.USDT_MINT,
        fromKeypair.publicKey
      );

      const toAta = await getAssociatedTokenAddress(
        this.USDT_MINT,
        toPubkey
      );

      // USDT amount (6 decimals)
      const amountInUnits = Math.floor(parseFloat(amount) * 1_000_000);

      // Transaction 생성
      const transaction = new Transaction().add(
        createTransferInstruction(
          fromAta,
          toAta,
          fromKeypair.publicKey,
          amountInUnits
        )
      );

      // 최근 블록해시 가져오기
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromKeypair.publicKey;

      // 서명 및 전송
      transaction.sign(fromKeypair);
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize()
      );

      // 확인 대기
      await this.connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error) {
      console.error('USDT transfer error:', error);
      throw error;
    }
  }

  // SOL 전송 (가스비 충전용)
  static async transferSOL(
    encryptedPrivateKey: string,
    toPublicKey: string,
    amount: string
  ): Promise<string> {
    try {
      const privateKeyBase58 = this.decryptPrivateKey(encryptedPrivateKey);
      const secretKey = bs58.decode(privateKeyBase58);
      const fromKeypair = Keypair.fromSecretKey(secretKey);

      const toPubkey = new PublicKey(toPublicKey);
      const lamports = Math.floor(parseFloat(amount) * 1_000_000_000);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPubkey,
          lamports: lamports
        })
      );

      const signature = await this.connection.sendTransaction(
        transaction,
        [fromKeypair]
      );

      await this.connection.confirmTransaction(signature, 'confirmed');

      return signature;
    } catch (error) {
      console.error('SOL transfer error:', error);
      throw error;
    }
  }

  // 트랜잭션 상태 확인
  static async getTransactionStatus(signature: string): Promise<any> {
    try {
      const status = await this.connection.getSignatureStatus(signature);
      return status;
    } catch (error) {
      console.error('Transaction status error:', error);
      return null;
    }
  }

  // Connection 인스턴스 반환 (외부에서 사용)
  static getConnection(): Connection {
    return this.connection;
  }
}