# 🚀 Solana Wallet System

Spring Boot 기반 Solana Wallet 입출금·송금·Swap 시스템 (2주 MVP)

## 📋 기술 스택

- **Backend**: Spring Boot 3.2, Java 21
- **Database**: PostgreSQL 15+, Redis
- **Blockchain**: Solana Devnet (solanaj SDK)
- **Security**: JWT, 2FA, AES-256-GCM
- **Build**: Gradle 8.13
- **Monitoring**: Actuator, Prometheus, Grafana

## 🎯 핵심 기능

1. ✅ **사용자별 Solana 지갑 생성** (Account 기반)
2. ⏳ **입금 모니터링** (RPC 폴링)
3. ⏳ **USDT/SPL 토큰 출금**
4. ⏳ **내부 사용자간 즉시 송금** (Off-chain)
5. ⏳ **Swap** (Jupiter API 연동)

## 📁 프로젝트 구조

```
solana-wallet-system/
├── src/main/java/com/wallet/
│   ├── SolanaWalletApplication.java    # 메인 클래스
│   ├── config/
│   │   └── SolanaConfig.java           # Solana RPC/WebSocket 설정
│   ├── domain/
│   │   ├── entity/                     # JPA 엔티티
│   │   │   ├── User.java
│   │   │   ├── Wallet.java
│   │   │   ├── Transaction.java
│   │   │   └── Balance.java
│   │   └── repository/                 # JPA Repository
│   ├── service/                        # 비즈니스 로직
│   │   ├── WalletService.java
│   │   └── impl/
│   │       └── WalletServiceImpl.java
│   ├── controller/                     # REST API
│   │   └── HealthController.java
│   └── util/
│       └── EncryptionUtil.java         # AES 암호화
├── src/main/resources/
│   ├── application.yml                 # 설정 파일
│   └── db/migration/
│       └── V1__Initial_Schema.sql      # Flyway 마이그레이션
├── build.gradle                        # Gradle 빌드 설정
└── README.md
```

## 🚀 시작하기

### 1. 사전 준비

```bash
# Java 21 설치
java -version

# PostgreSQL 15+ 설치 및 실행
createdb solana_wallet_db

# Redis 설치 및 실행
redis-server
```

### 2. Solana CLI 설정 (Devnet)

```bash
# Solana CLI 설치
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Devnet 연결
solana config set --url https://api.devnet.solana.com

# 테스트 지갑 생성
solana-keygen new --outfile ~/.config/solana/devnet.json

# Airdrop (테스트용 SOL 받기)
solana airdrop 2

# 잔액 확인
solana balance
```

### 3. 프로젝트 실행

```bash
# 빌드
./gradlew clean build

# 실행
./gradlew bootRun
```

### 4. API 테스트

```bash
# Health Check
curl http://localhost:8080/api/health

# Swagger UI
http://localhost:8080/swagger-ui.html
```

## 📊 데이터베이스 스키마

### 핵심 테이블

- **users**: 사용자 정보 (KYC, 2FA 포함)
- **wallets**: Solana 지갑 (암호화된 Private Key)
- **balances**: 토큰별 잔액 (available + locked)
- **transactions**: 모든 거래 내역 (입출금, 송금, Swap)
- **withdrawal_queue**: 출금 승인 큐
- **swaps**: Swap 거래 상세
- **audit_logs**: 감사 로그

## 🗓️ 2주 개발 커리큘럼

### Week 1: Wallet 백엔드 완성
- Day 1: Solana 기본 구조 이해
- Day 2: 프로젝트 스캐폴드 ✅
- Day 3: Wallet 엔티티 & DB 설계 ✅
- Day 4: 입금 리스너 구현
- Day 5: 출금 트랜잭션 생성
- Day 6: 내부 송금 (Off-chain)
- Day 7: 테스트 & 모니터링

### Week 2: Swap, 보안, 운영 고도화
- Day 8: Jupiter API 이해
- Day 9: Swap 실행 API 구현
- Day 10: 보안 구조 정리
- Day 11: 사용자 알림 및 상태 조회
- Day 12: 관리자 콘솔용 API
- Day 13: 통합 시나리오 테스트
- Day 14: 문서화 + 정리

## 🔐 보안 요구사항

- [x] Private Key AES-256-GCM 암호화
- [ ] AWS KMS 연동 (TODO)
- [x] 모든 금융 트랜잭션 DB 로깅
- [ ] 출금 시 2FA 필수
- [x] ACID 트랜잭션 보장

## 📝 TODO

- [ ] JWT 인증 구현
- [ ] 입금 모니터링 스케줄러
- [ ] 출금 API 구현
- [ ] 내부 송금 API
- [ ] Jupiter Swap API 연동
- [ ] 2FA 구현
- [ ] KYC/AML 시스템
- [ ] 관리자 대시보드

## 🌐 참고 링크

- [Solana Docs](https://docs.solana.com/)
- [solanaj SDK](https://github.com/skynetcap/solanaj)
- [Jupiter API](https://station.jup.ag/docs/apis/swap-api)
- [Solana Explorer (Devnet)](https://explorer.solana.com/?cluster=devnet)

## 📞 문의

이슈 또는 질문이 있으면 GitHub Issues로 남겨주세요.
