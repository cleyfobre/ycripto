package com.wallet.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(name = "wallet_id", nullable = false)
    private Long walletId;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "tx_type", nullable = false)
    private TransactionType txType;
    
    @Column(name = "tx_hash", length = 88)
    private String txHash;
    
    @Column(name = "from_address", length = 44)
    private String fromAddress;
    
    @Column(name = "to_address", length = 44)
    private String toAddress;
    
    @Column(name = "token_mint", nullable = false, length = 44)
    private String tokenMint;
    
    @Column(name = "token_symbol", nullable = false, length = 10)
    private String tokenSymbol;
    
    @Column(nullable = false, precision = 36, scale = 18)
    private BigDecimal amount;
    
    @Column(precision = 36, scale = 18)
    private BigDecimal fee = BigDecimal.ZERO;
    
    @Enumerated(EnumType.STRING)
    private TransactionStatus status = TransactionStatus.PENDING;
    
    @Column(columnDefinition = "INT DEFAULT 0")
    private Integer confirmations = 0;
    
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;
    
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    public enum TransactionType {
        DEPOSIT, WITHDRAW, INTERNAL_TRANSFER, SWAP
    }
    
    public enum TransactionStatus {
        PENDING, CONFIRMING, COMPLETED, FAILED, CANCELLED
    }
}
