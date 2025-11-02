package com.wallet.controller;

import com.wallet.domain.entity.Transaction;
import com.wallet.dto.ApiResponse;
import com.wallet.dto.InternalTransferRequest;
import com.wallet.dto.WithdrawRequest;
import com.wallet.service.TransactionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.*;

@Tag(name = "거래 관리", description = "출금, 내부 송금 및 거래 내역 조회 API")
@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
public class TransactionController {
    
    private final TransactionService transactionService;
    
    @Operation(
        summary = "출금 요청",
        description = "사용자의 지갑에서 외부 Solana 주소로 출금 요청을 등록합니다. 요청은 PENDING 상태로 저장되며, 실제 블록체인 전송은 별도 처리됩니다."
    )
    @PostMapping("/withdraw")
    public ApiResponse<Transaction> withdraw(
            @RequestParam Long userId,
            @Valid @RequestBody WithdrawRequest request) {
        Transaction transaction = transactionService.requestWithdraw(userId, request);
        return ApiResponse.success("출금 요청이 접수되었습니다", transaction);
    }
    
    @Operation(
        summary = "내부 송금",
        description = "플랫폼 내 사용자 간 송금을 즉시 처리합니다. 블록체인 트랜잭션 없이 DB에서 잔액만 이동되며, 즉시 COMPLETED 상태로 반영됩니다."
    )
    @PostMapping("/internal-transfer")
    public ApiResponse<Transaction> internalTransfer(
            @RequestParam Long fromUserId,
            @Valid @RequestBody InternalTransferRequest request) {
        Transaction transaction = transactionService.internalTransfer(fromUserId, request);
        return ApiResponse.success("송금이 완료되었습니다", transaction);
    }
    
    @Operation(
        summary = "사용자 거래 내역 조회",
        description = "특정 사용자의 모든 거래 내역을 페이지네이션으로 조회합니다. 출금, 입금, 내부 송금 등 모든 거래 유형이 포함됩니다."
    )
    @GetMapping("/user/{userId}")
    public ApiResponse<Page<Transaction>> getUserTransactions(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Transaction> transactions = transactionService.getUserTransactions(userId, pageable);
        return ApiResponse.success(transactions);
    }
    
    @Operation(
        summary = "거래 상세 조회",
        description = "거래 ID로 특정 거래의 상세 정보를 조회합니다."
    )
    @GetMapping("/{transactionId}")
    public ApiResponse<Transaction> getTransaction(@PathVariable Long transactionId) {
        Transaction transaction = transactionService.getTransactionById(transactionId);
        return ApiResponse.success(transaction);
    }
}
