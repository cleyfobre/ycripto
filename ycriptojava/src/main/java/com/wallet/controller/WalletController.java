package com.wallet.controller;

import com.wallet.domain.entity.Wallet;
import com.wallet.dto.ApiResponse;
import com.wallet.dto.WalletResponse;
import com.wallet.service.WalletService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "지갑 관리", description = "지갑 조회 및 잔액 확인 API")
@RestController
@RequestMapping("/api/wallets")
@RequiredArgsConstructor
public class WalletController {
    
    private final WalletService walletService;
    
    @Operation(
        summary = "사용자 지갑 조회",
        description = "사용자 ID로 지갑 정보와 모든 토큰의 잔액을 조회합니다. Solana 주소와 함께 SOL 및 기타 토큰 잔액이 반환됩니다."
    )
    @GetMapping("/user/{userId}")
    public ApiResponse<WalletResponse> getWallet(@PathVariable Long userId) {
        Wallet wallet = walletService.getWalletByUserId(userId);
        Map<String, String> balances = walletService.getAllBalances(wallet.getId());

        WalletResponse response = WalletResponse.builder()
                .walletId(wallet.getId())
                .address(wallet.getAddress())
                .balances(balances)
                .build();

        return ApiResponse.success(response);
    }
    
    @Operation(
        summary = "특정 토큰 잔액 조회",
        description = "지갑 ID와 토큰 민트 주소로 특정 토큰의 잔액을 조회합니다."
    )
    @GetMapping("/{walletId}/balance/{tokenMint}")
    public ApiResponse<String> getBalance(
            @PathVariable Long walletId,
            @PathVariable String tokenMint) {
        String balance = walletService.getBalance(walletId, tokenMint);
        return ApiResponse.success(balance);
    }
}
