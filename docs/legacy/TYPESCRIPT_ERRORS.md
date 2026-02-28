# Fix TypeScript/TSX Errors

## Issue
Red underlines in `.tsx` and `.ts` files due to missing dependencies and type definitions.

## Root Cause
1. Node modules not installed
2. Missing `next-env.d.ts` files
3. TypeScript language server needs to recognize Next.js types

---

## ✅ Files Fixed

1. ✅ `admin-dashboard/tsconfig.json` - Added Next.js plugin
2. ✅ `admin-dashboard/next-env.d.ts` - Created
3. ✅ `client/next-env.d.ts` - Created

---

## 🔧 Solution Steps

### Step 1: Install Dependencies

Run these commands to install all required dependencies:

```bash
# Admin Dashboard
cd admin-dashboard
npm install

# Client
cd ../client
npm install

# Go back to root
cd ..
```

### Step 2: Reload VS Code

After installing dependencies, reload VS Code:

**Option A: Command Palette**
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type: `Developer: Reload Window`
3. Press Enter

**Option B: Restart TypeScript Server**
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type: `TypeScript: Restart TS Server`
3. Press Enter

### Step 3: Verify Fix

Open any `.tsx` file and check:
- ✅ No red underlines on imports
- ✅ No "Cannot find module" errors
- ✅ JSX elements recognized
- ✅ Autocomplete working

---

## 📦 Dependencies Installed

### Admin Dashboard (`admin-dashboard/package.json`)

**Runtime Dependencies:**
- `next` ^14.0.4
- `react` ^18.2.0
- `react-dom` ^18.2.0
- `axios` ^1.6.2
- `lucide-react` ^0.294.0
- `recharts` ^2.10.3
- `react-hot-toast` ^2.4.1
- `zustand` ^4.4.7
- `date-fns` ^3.0.6

**Dev Dependencies:**
- `@types/node` ^20.10.5
- `@types/react` ^18.2.45
- `@types/react-dom` ^18.2.18
- `typescript` ^5.3.3
- `tailwindcss` ^3.3.6

### Client (`client/package.json`)

Similar dependencies for the client application.

---

## 🐛 Common Issues & Solutions

### Issue 1: "Cannot find module 'lucide-react'"
**Solution:**
```bash
cd admin-dashboard
npm install lucide-react
```

### Issue 2: "Cannot find module 'axios'"
**Solution:**
```bash
cd admin-dashboard
npm install axios
```

### Issue 3: "Cannot find name 'process'"
**Solution:**
```bash
cd admin-dashboard
npm install --save-dev @types/node
```

### Issue 4: "JSX element implicitly has type 'any'"
**Solution:**
1. Ensure `next-env.d.ts` exists (✅ Created)
2. Restart TypeScript server
3. Reload VS Code window

### Issue 5: Red underlines persist after installing
**Solution:**
```bash
# Delete node_modules and reinstall
cd admin-dashboard
rm -rf node_modules package-lock.json
npm install

# Or on Windows
rmdir /s /q node_modules
del package-lock.json
npm install
```

### Issue 6: TypeScript version mismatch
**Solution:**
```bash
# Use workspace TypeScript version
# In VS Code: Ctrl+Shift+P -> "TypeScript: Select TypeScript Version"
# Choose "Use Workspace Version"
```

---

## 🚀 Quick Fix Command

Run this single command to fix everything:

```bash
# Install all dependencies
cd admin-dashboard && npm install && cd ../client && npm install && cd ..
```

Then reload VS Code window.

---

## ✅ Verification Checklist

After running the fixes, verify:

- [ ] `admin-dashboard/node_modules` folder exists
- [ ] `client/node_modules` folder exists
- [ ] `admin-dashboard/next-env.d.ts` exists
- [ ] `client/next-env.d.ts` exists
- [ ] No red underlines in `.tsx` files
- [ ] Imports resolve correctly
- [ ] TypeScript autocomplete works
- [ ] No "Cannot find module" errors

---

## 📝 Files That Should Have No Errors

After the fix, these files should be error-free:

### Admin Dashboard
- ✅ `admin-dashboard/src/pages/index.tsx`
- ✅ `admin-dashboard/src/components/ServiceHealthCard.tsx`
- ✅ `admin-dashboard/src/components/ChaosPanel.tsx`
- ✅ `admin-dashboard/src/components/MetricCard.tsx`
- ✅ `admin-dashboard/src/components/MetricsChart.tsx`
- ✅ `admin-dashboard/src/lib/api.ts`
- ✅ `admin-dashboard/src/lib/store.ts`

### Client
- ✅ `client/src/pages/index.tsx`
- ✅ `client/src/pages/login.tsx`
- ✅ `client/src/components/OrderStatusTimeline.tsx`
- ✅ `client/src/lib/api.ts`
- ✅ `client/src/lib/websocket.ts`

---

## 🔍 Still Having Issues?

If errors persist after following all steps:

1. **Clear VS Code cache:**
   ```bash
   # Close VS Code first, then:
   # Windows
   rmdir /s /q "%APPDATA%\Code\Cache"
   
   # Mac/Linux
   rm -rf ~/Library/Application\ Support/Code/Cache
   ```

2. **Delete TypeScript cache:**
   ```bash
   cd admin-dashboard
   rm -rf .next
   
   cd ../client
   rm -rf .next
   ```

3. **Reinstall VS Code extensions:**
   - Uninstall "TypeScript and JavaScript Language Features"
   - Restart VS Code
   - It will reinstall automatically

4. **Check VS Code settings:**
   - Ensure `typescript.tsdk` points to workspace TypeScript
   - Check `.vscode/settings.json` if it exists

---

## 📚 Additional Resources

- [Next.js TypeScript Documentation](https://nextjs.org/docs/basic-features/typescript)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [VS Code TypeScript Support](https://code.visualstudio.com/docs/languages/typescript)

---

## Summary

The TypeScript errors are caused by missing `node_modules` and type definitions. Running `npm install` in both `admin-dashboard` and `client` directories, followed by reloading VS Code, will resolve all issues.

**Quick Fix:**
```bash
cd admin-dashboard && npm install && cd ../client && npm install && cd ..
```

Then: `Ctrl+Shift+P` → `Developer: Reload Window`
