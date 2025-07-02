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

## Step 4: Set Up GitHub Secrets (Secure Method)

1. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**
2. Click "New repository secret" and add these two secrets:
   
   **First Secret:**
   - Name: `SUPABASE_URL`
   - Secret: `https://your-project-ref.supabase.co` (your actual Project URL)
   
   **Second Secret:**
   - Name: `SUPABASE_ANON_KEY` 
   - Secret: `your-anon-public-key-here` (your actual anon public key)

3. Click "Add secret" for each one

**Note**: Don't change anything in your local `script.js` file - the GitHub Action will automatically inject these values during deployment.

## Step 5: Enable GitHub Actions

1. In your GitHub repository, go to **Settings** → **Actions** → **General**
2. Under "Actions permissions", make sure it's set to "Allow all actions and reusable workflows"
3. Click "Save" if you made any changes

## Step 6: Deploy with GitHub Actions

1. After setting up your secrets, **any push to the main branch** will automatically:
   - Build your site with the Supabase credentials injected
   - Deploy to GitHub Pages securely

2. Push any change to trigger the first deployment:
```bash
git add .
git commit -m "Trigger GitHub Actions deployment"  
git push
```

3. Go to **Actions** tab in your GitHub repo to watch the deployment
4. Once the action completes (green checkmark), your site is live with Supabase!

## Step 7: Test Your Live Site

1. Visit your GitHub Pages URL
2. Login and make an edit (add/edit a project or experience)  
3. Open in incognito mode - your changes should be visible to everyone!
4. Check browser console for "Data saved to Supabase" message

## Step 8: Test Locally (Optional)

To test Supabase locally, you'll need to temporarily add your credentials to `script.js`:

1. Replace the placeholder values in lines 8-9 of `script.js` with your actual credentials
2. Test locally, then **revert these changes** before committing
3. The GitHub Action handles credentials for production

## How It Works

- **When you edit as admin**: Data saves to both localStorage (backup) and Supabase database
- **When visitors load the site**: Data loads from Supabase database first, falls back to localStorage, then to default data
- **Everyone sees your edits**: All visitors get the latest data from your database

## Security

- **GitHub Secrets**: Your credentials are stored securely and never exposed in your code
- **Build-time injection**: Credentials are only added during the automated build process
- **Fingerprint authentication**: Only you can edit the portfolio
- **Public viewing**: Everyone can see the latest data you've published

## Troubleshooting

- **GitHub Action fails**: Check that your secrets are named exactly `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- **Console errors**: Verify your Supabase credentials in GitHub Secrets
- **Data not saving**: Check the table was created with exact column names: `id`, `data_type`, `content`, `updated_at`
- **Changes not visible**: Wait a few seconds and refresh - database operations can take a moment
- **Local testing issues**: Remember to temporarily add real credentials to test locally, then revert before committing