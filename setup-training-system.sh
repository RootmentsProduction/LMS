#!/bin/bash

echo "🚀 Setting up LMS Training System..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ Node.js and npm are installed"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ Backend dependencies already installed"
fi

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../lmsweb
if [ ! -d "node_modules" ]; then
    npm install
else
    echo "✅ Frontend dependencies already installed"
fi

# Go back to root
cd ..

echo ""
echo "🎉 Setup completed!"
echo ""
echo "To start the system:"
echo "1. Start the backend: cd backend && npm start"
echo "2. Start the frontend: cd lmsweb && npm run dev"
echo ""
echo "To test the APIs:"
echo "node test-training-api.js"
echo ""
echo "For more information, see TRAINING_SYSTEM_README.md"
