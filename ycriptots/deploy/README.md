# Kubernetes 로컬 배포 가이드

```
ycriptots/
  ├── Dockerfile                        # Docker 이미지 빌드
  ├── .dockerignore                     # Docker 빌드 제외 파일
  └── deploy/
      ├── README.md                     # 배포 가이드
      ├── deploy.sh                     # 배포 스크립트
      ├── cleanup.sh                    # 삭제 스크립트
      ├── namespace.yaml                # Namespace
      ├── configmap.yaml                # 환경 변수 (일반)
      ├── secret.yaml                   # 환경 변수 (민감 정보)
      ├── deployment.yaml               # Pod 배포 설정
      └── service.yaml                  # Service (NodePort)

  빠른 시작

  # 1. 배포
  cd /Users/bubaum/workspace/private/ycripto/ycriptots
  ./deploy/deploy.sh

  # 2. 확인
  kubectl get pods -n custody
  curl http://localhost:30082/api/health

  # 3. 삭제
  ./deploy/cleanup.sh

  주요 설정

  - Replicas: 2개 (High Availability)
  - Port: 30082 (NodePort)
  - Health Check: /api/health (Liveness & Readiness)
  - Resources:
    - Request: 256Mi RAM, 250m CPU
    - Limit: 512Mi RAM, 500m CPU
```

## 사전 준비

### 1. Docker Desktop 설치 및 Kubernetes 활성화
- Docker Desktop 설치
- Settings > Kubernetes > Enable Kubernetes 체크

또는

### 2. Minikube 사용 (선택)
```bash
# Minikube 설치 (Mac)
brew install minikube

# Minikube 시작
minikube start
```

---

## 배포 단계

### 1. Docker 이미지 빌드
```bash
cd /Users/bubaum/workspace/private/ycripto/ycriptots

# Docker 이미지 빌드
docker build -t custody-service:latest .
```

### 2. Minikube 사용 시 (Docker Desktop은 건너뛰기)
```bash
# Minikube의 Docker 데몬 사용
eval $(minikube docker-env)

# 이미지 다시 빌드
docker build -t custody-service:latest .
```

### 3. Namespace 생성
```bash
kubectl apply -f deploy/namespace.yaml
```

### 4. ConfigMap 생성
```bash
kubectl apply -f deploy/configmap.yaml
```

### 5. Secret 생성
**중요: secret.yaml에 실제 값을 입력하세요!**
```bash
kubectl apply -f deploy/secret.yaml
```

### 6. Deployment 배포
```bash
kubectl apply -f deploy/deployment.yaml
```

### 7. Service 배포
```bash
kubectl apply -f deploy/service.yaml
```

---

## 배포 확인

### Pod 상태 확인
```bash
kubectl get pods -n custody

# 실시간 로그 확인
kubectl logs -f -n custody deployment/custody-service
```

### Service 확인
```bash
kubectl get svc -n custody
```

### 접속 테스트
```bash
# Docker Desktop
curl http://localhost:30082/api/health

# Minikube
minikube service custody-service -n custody --url
```

---

## 외부 서비스 연결

### PostgreSQL (로컬)
- `host.docker.internal:5432`로 로컬 PostgreSQL 접근
- Docker Desktop은 자동 지원
- Minikube는 추가 설정 필요:
```bash
minikube ssh
# 호스트 IP 확인 후 secret.yaml 수정
```

### RabbitMQ (외부)
- `49.50.138.148:5672`로 외부 RabbitMQ 접근
- 방화벽 확인 필요

---

## 유용한 명령어

### 전체 리소스 조회
```bash
kubectl get all -n custody
```

### Pod 접속
```bash
kubectl exec -it -n custody deployment/custody-service -- /bin/sh
```

### ConfigMap 수정
```bash
kubectl edit configmap custody-config -n custody
```

### Deployment 재시작
```bash
kubectl rollout restart deployment custody-service -n custody
```

### 로그 확인 (여러 Pod)
```bash
kubectl logs -f -n custody -l app=custody
```

### 리소스 삭제
```bash
# 전체 삭제
kubectl delete namespace custody

# 개별 삭제
kubectl delete -f deploy/deployment.yaml
kubectl delete -f deploy/service.yaml
```

---

## Scaling

### 수평 확장
```bash
# Replica 수 변경
kubectl scale deployment custody-service -n custody --replicas=3

# 자동 스케일링 (HPA)
kubectl autoscale deployment custody-service -n custody \
  --min=2 --max=5 --cpu-percent=80
```

---

## Payment 서비스 추가 시

1. `deploy/payment-deployment.yaml` 생성
2. `deploy/payment-service.yaml` 생성
3. Secret에 payment 전용 환경 변수 추가
4. 동일한 방식으로 배포

```bash
kubectl apply -f deploy/payment-deployment.yaml
kubectl apply -f deploy/payment-service.yaml
```

---

## 트러블슈팅

### ImagePullBackOff 에러
```bash
# 이미지 존재 확인
docker images | grep custody-service

# imagePullPolicy 확인
# deployment.yaml에서 imagePullPolicy: Never 설정
```

### CrashLoopBackOff 에러
```bash
# 로그 확인
kubectl logs -n custody deployment/custody-service

# 환경 변수 확인
kubectl exec -n custody deployment/custody-service -- env
```

### 외부 DB 연결 실패
```bash
# Pod에서 직접 테스트
kubectl exec -it -n custody deployment/custody-service -- /bin/sh
nc -zv host.docker.internal 5432
```
