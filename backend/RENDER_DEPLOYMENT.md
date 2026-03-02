# Render Deployment Guide

## ✅ Fixed Issue

**Problem**: `npm ci` was failing because `package-lock.json` was missing.

**Solution**: Generated `package-lock.json` and updated Dockerfile to use `npm ci --omit=dev`.

---

## 🚀 Deploy to Render

### Prerequisites
- GitHub repository with your code
- MongoDB Atlas database
- Render account (free tier available)

### Step 1: Push Changes to GitHub

Make sure you commit and push the updated files:

```bash
git add backend/Dockerfile backend/package-lock.json
git commit -m "Fix Render deployment - add package-lock.json"
git push origin main
```

### Step 2: Create Web Service on Render

1. Go to https://render.com/dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure the service:

**Settings:**
- **Name**: `shiftsync-backend` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Docker`
- **Instance Type**: `Free` (or paid for better performance)

### Step 3: Add Environment Variables

In the Render dashboard, add these environment variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shiftsync
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
FRONTEND_URL=https://your-frontend-url.vercel.app
NODE_ENV=production
PORT=5000
```

**Important**: 
- Don't include quotes around values
- Make sure MongoDB URI is correct
- JWT secrets should be long random strings

### Step 4: Deploy

Click "Create Web Service" and Render will:
1. Clone your repository
2. Build the Docker image
3. Deploy your application
4. Provide a public URL (e.g., `https://shiftsync-backend.onrender.com`)

### Step 5: Verify Deployment

Once deployed, test your API:

```bash
curl https://your-app.onrender.com/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production"
}
```

---

## ✅ What Works on Render

- ✅ All REST API endpoints
- ✅ Authentication (JWT)
- ✅ Database operations (MongoDB)
- ✅ Real-time features (Socket.IO) ⭐
- ✅ WebSocket connections ⭐
- ✅ File uploads
- ✅ Cron jobs
- ✅ All features work!

---

## 🔧 Troubleshooting

### Build Fails with "npm ci" Error

**Solution**: Make sure `package-lock.json` is committed to your repository.

```bash
# Generate if missing
npm install --package-lock-only

# Commit and push
git add package-lock.json
git commit -m "Add package-lock.json"
git push
```

### Database Connection Error

**Check**:
1. MongoDB Atlas allows connections from anywhere (0.0.0.0/0)
2. MONGODB_URI environment variable is correct
3. Database user has proper permissions

**Fix in MongoDB Atlas**:
- Go to Network Access
- Add IP Address: `0.0.0.0/0` (Allow from anywhere)

### CORS Errors

**Check**:
- FRONTEND_URL environment variable matches your frontend domain exactly
- No trailing slash in FRONTEND_URL

### Health Check Fails

**Check**:
- Your app is listening on `process.env.PORT` (Render assigns this)
- Health endpoint `/health` exists and returns 200

### Socket.IO Not Connecting

**Check**:
1. Frontend is using correct WebSocket URL
2. CORS is configured properly
3. No proxy/firewall blocking WebSocket connections

**Frontend configuration**:
```typescript
// frontend/.env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_WS_URL=https://your-backend.onrender.com
```

---

## 📊 Render Free Tier Limitations

- **Spins down after 15 minutes of inactivity**
- **Cold start**: 30-60 seconds to wake up
- **750 hours/month** free (enough for one service running 24/7)
- **No custom domains** on free tier

### Handling Cold Starts

**Option 1**: Keep service warm with a cron job
```bash
# Use a service like cron-job.org to ping your health endpoint every 10 minutes
curl https://your-app.onrender.com/health
```

**Option 2**: Upgrade to paid plan ($7/month)
- No cold starts
- Always running
- Better performance

---

## 🔄 Auto-Deploy from GitHub

Render automatically deploys when you push to your main branch.

**To disable auto-deploy**:
1. Go to your service settings
2. Scroll to "Auto-Deploy"
3. Toggle off

**Manual deploy**:
- Click "Manual Deploy" → "Deploy latest commit"

---

## 📝 Environment Variables Reference

| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| MONGODB_URI | ✅ Yes | `mongodb+srv://...` | MongoDB connection string |
| JWT_SECRET | ✅ Yes | `your-secret-key-32-chars-min` | JWT signing secret |
| JWT_REFRESH_SECRET | ✅ Yes | `your-refresh-secret-32-chars` | Refresh token secret |
| FRONTEND_URL | ✅ Yes | `https://app.vercel.app` | Frontend URL for CORS |
| NODE_ENV | ✅ Yes | `production` | Environment mode |
| PORT | ⚠️ Auto | `5000` | Port (Render sets this) |

---

## 🎯 Performance Tips

### 1. Use Connection Pooling
Already implemented in `config/database.js`

### 2. Enable Compression
Add to `index.js`:
```javascript
import compression from 'compression';
app.use(compression());
```

### 3. Add Caching Headers
For static assets:
```javascript
app.use('/uploads', express.static('uploads', {
  maxAge: '1y',
  immutable: true
}));
```

### 4. Monitor Performance
- Use Render's built-in metrics
- Set up error tracking (Sentry, etc.)
- Monitor response times

---

## 🔐 Security Checklist

- ✅ Environment variables set (not in code)
- ✅ MongoDB network access configured
- ✅ CORS properly configured
- ✅ JWT secrets are strong and unique
- ✅ HTTPS enabled (automatic on Render)
- ✅ Rate limiting implemented (if needed)

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **MongoDB Atlas**: https://docs.atlas.mongodb.com

---

## ✅ Deployment Checklist

Before deploying:

- [ ] `package-lock.json` exists and is committed
- [ ] Dockerfile updated (uses `npm ci --omit=dev`)
- [ ] All environment variables ready
- [ ] MongoDB Atlas configured for external access
- [ ] Frontend URL known
- [ ] Code pushed to GitHub
- [ ] Render service created
- [ ] Environment variables added in Render
- [ ] Deployment successful
- [ ] Health check passes
- [ ] API endpoints tested
- [ ] Socket.IO connection tested
- [ ] Frontend connected to backend

---

## 🎉 Success!

Your backend should now be deployed and running on Render with full Socket.IO support!

**Next Steps**:
1. Update your frontend to use the Render backend URL
2. Test all features
3. Monitor logs for any errors
4. Set up custom domain (optional, paid plan)
