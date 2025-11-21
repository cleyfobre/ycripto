import { ConfigService } from '@nestjs/config';
export declare class DatabaseService {
    private configService;
    private pool;
    constructor(configService: ConfigService);
    processDeposit(userId: number, coinId: number, amount: string, txHash: string, fromAddress: string, toAddress: string, blockNumber: number): Promise<void>;
    getWalletInfo(address: string): Promise<{
        userId: number;
        coinId: number;
    } | null>;
    updateLastCheckedSlot(address: string, slot: number): Promise<void>;
    getLastCheckedSlot(address: string): Promise<number>;
}
