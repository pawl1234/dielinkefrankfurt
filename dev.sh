#!/bin/bash

# Start MailDev in the background
echo "Starting MailDev for email testing..."
npx maildev --web 1080 --smtp 1025 &
MAILDEV_PID=$!

# Give MailDev a moment to start
sleep 2

echo "MailDev started! View emails at http://localhost:1080"
echo "---------------------------------------------------"
echo "Email server is running on localhost:1025"
echo "Web interface is running on http://localhost:1080"
echo "---------------------------------------------------"

# Start Next.js development server
echo "Starting Next.js development server..."
npm run dev

# When Next.js is terminated, also kill MailDev
kill $MAILDEV_PID