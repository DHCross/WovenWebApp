#!/usr/bin/env bash
set -euo pipefail

PORTS=(8888 4000)
for p in "${PORTS[@]}"; do
  PID=$(lsof -nP -iTCP:$p -sTCP:LISTEN -t 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo "Killing process $PID on port $p"
    kill "$PID" || true
    # Give it a moment, then force kill if needed
    sleep 1
    if lsof -nP -iTCP:$p -sTCP:LISTEN -t >/dev/null 2>&1; then
      echo "Force killing process $PID on port $p"
      kill -9 "$PID" || true
    fi
  else
    echo "No listener on port $p"
  fi
done

echo "Ports freed."
