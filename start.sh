#!/bin/bash

# SCEAP Quick Start Script
# Starts both frontend and backend servers

echo "🚀 Smart Cable Engineering Automation Platform"
echo "=============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.9+"
    exit 1
fi

echo "📦 Installing dependencies..."
echo ""

# Install frontend dependencies
echo "📥 Frontend dependencies..."
cd frontend
npm install > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Frontend ready"
else
    echo "❌ Frontend installation failed"
    exit 1
fi
cd ..

# Install backend dependencies
echo "📥 Backend dependencies..."
cd backend
pip install -q -r requirements.txt > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Backend ready"
else
    echo "❌ Backend installation failed"
    exit 1
fi
cd ..

echo ""
echo "🎯 Starting servers..."
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo "API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop servers"
echo ""

# Run both servers
npm run dev
