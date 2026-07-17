#!/bin/bash
cd backend
source venv/bin/activate
uvicorn app.api.main:app --host 127.0.0.1 --port 8000 &
cd ../frontend
npm run dev &
wait
