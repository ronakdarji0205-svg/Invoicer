# Pro-Invoicer GST - PM2 Deployment Guide

## Prerequisites
- Node.js installed
- PM2 installed globally: `npm install -g pm2`

## Database
This application uses **SQLite** (better-sqlite3) for data storage.
- Database file: `backend/database.db`
- Automatically created on first run
- No additional database setup required

## Installation

1. Install dependencies:
```bash
npm install
cd backend && npm install && cd ..
```

2. Build frontend:
```bash
npm run build
```

3. Configure environment (optional):
```bash
# Create backend/.env file
cd backend
echo "PORT=5000" > .env
echo "JWT_SECRET=your-secret-key-here" >> .env
```

## PM2 Commands

### Start applications
```bash
pm2 start ecosystem.config.js
```

### View status
```bash
pm2 status
```

### View logs
```bash
# All logs
pm2 logs

# Backend only
pm2 logs pro-invoicer-backend

# Frontend only
pm2 logs pro-invoicer-frontend
```

### Monitor
```bash
pm2 monit
```

### Restart
```bash
pm2 restart all
pm2 restart pro-invoicer-backend
pm2 restart pro-invoicer-frontend
```

### Stop
```bash
pm2 stop all
pm2 stop pro-invoicer-backend
```

### Delete
```bash
pm2 delete all
```

### Save configuration (auto-restart on reboot)
```bash
pm2 save
pm2 startup
```

## Access URLs
- Frontend: http://localhost:6001
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/api/health

## Logs Location
- Backend logs: `./logs/backend-*.log`
- Frontend logs: `./logs/frontend-*.log`

## Production Deployment

1. Set environment variables:
```bash
export NODE_ENV=production
```

2. Build and start:
```bash
npm run build
pm2 start ecosystem.config.js --env production
pm2 save
```

## Backup Database
```bash
# Backup SQLite database
cp backend/database.db backend/database.db.backup
```

## Troubleshooting

### Check if PM2 is running
```bash
pm2 list
```

### View real-time logs
```bash
pm2 logs --lines 100
```

### Restart with fresh logs
```bash
pm2 flush
pm2 restart all
```

### Check backend health
```bash
curl http://localhost:5000/api/health
```
