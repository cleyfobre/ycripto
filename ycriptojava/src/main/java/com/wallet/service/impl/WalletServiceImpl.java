package com.wallet.service.impl;

import com.wallet.domain.entity.Balance;
import com.wallet.domain.entity.Wallet;
import com.wallet.domain.repository.BalanceRepository;
import com.wallet.domain.repository.WalletRepository;
import com.wallet.service.WalletService;
import com.wallet.util.EncryptionUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.p2p.solanaj.core.Account;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletServiceImpl implements WalletService {
    
    private final WalletRepository walletRepository;
    private final BalanceRepository balanceRepository;
    private final EncryptionUtil encryptionUtil;
    
    @Override
    @Transactional
    public Wallet createWallet(Long userId) {
        log.info("Creating wallet for user: {}", userId);
        
        // Solana 키페어 생성
        Account account = new Account();
        String publicKey = account.getPublicKey().toBase58();
        byte[] privateKeyBytes = account.getSecretKey();
        
        // Private Key 암호화
        String encryptedPrivateKey = encryptionUtil.encrypt(privateKeyBytes);
        
        // DB 저장
        Wallet wallet = Wallet.builder()
                .userId(userId)
                .address(publicKey)
                .privateKeyEncrypted(encryptedPrivateKey)
                .walletType(Wallet.WalletType.USER)
                .build();
        
        wallet = walletRepository.save(wallet);
        
        // SOL 기본 잔액 초기화
        Balance solBalance = Balance.builder()
                .walletId(wallet.getId())
                .tokenMint("SOL")
                .tokenSymbol("SOL")
                .availableBalance(BigDecimal.ZERO)
                .lockedBalance(BigDecimal.ZERO)
                .build();
        
        balanceRepository.save(solBalance);
        
        log.info("Wallet created successfully. Address: {}", publicKey);
        return wallet;
    }
    
    @Override
    @Transactional(readOnly = true)
    public Wallet getWalletByUserId(Long userId) {
        return walletRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Wallet not found for user: " + userId));
    }
    
    @Override
    @Transactional(readOnly = true)
    public Wallet getWalletByAddress(String address) {
        return walletRepository.findByAddress(address)
                .orElseThrow(() -> new RuntimeException("Wallet not found: " + address));
    }
    
    @Override
    @Transactional(readOnly = true)
    public String getBalance(Long walletId, String tokenMint) {
        Balance balance = balanceRepository.findByWalletIdAndTokenMint(walletId, tokenMint)
                .orElse(Balance.builder()
                        .availableBalance(BigDecimal.ZERO)
                        .build());
        
        return balance.getAvailableBalance().toPlainString();
    }
    
    @Override
    @Transactional(readOnly = true)
    public Map<String, String> getAllBalances(Long walletId) {
        List<Balance> balances = balanceRepository.findByWalletId(walletId);
        
        Map<String, String> result = new HashMap<>();
        for (Balance balance : balances) {
            result.put(balance.getTokenSymbol(), balance.getAvailableBalance().toPlainString());
        }
        
        return result;
    }
}
