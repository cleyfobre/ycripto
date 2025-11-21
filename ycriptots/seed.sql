-- ===========================================
-- 샘플 데이터 삽입
-- ===========================================

-- 1. 코인 정보
INSERT INTO coins (symbol, name, network, contract_address, decimals, min_confirmations, is_active) VALUES
('SOL', 'Solana', 'solana', NULL, 9, 60, true),
('USDT', 'Tether USD', 'solana', 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', 6, 60, true);

-- 2. 사용자 입금 지갑 (user_id = 1, SOL 전용)
INSERT INTO deposit_wallets (user_id, coin_id, address, private_key_encrypted, last_checked_slot, status) VALUES
(1, (SELECT id FROM coins WHERE symbol = 'SOL'), 'Ez6AzGpxYpock6CDW3FruUKvBZXHBLka87tLbZsbCbbH', '5uuDynEagoD66d1BHY7B7EMBzN85kzTePzxT7F1vbcoRdDNJuyoaW2JKxzSGwK3Bno19ebvDJq52WGrbW7AFGiY3', 0, 1);
