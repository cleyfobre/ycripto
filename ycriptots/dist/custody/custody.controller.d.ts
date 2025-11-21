import { CustodyService } from './custody.service';
declare class WithdrawDto {
    fromPrivateKey: string;
    toAddress: string;
    amount: string;
    currency: string;
}
export declare class CustodyController {
    private readonly custodyService;
    constructor(custodyService: CustodyService);
    health(): {
        status: string;
        network: string;
    };
    createWallet(): {
        success: boolean;
        data: {
            publicKey: string;
            privateKey: string;
        };
    };
    getBalance(address: string, currency?: string): Promise<{
        success: boolean;
        data: {
            address: string;
            balance: string;
            currency: string;
            balances?: undefined;
        };
    } | {
        success: boolean;
        data: {
            address: string;
            balances: {
                SOL: string;
                USDT: string;
            };
            balance?: undefined;
            currency?: undefined;
        };
    }>;
    withdraw(withdrawDto: WithdrawDto): Promise<{
        success: boolean;
        data: {
            signature: string;
            amount: string;
            currency: string;
            toAddress: string;
            explorer: string;
        };
    }>;
    getTransactionStatus(signature: string): Promise<{
        success: boolean;
        data: {
            signature: string;
            status: "confirmed" | "finalized" | "failed";
            explorer: string;
        };
    }>;
    monitorDeposit(address: string): Promise<{
        success: boolean;
        message: string;
        note: string;
    }>;
}
export {};
