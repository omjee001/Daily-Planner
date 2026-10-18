# Daily Planner - Quick Reference: Error Handling & Validation

## Key Features at a Glance

### ✅ Input Validation

- **Max 200 characters** per task
- **Minimum 1 character** required
- **Trimmed automatically** (removes extra whitespace)
- **No duplicates** - Same task checked case-insensitively
- **Button disabled** until valid input provided

### 🔒 Data Protection

- **JSON validation** on import/export
- **Date format checking** (YYYY-MM-DD only)
- **Task structure validation** (text + completed fields)
- **Corrpted data recovery** (prompt user or start fresh)

### 📝 Error Messages (Inline, Not Alerts)

| Message Type | Color  | Auto-Dismiss |
| ------------ | ------ | ------------ |
| ✅ Success   | Green  | 4 seconds    |
| ❌ Error     | Red    | 5 seconds    |
| ⚠️ Warning   | Yellow | 4 seconds    |
| ℹ️ Info      | Blue   | 4 seconds    |

### 📦 Storage Safety

- **Try/catch on all localStorage access**
- **QuotaExceededError handling** - "Storage space is full"
- **Graceful fallback** if storage unavailable
- **Data validated before saving**

### 🔐 Import/Export Security

- **Validates JSON format before parse**
- **Checks file type** (.json extension)
- **Shows confirmation** before merge
- **Clear error messages** on invalid file
- **Reports success with stats** (dates + tasks)

### 🛡️ Edge Cases Handled

| Scenario              | Behavior                    |
| --------------------- | --------------------------- |
| No tasks today        | Returns null (no crash)     |
| Large task lists      | Handles efficiently         |
| Invalid dates         | Silently ignored            |
| Missing DOM elements  | Logged, other features work |
| Zero tasks for export | Prevents empty export       |
| File read failure     | Shows error, allows retry   |

### 📊 Logging System

**Every operation is logged with timestamp:**

```
[HH:MM:SS] Message
[HH:MM:SS] ERROR: Error message
[HH:MM:SS] WARNING: Warning message
```

Check **DevTools Console** (F12) to see all logs.

### 🔧 Configuration

```javascript
Max task length: 200 characters
Min task length: 1 character
Message timeout: 4000-5000 ms
Storage key: "plannerData"
```

---

## Common User Scenarios

### Scenario 1: Add Empty Task

```
Action: Click "Add Task" with empty input
Result: Button is disabled (can't click)
```

### Scenario 2: Task Too Long

```
Action: Type 250 characters
Result: Button disabled (can type but can't submit)
```

### Scenario 3: Duplicate Task

```
Action: Add "Buy milk", then add "buy milk" again
Result: ⚠️ "This task already exists for today"
```

### Scenario 4: Import Corrupted File

```
Action: Select invalid JSON file
Result: ❌ "Invalid JSON format. Please check your file..."
```

### Scenario 5: Storage Full

```
Action: Try to add task when storage quota reached
Result: ❌ "Storage space is full. Please delete some old tasks."
```

### Scenario 6: Corrupted localStorage

```
Action: Refresh page after localStorage corruption
Result: Recovery prompt → "Start fresh?" or "Continue?"
```

---

## Developer Debugging

### Check Logs

Open DevTools (Press F12):

1. Go to **Console** tab
2. Look for timestamped messages
3. Errors shown in red

### Inspect Data

In Console, run:

```javascript
// View current data
window.plannerApp.data;

// Validate data structure
Validator.validateDataStructure(window.plannerApp.data);

// Check streaks
window.plannerApp.getStreaks();

// View storage
JSON.parse(localStorage.getItem("plannerData"));
```

### Test Error Scenarios

```javascript
// Corrupt storage (then refresh page)
localStorage.setItem("plannerData", "{invalid");

// Clear storage
localStorage.clear();

// Add invalid data
localStorage.setItem("plannerData", '{"invalid-date": []}');
```

---

## Error Messages Reference

### Task Adding Errors

- "Task cannot be empty" → Trim and try again
- "Task must be 200 characters or less" → Shorten text
- "This task already exists for today" → Duplicate detected

### Data Errors

- "Invalid date format..." → Dates must be YYYY-MM-DD
- "Invalid task structure" → Missing text or completed field
- "Corrupted data detected" → Choose recovery option

### Storage Errors

- "Storage space is full" → Delete old tasks or export backup
- "Failed to save data" → Try again or refresh page
- "Unable to load data" → Check localStorage permissions

### Import/Export Errors

- "Invalid JSON format" → File is not valid JSON
- "Please select a valid JSON file" → Wrong file type
- "No data to export" → Create tasks first

---

## Best Practices

✅ **DO:**

- Check console (F12) for debug info
- Export data before deleting old tasks
- Use JSON files exported by this app
- Keep up to 100+ tasks per day (tested safe)
- Refresh page if something seems wrong

❌ **DON'T:**

- Edit raw JSON files unless you know format
- Manually clear localStorage without backup
- Try to add tasks longer than 200 chars
- Use browser storage on shared computers
- Ignore error messages (they tell you what to do)

---

## Key Files

| File                      | Purpose                       |
| ------------------------- | ----------------------------- |
| `index.html`              | Structure + message container |
| `style.css`               | Styling + message CSS         |
| `script.js`               | All logic + error handling    |
| `ERROR_HANDLING_GUIDE.md` | Detailed documentation        |
| `QUICK_REFERENCE.md`      | This file                     |

---

## Troubleshooting

| Problem          | Solution                                     |
| ---------------- | -------------------------------------------- |
| App won't load   | Refresh page, clear cache, check console     |
| Can't add tasks  | Input might be empty/too long, check message |
| Data disappeared | Check if corrupted, choose recovery option   |
| Export fails     | Ensure you have tasks to export              |
| Import fails     | Verify file is valid JSON, check message     |
| Button disabled  | Provide valid input (1-200 chars)            |
| Storage full     | Delete old tasks or export + clear           |

---

## Safety Guarantees

🔒 **Your data is protected:**

- No data saved unless validated
- Corruption detected and reported
- Clear recovery options offered
- Graceful error handling everywhere
- No silent failures
- All errors logged for debugging

🛡️ **App is robust:**

- Handles edge cases
- Prevents crashes
- Works offline (localStorage)
- Survives invalid input
- Recovers from errors

---

> For detailed documentation, see **ERROR_HANDLING_GUIDE.md**
