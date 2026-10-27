# Resumio FFCS: Windows PowerShell Setup Script
$ErrorActionPreference = "Stop"

Write-Host "=== Resumio FFCS Environment Setup ===" -ForegroundColor Cyan

# 1. Check Python version
$pythonVersion = python --version 2>&1
Write-Host "Detected: $pythonVersion" -ForegroundColor Green

# 2. Set PYTHONPATH
$env:PYTHONPATH = (Get-Location).Path
Write-Host "Set PYTHONPATH to: $env:PYTHONPATH" -ForegroundColor Green

# 3. Initialize & Seed Database with real data
Write-Host "`nSeeding local SQLite database..." -ForegroundColor Yellow
python -m backend.seed

# 4. Run full test suite
Write-Host "`nRunning test verification..." -ForegroundColor Yellow
python -m pytest tests

Write-Host "`nSetup complete! You can now start the application with:" -ForegroundColor Cyan
Write-Host "  python run.py --dev" -ForegroundColor White
