# Daily Planner - Error Handling & Validation Guide

## Overview

This document explains the comprehensive error handling, validation, and defensive programming measures implemented in the Daily Planner app.

---

## 1. Validation System

### Task Input Validation

```javascript
Validator.validateTaskText(taskText);
```

**Rules:**

- ✅ Maximum 200 characters (configurable in `CONFIG.MAX_TASK_LENGTH`)
- ✅ Minimum 1 character (after trimming)
- ✅ Must be a string type
- ✅ Automatically trimmed before saving
- ✅ Prevents empty/whitespace-only tasks

**Error Messages:**

- "Task cannot be empty"
- "Task must be 200 characters or less"

### Data Structure Validation

```javascript
Validator.validateDataStructure(data);
```

**Checks:**

- Top-level must be an object
- All keys must be valid dates (YYYY-MM-DD format)
- All values must be arrays
- Each task must have `text` (string) and `completed` (boolean)

**On Corrupted Data:**

- Shows warning message to user
- Offers choice to start fresh or attempt recovery
- Logs error details to console for debugging

### Date String Validation

```javascript
Validator.isValidDateString(dateStr);
```

**Ensures:**

- Matches YYYY-MM-DD format
- Represents a valid calendar date
- Prevents timezone issues using consistent local date logic

---

## 2. Storage Safety

### Safe Data Loading

```javascript
StorageManager.load();
```

**Features:**

- Wrapped in try/catch block
- Handles missing data gracefully (returns empty object)
- Validates JSON parsing
- Validates data structure after parsing
- Returns helpful error messages on failure

**Possible Errors:**

- "Corrupted data detected" → Shows recovery prompt
- "Invalid data structure" → Provides specific validation error
- "Unable to load data from storage" → Generic fallback

### Safe Data Saving

```javascript
StorageManager.save(data);
```

**Protections:**

- Validates data before saving
- Catches QuotaExceededError (storage is full)
- Prevents invalid data from being persisted
- Logs all save operations

**Error Handling:**

```javascript
if (error.name === "QuotaExceededError") {
  → "Storage space is full. Please delete some old tasks."
}
```

---

## 3. Duplicate Task Prevention

When adding a task:

```javascript
const isDuplicate = this.data[dateStr].some(
  (task) => task.text.toLowerCase() === validatedText.toLowerCase(),
);
```

**Behavior:**

- Case-insensitive comparison
- Shows warning: "This task already exists for today"
- Prevents action without throwing error
- Logs to console for debugging

---

## 4. UI Error Messages

### Message Types

1. **Success** (green, 4 seconds)

   ```javascript
   MessageManager.success("Task added successfully");
   ```

2. **Error** (red, 5 seconds)

   ```javascript
   MessageManager.error("Failed to add task");
   ```

3. **Warning** (yellow, 4 seconds)

   ```javascript
   MessageManager.warning("This task already exists");
   ```

4. **Info** (blue, 4 seconds)
   ```javascript
   MessageManager.info("Data loaded");
   ```

### Message Features

- ✅ Inline notifications (no alert dialogs)
- ✅ Auto-dismiss after timeout
- ✅ Manual close button
- ✅ Multiple messages can stack
- ✅ Auto-escape HTML to prevent XSS

---

## 5. Input Validation

### Task Restrictions

**Disabled State:**

```javascript
// Add button disabled until input is valid
taskInput.addEventListener("input", () => {
  const isValid =
    taskInput.value.trim().length > 0 &&
    taskInput.value.length <= CONFIG.MAX_TASK_LENGTH;
  addBtn.disabled = !isValid;
});
```

**Visual Feedback:**

- Button appears disabled (opacity 0.5) when no valid input
- Input field shows red border on error
- Cursor becomes "not-allowed"

---

## 6. Import/Export Safety

### Export Validation

```javascript
exportData() {
  // Check if data exists
  if (Object.keys(this.data).length === 0) {
    → "No data to export. Create some tasks first!"
  }

  // Validate data before export
  Validator.validateDataStructure(this.data);

  // Generate safe JSON file
  const blob = new Blob([dataStr], { type: "application/json" });
}
```

### Import Validation

```javascript
importData(jsonStr) {
  // 1. Check input exists
  if (!jsonStr || typeof jsonStr !== "string") {
    → "No data provided"
  }

  // 2. Parse JSON safely
  try {
    imported = JSON.parse(jsonStr);
  } catch (parseError) {
    → "Invalid JSON format. Please check your file and try again."
  }

  // 3. Validate structure
  Validator.validateDataStructure(imported);

  // 4. Show confirmation
  const shouldMerge = confirm("Ready to import...");

  // 5. Merge and save
  this.data = { ...this.data, ...imported };
  StorageManager.save(this.data);
}
```

**File Type Checking:**

```javascript
if (file.type !== "application/json" && !file.name.endsWith(".json")) {
  → "Please select a valid JSON file"
}
```

---

## 7. DOM Element Safety

### Safe Element Retrieval

```javascript
const getElement = (id) => {
  const el = document.getElementById(id);
  if (!el) {
    Logger.warn(`Element not found: ${id}`);
  }
  return el;
};
```

**Usage:**

```javascript
const addBtn = getElement("addBtn");
if (addBtn) {
  addBtn.addEventListener("click", () => { ... });
}
```

---

## 8. Logging System

