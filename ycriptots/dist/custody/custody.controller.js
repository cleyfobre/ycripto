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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustodyController = void 0;
const common_1 = require("@nestjs/common");
const custody_service_1 = require("./custody.service");
class WithdrawDto {
}
let CustodyController = class CustodyController {
    constructor(custodyService) {
        this.custodyService = custodyService;
    }
    health() {
        return {
            status: 'ok',
            network: this.custodyService.getNetwork(),
        };
    }
    createWallet() {
        try {
            const wallet = this.custodyService.createWallet();
            return {
                success: true,
                data: wallet,
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getBalance(address, currency) {
        try {
            if (currency === 'sol') {
                const balance = await this.custodyService.getSOLBalance(address);
                return {
                    success: true,
                    data: {
                        address,
                        balance,
                        currency: 'SOL',
                    },
                };
            }
            if (currency === 'usdt') {
                const balance = await this.custodyService.getUSDTBalance(address);
                return {
                    success: true,
                    data: {
                        address,
                        balance,
                        currency: 'USDT',
                    },
                };
            }
            const [solBalance, usdtBalance] = await Promise.all([
                this.custodyService.getSOLBalance(address),
                this.custodyService.getUSDTBalance(address),
            ]);
            return {
                success: true,
                data: {
                    address,
                    balances: {
                        SOL: solBalance,
                        USDT: usdtBalance,
                    },
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async withdraw(withdrawDto) {
        try {
            const { fromPrivateKey, toAddress, amount, currency } = withdrawDto;
            if (!fromPrivateKey || !toAddress || !amount || !currency) {
                throw new common_1.HttpException({
                    success: false,
                    error: 'Missing required fields: fromPrivateKey, toAddress, amount, currency (sol or usdt)',
                }, common_1.HttpStatus.BAD_REQUEST);
            }
            let signature;
            const network = this.custodyService.getNetwork();
            if (currency.toLowerCase() === 'sol') {
                signature = await this.custodyService.withdrawSOL(fromPrivateKey, toAddress, amount);
            }
            else if (currency.toLowerCase() === 'usdt') {
                signature = await this.custodyService.withdrawUSDT(fromPrivateKey, toAddress, amount);
            }
            else {
                throw new common_1.HttpException({
                    success: false,
                    error: 'Invalid currency. Must be "sol" or "usdt"',
                }, common_1.HttpStatus.BAD_REQUEST);
            }
            return {
                success: true,
                data: {
                    signature,
                    amount,
                    currency: currency.toUpperCase(),
                    toAddress,
                    explorer: `https://explorer.solana.com/tx/${signature}${network === 'devnet' ? '?cluster=devnet' : ''}`,
                },
            };
        }
        catch (error) {
            if (error instanceof common_1.HttpException)
                throw error;
            throw new common_1.HttpException({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getTransactionStatus(signature) {
        try {
            const status = await this.custodyService.getTransactionStatus(signature);
            const network = this.custodyService.getNetwork();
            return {
                success: true,
                data: {
                    signature,
                    status,
                    explorer: `https://explorer.solana.com/tx/${signature}${network === 'devnet' ? '?cluster=devnet' : ''}`,
                },
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async monitorDeposit(address) {
        try {
            this.custodyService.monitorSOLDeposit(address, (amount, signature) => {
                console.log(`[${address}] Deposit detected: ${amount} SOL, Signature: ${signature}`);
            });
            return {
                success: true,
                message: `Monitoring started for address: ${address}`,
                note: 'Deposits will be logged to console. Consider implementing WebSocket for real-time updates.',
            };
        }
        catch (error) {
            throw new common_1.HttpException({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.CustodyController = CustodyController;
__decorate([
    (0, common_1.Get)('health'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "health", null);
__decorate([
    (0, common_1.Post)('wallet/create'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CustodyController.prototype, "createWallet", null);
__decorate([
    (0, common_1.Get)('wallet/:address/balance'),
    __param(0, (0, common_1.Param)('address')),
    __param(1, (0, common_1.Query)('currency')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CustodyController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Post)('withdraw'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [WithdrawDto]),
    __metadata("design:returntype", Promise)
], CustodyController.prototype, "withdraw", null);
__decorate([
    (0, common_1.Get)('transaction/:signature/status'),
    __param(0, (0, common_1.Param)('signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustodyController.prototype, "getTransactionStatus", null);
__decorate([
    (0, common_1.Post)('wallet/:address/monitor'),
    __param(0, (0, common_1.Param)('address')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CustodyController.prototype, "monitorDeposit", null);
exports.CustodyController = CustodyController = __decorate([
    (0, common_1.Controller)('api'),
    __metadata("design:paramtypes", [custody_service_1.CustodyService])
], CustodyController);
//# sourceMappingURL=custody.controller.js.map