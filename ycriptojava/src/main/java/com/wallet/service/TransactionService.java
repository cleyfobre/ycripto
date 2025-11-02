package com.wallet.service;

import com.wallet.domain.entity.Transaction;
import com.wallet.dto.InternalTransferRequest;
import com.wallet.dto.WithdrawRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TransactionService {
    
    /**
     * 출금 요청
     */
    Transaction requestWithdraw(Long userId, WithdrawRequest request);
    
    /**
     * 내부 송금 (즉시 반영)
     */
    Transaction internalTransfer(Long fromUserId, InternalTransferRequest request);
    
    /**
     * 사용자 거래 내역 조회
     */
    Page<Transaction> getUserTransactions(Long userId, Pageable pageable);
    
    /**
     * 거래 상세 조회
     */
    Transaction getTransactionById(Long transactionId);
}
