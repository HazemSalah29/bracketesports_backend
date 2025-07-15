# 🚀 Deployment Guide - Bracketesport Backend

This guide will show you how to deploy your Node.js backend API so your frontend can access it from anywhere.

## Quick Start Options

### 1. 🆓 **Render.com (Recommended for beginners)**

**Best for**: Free tier, easy setup, automatic deployments

#### Setup Steps:

1. **Push your code to GitHub** (if not already done)
2. **Sign up at [render.com](https://render.com)**
3. **Create a new Web Service**
   - Connect your GitHub repository
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`
4. **Add Environment Variables**:
   ```
   NODE_ENV=production
   PORT=10000
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret_here
   STRIPE_SECRET_KEY=your_stripe_secret
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   RIOT_API_KEY=your_riot_api_key
   NEWS_API_KEY=your_news_api_key
   FRONTEND_URL=https://your-frontend-domain.com
   ```
5. **Deploy!** - Your API will be available at `https://your-app-name.onrender.com`

### 2. ⚡ **Railway**

**Best for**: Simple deployment, great free tier

#### Setup Steps:

1. **Install Railway CLI**:
   ```bash
   npm install -g @railway/cli
   ```
2. **Login and deploy**:
   ```bash
   railway login
   railway init
   railway up
   ```
3. **Add environment variables** in Railway dashboard
4. **Your API**: `https://your-app.railway.app`

### 3. 🌐 **Vercel** (For Node.js APIs)

**Best for**: Serverless deployment, great for APIs

#### Setup Steps:

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```
2. **Deploy**:
   ```bash
   vercel
   ```
3. **Configure vercel.json** (already created below)

### 4. ☁️ **AWS/Heroku/DigitalOcean** (Production)

**Best for**: Production apps with high traffic

---

## 📁 Required Files for Deployment

### 1. vercel.json (for Vercel deployment)

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. Dockerfile (for containerized deployment)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

USER node

CMD ["npm", "start"]
```

### 3. .dockerignore

```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.tmp
.DS_Store
```

---

## 🔧 Pre-Deployment Checklist

### 1. **Database Setup (MongoDB Atlas)**

```bash
# Sign up at https://www.mongodb.com/atlas
# Create a cluster
# Get connection string
# Add to environment variables
```

### 2. **Environment Variables Setup**

Create these variables in your deployment platform:

```env
# Required
NODE_ENV=production
PORT=5000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bracketesport
JWT_SECRET=your-super-secret-jwt-key-min-32-characters

# API Keys
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret
RIOT_API_KEY=RGAPI-your-riot-api-key
NEWS_API_KEY=your-newsapi-key

# CORS
FRONTEND_URL=https://your-frontend-domain.com

# Optional
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
COIN_TO_USD_RATE=0.01
PLATFORM_FEE_PERCENTAGE=30
```

### 3. **Update package.json scripts**

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'No build required'",
    "test": "jest"
  }
}
```

---

## 🌍 Frontend Integration

Once deployed, update your frontend axios configuration:

### React Example:

```javascript
// src/config/api.js
const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'https://your-backend.onrender.com';

export const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Environment Variables for Frontend:

```env
# .env (for React)
REACT_APP_API_URL=https://your-backend.onrender.com
REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_or_live_key
```

---

## 🚀 Step-by-Step: Deploy to Render (Recommended)

### 1. **Prepare Your Repository**

```bash
# Make sure your code is on GitHub
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 2. **Deploy to Render**

1. Go to [render.com](https://render.com)
2. Sign up/Login with GitHub
3. Click "New +" → "Web Service"
4. Connect your repository
5. Configure:
   - **Name**: `bracketesport-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free

### 3. **Add Environment Variables**

In Render dashboard, add all the environment variables listed above.

### 4. **Deploy Database**

1. In Render, create a new PostgreSQL database OR
2. Use MongoDB Atlas (recommended)
   - Sign up at mongodb.com/atlas
   - Create cluster
   - Get connection string
   - Add to MONGODB_URI

### 5. **Test Your API**

```bash
# Test deployment
curl https://your-app.onrender.com/api/auth/health
```

---

## 🔄 Continuous Deployment

### GitHub Actions (Auto-deploy on push)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Render
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

---

## 📊 Monitoring & Maintenance

### 1. **Health Check Endpoint**

Your API already includes health checks at `/api/auth/health`

### 2. **Logging**

Monitor logs in your deployment platform dashboard

### 3. **Database Monitoring**

- MongoDB Atlas provides built-in monitoring
- Set up alerts for connection issues

### 4. **API Monitoring**

Consider tools like:

- Pingdom
- UptimeRobot
- New Relic

---

## 🛠️ Troubleshooting

### Common Issues:

1. **CORS Errors**:

   ```javascript
   // Make sure FRONTEND_URL is set correctly
   origin: process.env.FRONTEND_URL || 'http://localhost:3000';
   ```

2. **Environment Variables Not Loading**:

   - Check spelling in deployment platform
   - Restart your service after adding variables

3. **Database Connection Fails**:

   - Verify MongoDB URI format
   - Check IP whitelist in MongoDB Atlas

4. **API Routes Not Working**:
   - Ensure your base URL includes `/api`
   - Check route definitions in server.js

### Testing Your Deployed API:

```bash
# Test endpoints
curl https://your-backend.onrender.com/api/auth/health
curl -X POST https://your-backend.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"password123"}'
```

---

## 💰 Cost Breakdown

| Platform    | Free Tier              | Paid Plans        |
| ----------- | ---------------------- | ----------------- |
| **Render**  | 750 hours/month        | $7+/month         |
| **Railway** | $5 credit/month        | $0.000463/GB-hour |
| **Vercel**  | 100GB bandwidth        | $20+/month        |
| **Heroku**  | Discontinued free tier | $7+/month         |

---

## 🎯 Next Steps

1. **Choose deployment platform** (Render recommended)
2. **Set up MongoDB Atlas**
3. **Configure environment variables**
4. **Deploy and test**
5. **Update frontend configuration**
6. **Set up monitoring**

Your backend will be accessible at:

- **Render**: `https://your-app.onrender.com/api`
- **Railway**: `https://your-app.railway.app/api`
- **Vercel**: `https://your-app.vercel.app/api`

## 📞 Support

If you encounter issues:

1. Check deployment platform logs
2. Verify environment variables
3. Test API endpoints manually
4. Check database connectivity

**Your esports tournament platform backend is ready for production! 🏆**
