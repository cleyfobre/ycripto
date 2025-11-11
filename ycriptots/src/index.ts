import express, { Request, Response } from 'express';
import SolanaUSDTWallet from './core';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NETWORK = (process.env.SOLANA_NETWORK as 'mainnet-beta' | 'devnet') || 'mainnet-beta';

// Initialize wallet service
const walletService = new SolanaUSDTWallet(NETWORK);

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', network: NETWORK });
});

// 1. Create new wallet
app.post('/api/wallet/create', (_req: Request, res: Response) => {
  try {
    const wallet = walletService.createWallet();
    res.json({
      success: true,
      data: wallet
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 2. Get balance (SOL, USDT, or both)
app.get('/api/wallet/:address/balance', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const { currency } = req.query; // ?currency=sol or ?currency=usdt or ?currency=all

    if (currency === 'sol') {
      const balance = await walletService.getSOLBalance(address);
      return res.json({
        success: true,
        data: {
          address,
          balance,
          currency: 'SOL'
        }
      });
    }

    if (currency === 'usdt') {
      const balance = await walletService.getUSDTBalance(address);
      return res.json({
        success: true,
        data: {
          address,
          balance,
          currency: 'USDT'
        }
      });
    }

    // Default: return both balances
    const [solBalance, usdtBalance] = await Promise.all([
      walletService.getSOLBalance(address),
      walletService.getUSDTBalance(address)
    ]);

    res.json({
      success: true,
      data: {
        address,
        balances: {
          SOL: solBalance,
          USDT: usdtBalance
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 3. Withdraw (SOL or USDT)
app.post('/api/wallet/withdraw', async (req: Request, res: Response) => {
  try {
    const { fromPrivateKey, toAddress, amount, currency } = req.body;

    // Validate required fields
    if (!fromPrivateKey || !toAddress || !amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: fromPrivateKey, toAddress, amount, currency (sol or usdt)'
      });
    }

    let signature: string;

    if (currency.toLowerCase() === 'sol') {
      signature = await walletService.withdrawSOL(
        fromPrivateKey,
        toAddress,
        amount
      );
    } else if (currency.toLowerCase() === 'usdt') {
      signature = await walletService.withdrawUSDT(
        fromPrivateKey,
        toAddress,
        amount
      );
    } else {
      return res.status(400).json({
        success: false,
        error: 'Invalid currency. Must be "sol" or "usdt"'
      });
    }

    res.json({
      success: true,
      data: {
        signature,
        amount,
        currency: currency.toUpperCase(),
        toAddress,
        explorer: `https://explorer.solana.com/tx/${signature}${NETWORK === 'devnet' ? '?cluster=devnet' : ''}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 4. Get transaction status
app.get('/api/transaction/:signature/status', async (req: Request, res: Response) => {
  try {
    const { signature } = req.params;
    const status = await walletService.getTransactionStatus(signature);

    res.json({
      success: true,
      data: {
        signature,
        status,
        explorer: `https://explorer.solana.com/tx/${signature}${NETWORK === 'devnet' ? '?cluster=devnet' : ''}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// 5. Monitor deposit (WebSocket or polling endpoint)
// Note: This is a simple implementation. For production, consider using WebSockets
app.post('/api/wallet/:address/monitor', async (req: Request, res: Response) => {
  try {
    const { address } = req.params;

    // Start monitoring (this is non-blocking)
    walletService.monitorSOLDeposit(address, (amount, signature) => {
      console.log(`[${address}] Deposit detected: ${amount} USDT, Signature: ${signature}`);
      // In production, you'd want to emit this via WebSocket or store in a queue
    });

    res.json({
      success: true,
      message: `Monitoring started for address: ${address}`,
      note: 'Deposits will be logged to console. Consider implementing WebSocket for real-time updates.'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: any) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Solana USDT Wallet API Server`);
  console.log(`📡 Network: ${NETWORK}`);
  console.log(`🌐 Server running on http://localhost:${PORT}`);
  console.log(`\n📚 Available endpoints:`);
  console.log(`  GET  /health - Health check`);
  console.log(`  POST /api/wallet/create - Create new wallet`);
  console.log(`  GET  /api/wallet/:address/balance - Get USDT balance`);
  console.log(`  POST /api/wallet/withdraw - Withdraw USDT`);
  console.log(`  GET  /api/transaction/:signature/status - Get transaction status`);
  console.log(`  POST /api/wallet/:address/monitor - Monitor deposits`);
});

export default app;
