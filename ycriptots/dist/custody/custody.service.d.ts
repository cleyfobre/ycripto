import { ConfigService } from '@nestjs/config';
import { DatabaseService } from './database.service';
export declare class CustodyService {
    private configService;
    private databaseService;
    private connection;
    constructor(configService: ConfigService, databaseService: DatabaseService);
    createWallet(): {
        publicKey: string;
        privateKey: string;
    };
    private getKeypairFromPrivateKey;
    getSOLBalance(walletAddress: string): Promise<string>;
    getUSDTBalance(walletAddress: string): Promise<string>;
    monitorDeposit(walletAddress: string, callback: (amount: string, signature: string) => void): Promise<void>;
    monitorSOLDeposit(walletAddress: string, callback: (amount: string, signature: string) => void): Promise<void>;
    withdrawSOL(fromPrivateKey: string, toAddress: string, amount: string): Promise<string>;
    withdrawUSDT(fromPrivateKey: string, toAddress: string, amount: string): Promise<string>;
    getTransactionStatus(signature: string): Promise<'confirmed' | 'finalized' | 'failed'>;
    getNetwork(): string;
}
