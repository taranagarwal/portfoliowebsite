# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up (free)
2. Click "New Project"
3. Choose your organization and enter:
   - **Name**: `portfolio-website` (or any name you prefer)
   - **Database Password**: Create a strong password
   - **Region**: Choose closest to you
4. Click "Create new project" and wait for setup to complete

## Step 2: Create Database Table

1. In your Supabase dashboard, go to **Table Editor** (left sidebar)
2. Click "Create a new table"
3. **Table name**: `portfolio_data`
4. **Columns** (add these one by one):
   - `id` - Type: `int8` - Default: `AUTO INCREMENT` - Primary Key: ✅
   - `data_type` - Type: `text` - Required: ✅
   - `content` - Type: `jsonb` - Required: ✅
   - `updated_at` - Type: `timestamptz` - Default: `now()`
5. Click "Save"

## Step 3: Get Your API Credentials

1. Go to **Settings** → **API** (left sidebar)
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **anon public** key (long string under "Project API keys")

## Step 4: Set Up Environment Variables (Secure Method)

### Option A: GitHub Secrets (Recommended)

1. In your GitHub repo, go to **Settings** → **Secrets and variables** → **Actions**
2. Click "New repository secret" and add:
   - Name: `SUPABASE_URL` Value: `https://your-project-ref.supabase.co`
   - Name: `SUPABASE_ANON_KEY` Value: `your-anon-public-key-here`
3. Your GitHub Action will automatically replace these in the code during deployment

### Option B: Direct Code (Less Secure but Simpler)

1. Open `script.js`
2. Find lines 8-9 and replace with your actual values:

```javascript
this.supabaseUrl = 'https://your-project-ref.supabase.co';
this.supabaseKey = 'your-anon-public-key-here';
```

**Note**: Supabase anon keys are designed to be client-side safe, but GitHub Secrets is more secure.

## Step 5: Test Locally

1. Open your local portfolio website
2. Login and make an edit (add/edit a project or experience)
3. Check the browser console - you should see "Data saved to Supabase"
4. Refresh the page - your changes should persist
5. Open in incognito mode - your changes should be visible to everyone!

## Step 6: Deploy

1. Commit and push your changes:
```bash
git add script.js
git commit -m "Add Supabase credentials"
git push
```

2. Wait 5-10 minutes for GitHub Pages to deploy
3. Test your live site - admin edits should now persist for all visitors!

## How It Works

- **When you edit as admin**: Data saves to both localStorage (backup) and Supabase database
- **When visitors load the site**: Data loads from Supabase database first, falls back to localStorage, then to default data
- **Everyone sees your edits**: All visitors get the latest data from your database

## Security

- Your anon public key is safe to commit to GitHub - it only allows read/write to your database
- Only you can edit (fingerprint authentication)
- Everyone can view the latest data

## Troubleshooting

- **Console errors**: Check your URL and API key are correct
- **Data not saving**: Check the table was created with exact column names
- **Changes not visible**: Wait a few seconds and refresh - database operations can take a moment