#!/usr/bin/env bash
set -e

IMAGE_NAME="cloud-compiler-sandbox:latest"

echo "======================================================="
echo "Building Cloud Compiler Unified Sandbox Docker Image..."
echo "Target Image: ${IMAGE_NAME}"
echo "======================================================="

docker build -f docker/Dockerfile.sandbox -t "${IMAGE_NAME}" .

echo "======================================================="
echo "Successfully built ${IMAGE_NAME}!"
echo "Verifying runtime toolchains inside sandbox image:"
echo "-------------------------------------------------------"
docker run --rm "${IMAGE_NAME}" g++ --version | head -n 1
docker run --rm "${IMAGE_NAME}" python3 --version
docker run --rm "${IMAGE_NAME}" java -version 2>&1 | head -n 1
docker run --rm "${IMAGE_NAME}" node --version
echo "======================================================="