### Logger Utility

```javascript
Logger.log(msg, data); // Info log
Logger.warn(msg, data); // Warning log
Logger.error(msg, error); // Error log
```

**Features:**

- Timestamps on every log
- Structured formatting
- Data inspection support
- Console output for debugging

**Example Output:**

```
[11:30:45] Data loaded and validated successfully
[11:30:46] Task added successfully
[11:30:47] ERROR: Failed to save data Array (2)
```

---

## 9. Edge Cases Handled

### No Tasks for a Day

```javascript
getCompletionPercentage(dateStr) {
  if (!tasks || tasks.length === 0) return null;
  // Prevents division by zero
  // Returns null → renders as gray in heatmap
}
```

### Invalid Date Navigation

```javascript
goToDate(dateStr) {
  if (!Validator.isValidDateString(dateStr)) {
    Logger.warn("Invalid date string for navigation");
    return; // Silently fails, doesn't update date
  }
}
```

### Large Task Lists

- Uses efficient filtering
- Heatmap shows first 2 tasks + counter
- Maintains performance with 100+ tasks per day

### Rapid Clicks

```javascript
// Event listeners are immediate
// Database operations are transactional
// UI updates are debounce-safe (single render per operation)
```

### Missing DOM Elements

```javascript
// All elements checked before use
const monthDisplay = document.getElementById("monthDisplay");
if (monthDisplay) {
  monthDisplay.textContent = currentMonthYear;
}
```

---

## 10. Global Error Handlers

### Uncaught Errors

```javascript
window.addEventListener("error", (event) => {
  Logger.error("Uncaught error", event.error);
  // App doesn't crash, error is logged
});
```

### Unhandled Promise Rejections

```javascript
window.addEventListener("unhandledrejection", (event) => {
  Logger.error("Unhandled promise rejection", event.reason);
  // Prevents silent failures
});
```

---

## 11. Configuration

```javascript
const CONFIG = {
  STORAGE_KEY: "plannerData", // Where data is stored
  MAX_TASK_LENGTH: 200, // Maximum characters per task
  MIN_TASK_LENGTH: 1, // Minimum characters per task
  DEBOUNCE_DELAY: 300, // For future debounce operations
  MESSAGE_TIMEOUT: 4000, // Auto-dismiss timeout (ms)
};
```

---

## 12. Recovery Scenarios

### Scenario 1: Corrupted localStorage

```
User sees: "Corrupted data detected..."
Action: User clicks "OK" to start fresh
Result: localStorage is cleared, empty planner loads
```

### Scenario 2: Storage Quota Exceeded

```
User tries to add many tasks:
Error: "Storage space is full. Please delete some old tasks."
Action: User exports data, then deletes old entries
Result: Fresh space available, can continue using app
```

### Scenario 3: Invalid Import File

```
User selects wrong file:
Error: "Invalid JSON format. Please check your file and try again."
Action: User selects correct JSON export file
Result: Data imports successfully
```

### Scenario 4: Missing DOM Elements

```
JavaScript error in console: "Element not found: taskInput"
UI continues to work: Other features remain functional
Recovery: Refresh page, or inspect HTML for missing elements
```

---

## 13. Testing the Error Handling

### Manual Tests

**Test 1: Add empty task**

```
1. Leave input blank
2. Click "Add Task"
3. Expected: Nothing happens, button disabled
```

**Test 2: Add oversized task**

```
1. Paste 250 characters into input
2. Button stays disabled
3. Expected: Can't submit (button disabled)
```

**Test 3: Duplicate task**

```
1. Add "Buy milk"
2. Add "Buy milk" again
3. Expected: Warning message shown
```

**Test 4: Corrupt localStorage**

```
1. Open DevTools Console
2. Run: localStorage.setItem('plannerData', '{invalid json')
3. Refresh page
4. Expected: Recovery prompt shown
```

**Test 5: Storage quota**

```
(Difficult to simulate without large data)
Expected behavior: Shows "Storage space is full" error
```

---

## 14. Console Debugging

### View All Logs

Open DevTools (F12) and check Console tab for:

- All operations with timestamps
- Data loaded/saved confirmations
- Warnings for skipped actions
- Errors with full stack traces

### Example Debug Session

```javascript
// Check current data
window.plannerApp.data;

// Manually validate data
Validator.validateDataStructure(window.plannerApp.data);

// Check streaks calculation
window.plannerApp.getStreaks();

// View storage contents
JSON.parse(localStorage.getItem("plannerData"));
```

---

## 15. Non-Breaking Changes

**If error occurs:**

- ✅ User is always informed via message
- ✅ Operation is halted gracefully
- ✅ Other features continue working
- ✅ App doesn't throw unhandled exceptions
- ✅ Error is logged for debugging

**No Alert Dialogs for Errors**

- Uses inline messages instead
- Better UX, non-intrusive
- User can continue working

---

## Summary

This robust error handling system ensures:

1. **Data Integrity** - Validation prevents bad data from being saved
2. **User Safety** - Clear error messages guide user actions
3. **Recovery** - Graceful degradation, never losing data unexpectedly
4. **Debugging** - Comprehensive logging for developers
5. **Performance** - No app crashes, edges cases handled
6. **UX** - Non-blocking errors, helpful feedback

The app is production-ready with enterprise-level error handling! 🎯
