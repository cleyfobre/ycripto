-- ===========================================
-- 코인 정보 테이블
-- 시스템에서 지원하는 암호화폐 목록
-- ===========================================
CREATE TABLE coin (
    id SERIAL PRIMARY KEY,                    -- 코인 고유 ID
    symbol VARCHAR(10) UNIQUE NOT NULL,       -- 코인 심볼 (USDT, USDC, SOL, BTC, XRP)
    name VARCHAR(50) NOT NULL,                -- 코인 전체 이름 (Tether USD, Solana)
    network VARCHAR(20) NOT NULL,             -- 블록체인 네트워크 (solana, ethereum, bitcoin, ripple)
    contract_address VARCHAR(100),            -- 토큰 컨트랙트 주소 (네이티브 코인은 NULL, USDT 등 토큰은 주소 필요)
    decimals INT NOT NULL,                    -- 소수점 자릿수 (SOL=9, USDT=6, BTC=8)
    min_confirmations INT NOT NULL,           -- 입금 확정에 필요한 최소 블록 확인 수 (SOL=60, ETH=12, BTC=6)
    is_active SMALLINT DEFAULT 1,             -- 코인 활성화 여부 (1=active, 0=inactive)
    updated_at TIMESTAMP DEFAULT NOW(),       -- 레코드 수정 시각
    created_at TIMESTAMP DEFAULT NOW()        -- 레코드 생성 시각
);
CREATE UNIQUE INDEX idx_coin_symbol_network ON coin(symbol, network);


-- ===========================================
-- 사용자 잔액 테이블
-- ===========================================
CREATE TABLE user_balance (
    id BIGSERIAL PRIMARY KEY,                 -- 레코드 고유 ID
    member_id BIGINT NOT NULL,                -- 사용자 ID
    coin_id INT NOT NULL,-- 코인 ID
    balance DECIMAL(36,18) NOT NULL DEFAULT 0,-- 현재 사용 가능한 잔액
    updated_at TIMESTAMP DEFAULT NOW(),       -- 레코드 수정 시각
    created_at TIMESTAMP DEFAULT NOW(),       -- 레코드 생성 시각
    UNIQUE(member_id, coin_id)                  
);
CREATE INDEX idx_user_balance_member_id ON user_balance(member_id);
CREATE INDEX idx_user_balance_coin_id ON user_balance(coin_id);


-- ===========================================
-- 입금용 지갑 주소 테이블
-- 사용자별 코인 입금 주소 관리
-- ===========================================
CREATE TABLE deposit_wallet (
    id BIGSERIAL PRIMARY KEY,                      -- 레코드 고유 ID
    member_id BIGINT NOT NULL,                     -- 사용자 ID
    coin_id INT NOT NULL,     -- 코인 ID
    address VARCHAR(100) NOT NULL,                 -- 블록체인 지갑 주소 (입금용)
    private_key_encrypted VARCHAR(100) NOT NULL,   -- 암호화된 개인키 (출금 서명용, AES 등으로 암호화)
    last_checked_slot BIGINT DEFAULT 0,            -- 마지막으로 확인한 블록/슬롯 번호 (입금 모니터링용)
    last_checked_signature VARCHAR(100),           -- 마지막으로 확인한 트랜잭션 signature (until 파라미터용)
    status SMALLINT DEFAULT 1,                     -- 지갑 상태 (1=active, 2=inactive)
    updated_at TIMESTAMP DEFAULT NOW(),            -- 레코드 수정 시각
    created_at TIMESTAMP DEFAULT NOW(),            -- 레코드 생성 시각
    UNIQUE(member_id, coin_id)                       
);
CREATE INDEX idx_deposit_wallet_address ON deposit_wallet(address);
CREATE INDEX idx_deposit_wallet_user_coin ON deposit_wallet(member_id, coin_id);


-- ===========================================
-- 온체인 거래내역 테이블
-- 블록체인에서 발생한 모든 입출금 기록
-- ===========================================
CREATE TABLE onchain_transaction (
    id BIGSERIAL PRIMARY KEY,                      -- 레코드 고유 ID
    member_id BIGINT NOT NULL,                     -- 사용자 ID
    coin_id INT NOT NULL,     -- 코인 ID
    tx_hash VARCHAR(100) NOT NULL,                 -- 블록체인 트랜잭션 해시 (고유 식별자)
    from_address VARCHAR(100) NOT NULL,            -- 송신 지갑 주소
    to_address VARCHAR(100) NOT NULL,              -- 수신 지갑 주소
    amount DECIMAL(36,18) NOT NULL,                -- 거래 금액
    type SMALLINT NOT NULL,                        -- 거래 유형 (1=deposit, 2=withdraw)
    status SMALLINT NOT NULL,                      -- 거래 상태 (1=pending, 2=confirmed, 3=failed)
    confirmations INT DEFAULT 0,                   -- 현재 블록 확인 수 (min_confirmations 도달 시 confirmed)
    block_number BIGINT,                           -- 트랜잭션이 포함된 블록 번호 (Solana는 slot)
    updated_at TIMESTAMP DEFAULT NOW(),            -- 레코드 수정 시각
    created_at TIMESTAMP DEFAULT NOW(),            -- 레코드 생성 시각
    confirmed_at TIMESTAMP,                        -- 트랜잭션 최종 확정 시각
    memo VARCHAR(100),                             -- 메모 (에러 메시지, 사용자 메모 등)
    UNIQUE(tx_hash)                                -- 트랜잭션 해시는 유일해야 함
);
CREATE INDEX idx_onchain_tx_user_coin ON onchain_transaction(member_id, coin_id);
CREATE INDEX idx_onchain_tx_hash ON onchain_transaction(tx_hash);
CREATE INDEX idx_onchain_to_address ON onchain_transaction(to_address);
CREATE INDEX idx_onchain_status ON onchain_transaction(status);


-- ===========================================
-- 내부 거래내역 테이블
-- 플랫폼 내 사용자 간 코인 전송 기록
-- ===========================================
CREATE TABLE internal_transaction (
    id BIGSERIAL PRIMARY KEY,                      -- 레코드 고유 ID
    from_member_id BIGINT NOT NULL,                -- 송신자 사용자 ID
    to_member_id BIGINT NOT NULL,                  -- 수신자 사용자 ID
    coin_id INT NOT NULL,     -- 코인 ID
    amount DECIMAL(36,18) NOT NULL,                -- 전송 금액
    status SMALLINT DEFAULT 2,                     -- 거래 상태 (1=pending, 2=completed, 3=failed)
    updated_at TIMESTAMP DEFAULT NOW(),            -- 레코드 수정 시각
    created_at TIMESTAMP DEFAULT NOW()             -- 레코드 생성 시각
);
CREATE INDEX idx_internal_tx_from ON internal_transaction(from_member_id);
CREATE INDEX idx_internal_tx_to ON internal_transaction(to_member_id);
CREATE INDEX idx_internal_tx_coin ON internal_transaction(coin_id);
