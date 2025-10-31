-- V1__Initial_Schema.sql

-- 사용자 테이블
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    kyc_status VARCHAR(20) DEFAULT 'PENDING' CHECK (kyc_status IN ('PENDING', 'APPROVED', 'REJECTED')),
    two_factor_secret VARCHAR(255),
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'CLOSED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 지갑 테이블
CREATE TABLE wallets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address VARCHAR(44) UNIQUE NOT NULL,  -- Solana 주소는 Base58, 32-44자
    private_key_encrypted TEXT NOT NULL,
    derivation_path VARCHAR(100),
    wallet_type VARCHAR(20) DEFAULT 'USER' CHECK (wallet_type IN ('USER', 'HOT', 'COLD')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_wallets_address ON wallets(address);

-- 잔액 테이블 (토큰별)
CREATE TABLE balances (
    id BIGSERIAL PRIMARY KEY,
    wallet_id BIGINT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    token_mint VARCHAR(44) NOT NULL,  -- SOL은 'SOL', SPL 토큰은 mint address
    token_symbol VARCHAR(10) NOT NULL,
    available_balance DECIMAL(36, 18) DEFAULT 0 NOT NULL,
    locked_balance DECIMAL(36, 18) DEFAULT 0 NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_wallet_token UNIQUE (wallet_id, token_mint)
);

CREATE INDEX idx_balances_wallet_id ON balances(wallet_id);

-- 트랜잭션 테이블
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id),
    wallet_id BIGINT NOT NULL REFERENCES wallets(id),
    tx_type VARCHAR(20) NOT NULL CHECK (tx_type IN ('DEPOSIT', 'WITHDRAW', 'INTERNAL_TRANSFER', 'SWAP')),
    tx_hash VARCHAR(88),  -- Solana signature
    from_address VARCHAR(44),
    to_address VARCHAR(44),
    token_mint VARCHAR(44) NOT NULL,
    token_symbol VARCHAR(10) NOT NULL,
    amount DECIMAL(36, 18) NOT NULL,
    fee DECIMAL(36, 18) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    confirmations INT DEFAULT 0,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_tx_hash ON transactions(tx_hash);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

-- 출금 승인 큐 테이블
CREATE TABLE withdrawal_queue (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users(id),
    amount DECIMAL(36, 18) NOT NULL,
    token_symbol VARCHAR(10) NOT NULL,
    to_address VARCHAR(44) NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'COMPLETED')),
    approved_by BIGINT REFERENCES users(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_withdrawal_queue_status ON withdrawal_queue(status);
CREATE INDEX idx_withdrawal_queue_user_id ON withdrawal_queue(user_id);

-- Swap 기록 테이블
CREATE TABLE swaps (
    id BIGSERIAL PRIMARY KEY,
    transaction_id BIGINT NOT NULL REFERENCES transactions(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    from_token VARCHAR(44) NOT NULL,
    to_token VARCHAR(44) NOT NULL,
    from_amount DECIMAL(36, 18) NOT NULL,
    to_amount DECIMAL(36, 18) NOT NULL,
    rate DECIMAL(36, 18) NOT NULL,
    slippage_tolerance DECIMAL(5, 2) NOT NULL,
    jupiter_route JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_swaps_user_id ON swaps(user_id);
CREATE INDEX idx_swaps_transaction_id ON swaps(transaction_id);

-- 감사 로그 테이블
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id BIGINT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- 블록 스캔 진행 상황 테이블
CREATE TABLE block_scan_progress (
    id SERIAL PRIMARY KEY,
    last_scanned_slot BIGINT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 초기 데이터
INSERT INTO block_scan_progress (last_scanned_slot) VALUES (0);
