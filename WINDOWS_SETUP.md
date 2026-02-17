# Real Casual Lease - Windows Setup Guide

## ✅ What's Fixed

This package has been updated to work perfectly on Windows:
- ✅ Fixed `NODE_ENV` commands to use `cross-env`
- ✅ Added Windows batch files for easy setup
- ✅ Cross-platform compatibility ensured

---

## 🚀 Quick Start (3 Steps)

### Option 1: Using Batch Files (Easiest!)

1. **Double-click:** `windows-setup.bat`
   - This installs everything automatically
   
2. **Double-click:** `start-windows.bat`
   - This starts the server

3. **Open browser:** http://localhost:5000

**That's it!** ✨

---

### Option 2: Using Command Line

Open PowerShell or Command Prompt in this folder:

```powershell
# Step 1: Install dependencies
npm install

# Step 2: Run database migrations (if you have PostgreSQL)
npm run db:push

# Step 3: Start the server
npm run dev
```

Then open: http://localhost:5000

---

## 📋 Prerequisites

Before starting, make sure you have:

### 1. Node.js (Required)
- Download: https://nodejs.org
- Version: 18.x or higher
- Check: `node -v` should show v18 or higher

### 2. PostgreSQL (Required for full functionality)
- Download: https://www.postgresql.org/download/windows/
- Or use Docker: `docker run -p 5432:5432 -e POSTGRES_PASSWORD=password postgres`
- Check: PostgreSQL should be running on port 5432

### 3. Database Configuration
Create a `.env` file in this folder with:
```
DATABASE_URL=postgresql://username:password@localhost:5432/casuallease
```

---

## 🔧 What Changed for Windows

