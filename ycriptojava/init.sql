-- init.sql
-- Docker 컨테이너 시작 시 자동 실행되는 초기화 스크립트

-- 타임존 설정
SET timezone = 'Asia/Seoul';

-- 데이터베이스 확인
SELECT version();

-- 연결 테스트
\echo 'PostgreSQL initialized successfully for Solana Wallet System'
