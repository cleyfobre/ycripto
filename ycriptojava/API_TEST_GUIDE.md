# 🧪 API 테스트 가이드

## 🚀 서버 실행

```powershell
# Docker 시작
docker-compose up -d

# Spring Boot 실행
.\gradlew.bat bootRun
```

서버 실행 후 http://localhost:8080 접속 가능

---

## 📡 API 엔드포인트

### 1. Health Check

```bash
GET http://localhost:8080/api/health
```

**응답:**
```json
{
  "status": "UP",
  "network": "devnet",
  "solanaConnected": true,
  "currentSlot": 123456789
}
```

---

### 2. 사용자 등록 (자동으로 지갑 생성됨)

```bash
POST http://localhost:8080/api/users/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "홍길동",
  "phone": "010-1234-5678"
}
```

**응답:**
```json
{
  "success": true,
  "message": "회원가입이 완료되었습니다",
  "data": {
    "id": 1,
    "email": "user@example.com",
    "name": "홍길동",
    "kycStatus": "PENDING",
    "status": "ACTIVE"
  }
}
```

---

### 3. 사용자 정보 조회

```bash
GET http://localhost:8080/api/users/1
```

---

### 4. 지갑 조회

```bash
GET http://localhost:8080/api/wallets/user/1
```

**응답:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "walletId": 1,
    "address": "8xK7PqR9fGH2mNvT...",
    "balances": {
      "SOL": "0"
    }
  }
}
```

---

### 5. 출금 요청

```bash
POST http://localhost:8080/api/transactions/withdraw?userId=1
Content-Type: application/json

{
  "toAddress": "받는사람Solana주소",
  "amount": "1.5",
  "tokenSymbol": "SOL"
}
```

**응답:**
```json
{
  "success": true,
  "message": "출금 요청이 접수되었습니다",
  "data": {
    "id": 1,
    "txType": "WITHDRAW",
    "amount": 1.5,
    "status": "PENDING",
    "toAddress": "..."
  }
}
```

---

### 6. 내부 송금 (즉시 반영)

```bash
POST http://localhost:8080/api/transactions/internal-transfer?fromUserId=1
Content-Type: application/json

{
  "toUserId": 2,
  "amount": "10",
  "tokenSymbol": "SOL"
}
```

**응답:**
```json
{
  "success": true,
  "message": "송금이 완료되었습니다",
  "data": {
    "id": 2,
    "txType": "INTERNAL_TRANSFER",
    "amount": 10,
    "status": "COMPLETED"
  }
}
```

---

### 7. 거래 내역 조회

```bash
GET http://localhost:8080/api/transactions/user/1?page=0&size=20
```

**응답:**
```json
{
  "success": true,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": 1,
        "txType": "WITHDRAW",
        "amount": 1.5,
        "status": "PENDING",
        "createdAt": "2024-11-01T12:00:00"
      }
    ],
    "totalElements": 1,
    "totalPages": 1,
    "number": 0
  }
}
```

---

## 🧪 Postman 컬렉션 순서

### 시나리오 1: 기본 흐름

1. **Health Check** - 서버 정상 동작 확인
2. **사용자 등록** (User A) - 자동으로 지갑 생성됨
3. **사용자 등록** (User B)
4. **지갑 조회** (User A) - Solana 주소 확인
5. **지갑 조회** (User B)

### 시나리오 2: 수동 잔액 추가 (테스트용)

DB에 직접 잔액 추가:
```sql
-- PostgreSQL에 접속
docker exec -it solana-wallet-postgres psql -U postgres -d solana_wallet_db

-- User 1의 지갑에 SOL 100개 추가
UPDATE balances 
SET available_balance = 100 
WHERE wallet_id = 1 AND token_symbol = 'SOL';
```

### 시나리오 3: 내부 송금

6. **내부 송금** (User A → User B, 10 SOL)
7. **지갑 조회** (User A) - 잔액 90 SOL 확인
8. **지갑 조회** (User B) - 잔액 10 SOL 확인
9. **거래 내역 조회** (User A)

### 시나리오 4: 출금

10. **출금 요청** (User A, 5 SOL)
11. **거래 내역 조회** - PENDING 상태 확인

---

## 🛠️ Swagger UI

브라우저에서 접속:
```
http://localhost:8080/swagger-ui.html
```

모든 API를 웹에서 테스트 가능!

---

## 💡 주요 기능

✅ **완료된 기능:**
1. 사용자 등록 (자동 지갑 생성)
2. 지갑 조회 및 잔액 확인
3. 내부 송금 (즉시 반영, 블록체인 불필요)
4. 출금 요청 (대기 상태)
5. 거래 내역 조회

⏳ **미구현 (추후):**
- 입금 모니터링 (Solana 네트워크 스캔)
- 출금 실제 처리 (Solana 트랜잭션 브로드캐스트)
- Swap (Jupiter API)
- JWT 인증
- 2FA

---

## 🔍 데이터베이스 확인

```bash
# PostgreSQL 접속
docker exec -it solana-wallet-postgres psql -U postgres -d solana_wallet_db

# 테이블 확인
\dt

# 사용자 목록
SELECT * FROM users;

# 지갑 목록
SELECT * FROM wallets;

# 잔액 확인
SELECT * FROM balances;

# 거래 내역
SELECT * FROM transactions;
```

---

## ⚠️ 주의사항

1. **Security 비활성화**: 현재 모든 API가 인증 없이 접근 가능 (개발용)
2. **비밀번호 평문 저장**: BCrypt 암호화 미적용 (TODO)
3. **출금 미처리**: 출금 요청만 DB에 저장, 실제 Solana 전송 안 됨
4. **입금 모니터링 없음**: 외부에서 입금해도 감지 안 됨

---

## 🎯 다음 단계

1. **입금 모니터링 스케줄러** 구현
2. **출금 프로세싱** 구현 (Solana 트랜잭션)
3. **JWT 인증** 추가
4. **Swap 기능** (Jupiter API)
