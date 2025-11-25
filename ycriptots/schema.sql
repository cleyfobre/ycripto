-- ===========================================
-- 코인 정보 테이블
-- 시스템에서 지원하는 암호화폐 목록
-- ===========================================
CREATE TABLE coins (
    id SERIAL PRIMARY KEY,                    -- 코인 고유 ID
    symbol VARCHAR(10) UNIQUE NOT NULL,       -- 코인 심볼 (USDT, USDC, SOL, BTC, XRP)
    name VARCHAR(50) NOT NULL,                -- 코인 전체 이름 (Tether USD, Solana)
    network VARCHAR(20) NOT NULL,             -- 블록체인 네트워크 (solana, ethereum, bitcoin, ripple)
    contract_address VARCHAR(100),            -- 토큰 컨트랙트 주소 (네이티브 코인은 NULL, USDT 등 토큰은 주소 필요)
    decimals INT NOT NULL,                    -- 소수점 자릿수 (SOL=9, USDT=6, BTC=8)
    min_confirmations INT NOT NULL,           -- 입금 확정에 필요한 최소 블록 확인 수 (SOL=60, ETH=12, BTC=6)
    is_active BOOLEAN DEFAULT true,           -- 코인 활성화 여부 (false면 입출금 중단)
    updated_at TIMESTAMP DEFAULT NOW(),       -- 레코드 수정 시각
    created_at TIMESTAMP DEFAULT NOW()        -- 레코드 생성 시각
);
-- 예시 데이터
-- INSERT INTO coins VALUES (1, 'USDT', 'Tether USD', 'solana', 'Es9v...', 6, 60, true);
-- INSERT INTO coins VALUES (2, 'SOL', 'Solana', 'solana', NULL, 9, 60, true);
CREATE UNIQUE INDEX idx_coins_symbol_network ON coins(symbol, network);


-- ===========================================
-- 사용자 잔액 테이블
-- 각 사용자의 코인별 보유 잔액
-- ===========================================
CREATE TABLE user_balances (
    id BIGSERIAL PRIMARY KEY,                 -- 레코드 고유 ID
    user_id BIGINT NOT NULL,                  -- 사용자 ID (Auth 서비스에서 관리)
    coin_id INT NOT NULL REFERENCES coins(id),-- 코인 ID (coins 테이블 참조)
    balance DECIMAL(36,18) NOT NULL DEFAULT 0,-- 현재 사용 가능한 잔액
    updated_at TIMESTAMP DEFAULT NOW(),       -- 잔액 마지막 업데이트 시각
    created_at TIMESTAMP DEFAULT NOW(),       -- 레코드 생성 시각
    UNIQUE(user_id, coin_id)                  -- 사용자당 코인별 1개 레코드만 존재
);
CREATE INDEX idx_user_balances_user_id ON user_balances(user_id);
CREATE INDEX idx_user_balances_coin_id ON user_balances(coin_id);


-- ===========================================
-- 입금용 지갑 주소 테이블
-- 사용자별 코인 입금 주소 관리
-- ===========================================
CREATE TABLE deposit_wallets (
    id BIGSERIAL PRIMARY KEY,                      -- 레코드 고유 ID
    user_id BIGINT NOT NULL,                       -- 사용자 ID (Auth 서비스에서 관리)
    coin_id INT NOT NULL REFERENCES coins(id),     -- 코인 ID (coins 테이블 참조)
    address VARCHAR(100) NOT NULL,                 -- 블록체인 지갑 주소 (입금용)
    private_key_encrypted VARCHAR(100) NOT NULL,   -- 암호화된 개인키 (출금 서명용, AES 등으로 암호화)
    last_checked_slot BIGINT DEFAULT 0,            -- 마지막으로 확인한 블록/슬롯 번호 (입금 모니터링용)
    last_checked_signature VARCHAR(100),           -- 마지막으로 확인한 트랜잭션 signature (until 파라미터용)
    status SMALLINT DEFAULT 1,                     -- 지갑 상태 (1=active, 2=inactive, 3=compromised)
    updated_at TIMESTAMP DEFAULT NOW(),            -- 레코드 수정 시각
    created_at TIMESTAMP DEFAULT NOW(),            -- 지갑 생성 시각
    UNIQUE(user_id, coin_id)                       -- 사용자당 코인별 1개 지갑만 존재
);
CREATE INDEX idx_deposit_wallets_address ON deposit_wallets(address);
CREATE INDEX idx_deposit_wallets_user_coin ON deposit_wallets(user_id, coin_id);


