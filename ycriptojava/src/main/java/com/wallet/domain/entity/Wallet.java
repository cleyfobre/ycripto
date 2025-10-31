package com.wallet.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "wallets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Wallet {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "user_id", nullable = false)
    private Long userId;
    
    @Column(unique = true, nullable = false, length = 44)
    private String address;
    
    @Column(name = "private_key_encrypted", nullable = false, columnDefinition = "TEXT")
    private String privateKeyEncrypted;
    
    @Column(name = "derivation_path", length = 100)
    private String derivationPath;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "wallet_type")
    private WalletType walletType = WalletType.USER;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
    
    public enum WalletType {
        USER, HOT, COLD
    }
}
