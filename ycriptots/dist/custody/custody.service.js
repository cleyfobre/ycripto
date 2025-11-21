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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustodyService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const bs58_1 = __importDefault(require("bs58"));
const database_service_1 = require("./database.service");
const USDT_MINT = new web3_js_1.PublicKey('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB');
let CustodyService = class CustodyService {
    constructor(configService, databaseService) {
        this.configService = configService;
        this.databaseService = databaseService;
        const network = this.configService.get('SOLANA_NETWORK') || 'mainnet-beta';
        this.connection = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)(network), 'confirmed');
    }
    createWallet() {
        const keypair = web3_js_1.Keypair.generate();
        return {
            publicKey: keypair.publicKey.toBase58(),
            privateKey: bs58_1.default.encode(keypair.secretKey)
        };
    }
    getKeypairFromPrivateKey(privateKey) {
        const secretKey = bs58_1.default.decode(privateKey);
        return web3_js_1.Keypair.fromSecretKey(secretKey);
    }
    async getSOLBalance(walletAddress) {
        try {
            const publicKey = new web3_js_1.PublicKey(walletAddress);
            const balance = await this.connection.getBalance(publicKey);
            return (balance / 1e9).toFixed(9);
        }
        catch (error) {
            return '0.000000000';
        }
    }
    async getUSDTBalance(walletAddress) {
        try {
            const publicKey = new web3_js_1.PublicKey(walletAddress);
            const tokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(this.connection, web3_js_1.Keypair.generate(), USDT_MINT, publicKey);
            const accountInfo = await (0, spl_token_1.getAccount)(this.connection, tokenAccount.address);
            return (Number(accountInfo.amount) / 1e6).toFixed(6);
        }
        catch (error) {
            return '0.000000';
        }
    }
    async monitorDeposit(walletAddress, callback) {
        const publicKey = new web3_js_1.PublicKey(walletAddress);
        this.connection.onLogs(publicKey, async (logs) => {
            if (logs.logs.some(log => log.includes('Transfer'))) {
                const balance = await this.getUSDTBalance(walletAddress);
                callback(balance, logs.signature);
            }
        }, 'confirmed');
    }
    async monitorSOLDeposit(walletAddress, callback) {
        const pubkey = new web3_js_1.PublicKey(walletAddress);
        const walletInfo = await this.databaseService.getWalletInfo(walletAddress);
        if (!walletInfo) {
            console.error(`[Monitor] Wallet not found: ${walletAddress}`);
            return;
        }
        const signatures = await this.connection.getSignaturesForAddress(pubkey, {
            limit: 100
        });
        for (const sig of signatures.reverse()) {
            const tx = await this.connection.getParsedTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0
            });
            if (!tx || !tx.meta)
                continue;
            console.log('tx: ', tx);
            const accountIndex = tx.transaction.message.accountKeys.findIndex((key) => key.pubkey.toBase58() === walletAddress);
            if (accountIndex === -1)
                continue;
            const preBalance = tx.meta.preBalances[accountIndex];
            const postBalance = tx.meta.postBalances[accountIndex];
            const balanceChange = postBalance - preBalance;
            if (balanceChange > 0) {
                const amount = (balanceChange / web3_js_1.LAMPORTS_PER_SOL).toFixed(9);
                const senderIndex = tx.transaction.message.accountKeys.findIndex((key, idx) => idx !== accountIndex && tx.meta.preBalances[idx] > tx.meta.postBalances[idx]);
                const fromAddress = senderIndex !== -1
                    ? tx.transaction.message.accountKeys[senderIndex].pubkey.toBase58()
                    : 'unknown';
                try {
                    await this.databaseService.processDeposit(walletInfo.userId, walletInfo.coinId, amount, sig.signature, fromAddress, walletAddress, sig.slot);
                    callback(amount, sig.signature);
                }
                catch (error) {
                    console.log(`[Monitor] Transaction already processed or error: ${sig.signature}`);
                }
            }
        }
        if (signatures.length > 0) {
            const lastSlot = signatures[0].slot;
            await this.databaseService.updateLastCheckedSlot(walletAddress, lastSlot);
        }
    }
    async withdrawSOL(fromPrivateKey, toAddress, amount) {
        const fromKeypair = this.getKeypairFromPrivateKey(fromPrivateKey);
        const toPublicKey = new web3_js_1.PublicKey(toAddress);
        const lamports = Math.floor(parseFloat(amount) * web3_js_1.LAMPORTS_PER_SOL);
        const transaction = new web3_js_1.Transaction().add(web3_js_1.SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey: toPublicKey,
            lamports
        }));
        const signature = await (0, web3_js_1.sendAndConfirmTransaction)(this.connection, transaction, [fromKeypair]);
        return signature;
    }
    async withdrawUSDT(fromPrivateKey, toAddress, amount) {
        const fromKeypair = this.getKeypairFromPrivateKey(fromPrivateKey);
        const toPublicKey = new web3_js_1.PublicKey(toAddress);
        const transferAmount = BigInt(Math.floor(parseFloat(amount) * 1e6));
        const fromTokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(this.connection, fromKeypair, USDT_MINT, fromKeypair.publicKey);
        const toTokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(this.connection, fromKeypair, USDT_MINT, toPublicKey);
        const signature = await (0, spl_token_1.transfer)(this.connection, fromKeypair, fromTokenAccount.address, toTokenAccount.address, fromKeypair.publicKey, transferAmount);
        await this.connection.confirmTransaction(signature, 'confirmed');
        return signature;
    }
    async getTransactionStatus(signature) {
        const status = await this.connection.getSignatureStatus(signature);
        if (status.value?.confirmationStatus === 'finalized') {
            return 'finalized';
        }
        else if (status.value?.confirmationStatus === 'confirmed') {
            return 'confirmed';
        }
        return 'failed';
    }
    getNetwork() {
        return this.configService.get('SOLANA_NETWORK') || 'mainnet-beta';
    }
};
exports.CustodyService = CustodyService;
exports.CustodyService = CustodyService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        database_service_1.DatabaseService])
], CustodyService);
//# sourceMappingURL=custody.service.js.map