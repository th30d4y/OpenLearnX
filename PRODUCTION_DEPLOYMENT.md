# OpenLearnX Production Deployment Guide

**Last Updated:** May 12, 2026  
**Status:** Ready for Production Deployment

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Backend Deployment](#backend-deployment)
3. [Frontend Deployment](#frontend-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Database Setup](#database-setup)
6. [Blockchain Setup](#blockchain-setup)
7. [Post-Deployment Checks](#post-deployment-checks)
8. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Prerequisites

### Required Tools
- Node.js 18+ (for frontend)
- Python 3.10+ (for backend)
- MongoDB 4.4+ (database)
- Foundry/Anvil or Ethereum RPC endpoint (blockchain)
- Git
- PM2 or systemd (process manager)
- Nginx or Apache (reverse proxy)
- SSL/TLS certificates (HTTPS)

### Recommended Hosting
- **Backend:** Heroku, DigitalOcean, AWS, GCP, or self-hosted VPS
- **Frontend:** Vercel, Netlify, or static hosting
- **Database:** MongoDB Atlas, AWS DocumentDB, or self-hosted
- **Blockchain:** Alchemy, Infura, or self-hosted node

---

## Backend Deployment

### Option 1: Deploy to Heroku

#### 1. Prerequisites
```bash
npm install -g heroku
heroku login
```

#### 2. Create Procfile
```bash
cd backend
cat > Procfile << 'EOF'
web: python main.py
EOF
```

#### 3. Create requirements file (if not exists)
```bash
pip freeze > requirements.txt
```

#### 4. Deploy to Heroku
```bash
heroku create openlearnx-backend
git push heroku main

# Set environment variables
heroku config:set FLASK_ENV=production
heroku config:set MONGODB_URI=<your-mongodb-uri>
heroku config:set WEB3_PROVIDER_URL=<your-rpc-endpoint>
heroku config:set CONTRACT_ADDRESS=<deployed-contract-address>
heroku config:set SECRET_KEY=<secure-random-key>
heroku config:set JWT_SECRET_KEY=<secure-jwt-key>
```

#### 5. View logs
```bash
heroku logs --tail
```

---

### Option 2: Deploy to VPS (DigitalOcean/AWS/Linode)

#### 1. SSH into server
```bash
ssh root@your-server-ip
```

#### 2. Install dependencies
```bash
apt update && apt upgrade -y
apt install -y python3.10 python3-pip python3-venv nginx git mongodb
```

#### 3. Clone repository
```bash
cd /var/www
git clone https://github.com/th30d4y/OpenLearnX.git
cd OpenLearnX/backend
```

#### 4. Setup Python environment
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r ../requirements.txt
```

#### 5. Create .env file
```bash
cat > .env << 'EOF'
FLASK_ENV=production
SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
MONGODB_URI=mongodb://localhost:27017/openlearnx
WEB3_PROVIDER_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
CONTRACT_ADDRESS=0x...
JWT_SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')
EOF
```

#### 6. Setup PM2
```bash
npm install -g pm2
pm2 start "python3 main.py" --name openlearnx-backend
pm2 startup
pm2 save
```

#### 7. Configure Nginx
```bash
cat > /etc/nginx/sites-available/openlearnx-backend << 'EOF'
server {
    listen 80;
    server_name api.openlearnx.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/openlearnx-backend /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 8. Setup SSL with Let's Encrypt
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d api.openlearnx.com
```

---

## Frontend Deployment

### Option 1: Deploy to Vercel

#### 1. Connect repository to Vercel
- Go to https://vercel.com
- Import GitHub repository
- Select `frontend` as root directory

#### 2. Configure environment variables
```
NEXT_PUBLIC_BACKEND_URL=https://api.openlearnx.com
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
```

#### 3. Deploy
```bash
git push origin main
# Vercel will automatically deploy on push
```

---

### Option 2: Deploy to Netlify

#### 1. Connect repository
- Go to https://netlify.com
- Import GitHub repository
- Select `frontend` as publish directory

#### 2. Build settings
- Build command: `pnpm install && pnpm build`
- Publish directory: `.next`

#### 3. Environment variables
```
NEXT_PUBLIC_BACKEND_URL=https://api.openlearnx.com
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
```

---

### Option 3: Deploy to VPS

#### 1. SSH into server
```bash
ssh root@your-server-ip
```

#### 2. Install Node.js
```bash
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
npm install -g pnpm
```

#### 3. Clone repository
```bash
cd /var/www
git clone https://github.com/th30d4y/OpenLearnX.git
cd OpenLearnX/frontend
```

#### 4. Build application
```bash
pnpm install
pnpm build
```

#### 5. Setup PM2
```bash
pm2 start "pnpm start" --name openlearnx-frontend
pm2 startup
pm2 save
```

#### 6. Configure Nginx
```bash
cat > /etc/nginx/sites-available/openlearnx-frontend << 'EOF'
server {
    listen 80;
    server_name openlearnx.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/openlearnx-frontend /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 7. Setup SSL
```bash
certbot --nginx -d openlearnx.com
```

---

## Environment Configuration

### Backend (.env) - Production
```env
FLASK_ENV=production
DEBUG=False
SECRET_KEY=<secure-random-32-char-key>
JWT_SECRET_KEY=<secure-jwt-key>

# Database
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/openlearnx

# Blockchain
WEB3_PROVIDER_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
CONTRACT_ADDRESS=0x<deployed-contract-address>

# Security
# Frontend origins allowed to call the API (comma-separated)
CORS_ALLOWED_ORIGINS=https://openlearnx.com,https://www.openlearnx.com
ADMIN_TOKEN=<secure-admin-token>

# Optional: Email configuration
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
```

### Frontend (.env.production.local)
```env
NEXT_PUBLIC_BACKEND_URL=https://api.openlearnx.com
NEXT_PUBLIC_CHAIN_ID=1
NEXT_PUBLIC_CONTRACT_ADDRESS=0x<contract-address>
NEXT_PUBLIC_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY
```

---

## Database Setup

### MongoDB Atlas (Cloud)

1. Go to https://mongodb.com/cloud/atlas
2. Create account and new cluster
3. Add database user with strong password
4. Whitelist IP addresses
5. Get connection string: `mongodb+srv://user:pass@cluster.mongodb.net/openlearnx`

### Self-Hosted MongoDB

```bash
# Install MongoDB
apt install -y mongodb-org

# Start service
systemctl start mongod
systemctl enable mongod

# Create database and user
mongosh
use openlearnx
db.createUser({
  user: "openlearnx",
  pwd: "secure-password",
  roles: ["readWrite"]
})
```

---

## Blockchain Setup

### Using Alchemy (Recommended)
1. Go to https://alchemy.com
2. Create account and new app
3. Select Ethereum mainnet (or testnet)
4. Get API key: `https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY`

### Using Infura
1. Go to https://infura.io
2. Create account and new project
3. Select Ethereum mainnet
4. Get API key: `https://mainnet.infura.io/v3/YOUR-API-KEY`

### Self-Hosted Node
```bash
# Deploy smart contract to mainnet
cd backend
source venv/bin/activate

# Update WEB3_PROVIDER_URL to mainnet endpoint
python3 scripts/deploy.py  # Deploys to mainnet
```

---

## Post-Deployment Checks

### 1. Test Backend
```bash
curl https://api.openlearnx.com/api/health
curl https://api.openlearnx.com/api/dashboard/comprehensive-stats
```

### 2. Test Frontend
- Open https://openlearnx.com in browser
- Verify page loads
- Test wallet connection
- Test authentication flow

### 3. Database
```bash
mongosh
use openlearnx
db.stats()
```

### 4. Blockchain
```bash
curl -X POST https://eth-mainnet.g.alchemy.com/v2/YOUR-API-KEY \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x...","latest"],"id":1}'
```

---

## Monitoring & Maintenance

### PM2 Monitoring
```bash
pm2 monit          # Real-time monitoring
pm2 logs           # View logs
pm2 restart all    # Restart all processes
pm2 stop all       # Stop all processes
```

### Nginx Logs
```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Database Backups
```bash
# Daily backup to S3
0 2 * * * mongodump --uri="mongodb+srv://..." --archive=/backups/openlearnx-$(date +\%Y\%m\%d).archive
```

### SSL Certificate Renewal
```bash
# Auto-renewal with Let's Encrypt
certbot renew --dry-run
certbot renew  # Runs automatically via cron
```

### Update dependencies
```bash
# Backend
cd backend
source venv/bin/activate
pip install --upgrade pip
pip install -r ../requirements.txt

# Frontend
cd frontend
pnpm update
pnpm build
```

---

## Troubleshooting

### Backend not responding
```bash
pm2 logs openlearnx-backend
systemctl status mongod
```

### Frontend blank page
```bash
pm2 logs openlearnx-frontend
# Check the NEXT_PUBLIC_BACKEND_URL environment variable
```

### Database connection errors
```bash
# Test MongoDB connection
mongosh --uri="your-connection-string"
```

### SSL certificate issues
```bash
certbot renew --force-renewal
systemctl restart nginx
```

---

## Security Checklist

- [ ] Update `SECRET_KEY` and `JWT_SECRET_KEY` with secure values
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall rules
- [ ] Setup rate limiting on API
- [ ] Enable CORS only for your domain
- [ ] Rotate API keys regularly
- [ ] Setup monitoring and alerting
- [ ] Implement database backups
- [ ] Use environment variables for secrets
- [ ] Enable audit logging
- [ ] Update dependencies regularly
- [ ] Setup DDoS protection (Cloudflare)

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/th30d4y/OpenLearnX/issues
- Documentation: See DOCUMENTATION.md
- Contact: See README.md for contact info

---

**Deployment Version:** 2.0.4  
**Last Updated:** May 12, 2026
