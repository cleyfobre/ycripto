#!/bin/bash

set -e

echo "=== Custody Service Kubernetes 배포 ==="

# 현재 디렉토리 확인
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo ""
echo "1. Docker 이미지 빌드..."
docker build -t custody-service:latest .

echo ""
echo "2. Namespace 생성..."
kubectl apply -f deploy/namespace.yaml

echo ""
echo "3. ConfigMap 생성..."
kubectl apply -f deploy/configmap.yaml

echo ""
echo "4. Secret 생성..."
kubectl apply -f deploy/secret.yaml

echo ""
echo "5. Deployment 배포..."
kubectl apply -f deploy/deployment.yaml

echo ""
echo "6. Service 배포..."
kubectl apply -f deploy/service.yaml

echo ""
echo "=== 배포 완료! ==="
echo ""
echo "상태 확인:"
kubectl get all -n custody

echo ""
echo "접속 URL: http://localhost:30082/api/health"
echo ""
echo "로그 확인: kubectl logs -f -n custody -l app=custody"
