import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { CustodyService } from './custody.service';

// DTOs
class WithdrawDto {
  fromPrivateKey: string;
  toAddress: string;
  amount: string;
  currency: string;
}

@Controller('api')
export class CustodyController {
  constructor(private readonly custodyService: CustodyService) {}

  // Health check
  @Get('health')
  health() {
    return {
      status: 'ok',
      network: this.custodyService.getNetwork(),
    };
  }

  // 1. Create new wallet
  @Post('wallet/create')
  createWallet() {
    try {
      const wallet = this.custodyService.createWallet();
      return {
        success: true,
        data: wallet,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 2. Get balance (SOL, USDT, or both)
  @Get('wallet/:address/balance')
  async getBalance(
    @Param('address') address: string,
    @Query('currency') currency?: string,
  ) {
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

      // Default: return both balances
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
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 3. Withdraw (SOL or USDT)
  @Post('withdraw')
  async withdraw(@Body() withdrawDto: WithdrawDto) {
    try {
      const { fromPrivateKey, toAddress, amount, currency } = withdrawDto;

      if (!fromPrivateKey || !toAddress || !amount || !currency) {
        throw new HttpException(
          {
            success: false,
            error: 'Missing required fields: fromPrivateKey, toAddress, amount, currency (sol or usdt)',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      let signature: string;
      const network = this.custodyService.getNetwork();

      if (currency.toLowerCase() === 'sol') {
        signature = await this.custodyService.withdrawSOL(
          fromPrivateKey,
          toAddress,
          amount,
        );
      } else if (currency.toLowerCase() === 'usdt') {
        signature = await this.custodyService.withdrawUSDT(
          fromPrivateKey,
          toAddress,
          amount,
        );
      } else {
        throw new HttpException(
          {
            success: false,
            error: 'Invalid currency. Must be "sol" or "usdt"',
          },
          HttpStatus.BAD_REQUEST,
        );
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
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 4. Get transaction status
  @Get('transaction/:signature/status')
  async getTransactionStatus(@Param('signature') signature: string) {
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
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // 5. Monitor deposit
  @Post('wallet/:address/monitor')
  async monitorDeposit(@Param('address') address: string) {
    try {
      this.custodyService.monitorSOLDeposit(address, (amount, signature) => {
        console.log(`[${address}] Deposit detected: ${amount} SOL, Signature: ${signature}`);
      });

      return {
        success: true,
        message: `Monitoring started for address: ${address}`,
        note: 'Deposits will be logged to console. Consider implementing WebSocket for real-time updates.',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
