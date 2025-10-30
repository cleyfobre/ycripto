import { pool, withTransaction } from '../config/database';
import { SolanaWalletService } from './SolanaWalletService';
import * as bcrypt from 'bcrypt';

export class UserService {
  // 사용자 생성 및 지갑 자동 생성
  static async createUserWithWallet(
    email: string,
    password: string,
    name: string,
    phone?: string
  ): Promise<{ userId: number; walletAddress: string }> {
    return withTransaction(async (client) => {
      // 1. 비밀번호 해싱
      const passwordHash = await bcrypt.hash(password, 12);

      // 2. 사용자 생성
      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, name, phone) 
         VALUES ($1, $2, $3, $4) 
         RETURNING id`,
        [email, passwordHash, name, phone]
      );
      
      const userId = userResult.rows[0].id;

      // 3. Solana HD Wallet 생성
      const wallet = await SolanaWalletService.createUserWallet(userId);

      // 4. 지갑 정보 저장
      await client.query(
        `INSERT INTO wallets (user_id, address, derivation_path, encrypted_private_key, balance_usdt)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, wallet.publicKey, wallet.derivationPath, wallet.encryptedPrivateKey, '0']
      );

      // 5. Private Key 메모리에서 제거
      wallet.privateKey = '';

      console.log(`✅ User created: ${email}, Wallet: ${wallet.publicKey}`);

      return {
        userId,
        walletAddress: wallet.publicKey
      };
    });
  }

  // 사용자 지갑 조회
  static async getUserWallet(userId: number): Promise<any> {
    const result = await pool.query(
      `SELECT id, address, balance_usdt, derivation_path, created_at
       FROM wallets
       WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Wallet not found');
    }

    return result.rows[0];
  }

  // 지갑 잔액 업데이트 (블록체인에서 동기화)
  static async syncWalletBalance(walletId: number): Promise<{ sol: string; usdt: string }> {
    return withTransaction(async (client) => {
      // 지갑 주소 조회
      const walletResult = await client.query(
        'SELECT address FROM wallets WHERE id = $1',
        [walletId]
      );

      if (walletResult.rows.length === 0) {
        throw new Error('Wallet not found');
      }

      const address = walletResult.rows[0].address;

      // 블록체인에서 실제 잔액 조회
      const solBalance = await SolanaWalletService.getSOLBalance(address);
      const usdtBalance = await SolanaWalletService.getUSDTBalance(address);

      // DB 업데이트
      await client.query(
        'UPDATE wallets SET balance_usdt = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [usdtBalance, walletId]
      );

      console.log(`✅ Wallet ${address} synced - SOL: ${solBalance}, USDT: ${usdtBalance}`);

      return {
        sol: solBalance,
        usdt: usdtBalance
      };
    });
  }

  // 이메일로 사용자 조회
  static async getUserByEmail(email: string): Promise<any> {
    const result = await pool.query(
      'SELECT id, email, name, kyc_verified FROM users WHERE email = $1',
      [email]
    );

    return result.rows[0] || null;
  }

  // 사용자 ID로 지갑 주소 조회
  static async getWalletAddressByUserId(userId: number): Promise<string> {
    const result = await pool.query(
      'SELECT address FROM wallets WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('Wallet not found for user');
    }

    return result.rows[0].address;
  }
}