### Fixed Scripts
**Before (doesn't work on Windows):**
```json
"dev": "NODE_ENV=development tsx watch server/_core/index.ts"
```

**After (works everywhere):**
```json
"dev": "cross-env NODE_ENV=development tsx watch server/_core/index.ts"
```

### Added cross-env Package
The `cross-env` package makes environment variables work on Windows, Mac, and Linux.

---

## 🎯 Testing the Setup

### Step 1: Verify Installation
```powershell
node -v    # Should show v18 or higher
npm -v     # Should show 8 or higher
```

### Step 2: Install Dependencies
```powershell
npm install
```

**Expected output:**
```
added XXX packages
```

### Step 3: Start Server
```powershell
npm run dev
```

**Expected output:**
```
> casuallease@1.0.0 dev
> cross-env NODE_ENV=development tsx watch server/_core/index.ts

Server running on http://localhost:5000
Database connected
```

### Step 4: Test in Browser
Open: http://localhost:5000

You should see the homepage with:
- Logo in header
- FAQ section at bottom
- Search functionality

---

## 🐛 Troubleshooting

### Problem: "cross-env is not recognized"

**Solution:**
```powershell
# Delete node_modules and reinstall
Remove-Item -Recurse -Force node_modules
npm install
```

---

### Problem: "Database connection failed"

**Solution 1:** Make sure PostgreSQL is running
```powershell
# Check if PostgreSQL service is running
Get-Service -Name postgresql*
```

**Solution 2:** Check your `.env` file exists and has correct credentials
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/casuallease
```

**Solution 3:** Create the database
```powershell
# Connect to PostgreSQL (you'll need psql installed)
psql -U postgres
CREATE DATABASE casuallease;
\q
```

---

### Problem: "Port 5000 already in use"

**Solution 1:** Kill the process using port 5000
```powershell
# Find what's using port 5000
netstat -ano | findstr :5000

# Kill it (replace XXXX with the PID from above)
taskkill /PID XXXX /F
```

**Solution 2:** Use a different port
```powershell
# Edit package.json and add --port flag
"dev": "cross-env NODE_ENV=development tsx watch server/_core/index.ts --port 3000"
```

---

### Problem: "Cannot find module"

**Solution:**
```powershell
# Clear npm cache and reinstall
npm cache clean --force
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

---

### Problem: PowerShell Execution Policy Error

**Error:** "cannot be loaded because running scripts is disabled"

**Solution:**
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then try again in regular PowerShell
npm run dev
```

---

## 🎨 Features to Test

Once the server is running, test these features:

### 1. Homepage
- ✅ Logo should appear in header
- ✅ Search bar works
- ✅ FAQ section at bottom (click questions to expand)

### 2. Admin Dashboard
**Login as MegaAdmin:**
- URL: http://localhost:5000/login
- Create admin: `npm run seed:admin`

**Test these pages:**
- `/admin/logo-management` - Switch between 5 logos
- `/admin/owner-logo-allocation` - Allocate logos to owners
- `/admin/manage-faq` - Manage FAQ content
- `/admin/pending-approvals` - See insurance validation

### 3. Logo System
- Click different logos → should change instantly
- Upload a custom logo → should work
- Check admin sidebar → should show selected logo

### 4. FAQ System
- Go to homepage
- Scroll to "Frequently Asked Questions"
- Click questions → should expand/collapse
- Test admin CRUD operations

---

## 📁 Project Structure

```
Realcasuallease-modified/
├── client/                 # Frontend (React)
│   ├── src/
│   │   ├── pages/         # All pages
│   │   ├── components/    # Reusable components
│   │   └── hooks/         # Custom React hooks
│   └── public/
│       └── logos/         # Add your 5 logo files here!
├── server/                # Backend (Express + tRPC)
│   ├── _core/            # Core server files
│   ├── routers.ts        # API endpoints
│   └── db.ts             # Database functions
├── drizzle/              # Database schema
├── migrations/           # SQL migrations
├── package.json          # ✅ Fixed for Windows!
├── windows-setup.bat     # ✅ Easy setup script
└── start-windows.bat     # ✅ Easy start script
```

---

## 🔑 Important Files

### Add Your Logos
Place 5 logo files here:
```
client/public/logos/
├── logo_1.png
├── logo_2.png
├── logo_3.png
├── logo_4.png
└── logo_5.png
```

**Recommendations:**
- PNG with transparent background
- 400-600px wide × 100-200px tall
- Under 500KB each

### Configure Database
Create `.env` file:
```
DATABASE_URL=postgresql://username:password@localhost:5432/casuallease
BASE_URL=http://localhost:5000
```

---

## 🎓 Next Steps

1. ✅ Get it running locally (you're doing this now!)
2. ✅ Add your 5 logo files
3. ✅ Test all features
4. ✅ Configure your database properly
5. ✅ Deploy to production (when ready)

---

## 💡 Tips for Windows Users

### Use Windows Terminal
Better than Command Prompt:
- Download from Microsoft Store
- Modern, tabbed interface
- Better copy/paste

### Use VS Code
Best IDE for this project:
- Download: https://code.visualstudio.com
- Open folder in VS Code
- Integrated terminal: Ctrl + `
- Run commands directly

### Use Git Bash (Optional)
If you prefer Linux-style commands:
- Comes with Git for Windows
- Unix-style commands work
- Better for following Linux tutorials

---

## 🆘 Still Having Issues?

### Check These:
1. Node.js version: `node -v` (should be 18+)
2. npm version: `npm -v` (should be 8+)
3. PostgreSQL running: `Get-Service postgresql*`
4. .env file exists with correct DATABASE_URL
5. Ran `npm install` successfully

### Get Detailed Logs:
```powershell
# Run with verbose logging
npm run dev --verbose

# Check for specific errors
# Copy the error message and search online
```

### Common Error Messages:

**"ENOENT: no such file or directory"**
→ File path issue, check you're in the right folder

**"EADDRINUSE: address already in use"**
→ Port 5000 is taken, kill that process or use different port

**"Cannot find module"**
→ Run `npm install` again

**"Database connection failed"**
→ Check PostgreSQL is running and .env is correct

---

## 🎉 Success!

If you see this in your terminal:
```
Server running on http://localhost:5000
Database connected
```

**You're ready to go!** 🚀

Open http://localhost:5000 in your browser and enjoy!

---

## 📖 Documentation

For more details, see these guides:
- `FINAL_COMPLETE_SUMMARY.md` - Overview of all features
- `LOGO_SYSTEM_COMPLETE.md` - Logo management
- `OWNER_LOGO_ALLOCATION_GUIDE.md` - Owner-specific logos
- `FAQ_FEATURE_GUIDE.md` - FAQ system

---

**Need help?** The batch files make it super easy - just double-click and you're running! ✨
