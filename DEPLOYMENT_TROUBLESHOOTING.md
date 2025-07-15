# 🚨 Render Deployment Troubleshooting Guide

## Current Error: npm error signal SIGTERM

### 🔍 What This Error Means:
- `SIGTERM` = Process termination signal
- Usually means the app took too long to start or crashed during startup
- Common on Render's free tier due to resource limitations

## 🛠️ Quick Fixes to Try:

### 1. **Check Environment Variables in Render**
Go to your Render dashboard and verify these are set:

```
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://bracketesports_admin:UU5wg8DCeXu7qfNY@bracketesports-prod.6w6yjfb.mongodb.net/bracketesports?retryWrites=true&w=majority
JWT_SECRET=BracketEsports2025SecretKeyForJWTTokensVerySecure123456
FRONTEND_URL=https://bracketesports.vercel.app
```

### 2. **Update Build Command in Render**
In your Render service settings:
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 3. **Check MongoDB Atlas Network Access**
1. Go to MongoDB Atlas dashboard
2. Navigate to "Network Access"
3. Ensure `0.0.0.0/0` is whitelisted (allows access from anywhere)

### 4. **Verify Database User Permissions**
1. Go to "Database Access" in MongoDB Atlas
2. Ensure user `bracketesports_admin` has "Read and write to any database" permissions

## 🔄 Step-by-Step Fix Process:

### Step 1: Update Your Code
```bash
# In your local terminal
git add .
git commit -m "Fix deployment issues - add graceful shutdown and timeout handling"
git push origin main
```

### Step 2: Trigger Manual Deploy in Render
1. Go to your Render dashboard
2. Click on "bracketesports-backend" service
3. Click "Manual Deploy" → "Deploy latest commit"

### Step 3: Monitor Deployment Logs
1. Go to "Logs" tab in Render
2. Watch for these success messages:
   - "MongoDB connected successfully"
   - "Server running on port 10000"

## 🧪 Test Deployment Success:

### Test 1: Health Check
```bash
curl https://bracketesports-backend.onrender.com/api/health
```
**Expected Response:**
```json
{"status":"OK","timestamp":"...","environment":"production"}
```

### Test 2: CORS Check
```bash
curl -H "Origin: https://bracketesports.vercel.app" https://bracketesports-backend.onrender.com/api/health
```
**Should include CORS headers**

## 🚨 If Still Failing:

### Check Logs for Specific Errors:
1. MongoDB connection timeout
2. Missing environment variables
3. Port binding issues
4. Memory limit exceeded

### Common Error Messages & Solutions:

#### "MongoNetworkTimeoutError"
- **Cause**: Can't connect to MongoDB
- **Fix**: Check MONGODB_URI and network access

#### "EADDRINUSE"
- **Cause**: Port already in use
- **Fix**: Render should handle this automatically

#### "Cannot read property of undefined"
- **Cause**: Missing environment variables
- **Fix**: Add all required environment variables

## 🔧 Alternative Deployment Options:

### Option 1: Railway (Often More Stable)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Option 2: Heroku
```bash
# Create Procfile
echo "web: npm start" > Procfile
git add Procfile
git commit -m "Add Procfile for Heroku"

# Deploy to Heroku
heroku create bracketesports-backend
heroku config:set NODE_ENV=production
heroku config:set MONGODB_URI="your_mongodb_uri"
git push heroku main
```

## 📞 Last Resort Debugging:

### Add Debug Logging:
Add this to your server.js to see what's failing:

```javascript
console.log('🚀 Starting server...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Port:', process.env.PORT);
console.log('MongoDB URI exists:', !!process.env.MONGODB_URI);
console.log('JWT Secret exists:', !!process.env.JWT_SECRET);
```

## ✅ Success Indicators:

Your deployment is working when you see:
1. ✅ Build completes without errors
2. ✅ Health endpoint returns 200 status
3. ✅ MongoDB connection successful in logs
4. ✅ CORS headers present for your frontend URL

## 🎯 Next Steps After Fix:

1. Test all API endpoints
2. Connect your Vercel frontend
3. Test full user registration/login flow
4. Verify real-time features work

Your esports platform is almost ready! 🏆