-- ===========================================
-- 온체인 거래내역 테이블
-- 블록체인에서 발생한 모든 입출금 기록
-- ===========================================
CREATE TABLE onchain_transactions (
    id BIGSERIAL PRIMARY KEY,                      -- 레코드 고유 ID
    user_id BIGINT NOT NULL,                       -- 사용자 ID (Auth 서비스에서 관리)
    coin_id INT NOT NULL REFERENCES coins(id),     -- 코인 ID (coins 테이블 참조)
    tx_hash VARCHAR(100) NOT NULL,                 -- 블록체인 트랜잭션 해시 (고유 식별자)
    from_address VARCHAR(100) NOT NULL,            -- 송신 지갑 주소
    to_address VARCHAR(100) NOT NULL,              -- 수신 지갑 주소
    amount DECIMAL(36,18) NOT NULL,                -- 거래 금액
    type SMALLINT NOT NULL,                        -- 거래 유형 (1=deposit, 2=withdraw, 3=sweep)
    status SMALLINT NOT NULL,                      -- 거래 상태 (1=pending, 2=confirmed, 3=failed)
    confirmations INT DEFAULT 0,                   -- 현재 블록 확인 수 (min_confirmations 도달 시 confirmed)
    block_number BIGINT,                           -- 트랜잭션이 포함된 블록 번호 (Solana는 slot)
    updated_at TIMESTAMP DEFAULT NOW(),            -- 레코드 수정 시각
    created_at TIMESTAMP DEFAULT NOW(),            -- 트랜잭션 감지/생성 시각
    confirmed_at TIMESTAMP,                        -- 트랜잭션 최종 확정 시각
    memo VARCHAR(100),                             -- 메모 (에러 메시지, 사용자 메모 등)
    UNIQUE(tx_hash)                                -- 트랜잭션 해시는 유일해야 함
);
CREATE INDEX idx_onchain_tx_user_coin ON onchain_transactions(user_id, coin_id);
CREATE INDEX idx_onchain_tx_hash ON onchain_transactions(tx_hash);
CREATE INDEX idx_onchain_to_address ON onchain_transactions(to_address);
CREATE INDEX idx_onchain_status ON onchain_transactions(status);


-- ===========================================
-- 내부 거래내역 테이블
-- 플랫폼 내 사용자 간 코인 전송 기록
-- ===========================================
CREATE TABLE internal_transactions (
    id BIGSERIAL PRIMARY KEY,                      -- 레코드 고유 ID
    from_user_id BIGINT NOT NULL,                  -- 송신자 사용자 ID
    to_user_id BIGINT NOT NULL,                    -- 수신자 사용자 ID
    coin_id INT NOT NULL REFERENCES coins(id),     -- 코인 ID (coins 테이블 참조)
    amount DECIMAL(36,18) NOT NULL,                -- 전송 금액
    status SMALLINT DEFAULT 2,                     -- 거래 상태 (1=pending, 2=completed, 3=failed)
    updated_at TIMESTAMP DEFAULT NOW(),            -- 레코드 수정 시각
    created_at TIMESTAMP DEFAULT NOW()             -- 거래 생성 시각
);
CREATE INDEX idx_internal_tx_from ON internal_transactions(from_user_id);
CREATE INDEX idx_internal_tx_to ON internal_transactions(to_user_id);
CREATE INDEX idx_internal_tx_coin ON internal_transactions(coin_id);
