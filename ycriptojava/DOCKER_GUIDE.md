# Docker Compose 사용 가이드

## 🚀 시작하기

### 1. Docker 실행 (모든 서비스)
```bash
docker-compose up -d
```

### 2. 서비스 상태 확인
```bash
docker-compose ps
```

### 3. 로그 확인
```bash
# 전체 로그
docker-compose logs -f

# PostgreSQL 로그만
docker-compose logs -f postgres

# Redis 로그만
docker-compose logs -f redis
```

### 4. 서비스 중지
```bash
docker-compose down
```

### 5. 데이터까지 삭제 (완전 초기화)
```bash
docker-compose down -v
```

---

## 📊 포함된 서비스

| 서비스 | 포트 | 용도 |
|--------|------|------|
| PostgreSQL | 5432 | 메인 데이터베이스 |
| Redis | 6379 | 캐시/세션 |
| pgAdmin | 5050 | DB 관리 도구 (웹) |

---

## 🔑 접속 정보

### PostgreSQL
- **Host**: localhost
- **Port**: 5432
- **Database**: solana_wallet_db
- **Username**: postgres
- **Password**: postgres

### Redis
- **Host**: localhost
- **Port**: 6379
- **Password**: (없음)

### pgAdmin (웹 UI)
- **URL**: http://localhost:5050
- **Email**: admin@wallet.com
- **Password**: admin

---

## 🛠️ pgAdmin에서 PostgreSQL 연결하기

1. 브라우저에서 http://localhost:5050 접속
2. Email: `admin@wallet.com`, Password: `admin` 로그인
3. 좌측 `Servers` 우클릭 → `Register` → `Server`
4. 다음 정보 입력:
   - **General 탭**:
     - Name: `Solana Wallet DB`
   - **Connection 탭**:
     - Host: `postgres` (또는 `host.docker.internal`)
     - Port: `5432`
     - Username: `postgres`
     - Password: `postgres`
     - Save password: ✅ 체크

---

## 📝 유용한 명령어

### 데이터베이스 직접 접속
```bash
docker exec -it solana-wallet-postgres psql -U postgres -d solana_wallet_db
```

### Redis CLI 접속
```bash
docker exec -it solana-wallet-redis redis-cli
```

### 컨테이너 재시작
```bash
docker-compose restart postgres
docker-compose restart redis
```

---

## 🔄 데이터 백업/복원

### 백업
```bash
docker exec solana-wallet-postgres pg_dump -U postgres solana_wallet_db > backup.sql
```

### 복원
```bash
docker exec -i solana-wallet-postgres psql -U postgres solana_wallet_db < backup.sql
```

---

## ⚠️ 주의사항

- 운영 환경에서는 **비밀번호를 반드시 변경**하세요
- 데이터는 Docker Volume에 저장됩니다 (`postgres_data`, `redis_data`)
- `docker-compose down -v` 실행 시 **모든 데이터가 삭제**됩니다
