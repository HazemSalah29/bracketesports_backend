# 🚀 Pre-Deployment Checklist

Before deploying your Bracketesport backend, make sure you complete these steps:

## ✅ Code Preparation

- [ ] All code is committed to Git
- [ ] No sensitive data (API keys, passwords) in code
- [ ] All routes tested locally
- [ ] Error handling implemented
- [ ] CORS configured properly

## ✅ Database Setup

- [ ] MongoDB Atlas account created
- [ ] Database cluster created
- [ ] Database user created with appropriate permissions
- [ ] IP whitelist configured (0.0.0.0/0 for production)
- [ ] Connection string obtained

## ✅ API Keys & Services

- [ ] Stripe account setup (for payments)
  - [ ] Secret key obtained
  - [ ] Webhook endpoint configured
  - [ ] Test/Live mode configured
- [ ] Riot Games API key obtained
- [ ] News API key obtained from newsapi.org
- [ ] JWT secret generated (32+ characters)

## ✅ Environment Variables

Copy from `.env.production.template` and fill in:

- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI=your_connection_string`
- [ ] `JWT_SECRET=your_secret_key`
- [ ] `STRIPE_SECRET_KEY=sk_live_or_test_key`
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_your_webhook`
- [ ] `RIOT_API_KEY=RGAPI-your_key`
- [ ] `NEWS_API_KEY=your_newsapi_key`
- [ ] `FRONTEND_URL=https://your-frontend-domain.com`

## ✅ Deployment Platform Choice

Choose one:

- [ ] **Render.com** (Recommended for beginners)
- [ ] **Railway** (Great developer experience)
- [ ] **Vercel** (Serverless functions)
- [ ] **AWS/Heroku/DigitalOcean** (Production scale)

## ✅ Platform-Specific Setup

### For Render.com:

- [ ] GitHub repository connected
- [ ] Build command: `npm install`
- [ ] Start command: `npm start`
- [ ] Environment variables added
- [ ] Auto-deploy enabled

### For Railway:

- [ ] Railway CLI installed: `npm install -g @railway/cli`
- [ ] Railway account created
- [ ] Project initialized: `railway init`

### For Vercel:

- [ ] Vercel CLI installed: `npm install -g vercel`
- [ ] `vercel.json` configuration file present
- [ ] Serverless functions configured

## ✅ Post-Deployment Testing

- [ ] Health check endpoint working: `GET /api/health`
- [ ] Authentication endpoints working
- [ ] Database connection successful
- [ ] CORS headers configured correctly
- [ ] API accessible from frontend domain

## ✅ Frontend Integration

- [ ] Frontend API URL updated to production
- [ ] CORS origin matches frontend domain
- [ ] Authentication flow tested
- [ ] All API endpoints tested from frontend

## ✅ Monitoring & Maintenance

- [ ] Error logging configured
- [ ] Database monitoring setup
- [ ] API uptime monitoring
- [ ] SSL certificate active (handled by platform)

## 🚨 Security Checklist

- [ ] Environment variables secure
- [ ] Rate limiting enabled
- [ ] Helmet security headers active
- [ ] JWT secret is strong and unique
- [ ] Database access restricted
- [ ] HTTPS enabled (automatic on most platforms)

## 📞 Emergency Contacts

- **Platform Support**: Check your chosen platform's documentation
- **Database Issues**: MongoDB Atlas support
- **Payment Issues**: Stripe support
- **API Issues**: Check provider documentation

---

## 🏁 Deployment Commands

### Quick Deploy (Render):

1. `git push origin main`
2. Go to render.com → Connect repo → Deploy

### Quick Deploy (Railway):

```bash
railway login
railway init
railway up
```

### Quick Deploy (Vercel):

```bash
vercel
```

### Test Locally:

```bash
npm run dev
```

---

**✨ You're ready to deploy! Your esports tournament platform will be live soon! 🏆**
