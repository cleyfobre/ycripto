package com.wallet.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "balances")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Balance {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "wallet_id", nullable = false)
    private Long walletId;
    
    @Column(name = "token_mint", nullable = false, length = 44)
    private String tokenMint;
    
    @Column(name = "token_symbol", nullable = false, length = 10)
    private String tokenSymbol;
    
    @Column(name = "available_balance", nullable = false, precision = 36, scale = 18)
    private BigDecimal availableBalance = BigDecimal.ZERO;
    
    @Column(name = "locked_balance", nullable = false, precision = 36, scale = 18)
    private BigDecimal lockedBalance = BigDecimal.ZERO;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
