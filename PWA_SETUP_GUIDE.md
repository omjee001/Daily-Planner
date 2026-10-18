# PWA Setup Guide for Daily Planner

## ✅ What's Been Done

Your Daily Planner is now a fully functional Progressive Web App (PWA)! Here's what was added:

### Files Created/Modified:

1. ✅ **manifest.json** - PWA configuration & app metadata
2. ✅ **service-worker.js** - Offline caching & asset management
3. ✅ **index.html** - Added manifest link & meta tags
4. ✅ **script.js** - Added service worker registration

---

## 📂 Folder Structure

```
Daily_planner/
├── index.html              (Updated - manifest link added)
├── style.css               (No changes)
├── script.js               (Updated - SW registration added)
├── manifest.json           (NEW - PWA configuration)
├── service-worker.js       (NEW - Offline support)
├── QUICK_REFERENCE.md      (Existing)
└── ERROR_HANDLING_GUIDE.md (Existing)
```

---

## 🚀 How to Test Locally

### Step 1: Start a Local Web Server

Your browser requires HTTPS (or localhost) for PWA features to work. Here's how:

**Option A: Using Python (Easiest)**

```bash
# Navigate to your project folder
cd "/Users/omjee/Documents/Acadamic/Tutorial/Own Project/Daily_planner"

# Python 3
python3 -m http.server 8000

# Then open in browser:
# http://localhost:8000
```

**Option B: Using Node.js (if installed)**

```bash
# Install a simple server globally (one-time)
npm install -g http-server

# Run it in your project folder
http-server

# Then open: http://localhost:8080
```

**Option C: Using VS Code Live Server**

1. Install "Live Server" extension in VS Code
2. Right-click `index.html` → "Open with Live Server"
3. Browser opens automatically at `http://localhost:5500`

### Step 2: Open DevTools and Check Service Worker

1. Open `http://localhost:8000` in Chrome/Edge
2. Press `F12` to open Developer Tools
3. Go to **Application** tab → **Service Workers**
4. You should see: "service-worker.js (activated and running)"

### Step 3: Test Offline Mode

1. In DevTools, go to **Application** → **Cache Storage**
2. You should see "daily-planner-v1" with cached files
3. In **Network** tab, check "Offline" checkbox
4. Refresh the page - app should still load! ✓

---

## 📱 Install as App on Mac

### Chrome / Edge (Recommended)

**Method 1: Browser Menu (Easiest)**

1. Open your app at `http://localhost:8000`
2. Click the **⊕** icon in the address bar (top right area)
3. Click **"Install Daily Planner"**
4. App opens in standalone window
5. Find it in Applications folder or Cmd+Space → "Daily Planner"

**Method 2: Using Chrome Menu**

1. Go to `http://localhost:8000`
2. Click the **three dots menu** (top right)
3. Go to **More Tools** → **Create Shortcuts**
4. Check "Open as window"
5. Click **Create**

**Method 3: Using Safari (if needed)**
Safari doesn't support full PWA install on Mac, but you can:

1. Open app at `http://localhost:8000`
2. Click **File** → **Add to Dock**
3. App appears in Dock (launches in Safari window)

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Install Button Not Showing"

**Causes:**

- Not using `http://localhost` or `https://` (PWA needs secure context)
- Service Worker not registered/activated
- Manifest not linked in HTML

**Solution:**

1. Check DevTools → Application → Service Workers (should say "activated")
2. Check DevTools → Application → Manifest (should load without errors)
3. Check browser console (F12) for any error messages
4. Try a hard refresh: **Cmd+Shift+R**

### Issue 2: "Service Worker shows 'Redundant'"

**Cause:** Service worker failed to activate (usually script error)

**Solution:**

1. Check DevTools → Application → Service Workers → Details
2. Look at browser console for error messages
3. Verify `service-worker.js` has correct file paths
4. Check that manifest.json is valid JSON (use JSONLint.com)

### Issue 3: "App Won't Load Offline"

**Causes:**

- Service worker didn't cache files
- Assets have wrong paths
- Network errors during initial cache

**Solution:**

1. Wait 10 seconds after first visit (caching takes time)
2. Check Cache Storage in DevTools - verify files are cached
3. Look at service-worker.js console logs for errors
4. Verify file paths in ASSETS_TO_CACHE match your setup

### Issue 4: "Installed App Not Updating"

**Cause:** Old service worker still active (browser caching)

**Solution:**

1. In DevTools → Application → Service Workers
2. Click "Unregister" on the old service worker
3. Or check "Bypass for network" in DevTools
4. Hard refresh: **Cmd+Shift+R**, wait 10 seconds

### Issue 5: "Manifest Shows 404 Error"

**Cause:** manifest.json path is wrong or file doesn't exist

**Solution:**

1. Verify manifest.json exists in same folder as index.html
2. Check DevTools → Application → Manifest
3. In HTML, link should be: `<link rel="manifest" href="manifest.json" />`

---

## 🔧 How PWA Features Work

### Offline Support

```
User visits app → Service Worker caches files → User goes offline
→ Service Worker serves cached files → App works perfectly offline
```

