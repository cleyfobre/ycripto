package com.wallet.service;

import com.wallet.domain.entity.Wallet;

public interface WalletService {
    
    /**
     * 사용자 지갑 생성 (Solana 키페어 생성 + DB 저장)
     */
    Wallet createWallet(Long userId);
    
    /**
     * 사용자 지갑 조회
     */
    Wallet getWalletByUserId(Long userId);
    
    /**
     * 주소로 지갑 조회
     */
    Wallet getWalletByAddress(String address);
    
    /**
     * 잔액 조회 (특정 토큰)
     */
    String getBalance(Long walletId, String tokenMint);
    
    /**
     * 모든 토큰 잔액 조회
     */
    java.util.Map<String, String> getAllBalances(Long walletId);
}
