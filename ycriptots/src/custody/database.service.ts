import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

// 임시 DB 연동 서비스 (추후 다른 서비스 호출로 대체 예정)
@Injectable()
export class DatabaseService {
  private pool: Pool;

  constructor(private configService: ConfigService) {
    this.pool = new Pool({
      connectionString: this.configService.get<string>('DATABASE_URL'),
    });
  }

  // 입금 처리: user_balances 업데이트 + onchain_transactions 추가
  async processDeposit(
    userId: number,
    coinId: number,
    amount: string,
    txHash: string,
    fromAddress: string,
    toAddress: string,
    blockNumber: number
  ): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. onchain_transactions에 추가 (중복 체크)
      const existingTx = await client.query(
        'SELECT id FROM onchain_transactions WHERE tx_hash = $1',
        [txHash]
      );

      if (existingTx.rows.length > 0) {
        // 이미 처리된 트랜잭션
        await client.query('ROLLBACK');
        return;
      }

      await client.query(
        `INSERT INTO onchain_transactions
         (user_id, coin_id, tx_hash, from_address, to_address, amount, type, status, confirmations, block_number, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, $6, 1, 2, 60, $7, NOW())`,
        [userId, coinId, txHash, fromAddress, toAddress, amount, blockNumber]
      );

      // 2. user_balances 업데이트 (없으면 추가)
      const existingBalance = await client.query(
        'SELECT id, balance FROM user_balances WHERE user_id = $1 AND coin_id = $2',
        [userId, coinId]
      );

      if (existingBalance.rows.length > 0) {
        // 기존 잔액에 추가
        await client.query(
          `UPDATE user_balances
           SET balance = balance + $1, updated_at = NOW()
           WHERE user_id = $2 AND coin_id = $3`,
          [amount, userId, coinId]
        );
      } else {
        // 새로 생성
        await client.query(
          `INSERT INTO user_balances (user_id, coin_id, balance)
           VALUES ($1, $2, $3)`,
          [userId, coinId, amount]
        );
      }

      await client.query('COMMIT');
      console.log(`[DB] Deposit processed: ${amount} for user ${userId}, tx: ${txHash}`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('[DB] Error processing deposit:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  // 지갑 주소로 user_id와 coin_id 조회
  async getWalletInfo(address: string): Promise<{ userId: number; coinId: number } | null> {
    const result = await this.pool.query(
      'SELECT user_id, coin_id FROM deposit_wallets WHERE address = $1 AND status = 1',
      [address]
    );

    if (result.rows.length === 0) return null;

    return {
      userId: result.rows[0].user_id,
      coinId: result.rows[0].coin_id
    };
  }

  // 마지막 체크 슬롯 및 시그니처 업데이트
  async updateLastChecked(address: string, slot: number, signature: string): Promise<void> {
    await this.pool.query(
      'UPDATE deposit_wallets SET last_checked_slot = $1, last_checked_signature = $2, updated_at = NOW() WHERE address = $3',
      [slot, signature, address]
    );
  }

  // 마지막 체크 시그니처 조회
  async getLastCheckedSignature(address: string): Promise<string | null> {
    const result = await this.pool.query(
      'SELECT last_checked_signature FROM deposit_wallets WHERE address = $1',
      [address]
    );

    return result.rows[0]?.last_checked_signature || null;
  }
}