### Caching Strategy (Cache-First)

1. User requests a file
2. Service Worker checks cache first
3. If in cache → serve from cache (instant)
4. If not in cache → fetch from network → cache for next time
5. If offline → cached version is used

### App Installation

1. Manifest tells browser:
   - "This is a PWA"
   - "Here are my colors & icons"
   - "Open standalone (not in tabs)"
2. After service worker activates, browser shows "Install" option
3. User clicks install → app appears in Applications

---

## 📊 Manifest Configuration Explained

In **manifest.json**:

| Field              | Purpose                                            |
| ------------------ | -------------------------------------------------- |
| `name`             | Full app name (shown during install)               |
| `short_name`       | Short name (shown on home screen)                  |
| `start_url`        | Where app opens when launched                      |
| `display`          | "standalone" = act like native app (no browser UI) |
| `theme_color`      | Status bar color                                   |
| `background_color` | Splash screen color                                |
| `icons`            | App icons (SVG, no image files needed!)            |
| `categories`       | App type (helps OS categorize)                     |
| `scope`            | Which URLs belong to this app                      |

---

## 🛡️ Service Worker Explained

**What service-worker.js does:**

1. **Install:** Caches all essential files
2. **Activate:** Removes old cache versions
3. **Fetch:** Intercepts network requests:
   - Check cache first
   - If not cached → fetch from network
   - Save new responses in cache
   - If offline → use cached version

**Why this is safe:**

- Doesn't interfere with outside websites
- Only caches your app's files
- JavaScript errors don't break the app (try/catch everywhere)
- Works even if caching fails

---

## ✨ What Users Can Do Now

### Before PWA:

❌ App only works in browser  
❌ Requires internet (no offline support)  
❌ Not in Applications folder  
❌ Can't add to Dock

### After PWA:

✅ App is installable (like native app)  
✅ Works offline completely  
✅ Appears in Applications folder  
✅ Can pin to Dock (Mac)  
✅ Standalone window (no browser UI)  
✅ Much faster loading (cache first)

---

## 🚀 Production Deployment

When you deploy to a real server (not localhost):

### Required Changes in Files:

**manifest.json** - Update `start_url` and `scope`:

```json
{
  "start_url": "/daily-planner/",
  "scope": "/daily-planner/"
}
```

**service-worker.js** - Update cache paths:

```javascript
const ASSETS_TO_CACHE = [
  "/daily-planner/index.html",
  "/daily-planner/style.css",
  "/daily-planner/script.js",
  "/daily-planner/manifest.json",
];
```

**index.html** - Links already work (relative paths)

---

## 📋 Testing Checklist

Before considering it "done", verify:

- [ ] App loads at `http://localhost:8000`
- [ ] DevTools shows "Service Worker" as "activated"
- [ ] DevTools shows Cache Storage with cached files
- [ ] Install button appears in browser (wait 10 seconds)
- [ ] App installs and opens in standalone window
- [ ] App works offline (enable "Offline" in DevTools)
- [ ] App still works after restart
- [ ] Data persists (add task, refresh, task is there)
- [ ] No console errors (open F12 → Console)

---

## 🎯 Next Steps (Optional)

To make it even better later:

1. **Add custom icons**
   - Replace SVG in manifest with real PNG files
2. **Add update notifications**
   - Check for new service worker version
   - Notify user to refresh
3. **Add app shortcuts**
   - Quick actions (e.g., "Add Task", "View Today")
4. **Add web app install prompt**
   - Custom "Install" button in app UI
5. **Add PWA screenshots**
   - Better splash screens

---

## ❓ FAQ

**Q: Will my data sync across devices?**  
A: No, data is stored locally only. You can export/import JSON manually.

**Q: Can I use this on Android?**  
A: Yes! Just open the same URL in Chrome on Android and tap "Install app".

**Q: Do I need HTTPS?**  
A: Only for production. `localhost` and `127.0.0.1` work on your Mac.

**Q: Will old data work?**  
A: Yes! Service worker doesn't touch localStorage, only network requests.

**Q: Can I uninstall it?**  
A: Yes, like any Mac app - Cmd+Delete or Trash.

---

## 🐛 Debug Commands in Console

Run these in DevTools → Console to test:

```javascript
// Check if service worker is registered
navigator.serviceWorker.getRegistrations().then((r) => console.log(r));

// Clear all caches (nuclear option)
caches
  .keys()
  .then((names) => names.forEach((name) => caches.delete(name)))
  .then(() => location.reload());

// Check cached files
caches
  .open("daily-planner-v1")
  .then((cache) =>
    cache.keys().then((keys) => keys.forEach((k) => console.log(k.url))),
  );
```

---

## 📞 Still Having Issues?

1. Check DevTools → Console for error messages (copy exact error)
2. Verify file paths match exactly (case-sensitive on Unix/Mac)
3. Try in an Incognito window (cleaner cache state)
4. Clear cache: `Cmd+Shift+Delete`, select "All time", Clear
5. Restart the web server and browser

---

**Your Daily Planner is now a full PWA! 🎉**

You can install it like any native app and it will work completely offline.
