# Timeline App - Deployment Guide

This guide will help you deploy the Timeline frontend to GitHub Pages with Supabase as the backend.

## Architecture

```
GitHub Pages (Static Frontend) → Supabase API → PostgreSQL Database
```

**No backend server needed!** Everything runs serverless:
- Frontend: Static HTML/CSS/JS on GitHub Pages (free)
- Backend: Supabase PostgreSQL + Auto-generated REST API (free tier available)

---

## Prerequisites

1. **Supabase Account**: https://supabase.com
2. **GitHub Repository**: Your code pushed to GitHub
3. **Node.js 18+**: For local development

---

## Step 1: Configure Supabase

### 1.1 Get Your Supabase Credentials

1. Go to https://supabase.com/dashboard/project/alslzntgnfqqbptgbpsf/settings/api
2. Copy these values:
   - **Project URL**: `https://alslzntgnfqqbptgbpsf.supabase.co`
   - **anon public key**: (long string starting with `eyJ...`)

### 1.2 Update Local Environment

Edit `frontend/.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://alslzntgnfqqbptgbpsf.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 1.3 Set Up Row Level Security (RLS)

Run the SQL script in Supabase SQL Editor:

```bash
# Go to: https://supabase.com/dashboard/project/alslzntgnfqqbptgbpsf/sql
# Copy and paste the contents of setup_rls_policies.sql
# Click "Run"
```

Or via command line:
```bash
PGPASSWORD="r5Po109bLniQhMgZ" psql \
  -h aws-1-us-west-1.pooler.supabase.com \
  -U postgres.alslzntgnfqqbptgbpsf \
  -d postgres \
  -f setup_rls_policies.sql
```

---

## Step 2: Configure GitHub Repository

### 2.1 Add GitHub Secrets

Go to your repository settings:
```
https://github.com/YOUR_USERNAME/timeline/settings/secrets/actions
```

Add these secrets:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key

### 2.2 Enable GitHub Pages

1. Go to repository **Settings** → **Pages**
2. Under "Build and deployment":
   - **Source**: GitHub Actions
3. Save

---

## Step 3: Deploy

### Option A: Automatic Deployment (Recommended)

Simply push to the `main` branch:
```bash
git add .
git commit -m "Configure for GitHub Pages deployment"
git push origin main
```

The GitHub Action will automatically:
1. Build your Next.js app
2. Export static files
3. Deploy to GitHub Pages

### Option B: Manual Deployment

Trigger manually from GitHub Actions tab:
1. Go to **Actions** → **Deploy to GitHub Pages**
2. Click **Run workflow**
3. Select branch and click **Run workflow**

---

## Step 4: Verify Deployment

1. **Check GitHub Actions**:
   - Go to **Actions** tab
   - Verify the workflow completed successfully

2. **Visit Your Site**:
   ```
   https://YOUR_USERNAME.github.io/timeline/
   ```

3. **Test Functionality**:
   - Events should load from Supabase
   - Map should display event locations
   - You should be able to create/edit events (if RLS is configured for write access)

---

## Local Development

### Run Locally

```bash
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:3000`

### Build Locally

Test the static export:
```bash
npm run build
```

The static files will be in `frontend/out/`

---

## Troubleshooting

### Events Not Loading

1. **Check Browser Console** for errors
2. **Verify Supabase URL** in `.env.local` or GitHub Secrets
3. **Check RLS Policies**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT * FROM pg_policies WHERE schemaname = 'public';
   ```

### Build Fails

1. **Check Node version**: Must be 18+
   ```bash
   node --version
   ```

2. **Clear cache**:
   ```bash
   rm -rf node_modules .next
   npm install
   npm run build
   ```

### GitHub Actions Fails

1. **Check secrets** are set correctly in repository settings
2. **Verify** `NEXT_PUBLIC_SUPABASE_ANON_KEY` doesn't have extra spaces
3. **Review logs** in GitHub Actions tab for specific errors

---

## Cost

- **GitHub Pages**: Free for public repositories
- **Supabase**:
  - Free tier: 500MB database, 2GB bandwidth/month, 50MB file storage
  - Paid tier: Starts at $25/month for more resources

---

## Security Notes

1. **Anon Key is Safe**: The `NEXT_PUBLIC_SUPABASE_ANON_KEY` is meant to be public
2. **RLS Protects Data**: Row Level Security policies control access
3. **For Production**: Consider adding authentication (Supabase Auth)

---

## Next Steps

### Add Authentication (Optional)

For user authentication:
1. Enable Supabase Auth in dashboard
2. Update RLS policies to check `auth.uid()`
3. Add login/signup UI

### Custom Domain (Optional)

1. Add `CNAME` file to `frontend/public/`:
   ```
   your-domain.com
   ```
2. Configure DNS to point to GitHub Pages
3. Enable HTTPS in repository settings

### Monitoring

- **Supabase Dashboard**: Monitor database usage
- **GitHub Pages**: Check deployment status
- **Browser DevTools**: Debug client-side issues

---

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **GitHub Pages**: https://docs.github.com/pages
