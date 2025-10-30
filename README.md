# Solana USDT 지갑 시스템 실행 가이드

## 🌟 왜 솔라나?

### 이더리움 vs 솔라나 비교
| 항목 | 이더리움 | 솔라나 |
|------|---------|--------|
| 트랜잭션 속도 | 15 TPS | 65,000 TPS |
| 평균 수수료 | $5-50 | $0.00025 |
| 컨펌 시간 | 1-5분 | 0.4초 |
| USDT 표준 | ERC-20 | SPL Token |

✅ **솔라나 선택 이유**: 빠르고 저렴하며 실시간 송금에 최적

## 1. 사전 준비

### PostgreSQL 설치
```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 데이터베이스 생성
```bash
psql -U postgres

CREATE DATABASE usdt_wallet;
\c usdt_wallet
\i /path/to/schema.sql
```

### Solana RPC 엔드포인트

**추천 무료 RPC:**
1. **Helius** (추천): https://www.helius.dev/
   - 무료 티어: 100 req/sec
   - URL: `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY`

2. **공식 RPC**: https://api.mainnet-beta.solana.com
   - 무료지만 느림

3. **QuickNode**: https://www.quicknode.com/
   - 무료 티어 제공

## 2. 프로젝트 설정

```bash
# 의존성 설치
npm install

# .env 파일 설정
nano .env
```

### .env 필수 설정
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=usdt_wallet
DB_USER=postgres
DB_PASSWORD=your_password

# Solana RPC (메인넷)
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY

# 또는 데브넷 테스트
# SOLANA_RPC_URL=https://api.devnet.solana.com

JWT_SECRET=random_secure_string_min_32_chars
```

## 3. 실행

### 개발 모드
```bash
npm run dev
```

### 프로덕션
```bash
npm run build
npm start
```

## 4. API 테스트

### 헬스 체크
```bash
curl http://localhost:3000/health
```

**응답:**
```json
{
  "status": "ok",
  "network": "Solana",
  "timestamp": "2025-10-30T12:00:00.000Z"
}
```

### 사용자 생성 + 솔라나 지갑 자동 생성
```bash
curl -X POST http://localhost:3000/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "securePassword123!",
    "name": "홍길동",
    "phone": "010-1234-5678"
  }'
```

**응답 예시:**
```json
{
  "success": true,
  "userId": 1,
  "walletAddress": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "network": "Solana"
}
```

### 지갑 조회
```bash
curl http://localhost:3000/api/users/1/wallet
```

### 실시간 잔액 조회 (SOL + USDT)
```bash
curl http://localhost:3000/api/wallets/7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU/balance
```

**응답 예시:**
```json
{
  "success": true,
  "address": "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
  "balances": {
    "sol": "0.05",
    "usdt": "100.50"
  },
  "network": "Solana"
}
```

### DB 잔액 동기화
```bash
curl -X POST http://localhost:3000/api/wallets/1/sync
```

### 트랜잭션 상태 확인
```bash
curl http://localhost:3000/api/transactions/5wHu1qwD...signature
```

## 5. 솔라나 지갑 테스트

### Phantom 지갑으로 입금 테스트
1. Phantom 지갑 설치: https://phantom.app/
2. 생성된 지갑 주소로 USDT 전송
3. `/api/wallets/{walletId}/sync` 호출로 잔액 확인

### 데브넷에서 테스트
```bash
# .env에서 데브넷 RPC 사용
SOLANA_RPC_URL=https://api.devnet.solana.com

# 무료 SOL 받기 (데브넷)
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

## 6. 솔라나 USDT 정보

### USDT Contract 주소 (Mainnet)
```
Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
```

### USDT 특징
- **표준**: SPL Token
- **Decimals**: 6
- **발행자**: Tether (Circle 아님)
- **Solscan 확인**: https://solscan.io/token/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB

## 7. 보안 체크리스트

### 🔴 절대 공개 금지
- ✅ MASTER_SEED (24 단어 니모닉)
- ✅ Private Keys (Base58 인코딩)
- ✅ JWT_SECRET
- ✅ DB 비밀번호

### 🟢 프로덕션 필수 조치
- ✅ AWS KMS로 마스터 시드 암호화
- ✅ Private Key 로그 출력 금지
- ✅ HTTPS 필수
- ✅ Rate Limiting
- ✅ 방화벽 설정

## 8. 솔라나 특수 사항

### Associated Token Account (ATA)
- 각 사용자는 USDT를 받기 위한 ATA가 필요
- 첫 입금 시 ATA 생성 비용: ~0.002 SOL
- 시스템에서 자동 생성됨

### 가스비 (SOL)
- 모든 트랜잭션에 SOL 필요
- 평균 0.000005 SOL per transaction
- Hot Wallet에 충분한 SOL 보유 필수

### 추천 아키텍처
```
사용자 지갑 (입금 전용)
    ↓ 입금 감지
Hot Wallet (출금 전용)
    ↓ 출금 실행
수취인 지갑
```

## 9. 다음 단계

이제 기본 지갑 시스템이 완성되었습니다!

### 다음 구현 예정:
1. ✅ Solana HD Wallet 생성 (완료)
2. ⏳ 입금 모니터링 (WebSocket)
3. ⏳ 내부 송금 (DB 트랜잭션)
4. ⏳ 출금 시스템 (Hot Wallet)
5. ⏳ 2FA 인증

## 10. 유용한 링크

- Solana Docs: https://docs.solana.com/
- SPL Token: https://spl.solana.com/token
- Solscan Explorer: https://solscan.io/
- Phantom Wallet: https://phantom.app/
- Helius RPC: https://www.helius.dev/

## 트러블슈팅

### "Account not found" 에러
→ 해당 지갑에 USDT ATA가 없음 (입금 필요)

### RPC 연결 실패
→ RPC URL 확인 또는 무료 RPC 제한 확인

### 트랜잭션 실패
→ SOL 잔액 부족 (가스비)