#!/usr/bin/env bash
set -e

echo "=== Resumio FFCS Environment Setup ==="
python3 --version

export PYTHONPATH="$(pwd)"
echo "Set PYTHONPATH to: $PYTHONPATH"

echo -e "\nSeeding local SQLite database..."
python3 -m backend.seed

echo -e "\nRunning test verification..."
python3 -m pytest tests

echo -e "\nSetup complete! You can now start the application with:"
echo "  python3 run.py --dev"
