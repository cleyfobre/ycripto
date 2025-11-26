#!/bin/bash

set -e

echo "=== Custody Service Kubernetes 삭제 ==="

echo ""
echo "정말로 삭제하시겠습니까? (y/N)"
read -r response

if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo ""
    echo "리소스 삭제 중..."

    kubectl delete -f deploy/service.yaml --ignore-not-found=true
    kubectl delete -f deploy/deployment.yaml --ignore-not-found=true
    kubectl delete -f deploy/secret.yaml --ignore-not-found=true
    kubectl delete -f deploy/configmap.yaml --ignore-not-found=true

    echo ""
    echo "Namespace는 유지됩니다. 완전히 삭제하려면:"
    echo "kubectl delete namespace custody"

    echo ""
    echo "=== 삭제 완료! ==="
else
    echo "취소되었습니다."
fi
