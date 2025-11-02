package com.wallet.service.impl;

import com.wallet.domain.entity.Balance;
import com.wallet.domain.entity.Transaction;
import com.wallet.domain.entity.Wallet;
import com.wallet.domain.repository.BalanceRepository;
import com.wallet.domain.repository.TransactionRepository;
import com.wallet.dto.InternalTransferRequest;
import com.wallet.dto.WithdrawRequest;
import com.wallet.service.TransactionService;
import com.wallet.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionServiceImpl implements TransactionService {
    
    private final TransactionRepository transactionRepository;
    private final BalanceRepository balanceRepository;
    private final WalletService walletService;
    
    @Override
    @Transactional
    public Transaction requestWithdraw(Long userId, WithdrawRequest request) {
        log.info("Withdraw request from user: {}, amount: {}, to: {}", 
                userId, request.getAmount(), request.getToAddress());
        
        Wallet wallet = walletService.getWalletByUserId(userId);
        BigDecimal amount = new BigDecimal(request.getAmount());
        
        // 잔액 확인
        Balance balance = balanceRepository.findByWalletIdAndTokenMint(wallet.getId(), request.getTokenSymbol())
                .orElseThrow(() -> new RuntimeException("토큰을 찾을 수 없습니다: " + request.getTokenSymbol()));
        
        if (balance.getAvailableBalance().compareTo(amount) < 0) {
            throw new RuntimeException("잔액이 부족합니다");
        }
        
        // 잔액 차감 (available -> locked)
        balance.setAvailableBalance(balance.getAvailableBalance().subtract(amount));
        balance.setLockedBalance(balance.getLockedBalance().add(amount));
        balanceRepository.save(balance);
        
        // 트랜잭션 생성
        Transaction transaction = Transaction.builder()
                .userId(userId)
                .walletId(wallet.getId())
                .txType(Transaction.TransactionType.WITHDRAW)
                .fromAddress(wallet.getAddress())
                .toAddress(request.getToAddress())
                .tokenMint(request.getTokenSymbol())
                .tokenSymbol(request.getTokenSymbol())
                .amount(amount)
                .status(Transaction.TransactionStatus.PENDING)
                .build();
        
        transaction = transactionRepository.save(transaction);
        
        log.info("Withdraw transaction created. ID: {}", transaction.getId());
        
        // TODO: 실제 Solana 네트워크로 전송 (별도 프로세스)
        
        return transaction;
    }
    
    @Override
    @Transactional
    public Transaction internalTransfer(Long fromUserId, InternalTransferRequest request) {
        log.info("Internal transfer from user: {} to user: {}, amount: {}", 
                fromUserId, request.getToUserId(), request.getAmount());
        
        Wallet fromWallet = walletService.getWalletByUserId(fromUserId);
        Wallet toWallet = walletService.getWalletByUserId(request.getToUserId());
        BigDecimal amount = new BigDecimal(request.getAmount());
        
        // 송신자 잔액 확인
        Balance fromBalance = balanceRepository.findByWalletIdAndTokenMint(
                fromWallet.getId(), request.getTokenSymbol())
                .orElseThrow(() -> new RuntimeException("토큰을 찾을 수 없습니다"));
        
        if (fromBalance.getAvailableBalance().compareTo(amount) < 0) {
            throw new RuntimeException("잔액이 부족합니다");
        }
        
        // 수신자 잔액 조회 또는 생성
        Balance toBalance = balanceRepository.findByWalletIdAndTokenMint(
                toWallet.getId(), request.getTokenSymbol())
                .orElseGet(() -> Balance.builder()
                        .walletId(toWallet.getId())
                        .tokenMint(request.getTokenSymbol())
                        .tokenSymbol(request.getTokenSymbol())
                        .availableBalance(BigDecimal.ZERO)
                        .lockedBalance(BigDecimal.ZERO)
                        .build());
        
        // 잔액 이동 (DB만 업데이트, 블록체인 트랜잭션 없음)
        fromBalance.setAvailableBalance(fromBalance.getAvailableBalance().subtract(amount));
        toBalance.setAvailableBalance(toBalance.getAvailableBalance().add(amount));
        
        balanceRepository.save(fromBalance);
        balanceRepository.save(toBalance);
        
        // 트랜잭션 생성
        Transaction transaction = Transaction.builder()
                .userId(fromUserId)
                .walletId(fromWallet.getId())
                .txType(Transaction.TransactionType.INTERNAL_TRANSFER)
                .fromAddress(fromWallet.getAddress())
                .toAddress(toWallet.getAddress())
                .tokenMint(request.getTokenSymbol())
                .tokenSymbol(request.getTokenSymbol())
                .amount(amount)
                .status(Transaction.TransactionStatus.COMPLETED)
                .build();
        
        transaction = transactionRepository.save(transaction);
        
        log.info("Internal transfer completed. Transaction ID: {}", transaction.getId());
        return transaction;
    }
    
    @Override
    @Transactional(readOnly = true)
    public Page<Transaction> getUserTransactions(Long userId, Pageable pageable) {
        return transactionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }
    
    @Override
    @Transactional(readOnly = true)
    public Transaction getTransactionById(Long transactionId) {
        return transactionRepository.findById(transactionId)
                .orElseThrow(() -> new RuntimeException("거래를 찾을 수 없습니다: " + transactionId));
    }
}
