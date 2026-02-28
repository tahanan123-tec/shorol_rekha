# Quick Fix for Red Underlines

## The Problem
You're seeing red underlines in `.tsx` and `.js` files because the dependencies haven't been installed yet.

## The Solution (Choose One)

### Option 1: Automated Script (Recommended)

**Windows (PowerShell):**
```powershell
.\install-dependencies.ps1
```

**Mac/Linux (Bash):**
```bash
chmod +x install-dependencies.sh
./install-dependencies.sh
```

### Option 2: Manual Installation

```bash
# Install all dependencies at once
cd admin-dashboard && npm install && cd ..
cd client && npm install && cd ..
cd services/identity-provider && npm install && cd ../..
cd services/order-gateway && npm install && cd ../..
cd services/stock-service && npm install && cd ../..
cd services/kitchen-queue && npm install && cd ../..
cd services/notification-hub && npm install && cd ../..
cd services/chaos-monkey && npm install && cd ../..
cd services/predictive-scaler && npm install && cd ../..
```

### Option 3: Docker (No Local Install Needed)

If you just want to run the system without fixing IDE errors:

```bash
docker-compose up -d
```

The code will work fine in Docker even with red underlines in your IDE.

---

## After Installing

1. **Reload VS Code:**
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
   - Type: `Developer: Reload Window`
   - Press Enter

2. **Verify:**
   - Open any `.tsx` file
   - Red underlines should be gone
   - Autocomplete should work

---

## Why This Happens

The TypeScript files need the `node_modules` folder with all dependencies installed. Without it:
- ❌ Cannot find module 'axios'
- ❌ Cannot find module 'lucide-react'
- ❌ Cannot find name 'process'
- ❌ JSX element implicitly has type 'any'

After running `npm install`:
- ✅ All modules found
- ✅ Type definitions loaded
- ✅ JSX recognized
- ✅ Autocomplete works

---

## Files That Will Be Fixed

### Admin Dashboard
- `admin-dashboard/src/pages/index.tsx`
- `admin-dashboard/src/components/ServiceHealthCard.tsx`
- `admin-dashboard/src/components/ChaosPanel.tsx`
- `admin-dashboard/src/lib/api.ts`

### Client
- `client/src/pages/index.tsx`
- `client/src/pages/login.tsx`
- `client/src/lib/api.ts`

### Backend Services
- All `.js` files in services folders

---

## Still Have Errors?

If errors persist after installing and reloading:

1. **Restart TypeScript Server:**
   - `Ctrl+Shift+P` → `TypeScript: Restart TS Server`

2. **Clear Cache:**
   ```bash
   # Delete .next folders
   rm -rf admin-dashboard/.next
   rm -rf client/.next
   ```

3. **Reinstall:**
   ```bash
   cd admin-dashboard
   rm -rf node_modules package-lock.json
   npm install
   ```

---

## Summary

**Quick Fix:**
```bash
# Windows
.\install-dependencies.ps1

# Mac/Linux
./install-dependencies.sh
```

Then reload VS Code: `Ctrl+Shift+P` → `Developer: Reload Window`

That's it! All red underlines will disappear.
