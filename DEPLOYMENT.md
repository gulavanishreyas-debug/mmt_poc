# Deploying MakeMyTrip Social Cart to Vercel

## Prerequisites
- GitHub/GitLab/Bitbucket account
- [Vercel account](https://vercel.com/signup) (free)

## Deployment Methods

### Method 1: Deploy via Vercel Dashboard (Easiest)

1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/mmt-social-cart.git
   git push -u origin main
   ```

2. **Deploy to Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click "Import Project"
   - Select your GitHub repository
   - Click "Deploy" (Vercel auto-detects Next.js settings)
   - Wait ~2 minutes for build to complete

3. **Your app is live!** 🎉
   - Vercel provides a URL like: `https://mmt-social-cart.vercel.app`
   - Share this URL with anyone to test your app

### Method 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```
   - Follow the prompts (press Enter to accept defaults)
   - First deployment creates the project
   - Get production URL instantly

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

## Configuration Files Added

### `vercel.json`
Configures SSE endpoint timeout to 60 seconds (max for Hobby plan):
```json
{
  "functions": {
    "app/api/social-cart/events/route.ts": {
      "maxDuration": 60
    }
  }
}
```

### `.vercelignore`
Excludes unnecessary files from deployment to speed up builds.

## Important Notes for Production

### ⚠️ In-Memory Storage Limitations
Your app uses in-memory storage (`app/api/social-cart/storage.ts`) which means:
- **Data resets on every deployment**
- **Data resets when serverless functions go idle** (~5-15 minutes of inactivity)
- **Each serverless region has separate memory** (multi-region inconsistency)

**For Demo/POC:** This is perfectly fine!  
**For Production:** Consider adding a database:
- **Vercel KV** (Redis) - Free tier available
- **Supabase** (PostgreSQL) - Free tier with real-time features
- **MongoDB Atlas** - Free tier (512MB)

### ✅ What Works on Vercel
- Real-time sync via Server-Sent Events (SSE)
- Multi-user collaboration (during active sessions)
- All animations and gamification
- WhatsApp sharing
- Mobile-responsive UI

### ⚠️ Known Limitations
- **Session duration:** SSE connections auto-close after 60 seconds (Hobby plan limit)
  - Client auto-reconnects, but brief disconnection may occur
- **Cold starts:** First request after idle period takes ~3-5 seconds
- **No persistent state:** Trip data lost after inactivity

## Testing Your Deployment

1. **Open the deployed URL** in your browser
2. **Test multi-user flow:**
   - Open main URL in one browser
   - Create a trip
   - Copy invitation link
   - Open invitation link in incognito/another browser
   - Verify real-time sync works

3. **Check console logs:**
   - Open browser DevTools → Console
   - Look for `[useRealTimeSync]` connection messages
   - Verify SSE events are received

## Custom Domain (Optional)

1. Go to your Vercel project dashboard
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Follow DNS configuration instructions

## Troubleshooting

### Build Fails
```bash
# Test build locally first
npm run build
```
If local build works but Vercel fails, check:
- Node version compatibility (Vercel uses Node 18 by default)
- Missing environment variables

### SSE Not Working
- Check browser console for connection errors
- Verify `vercel.json` is deployed (check project settings)
- Test with multiple tabs/browsers

### Data Lost Immediately
- Normal behavior - serverless functions are stateless
- Data persists only during active user sessions
- Add database for true persistence

## Cost Estimate

**Vercel Hobby Plan (FREE):**
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Global CDN
- ✅ Preview deployments for Git branches

**Sufficient for:** Personal projects, demos, portfolios, POCs

## Next Steps

After deployment, consider:
1. ✅ Share the live URL with stakeholders
2. 📊 Monitor usage via Vercel Analytics (free)
3. 🔍 Add error tracking (Sentry free tier)
4. 💾 Plan database integration for production
5. 🚀 Set up CI/CD for automatic deployments on Git push

---

**Need help?** Check Vercel's excellent [Next.js deployment docs](https://vercel.com/docs/frameworks/nextjs)
