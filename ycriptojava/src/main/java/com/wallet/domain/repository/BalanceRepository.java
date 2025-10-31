package com.wallet.domain.repository;

import com.wallet.domain.entity.Balance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface BalanceRepository extends JpaRepository<Balance, Long> {
    Optional<Balance> findByWalletIdAndTokenMint(Long walletId, String tokenMint);
    List<Balance> findByWalletId(Long walletId);
}
