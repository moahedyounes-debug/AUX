# AUX ASC Dashboard - Deployment & Setup Guide

**Version:** 4.0 Production Ready  
**Date:** May 21, 2026  
**Author:** MoAhed Younis  
**Last Updated:** May 21, 2026

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Requirements](#system-requirements)
3. [Development Environment Setup](#development-environment-setup)
4. [Google Sheets Configuration](#google-sheets-configuration)
5. [Production Deployment](#production-deployment)
6. [Environment Configuration](#environment-configuration)
7. [Server Setup](#server-setup)
8. [Data Integration](#data-integration)
9. [Testing Checklist](#testing-checklist)
10. [Monitoring & Maintenance](#monitoring--maintenance)
11. [Troubleshooting](#troubleshooting)
12. [Rollback Procedures](#rollback-procedures)

---

## Quick Start

### For Local Development (5 minutes)

```bash
# Clone the repository
git clone https://github.com/moahedyounes-debug/AUX.git
cd AUX

# Start the development server
npm install  # If not already installed
npm start

# Open in browser
# Navigate to: http://localhost:8000
```

### For Production Deployment (30-60 minutes)

See [Production Deployment](#production-deployment) section below.

---

## System Requirements

### Minimum Requirements

| Component | Requirement | Notes |
|-----------|-------------|-------|
| **OS** | Windows 10+, macOS 10.14+, Linux (Ubuntu 18.04+) | Any OS with Node.js support |
| **Node.js** | v14.0.0 or higher | v16+ recommended for security |
| **npm** | v6.0.0 or higher | Comes with Node.js |
| **RAM** | 2GB minimum | 4GB+ recommended for production |
| **Disk Space** | 500MB (with node_modules) | 1GB+ for logs and data cache |
| **Browser** | Chrome 90+, Firefox 88+, Safari 14+ | Edge 90+ also supported |
| **Internet** | Stable connection for Google Sheets API | Required for data integration |

### Recommended Specifications (Production)

| Component | Specification |
|-----------|---------------|
| **OS** | Linux (Ubuntu 20.04 LTS) or Windows Server 2019+ |
| **Node.js** | v18 LTS |
| **Server** | Dedicated hosting (not shared) |
| **RAM** | 8GB |
| **Disk** | SSD 20GB+ |
| **Network** | 100 Mbps+ connection |
| **Backup** | Automated daily backups |

### Port Requirements

| Port | Service | Notes |
|------|---------|-------|
| 8000 | Dashboard HTTP | Development server (http://localhost:8000) |
| 443 | HTTPS | Required for production |
| 80 | HTTP redirect | Redirects to HTTPS |

---

## Development Environment Setup

### Step 1: Prerequisites Installation

#### Windows

```powershell
# Install Node.js (using chocolatey)
choco install nodejs

# Or download from: https://nodejs.org/

# Verify installation
node --version
npm --version
```

#### macOS

```bash
# Using Homebrew
brew install node

# Or download from: https://nodejs.org/

# Verify installation
node --version
npm --version
```

#### Linux (Ubuntu/Debian)

```bash
# Update package manager
sudo apt-get update
sudo apt-get install curl

# Install Node.js v18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### Step 2: Clone Repository

```bash
# Clone from GitHub
git clone https://github.com/moahedyounes-debug/AUX.git
cd AUX

# Or clone from a specific branch
git clone -b main https://github.com/moahedyounes-debug/AUX.git

# Verify files
ls -la Dashboard/
# Should show: index.html, css/, js/, docs/
```

### Step 3: Install Dependencies

```bash
# Navigate to project root
cd AUX

# Install npm packages
npm install

# This creates node_modules/ directory and installs:
# - express (web server)
# - cors (cross-origin support)
# - dotenv (environment variables)
# - Other dependencies listed in package.json

# Verify installation
npm list
```

### Step 4: Configure Environment Variables

```bash
# Create .env file in project root
touch .env

# Edit .env with your configuration
cat > .env << EOF
NODE_ENV=development
PORT=8000
LOG_LEVEL=debug
DATA_CACHE_TTL=3600
DASHBOARD_SHEET_ID=1x796CMZf8b3RUNkqsanO56F_Wmo75L2uLzIlgE65doY
PARTS_SHEET_ID=1jQvpH0ZA5V_JB0Y2uLBM-3_Bt9VurTbncAE4WDv4wUg
CALL_CENTER_SHEET_ID=1U-GUCKqShHLkqg4FvCur-T0Tic0cMAP1ou9hvoSw_FI
EVAL_SHEET_ID=1KDMVAKplmbNvfdd66Ha-TmJ3fm_6mD29F2AsT9UsqvE
EOF
```

### Step 5: Start Development Server

```bash
# Start the development server
npm start

# Output should show:
# Server running at http://localhost:8000
# Press Ctrl+C to stop

# In another terminal, verify the server is running
curl http://localhost:8000

# Open in browser
# Visit: http://localhost:8000
```

### Step 6: Verify Installation

```bash
# Check file structure
tree -L 2 Dashboard/

# Check that all key files exist
test -f Dashboard/index.html && echo "✅ index.html found"
test -f Dashboard/js/app.js && echo "✅ app.js found"
test -f Dashboard/js/config.js && echo "✅ config.js found"
test -f Dashboard/css/main.css && echo "✅ main.css found"
```

---

## Google Sheets Configuration

### Prerequisites

- Google Account (personal or workspace)
- Owner/Editor access to the Google Sheets
- Google Drive API enabled (if using API instead of CSV export)

### Step 1: Verify Sheet IDs

The dashboard uses 4 independent Google Sheets for different data:

| Sheet Name | Purpose | Sheet ID |
|-----------|---------|----------|
| Main Dashboard | Service tickets, KPIs | `1x796CMZf8b3RUNkqsanO56F_Wmo75L2uLzIlgE65doY` |
| Parts Management | Inventory, spare parts | `1jQvpH0ZA5V_JB0Y2uLBM-3_Bt9VurTbncAE4WDv4wUg` |
| Call Center KPI | Calls, WhatsApp, agent metrics | `1U-GUCKqShHLkqg4FvCur-T0Tic0cMAP1ou9hvoSw_FI` |
| Agent Evaluation | Monthly evaluations | `1KDMVAKplmbNvfdd66Ha-TmJ3fm_6mD29F2AsT9UsqvE` |

### Step 2: Configure Sheet Sharing

For each Google Sheet:

1. Open the sheet in Google Drive
2. Click **Share** button (top right)
3. Set sharing to **"Anyone with the link can view"** OR
4. Specify specific email addresses for team access
5. Click **Share** to confirm

### Step 3: Verify Data Structure

Each sheet must have the correct columns. Check the following:

**Dashboard Sheet (Main):**
- Ticket Number
- Branch
- Technician
- Status
- Created Date
- Completed Date
- Hours Spent

**Parts Sheet:**
- Part Code
- Part Description / Part Name
- Order Number
- Sort (Stage)
- Quantity
- Status / Final Status
- Warehouse / Location
- AWB (Tracking)

**Call Center Sheet:**
- Agent Name
- Calls Received
- Calls Handled
- Average Handle Time
- Total Handle Time
- SLAP Score
- Within SLA

**Evaluation Sheet:**
- Agent Name
- Month
- Quality Score
- Courtesy Score
- Technical Knowledge
- Overall Rating
- Manager Feedback

### Step 4: Test Data Access

```bash
# The dashboard automatically fetches CSV from Google Sheets
# To verify data is being fetched, check the browser console

# In browser developer tools (F12):
# 1. Open Console tab
# 2. Look for messages like: "Dashboard sheet loaded: XXX rows"
# 3. Check Network tab for CSV requests to gviz requests

# Expected requests:
# - https://docs.google.com/spreadsheets/d/{SHEET_ID}/gviz/query?...
```

---

## Production Deployment

### Step 1: Choose Hosting Environment

#### Option A: AWS (Recommended)

```bash
# Launch EC2 instance
# - AMI: Ubuntu 20.04 LTS
# - Instance type: t3.medium (minimum)
# - Storage: 20GB gp3 SSD
# - Security group: Allow ports 80, 443

# Connect to instance
ssh -i your-key.pem ubuntu@your-instance-ip

# Update system
sudo apt-get update && sudo apt-get upgrade -y
```

#### Option B: DigitalOcean

```bash
# Create droplet
# - Image: Ubuntu 20.04
# - Size: Regular $12/month (2GB RAM)
# - Add block storage: 20GB

# Connect
ssh root@your-droplet-ip
```

#### Option C: On-Premises Server

```bash
# Ensure server meets requirements in System Requirements section
# Install Node.js following Linux instructions above
# Ensure port 80, 443 accessible
```

### Step 2: Deploy Application

```bash
# SSH into production server
ssh deployment@prod-server.com

# Clone repository
cd /opt
sudo git clone https://github.com/moahedyounes-debug/AUX.git
cd AUX

# Install dependencies
npm install --production

# Create production environment file
sudo nano .env
```

**Production .env file:**

```bash
NODE_ENV=production
PORT=8000
LOG_LEVEL=info
HTTPS=true
CERT_PATH=/etc/ssl/certs/server.crt
KEY_PATH=/etc/ssl/private/server.key
DATA_CACHE_TTL=7200
DASHBOARD_SHEET_ID=1x796CMZf8b3RUNkqsanO56F_Wmo75L2uLzIlgE65doY
PARTS_SHEET_ID=1jQvpH0ZA5V_JB0Y2uLBM-3_Bt9VurTbncAE4WDv4wUg
CALL_CENTER_SHEET_ID=1U-GUCKqShHLkqg4FvCur-T0Tic0cMAP1ou9hvoSw_FI
EVAL_SHEET_ID=1KDMVAKplmbNvfdd66Ha-TmJ3fm_6mD29F2AsT9UsqvE
```

### Step 3: Set Up SSL Certificate

```bash
# Install Certbot (for Let's Encrypt free SSL)
sudo apt-get install certbot python3-certbot-nginx -y

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com

# Certificates will be saved to:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem (cert)
# /etc/letsencrypt/live/yourdomain.com/privkey.pem (key)

# Update .env file with cert paths
sudo nano .env
# CERT_PATH=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
# KEY_PATH=/etc/letsencrypt/live/yourdomain.com/privkey.pem

# Auto-renew certificate (runs daily)
sudo certbot renew --quiet
```

### Step 4: Set Up Process Manager (PM2)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start application with PM2
cd /opt/AUX
pm2 start server.js --name "dashboard"

# Create startup script (auto-restart on reboot)
sudo pm2 startup
pm2 save

# Monitor application
pm2 logs dashboard

# Check status
pm2 status
```

### Step 5: Configure Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt-get install nginx -y

# Create configuration file
sudo nano /etc/nginx/sites-available/dashboard
```

**Nginx configuration:**

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Compression
    gzip on;
    gzip_types text/plain text/css application/javascript;

    # Proxy settings
    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

**Enable the configuration:**

```bash
# Create symlink
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable auto-start
sudo systemctl enable nginx
```

### Step 6: Configure Firewall

```bash
# If using UFW firewall (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Verify
sudo ufw status
```

### Step 7: Set Up Automated Backups

```bash
# Create backup script
sudo nano /opt/AUX/backup.sh
```

**Backup script:**

```bash
#!/bin/bash

BACKUP_DIR="/var/backups/dashboard"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
SOURCE_DIR="/opt/AUX"

mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/dashboard_$TIMESTAMP.tar.gz \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='logs' \
    $SOURCE_DIR

# Keep only last 30 days of backups
find $BACKUP_DIR -name "dashboard_*.tar.gz" -mtime +30 -delete

echo "Backup completed: dashboard_$TIMESTAMP.tar.gz"
```

**Make it executable and schedule:**

```bash
sudo chmod +x /opt/AUX/backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e

# Add this line:
0 2 * * * /opt/AUX/backup.sh >> /var/log/dashboard-backup.log 2>&1
```

---

## Environment Configuration

### Configuration Files

#### 1. `.env` (Environment Variables)

```bash
# Server Configuration
NODE_ENV=production|development|staging
PORT=8000
HTTPS=true|false

# SSL Certificates (production only)
CERT_PATH=/path/to/cert.crt
KEY_PATH=/path/to/key.key

# Logging
LOG_LEVEL=debug|info|warn|error
LOG_FILE=/var/log/dashboard.log

# Data Integration
DATA_CACHE_TTL=3600
REFRESH_INTERVAL=300000

# Google Sheets IDs
DASHBOARD_SHEET_ID=...
PARTS_SHEET_ID=...
CALL_CENTER_SHEET_ID=...
EVAL_SHEET_ID=...

# Feature Flags
ENABLE_EXPORT=true
ENABLE_FILTERS=true
ENABLE_TRANSLATIONS=true
```

#### 2. `Dashboard/js/config.js` (Client Configuration)

```javascript
// API endpoints
const API_BASE = 'http://localhost:8000';
const SHEETS_BASE = 'https://docs.google.com/spreadsheets/d';

// Google Sheet IDs
const DASHBOARD_SHEET_ID = '1x796CMZf8b3RUNkqsanO56F_Wmo75L2uLzIlgE65doY';
const PARTS_SHEET_ID = '1jQvpH0ZA5V_JB0Y2uLBM-3_Bt9VurTbncAE4WDv4wUg';
const CALL_CENTER_SHEET_ID = '1U-GUCKqShHLkqg4FvCur-T0Tic0cMAP1ou9hvoSw_FI';
const EVAL_SHEET_ID = '1KDMVAKplmbNvfdd66Ha-TmJ3fm_6mD29F2AsT9UsqvE';

// Feature Configuration
const FEATURES = {
    ENABLE_EXPORT: true,
    ENABLE_FILTERS: true,
    ENABLE_TRANSLATIONS: true,
    DEFAULT_LANGUAGE: 'en', // 'en', 'zh', 'ar'
};

// UI Configuration
const UI_CONFIG = {
    THEME: 'light', // 'light', 'dark'
    SIDEBAR_COLLAPSED: false,
    ITEMS_PER_PAGE: 50,
};
```

### Environment-Specific Settings

#### Development

```bash
NODE_ENV=development
LOG_LEVEL=debug
DATA_CACHE_TTL=300          # 5 minutes (frequent refresh)
HTTPS=false
```

#### Staging

```bash
NODE_ENV=staging
LOG_LEVEL=info
DATA_CACHE_TTL=1800         # 30 minutes
HTTPS=true
```

#### Production

```bash
NODE_ENV=production
LOG_LEVEL=warn
DATA_CACHE_TTL=3600         # 1 hour
HTTPS=true
```

---

## Server Setup

### Health Check

```bash
# Test server is running
curl http://localhost:8000

# Should return HTML content of index.html

# Check if HTTPS is working (production)
curl -k https://yourdomain.com
# -k flag ignores SSL certificate validation for testing
```

### Log Monitoring

```bash
# View PM2 logs in real-time
pm2 logs dashboard

# View application error log
tail -f /var/log/dashboard.log

# View Nginx error log
sudo tail -f /var/log/nginx/error.log

# View system logs
sudo journalctl -u dashboard -f
```

### Performance Monitoring

```bash
# Monitor CPU and memory usage
pm2 monit

# Check disk space
df -h

# Monitor network connections
netstat -tuln | grep 8000

# Monitor active connections to dashboard
sudo ss -antp | grep 8000
```

---

## Data Integration

### Google Sheets Data Flow

```
Google Sheets (4 independent sheets)
        ↓
gviz CSV export
        ↓
JavaScript parseSheet()
        ↓
Global data arrays
(PARTS_REQUESTS, ticketData, etc.)
        ↓
Render functions
        ↓
DOM/HTML display
```

### Configuring Data Refresh

#### Manual Refresh

```javascript
// In browser console, manually trigger data refresh
loadAllData();  // Loads all data from Google Sheets
```

#### Automatic Refresh

Edit `Dashboard/js/app.js`:

```javascript
// Set refresh interval (in milliseconds)
const REFRESH_INTERVAL = 300000;  // 5 minutes

// Start automatic refresh
setInterval(loadAllData, REFRESH_INTERVAL);
```

### Data Validation

```bash
# Test that all sheets are accessible
# Open browser console (F12) and check for errors

# Expected messages should include:
# "Dashboard sheet loaded: XXX rows"
# "Parts sheet loaded: XXX rows"
# "Call Center sheet loaded: XXX rows"
# "Evaluations sheet loaded: XXX rows"

# If any sheet fails to load:
# 1. Check the Sheet ID in config.js matches actual Google Sheet
# 2. Verify sheet is shared publicly or with correct email
# 3. Check internet connection
# 4. Check Google Sheets API quotas
```

---

## Testing Checklist

### Pre-Deployment Testing (Development)

- [ ] All pages load without console errors
- [ ] Navigation between pages works smoothly
- [ ] Filters apply correctly
- [ ] KPI calculations match expected values
- [ ] Export functions work (Excel, CSV)
- [ ] Part status badges display correctly
- [ ] Language switching works (3 languages)
- [ ] Responsive design works on mobile/tablet/desktop

### Staging Environment Testing

- [ ] SSL certificate is valid and not showing warnings
- [ ] All pages load with proper styling
- [ ] Google Sheets data is being fetched correctly
- [ ] Filters work across all views
- [ ] Charts render without lag
- [ ] No mixed content warnings (HTTP/HTTPS)
- [ ] Nginx reverse proxy is functioning
- [ ] PM2 auto-restart works (kill process and verify restart)

### Production Deployment Testing

```bash
# Full deployment test checklist

# 1. Server accessibility
curl -I https://yourdomain.com
# Response should be: HTTP/2 200 OK

# 2. SSL certificate verification
openssl s_client -connect yourdomain.com:443
# Should show valid certificate chain

# 3. Data loading
# Visit: https://yourdomain.com
# Open browser console (F12)
# Check for "Dashboard sheet loaded" messages
# Verify no errors in console

# 4. Feature testing
# - Navigate all pages
# - Test filters
# - Test export
# - Test language switching
# - Verify part status badges

# 5. Performance testing
# - Page load time < 3 seconds
# - No memory leaks in console
# - Charts render smoothly

# 6. Backup testing
# - Verify backup files are created
# - Test backup restoration procedure
```

### Automated Testing

```bash
# Create simple health check script
cat > /opt/AUX/health-check.sh << 'EOF'
#!/bin/bash

URL="https://yourdomain.com"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $RESPONSE -eq 200 ]; then
    echo "✅ Dashboard is healthy"
    exit 0
else
    echo "❌ Dashboard returned HTTP $RESPONSE"
    # Send alert email or notification
    exit 1
fi
EOF

chmod +x /opt/AUX/health-check.sh

# Schedule hourly health checks
crontab -e
# Add: 0 * * * * /opt/AUX/health-check.sh
```

---

## Monitoring & Maintenance

### Daily Tasks

```bash
# Check application status
pm2 status

# Check disk space
df -h

# Review recent logs
tail -20 /var/log/dashboard.log

# Monitor connections
netstat -an | grep ESTABLISHED | wc -l
```

### Weekly Tasks

- [ ] Review error logs for patterns
- [ ] Check Google Sheets data accuracy
- [ ] Verify backup completion
- [ ] Test data export functions
- [ ] Review performance metrics
- [ ] Check SSL certificate expiration (> 30 days)

### Monthly Tasks

- [ ] Security audit (review access logs)
- [ ] Performance optimization review
- [ ] Database/data cleanup
- [ ] Dependency updates (npm audit)
- [ ] Disaster recovery drill
- [ ] Team training on new features

### Quarterly Tasks

- [ ] Full system security audit
- [ ] Performance benchmarking
- [ ] Capacity planning review
- [ ] Google Sheets structure review
- [ ] Documentation updates

### Monitoring Tools

#### PM2 Web Dashboard

```bash
# Start PM2 web dashboard (accessible at http://localhost:9615)
pm2 web

# Or with port configuration
pm2 web --port 9615
```

#### System Monitoring

```bash
# Install system monitoring tools
sudo apt-get install htop iotop nethogs

# Real-time system monitor
htop

# Disk I/O monitor
iotop

# Network monitor
nethogs
```

#### Log Aggregation (Optional)

```bash
# Install ELK stack or use cloud logging
# Example: AWS CloudWatch, Datadog, New Relic

# For simple logging, use logrotate
sudo nano /etc/logrotate.d/dashboard

# Add:
/var/log/dashboard.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
}
```

---

## Troubleshooting

### Common Issues & Solutions

#### Issue: "Port 8000 already in use"

```bash
# Find process using port 8000
lsof -i :8000
# or
netstat -tuln | grep 8000

# Kill the process
kill -9 <PID>

# Or change PORT in .env
PORT=8001
pm2 restart dashboard
```

#### Issue: "Google Sheets data not loading"

```bash
# Check Sheet IDs in config.js
# Verify sheets are shared publicly
# Check browser console for errors (F12)
# Verify internet connection
# Check Google Sheets API quota
# Try clearing browser cache and reload
```

#### Issue: "SSL certificate errors"

```bash
# Verify certificate paths in .env
cat /etc/letsencrypt/live/yourdomain.com/fullchain.pem

# Check certificate expiration
openssl x509 -in /etc/letsencrypt/live/yourdomain.com/fullchain.pem -text -noout | grep -A 2 "Not After"

# Renew certificate
sudo certbot renew --force-renewal

# Restart server
pm2 restart dashboard
```

#### Issue: "High memory usage"

```bash
# Check for memory leaks
pm2 logs dashboard

# Restart application to clear memory
pm2 restart dashboard

# Review recent code changes that might cause leaks
git diff HEAD~1 Dashboard/js/

# Check for unbounded data structures
# Monitor over time with:
watch -n 5 'pm2 status'
```

#### Issue: "Slow page load"

```bash
# Check network tab in browser (F12)
# Identify which requests are slow

# Increase data cache TTL in .env
DATA_CACHE_TTL=7200  # 2 hours instead of 1 hour

# Optimize Google Sheets (remove unnecessary rows/columns)
# Enable gzip compression in Nginx (already configured)
# Enable browser caching (already configured)

# Check server resources
pm2 monit
htop
```

#### Issue: "Nginx 502 Bad Gateway"

```bash
# Check if upstream server (Node.js) is running
pm2 status
pm2 logs dashboard

# Verify Nginx can reach localhost:8000
curl http://localhost:8000

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Verify proxy configuration
sudo nginx -t
```

#### Issue: "Certificate renewal failing"

```bash
# Check certbot logs
sudo tail -f /var/log/letsencrypt/letsencrypt.log

# Verify DNS is properly configured
nslookup yourdomain.com

# Ensure port 80 is accessible for challenge
sudo ufw allow 80/tcp

# Manually renew
sudo certbot renew --dry-run
sudo certbot renew --force-renewal
```

### Debug Mode

Enable debug logging:

```bash
# Set environment variable
export LOG_LEVEL=debug

# Or in .env
LOG_LEVEL=debug

# Restart server
pm2 restart dashboard

# View detailed logs
pm2 logs dashboard
```

### Getting Help

If issues persist:

1. Check the [GitHub Issues](https://github.com/moahedyounes-debug/AUX/issues)
2. Review logs in `/var/log/dashboard.log`
3. Check browser console (F12)
4. Contact: moahed.younis@auxair.com
5. Document the issue with:
   - Error messages
   - Steps to reproduce
   - Environment details (OS, Node version, etc.)
   - Relevant log excerpts

---

## Rollback Procedures

### Quick Rollback (Last 5 minutes)

```bash
# If application crashes after deployment
pm2 restart dashboard

# This will automatically restart from last known state
```

### Version Rollback (Previous Git Commit)

```bash
# Show recent commits
git log --oneline -10

# Rollback to previous version
git revert <commit-hash>
git push origin main

# Or reset to previous commit (use with caution)
git reset --hard <commit-hash>
git push origin main --force
```

### Full Backup Restoration

```bash
# List available backups
ls -lh /var/backups/dashboard/

# Extract backup
cd /opt
tar -xzf /var/backups/dashboard/dashboard_YYYYMMDD_HHMMSS.tar.gz

# Reinstall dependencies
npm install --production

# Restart server
pm2 restart dashboard

# Verify restoration
curl http://localhost:8000
```

### Database Rollback (Google Sheets)

```bash
# Google Sheets has automatic version history
# In Google Sheets:
# 1. Click File → Version history
# 2. Select desired previous version
# 3. Click "Restore this version"
```

### Disaster Recovery Plan

**RTO (Recovery Time Objective):** < 1 hour  
**RPO (Recovery Point Objective):** < 24 hours

**Steps:**

1. Restore from latest backup
2. Verify data integrity
3. Restart application
4. Run health checks
5. Notify stakeholders
6. Monitor for issues

---

## Post-Deployment Checklist

After successfully deploying to production:

- [ ] SSL certificate is valid and auto-renewal configured
- [ ] Backups are running and tested
- [ ] Monitoring and alerting configured
- [ ] Team has been trained on new deployment
- [ ] Documentation has been updated
- [ ] Rollback procedure has been tested
- [ ] Performance baseline established
- [ ] Security audit completed
- [ ] Disaster recovery plan reviewed
- [ ] Stakeholders notified

---

## Support & Maintenance Contact

**Dashboard Owner:** MoAhed Younis  
**Email:** moahed.younis@auxair.com  
**GitHub Repository:** https://github.com/moahedyounes-debug/AUX  
**Documentation:** See README.md and other .md files in repository

**Escalation Path:**
1. Check troubleshooting section
2. Review GitHub issues
3. Contact dashboard owner
4. Open GitHub issue if bug found

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 4.0 | May 21, 2026 | Initial production-ready release |
| 3.0 | May 18, 2026 | Added translation support |
| 2.0 | May 15, 2026 | Added parts inventory |
| 1.0 | May 1, 2026 | Initial release |

---

**Document Generated:** May 21, 2026  
**Last Updated:** May 21, 2026  
**Status:** Ready for Production Deployment
