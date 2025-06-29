# Portfolio Website

A responsive, editable portfolio website with admin authentication.

## Setup

1. **Clone the repository**
2. **Set up configuration:**
   ```bash
   cp config.example.js config.js
   ```
3. **Edit config.js** and set your admin password:
   ```javascript
   window.CONFIG = {
       ADMIN_PASSWORD: 'your-secure-password-here'
   };
   ```
4. **Open index.html** in your browser

## Features

- Responsive design
- Admin login for editing content
- Photo editor with zoom/pan
- Automatic experience sorting
- Export data for deployment

## Security

- Password is stored in `config.js` (not committed to git)
- Use `.gitignore` to protect sensitive files
- Change the default password before deployment

## Deployment

1. Edit all content locally
2. Login and click "Export Data"
3. Replace default data in `script.js` with exported data
4. Deploy to GitHub Pages, Netlify, or Vercel
5. For deployment, you can remove the login system entirely

## File Structure

```
├── index.html          # Main page
├── styles.css          # Styling
├── script.js           # Main functionality
├── config.js           # Configuration (not in git)
├── config.example.js   # Template for config
├── .gitignore         # Git ignore rules
└── README.md          # This file
```