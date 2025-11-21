"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const pg_1 = require("pg");
let DatabaseService = class DatabaseService {
    constructor(configService) {
        this.configService = configService;
        this.pool = new pg_1.Pool({
            connectionString: this.configService.get('DATABASE_URL'),
        });
    }
    async processDeposit(userId, coinId, amount, txHash, fromAddress, toAddress, blockNumber) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const existingTx = await client.query('SELECT id FROM onchain_transactions WHERE tx_hash = $1', [txHash]);
            if (existingTx.rows.length > 0) {
                await client.query('ROLLBACK');
                return;
            }
            await client.query(`INSERT INTO onchain_transactions
         (user_id, coin_id, tx_hash, from_address, to_address, amount, type, status, confirmations, block_number, confirmed_at)
         VALUES ($1, $2, $3, $4, $5, $6, 1, 2, 60, $7, NOW())`, [userId, coinId, txHash, fromAddress, toAddress, amount, blockNumber]);
            const existingBalance = await client.query('SELECT id, balance FROM user_balances WHERE user_id = $1 AND coin_id = $2', [userId, coinId]);
            if (existingBalance.rows.length > 0) {
                await client.query(`UPDATE user_balances
           SET balance = balance + $1, updated_at = NOW()
           WHERE user_id = $2 AND coin_id = $3`, [amount, userId, coinId]);
            }
            else {
                await client.query(`INSERT INTO user_balances (user_id, coin_id, balance)
           VALUES ($1, $2, $3)`, [userId, coinId, amount]);
            }
            await client.query('COMMIT');
            console.log(`[DB] Deposit processed: ${amount} for user ${userId}, tx: ${txHash}`);
        }
        catch (error) {
            await client.query('ROLLBACK');
            console.error('[DB] Error processing deposit:', error);
            throw error;
        }
        finally {
            client.release();
        }
    }
    async getWalletInfo(address) {
        const result = await this.pool.query('SELECT user_id, coin_id FROM deposit_wallets WHERE address = $1 AND status = 1', [address]);
        if (result.rows.length === 0)
            return null;
        return {
            userId: result.rows[0].user_id,
            coinId: result.rows[0].coin_id
        };
    }
    async updateLastCheckedSlot(address, slot) {
        await this.pool.query('UPDATE deposit_wallets SET last_checked_slot = $1, updated_at = NOW() WHERE address = $2', [slot, address]);
    }
    async getLastCheckedSlot(address) {
        const result = await this.pool.query('SELECT last_checked_slot FROM deposit_wallets WHERE address = $1', [address]);
        return result.rows[0]?.last_checked_slot || 0;
    }
};
exports.DatabaseService = DatabaseService;
exports.DatabaseService = DatabaseService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], DatabaseService);
//# sourceMappingURL=database.service.js.map