#!/bin/bash
# Start both backend (port 3001) and frontend (port 5000) concurrently

export BACKEND_PORT=3001
export BACKEND_INTERNAL_URL=http://localhost:3001

# Start backend in background
cd /home/runner/workspace/backend && node src/index.js &
BACKEND_PID=$!

# Give backend time to initialize DB
sleep 3

# Start frontend on port 5000 (Replit webview port)
cd /home/runner/workspace/frontend && npx next dev -p 5000

# If frontend exits, kill backend
kill $BACKEND_PID 2>/dev/null
