$ErrorActionPreference = "Stop"

$IMAGE_NAME = "cloud-compiler-sandbox:latest"

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "Building Cloud Compiler Unified Sandbox Docker Image..." -ForegroundColor Cyan
Write-Host "Target Image: $IMAGE_NAME" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

docker build -f docker/Dockerfile.sandbox -t $IMAGE_NAME .

Write-Host "=======================================================" -ForegroundColor Green
Write-Host "Successfully built $IMAGE_NAME!" -ForegroundColor Green
Write-Host "Verifying runtime toolchains inside sandbox image:" -ForegroundColor Green
Write-Host "-------------------------------------------------------" -ForegroundColor Green

docker run --rm $IMAGE_NAME g++ --version
docker run --rm $IMAGE_NAME python3 --version
docker run --rm $IMAGE_NAME java -version
docker run --rm $IMAGE_NAME node --version

Write-Host "=======================================================" -ForegroundColor Green
