// ===== CONFIGURATION =====
const CONFIG = {
  STORAGE_KEY: "plannerData",
  SETTINGS_KEY: "plannerSettings",
  MAX_TASK_LENGTH: 200,
  MIN_TASK_LENGTH: 1,
  DEBOUNCE_DELAY: 300,
  MESSAGE_TIMEOUT: 3000,
};

const DEFAULT_DATA = {
  version: 2,
  data: {},
};

const DEFAULT_SETTINGS = {
  theme: "light",
  accent: "#0f766e",
  streakThreshold: 80,
  categories: [
    { name: "Work", color: "#3b82f6" },
    { name: "Personal", color: "#8b5cf6" },
    { name: "Health", color: "#00cec9" },
  ],
};

// ===== LOGGER =====
class Logger {
  static log(msg, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    if (data) console.log(`[${timestamp}] ${msg}`, data);
    else console.log(`[${timestamp}] ${msg}`);
  }

  static error(msg, error = null) {
    console.error(`[${new Date().toLocaleTimeString()}] ERROR: ${msg}`, error || "");
  }

  static warn(msg, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    if (data) console.warn(`[${timestamp}] WARNING: ${msg}`, data);
    else console.warn(`[${timestamp}] WARNING: ${msg}`);
  }
}

// ===== VALIDATION =====
class Validator {
  static isValidDateString(dateStr) {
    if (typeof dateStr !== "string") return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const year = Number(dateStr.slice(0, 4));
    const month = Number(dateStr.slice(5, 7));
    const day = Number(dateStr.slice(8, 10));
    if (month < 1 || month > 12 || day < 1 || day > 31) return false;

    // Construct in local time and compare all fields so JavaScript cannot
    // normalize an impossible date such as February 31.
    const date = new Date(0);
    date.setHours(0, 0, 0, 0);
    date.setFullYear(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  }

  static validateTaskText(taskText) {
    if (typeof taskText !== "string") throw new Error("Task must be a string");
    const trimmed = taskText.trim();
    if (trimmed.length < CONFIG.MIN_TASK_LENGTH) throw new Error("Task cannot be empty");
    if (trimmed.length > CONFIG.MAX_TASK_LENGTH)
      throw new Error(`Task must be ${CONFIG.MAX_TASK_LENGTH} characters or less`);
    return trimmed;
  }

  static validateTask(task) {
    if (!task || typeof task !== "object") throw new Error("Task must be an object");
    if (typeof task.text !== "string" || typeof task.completed !== "boolean")
      throw new Error("Task must have text and completed properties");
    return {
      text: String(task.text),
      completed: Boolean(task.completed),
      priority: task.priority || "normal",
      category: task.category || "",
    };
  }

  static validateDataStructure(data) {
    if (!data || typeof data !== "object") throw new Error("Data must be an object");
    for (const [dateStr, tasks] of Object.entries(data)) {
      if (!this.isValidDateString(dateStr))
        throw new Error(`Invalid date format: "${dateStr}". Expected YYYY-MM-DD`);
      if (!Array.isArray(tasks))
        throw new Error(`Tasks for ${dateStr} must be an array`);
      for (let i = 0; i < tasks.length; i++) {
        try {
          this.validateTask(tasks[i]);
        } catch (error) {
          throw new Error(`Task ${i} in ${dateStr} is invalid: ${error.message}`);
        }
      }
    }
    return true;
  }
}

// ===== STORAGE =====
class StorageManager {
  static load() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEY);
      if (stored === null) return { version: DEFAULT_DATA.version, data: {} };
      const parsed = JSON.parse(stored);
      // Migrate v1 data
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Saved planner data must be an object");
      }
      if (!parsed.version) {
        const migrated = { version: 2, data: parsed };
        Validator.validateDataStructure(migrated.data);
        return migrated;
      }
      // Migrate v1 tasks to v2 (add priority/category)
      if (parsed.version === 1) {
        if (!parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
          throw new Error("Saved planner data has an invalid v1 structure");
        }
        for (const dateStr of Object.keys(parsed.data)) {
          parsed.data[dateStr] = parsed.data[dateStr].map((task) => ({
            text: task.text,
            completed: task.completed,
            priority: task.priority || "normal",
            category: task.category || "",
          }));
        }
        parsed.version = 2;
      }
      if (parsed.version !== 2 || !parsed.data || typeof parsed.data !== "object" || Array.isArray(parsed.data)) {
        throw new Error("Saved planner data has an unsupported or invalid version");
      }
      Validator.validateDataStructure(parsed.data);
      return parsed;
    } catch (error) {
      Logger.error("Load failed", error);
      if (error instanceof SyntaxError) {
        throw new Error("Saved planner data is corrupted and contains invalid JSON");
      }
      if (error?.name === "SecurityError" || error?.name === "InvalidStateError") {
        throw new Error("Unable to access browser storage. Check storage permissions and try again");
      }
      throw new Error(`Saved planner data is corrupted: ${error.message}`);
    }
  }

  static save(data) {
    try {
      Validator.validateDataStructure(data.data);
      localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (error) {
      Logger.error("Save failed", error);
      if (error?.name === "QuotaExceededError") {
        throw new Error("Unable to save data: browser storage is full");
      }
      if (error?.name === "SecurityError" || error?.name === "InvalidStateError") {
        throw new Error("Unable to save data: browser storage is unavailable");
      }
      if (error?.message?.startsWith("Data")) throw error;
      throw new Error(`Failed to save data: ${error.message}`);
    }
  }

  static clear() {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
  }

  static loadSettings() {
    try {
      const stored = localStorage.getItem(CONFIG.SETTINGS_KEY);
      if (!stored) return { ...DEFAULT_SETTINGS };
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  static saveSettings(settings) {
    localStorage.setItem(CONFIG.SETTINGS_KEY, JSON.stringify(settings));
  }
}

// ===== MESSAGES =====
class MessageManager {
  static show(message, type = "info", duration = CONFIG.MESSAGE_TIMEOUT) {
    const container = document.getElementById("messageContainer");
    if (!container) return;

    const id = `msg-${Date.now()}`;
    const messageEl = document.createElement("div");
    messageEl.className = `message ${type}`;
    messageEl.id = id;
    messageEl.innerHTML = `
      <span>${escapeHtml(message)}</span>
      <button class="message-close" data-message-id="${id}">×</button>
    `;

    container.appendChild(messageEl);
    messageEl.querySelector(".message-close").addEventListener("click", () => this.dismiss(id));

    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
  }

  static dismiss(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  static success(msg) { this.show(msg, "success"); }
  static error(msg) { this.show(msg, "error", CONFIG.MESSAGE_TIMEOUT + 2000); }
  static warning(msg) { this.show(msg, "warning"); }
  static info(msg) { this.show(msg, "info"); }

  static clearAll() {
    const container = document.getElementById("messageContainer");
    if (container) container.innerHTML = "";
  }
}

// ===== MAIN APP =====
class PlannerApp {
  constructor() {
    this.currentDate = new Date();
    this.currentDate.setHours(0, 0, 0, 0);
    this.filterMode = "all";
    this.sortMode = "default";
    this.calendarDate = new Date(this.currentDate);

    this.data = this.loadDataSafely();
    this.settings = StorageManager.loadSettings();
    this.cache = {};
    this.init();
  }

  // ===== DATA LOADING =====
  loadDataSafely() {
    try {
      return StorageManager.load();
    } catch (error) {
      Logger.error("Critical error loading data", error);
      MessageManager.error(error.message);
      // Keep the original localStorage value intact. The app can still start
      // with an in-memory empty model until the user chooses how to recover.
      return { version: DEFAULT_DATA.version, data: {} };
    }
  }

  saveDataSafely() {
    try {
      StorageManager.save(this.data);
      return true;
    } catch (error) {
      Logger.error("Error saving data", error);
      MessageManager.error(error.message);
      return false;
    }
  }

  saveSettings() {
    StorageManager.saveSettings(this.settings);
  }

  // ===== DATE UTILITIES =====
  getDateString(date = this.currentDate) {
    try {
      const d = date instanceof Date ? date : new Date(date);
      if (isNaN(d.getTime())) throw new Error("Invalid date");
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    } catch {
      const fb = date instanceof Date ? date : this.currentDate;
      return `${fb.getFullYear()}-${String(fb.getMonth() + 1).padStart(2, "0")}-${String(fb.getDate()).padStart(2, "0")}`;
    }
  }

  parseDate(dateStr) {
    try {
      if (!Validator.isValidDateString(dateStr)) throw new Error("Invalid");
      const d = new Date(dateStr + "T00:00:00");
      d.setHours(0, 0, 0, 0);
      return d;
    } catch {
      return new Date();
    }
  }

  // ===== TASK OPERATIONS =====
  addTask(taskText) {
    try {
      const validatedText = Validator.validateTaskText(taskText);
      const dateStr = this.getDateString();
      if (!this.data.data[dateStr]) this.data.data[dateStr] = [];

      const isDuplicate = this.data.data[dateStr].some(
        (t) => t.text.toLowerCase() === validatedText.toLowerCase()
      );
      if (isDuplicate) {
        MessageManager.warning("This task already exists for this day");
        return false;
      }

      const priority = document.getElementById("taskPriority")?.value || "normal";
      const category = document.getElementById("taskCategory")?.value || "";

      this.data.data[dateStr].push({
        text: validatedText,
        completed: false,
        priority,
        category,
      });

      if (this.saveDataSafely()) {
        MessageManager.success("Task added ✓");
        this.cache = {};
        this.render();
        return true;
      }
    } catch (error) {
      Logger.error("Error adding task", error);
      MessageManager.error(error.message);
      return false;
    }
  }

  deleteTask(taskIndex) {
    try {
      const dateStr = this.getDateString();
      if (!this.data.data[dateStr]) return false;
      if (taskIndex < 0 || taskIndex >= this.data.data[dateStr].length) {
        MessageManager.error("Invalid task index");
        return false;
      }

      this.data.data[dateStr].splice(taskIndex, 1);
      if (this.data.data[dateStr].length === 0) delete this.data.data[dateStr];

      if (this.saveDataSafely()) {
        MessageManager.success("Task deleted");
        this.cache = {};
        this.render();
        return true;
      }
    } catch (error) {
      Logger.error("Error deleting task", error);
      MessageManager.error("Failed to delete task");
      return false;
    }
  }

  copyTask(taskIndex) {
    try {
      const dateStr = this.getDateString();
      if (!this.data.data[dateStr]) return false;
      if (taskIndex < 0 || taskIndex >= this.data.data[dateStr].length) return false;

      const task = this.data.data[dateStr][taskIndex];
      this.data.data[dateStr].push({
        text: task.text,
        completed: false,
        priority: task.priority || "normal",
        category: task.category || "",
      });

      if (this.saveDataSafely()) {
        MessageManager.success("Task copied");
        this.cache = {};
        this.render();
        return true;
      }
    } catch (error) {
      Logger.error("Error copying task", error);
      MessageManager.error("Failed to copy task");
      return false;
    }
  }

  copyFromPreviousDay() {
    const prevDate = new Date(this.currentDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = this.getDateString(prevDate);
    const currentDateStr = this.getDateString();
    const prevTasks = this.data.data[prevDateStr];

    if (!prevTasks || prevTasks.length === 0) {
      MessageManager.warning("No tasks from the previous day");
      return;
    }

    const originalTasks = this.data.data[currentDateStr];
    const currentTasks = originalTasks ? [...originalTasks] : [];
    if (!this.data.data[currentDateStr]) this.data.data[currentDateStr] = [];
    const existingTexts = new Set(this.data.data[currentDateStr].map((t) => t.text.toLowerCase()));
    let added = 0;

    prevTasks.forEach((task) => {
      if (!task.completed && !existingTexts.has(task.text.toLowerCase())) {
        this.data.data[currentDateStr].push({
          text: task.text,
          completed: false,
          priority: task.priority || "normal",
          category: task.category || "",
        });
        added++;
      }
    });

    if (added === 0) {
      MessageManager.info("No new tasks to copy");
      return;
    }

    if (!this.saveDataSafely()) {
      if (originalTasks) this.data.data[currentDateStr] = currentTasks;
      else delete this.data.data[currentDateStr];
      this.cache = {};
      this.render();
      return;
    }
    this.cache = {};
    this.render();
    MessageManager.success(`${added} task${added > 1 ? "s" : ""} copied`);
  }

  toggleTask(taskIndex) {
    try {
      const dateStr = this.getDateString();
      if (!this.data.data[dateStr]) return false;
      if (taskIndex < 0 || taskIndex >= this.data.data[dateStr].length) return false;

      this.data.data[dateStr][taskIndex].completed = !this.data.data[dateStr][taskIndex].completed;

      if (this.saveDataSafely()) {
        this.cache = {};
        this.render();
        return true;
      }
    } catch (error) {
      Logger.error("Error toggling task", error);
      MessageManager.error("Failed to update task");
      return false;
    }
  }

  clearDayTasks() {
    const dateStr = this.getDateString();
    const tasks = this.data.data[dateStr];
    if (!tasks || tasks.length === 0) {
      MessageManager.info("No tasks to clear");
      return;
    }

    if (!confirm(`Delete all ${tasks.length} tasks for this day?`)) return;

    delete this.data.data[dateStr];
    if (this.saveDataSafely()) {
      this.cache = {};
      this.render();
      MessageManager.success("Day cleared");
    }
  }

  // ===== CALCULATIONS =====
  getCompletionPercentage(dateStr) {
    if (this.cache[dateStr] !== undefined) return this.cache[dateStr];
    if (!Validator.isValidDateString(dateStr)) return null;
    const tasks = this.data.data[dateStr];
    if (!tasks || tasks.length === 0) return null;
    const completed = tasks.filter((t) => t.completed).length;
    const percent = Math.round((completed / tasks.length) * 100);
    this.cache[dateStr] = percent;
    return percent;
  }

  getWeeklyStats() {
    try {
      const monday = new Date(this.currentDate);
      const dayOfWeek = monday.getDay();
      monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

      let totalCompleted = 0, totalTasks = 0, daysWithTasks = 0, totalPercentage = 0;

      for (let i = 0; i < 7; i++) {
        const day = new Date(monday);
        day.setDate(day.getDate() + i);
        const dateStr = this.getDateString(day);
        const tasks = this.data.data[dateStr];
        if (tasks && tasks.length > 0) {
          totalTasks += tasks.length;
          totalCompleted += tasks.filter((t) => t.completed).length;
          const pct = this.getCompletionPercentage(dateStr);
          if (pct !== null) {
            totalPercentage += pct;
            daysWithTasks++;
          }
        }
      }

      return {
        avgCompletion: daysWithTasks > 0 ? Math.round(totalPercentage / daysWithTasks) : 0,
        totalCompleted,
        totalTasks,
      };
    } catch {
      return { avgCompletion: 0, totalCompleted: 0, totalTasks: 0 };
    }
  }

  getStreaks() {
    try {
      const threshold = this.settings.streakThreshold ?? 80;
      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      let checkDate = new Date();
      checkDate.setHours(0, 0, 0, 0);
      const todayStr = this.getDateString(checkDate);
      if (!this.data.data[todayStr] || this.getCompletionPercentage(todayStr) < threshold) {
        checkDate.setDate(checkDate.getDate() - 1);
      }

      while (true) {
        const dateStr = this.getDateString(checkDate);
        if (this.getCompletionPercentage(dateStr) >= threshold) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else break;
      }

      const sorted = Object.keys(this.data.data)
        .filter((d) => Validator.isValidDateString(d))
        .sort();

      for (let i = 0; i < sorted.length; i++) {
        const dateStr = sorted[i];
        const qualifies = this.getCompletionPercentage(dateStr) >= threshold;
        if (!qualifies) {
          tempStreak = 0;
          continue;
        }

        if (tempStreak > 0) {
          const previousDate = this.parseDate(sorted[i - 1]);
          const currentDate = this.parseDate(dateStr);
          const dayGap = Math.round((currentDate - previousDate) / 86400000);
          if (dayGap !== 1) tempStreak = 0;
        }
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      }

      return { currentStreak, longestStreak };
    } catch {
      return { currentStreak: 0, longestStreak: 0 };
    }
  }

  // ===== EXPORT/IMPORT =====
  exportData() {
    try {
      if (Object.keys(this.data.data).length === 0) {
        MessageManager.warning("No data to export");
        return;
      }
      const dataStr = JSON.stringify(this.data.data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `planner-${this.getDateString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      MessageManager.success("Data exported ✓");
    } catch (error) {
      Logger.error("Error exporting", error);
      MessageManager.error("Failed to export data");
    }
  }

  importData(jsonStr) {
    try {
      if (!jsonStr) throw new Error("No data provided");
      let imported;
      try { imported = JSON.parse(jsonStr); }
      catch { throw new Error("Invalid JSON format"); }

      Validator.validateDataStructure(imported);
      const itemCount = Object.values(imported).reduce((sum, t) => sum + t.length, 0);
      const dateCount = Object.keys(imported).length;

      if (!confirm(`Import ${dateCount} dates with ${itemCount} tasks?\nThis will merge with existing data.`)) return;

      this.backupData();
      this.data.data = this.safeMergeData(this.data.data, imported);

      if (this.saveDataSafely()) {
        this.cache = {};
        this.render();
        MessageManager.success(`Imported ${dateCount} dates, ${itemCount} tasks`);
      }
    } catch (error) {
      Logger.error("Error importing", error);
      MessageManager.error("Import failed: " + error.message);
    }
  }

  backupData() {
    localStorage.setItem("plannerBackup", JSON.stringify(this.data));
  }

  safeMergeData(existing, incoming) {
    const result = { ...existing };
    for (const date in incoming) {
      if (!result[date]) {
        result[date] = incoming[date];
      } else {
        const existingTexts = new Set(result[date].map((t) => t.text.toLowerCase()));
        const newTasks = incoming[date].filter((t) => !existingTexts.has(t.text.toLowerCase()));
        result[date] = [...result[date], ...newTasks];
      }
    }
    return result;
  }

  // ===== NAVIGATION =====
  prevDate() {
    this.currentDate.setDate(this.currentDate.getDate() - 1);
    this.render();
  }

  nextDate() {
    this.currentDate.setDate(this.currentDate.getDate() + 1);
    this.render();
  }

  goToToday() {
    this.currentDate = new Date();
    this.currentDate.setHours(0, 0, 0, 0);
    this.render();
  }

  goToDate(dateStr) {
    if (!Validator.isValidDateString(dateStr)) return;
    this.currentDate = this.parseDate(dateStr);
    this.render();
  }

  // ===== THEME & SETTINGS =====
  applyTheme() {
    document.documentElement.setAttribute("data-theme", this.settings.theme || "light");
    document.documentElement.style.setProperty("--accent", this.settings.accent);

    // Compute accent colors
    const hex = this.settings.accent;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    document.documentElement.style.setProperty("--accent-light", `rgba(${r}, ${g}, ${b}, 0.15)`);
    document.documentElement.style.setProperty("--accent-glow", `rgba(${r}, ${g}, ${b}, 0.4)`);
    document.documentElement.style.setProperty("--accent-dark", hex);

    // Update theme-color meta
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) metaThemeColor.content = hex;
  }

  updateCategoryDropdown() {
    const select = document.getElementById("taskCategory");
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">None</option>';
    (this.settings.categories || []).forEach((cat) => {
      const opt = document.createElement("option");
      opt.value = cat.name;
      opt.textContent = cat.name;
      select.appendChild(opt);
    });
    select.value = currentVal;
  }

  renderCategoriesList() {
    const container = document.getElementById("categoriesList");
    if (!container) return;
    container.innerHTML = "";
    (this.settings.categories || []).forEach((cat, i) => {
      const tag = document.createElement("span");
      tag.className = "category-tag";
      tag.style.background = cat.color + "20";
      tag.style.color = cat.color;
      tag.style.borderColor = cat.color + "40";
      tag.innerHTML = `${escapeHtml(cat.name)} <button class="remove-cat" data-index="${i}">×</button>`;
      tag.querySelector(".remove-cat").addEventListener("click", () => {
        this.settings.categories.splice(i, 1);
        this.saveSettings();
        this.renderCategoriesList();
        this.updateCategoryDropdown();
      });
      container.appendChild(tag);
    });
  }

  // ===== UI RENDERING =====
  render() {
    try {
      this.updateDateDisplay();
      this.updateCopyButtonLabel();
      this.updateStreaks();
      this.renderTaskList();
      this.updateWeeklyStats();
      this.updateTaskCount();
      this.renderWeekDayIndicators();
      this.updateProgressBar();
    } catch (error) {
      Logger.error("Error in render", error);
    }
  }

  updateDateDisplay() {
    const dateEl = document.getElementById("currentDate");
    const dayEl = document.getElementById("dayOfWeek");
    const monthEl = document.getElementById("monthDisplay");
    if (!dateEl || !dayEl) return;

    const dayOfWeek = this.currentDate.toLocaleDateString("en-US", { weekday: "long" });
    const dayNum = this.currentDate.getDate();
    const monthStr = this.currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    dateEl.textContent = dayNum;
    dayEl.textContent = dayOfWeek;
    if (monthEl) monthEl.textContent = monthStr;
  }

  updateCopyButtonLabel() {
    const copyBtn = document.getElementById("copyPrevBtn");
    if (!copyBtn) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    copyBtn.textContent = this.getDateString() === this.getDateString(today)
      ? "📋 Copy Yesterday"
      : "📋 Copy Previous Day";
  }

  updateStreaks() {
    const { currentStreak, longestStreak } = this.getStreaks();
    const currentEl = document.getElementById("currentStreak");
    const longestEl = document.getElementById("longestStreak");
    const progressEl = document.getElementById("todayProgress");

    if (currentEl) currentEl.textContent = currentStreak;
    if (longestEl) longestEl.textContent = longestStreak;
    if (progressEl) {
      const pct = this.getCompletionPercentage(this.getDateString()) || 0;
      progressEl.textContent = pct + "%";
    }
  }

  updateWeeklyStats() {
    const stats = this.getWeeklyStats();
    const weekAvg = document.getElementById("weekAvg");
    const weekCompleted = document.getElementById("weekCompleted");
    const weekTotal = document.getElementById("weekTotal");
    if (weekAvg) weekAvg.textContent = stats.avgCompletion + "%";
    if (weekCompleted) weekCompleted.textContent = stats.totalCompleted;
    if (weekTotal) weekTotal.textContent = stats.totalTasks;
  }

  updateProgressBar() {
    const fill = document.getElementById("taskProgressFill");
    if (!fill) return;
    const pct = this.getCompletionPercentage(this.getDateString());
    fill.style.width = (pct !== null ? pct : 0) + "%";
  }

  renderWeekDayIndicators() {
    const container = document.getElementById("weekDayIndicators");
    if (!container) return;
    container.innerHTML = "";

    const monday = new Date(this.currentDate);
    const dayOfWeek = monday.getDay();
    monday.setDate(monday.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = this.getDateString(today);
    const selectedStr = this.getDateString(this.currentDate);
    const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(day.getDate() + i);
      const dateStr = this.getDateString(day);
      const pct = this.getCompletionPercentage(dateStr);
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedStr;

      let circleClass = "";
      if (pct !== null) {
        if (pct === 100) circleClass = "has-tasks-complete";
        else if (pct >= 66) circleClass = "has-tasks-high";
        else if (pct >= 33) circleClass = "has-tasks-med";
        else circleClass = "has-tasks-low";
      }

      const dot = document.createElement("div");
      dot.className = `week-day-dot${isSelected ? " active" : ""}`;
      dot.tabIndex = 0;
      dot.setAttribute("role", "button");
      dot.setAttribute("aria-label", `${dayLabels[i]} ${day.getDate()}`);
      dot.innerHTML = `
        <span class="week-day-label">${dayLabels[i]}</span>
        <span class="week-day-circle ${circleClass}${isToday ? " today" : ""}">${day.getDate()}</span>
      `;
      const selectDay = () => {
        this.currentDate = new Date(day);
        this.currentDate.setHours(0, 0, 0, 0);
        this.render();
      };
      dot.addEventListener("click", selectDay);
      dot.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectDay();
        }
      });
      container.appendChild(dot);
    }
  }

  renderTaskList() {
    const dateStr = this.getDateString();
    const tasks = this.data.data[dateStr] || [];
    const taskList = document.getElementById("taskList");
    const emptyState = document.getElementById("emptyState");
    if (!taskList) return;

    taskList.innerHTML = "";

    // Filter
    let filtered = tasks.map((task, idx) => ({ ...task, originalIndex: idx }));
    if (this.filterMode === "active") filtered = filtered.filter((t) => !t.completed);
    if (this.filterMode === "completed") filtered = filtered.filter((t) => t.completed);

    // Sort
    if (this.sortMode === "priority") {
      const order = { urgent: 0, high: 1, normal: 2, low: 3 };
      filtered.sort((a, b) => (order[a.priority] ?? 2) - (order[b.priority] ?? 2));
    } else if (this.sortMode === "category") {
      filtered.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
    } else if (this.sortMode === "alpha") {
      filtered.sort((a, b) => a.text.localeCompare(b.text));
    }

    if (filtered.length === 0) {
      if (emptyState) {
        emptyState.textContent = tasks.length === 0
          ? "No tasks for this day. Add one above! ☝️"
          : `No ${this.filterMode} tasks`;
        emptyState.classList.remove("hidden-element");
      }
      return;
    }

    if (emptyState) emptyState.classList.add("hidden-element");

    filtered.forEach((task) => {
      const realIndex = task.originalIndex;
      const li = document.createElement("li");
      li.className = `task-item priority-${task.priority || "normal"} ${task.completed ? "completed" : ""}`;

      const priorityIcons = { low: "⬇️", normal: "", high: "⬆️", urgent: "🔴" };
      const priorityIcon = priorityIcons[task.priority] || "";

      let categoryBadge = "";
      if (task.category) {
        const cat = (this.settings.categories || []).find((c) => c.name === task.category);
        const color = cat ? cat.color : "#6b7280";
        categoryBadge = `<span class="task-category-badge" style="background:${color}20;color:${color}">${escapeHtml(task.category)}</span>`;
      }

      const checkboxId = `task-${realIndex}`;
      li.innerHTML = `
        <input type="checkbox" id="${checkboxId}" class="task-checkbox" ${task.completed ? "checked" : ""}
          aria-label="Mark ${escapeHtml(task.text)} as ${task.completed ? "incomplete" : "complete"}"
          data-index="${realIndex}">
        <label for="${checkboxId}" class="task-text">${escapeHtml(task.text)}</label>
        ${priorityIcon ? `<span class="task-priority-icon">${priorityIcon}</span>` : ""}
        ${categoryBadge}
        <div class="task-actions">
          <button class="task-action-btn copy-btn" data-index="${realIndex}" title="Copy">📋</button>
          <button class="task-action-btn delete-btn" data-index="${realIndex}" title="Delete">🗑️</button>
        </div>
      `;

      li.querySelector(".task-checkbox").addEventListener("change", () => this.toggleTask(realIndex));
      li.querySelector(".copy-btn").addEventListener("click", () => this.copyTask(realIndex));
      li.querySelector(".delete-btn").addEventListener("click", () => this.deleteTask(realIndex));

      taskList.appendChild(li);
    });
  }

  updateTaskCount() {
    const dateStr = this.getDateString();
    const tasks = this.data.data[dateStr] || [];
    const el = document.getElementById("taskCount");
    if (el) {
      const completed = tasks.filter((t) => t.completed).length;
      el.textContent = `Tasks (${completed}/${tasks.length})`;
    }
  }

  // ===== CALENDAR OVERLAY =====
  openCalendar() {
    this.calendarDate = new Date(this.currentDate);
    this.renderCalendar();
    document.getElementById("calendarOverlay")?.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  closeCalendar() {
    document.getElementById("calendarOverlay")?.classList.add("hidden");
    document.body.style.overflow = "";
  }

  renderCalendar() {
    const titleEl = document.getElementById("calMonthTitle");
    const gridEl = document.getElementById("calDaysGrid");
    if (!titleEl || !gridEl) return;

    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth();

    titleEl.textContent = this.calendarDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    gridEl.innerHTML = "";

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = this.getDateString(today);
    const selectedStr = this.getDateString(this.currentDate);

    let current = new Date(startDate);

    while (current <= lastDay || current.getDay() !== 0) {
      const dateStr = this.getDateString(current);
      const isCurrentMonth = current.getMonth() === month;
      const isToday = dateStr === todayStr;
      const isSelected = dateStr === selectedStr;

      const dayEl = document.createElement("div");
      dayEl.className = "cal-day";
      dayEl.textContent = current.getDate();

      if (!isCurrentMonth) {
        dayEl.classList.add("other-month");
      } else {
        if (isToday) dayEl.classList.add("today");
        if (isSelected) dayEl.classList.add("selected");

        const tasks = this.data.data[dateStr];
        if (tasks && tasks.length > 0) {
          dayEl.classList.add("has-tasks");
          const completed = tasks.filter((t) => t.completed).length;
          const pct = Math.round((completed / tasks.length) * 100);
          if (pct === 100) dayEl.classList.add("comp-complete");
          else if (pct >= 66) dayEl.classList.add("comp-high");
          else if (pct >= 33) dayEl.classList.add("comp-med");
          else dayEl.classList.add("comp-low");
        }

        const clickDate = dateStr;
        dayEl.addEventListener("click", () => {
          const tasks = this.data.data[clickDate];
          if (tasks && tasks.length > 0) {
            this.openEventDetail(clickDate);
          } else {
            // Navigate to that date directly
            this.goToDate(clickDate);
            this.closeCalendar();
          }
        });
      }

      gridEl.appendChild(dayEl);
      current.setDate(current.getDate() + 1);
    }
  }

  // ===== EVENT DETAIL OVERLAY =====
  openEventDetail(dateStr) {
    const overlay = document.getElementById("eventOverlay");
    const titleEl = document.getElementById("eventDateTitle");
    const statsEl = document.getElementById("eventStats");
    const listEl = document.getElementById("eventTaskList");
    const goToBtn = document.getElementById("eventGoToDate");
    if (!overlay || !titleEl || !statsEl || !listEl) return;

    this._eventDateStr = dateStr;
    const date = this.parseDate(dateStr);
    const tasks = this.data.data[dateStr] || [];

    titleEl.textContent = date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    if (tasks.length === 0) {
      statsEl.innerHTML = "";
      listEl.innerHTML = '<div class="event-empty">No tasks for this day</div>';
    } else {
      const completed = tasks.filter((t) => t.completed).length;
      const pct = Math.round((completed / tasks.length) * 100);

      statsEl.innerHTML = `
        <div class="event-stat">
          <span class="event-stat-value">${tasks.length}</span>
          <span class="event-stat-label">Total</span>
        </div>
        <div class="event-stat">
          <span class="event-stat-value">${completed}</span>
          <span class="event-stat-label">Done</span>
        </div>
        <div class="event-stat">
          <span class="event-stat-value">${pct}%</span>
          <span class="event-stat-label">Completion</span>
        </div>
      `;

      listEl.innerHTML = "";
      tasks.forEach((task) => {
        const priorityColors = { low: "#94a3b8", normal: "", high: "#f59e0b", urgent: "#ef4444" };
        const div = document.createElement("div");
        div.className = `event-task ${task.completed ? "is-done" : ""}`;

        let priorityBadge = "";
        if (task.priority && task.priority !== "normal") {
          const pColor = priorityColors[task.priority] || "";
          priorityBadge = `<span class="event-task-priority" style="background:${pColor}20;color:${pColor}">${task.priority}</span>`;
        }

        div.innerHTML = `
          <span class="event-task-icon ${task.completed ? "done" : "pending"}">${task.completed ? "✓" : ""}</span>
          <span class="event-task-text">${escapeHtml(task.text)}</span>
          ${priorityBadge}
        `;
        listEl.appendChild(div);
      });
    }

    // Set up the go-to button
    if (goToBtn) {
      goToBtn.onclick = () => {
        this.goToDate(dateStr);
        this.closeEventDetail();
        this.closeCalendar();
      };
    }

    overlay.classList.remove("hidden");
  }

  closeEventDetail() {
    document.getElementById("eventOverlay")?.classList.add("hidden");
  }

  // ===== INITIALIZATION =====
  init() {
    try {
      Logger.log("Initializing PlannerApp v2");

      // Apply saved theme
      this.applyTheme();

      const getEl = (id) => document.getElementById(id);

      // === Settings Panel ===
      const settingsToggle = getEl("settingsToggle");
      const settingsPanel = getEl("settingsPanel");
      const settingsClose = getEl("settingsClose");

      if (settingsToggle && settingsPanel) {
        settingsToggle.addEventListener("click", () => {
          settingsPanel.classList.toggle("hidden");
        });
      }
      if (settingsClose && settingsPanel) {
        settingsClose.addEventListener("click", () => {
          settingsPanel.classList.add("hidden");
        });
      }

      // Theme buttons
      document.querySelectorAll(".theme-btn").forEach((btn) => {
        if (btn.dataset.theme === (this.settings.theme || "light")) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
        btn.addEventListener("click", () => {
          document.querySelectorAll(".theme-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.settings.theme = btn.dataset.theme;
          this.saveSettings();
          this.applyTheme();
        });
      });

      // Accent buttons
      document.querySelectorAll(".accent-btn").forEach((btn) => {
        if (btn.dataset.accent === this.settings.accent) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
        btn.addEventListener("click", () => {
          document.querySelectorAll(".accent-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.settings.accent = btn.dataset.accent;
          this.saveSettings();
          this.applyTheme();
        });
      });

      // Streak threshold
      const streakSlider = getEl("streakThreshold");
      const streakValue = getEl("streakThresholdValue");
      if (streakSlider) {
        streakSlider.value = this.settings.streakThreshold;
        if (streakValue) streakValue.textContent = this.settings.streakThreshold + "%";
        streakSlider.addEventListener("input", () => {
          const val = parseInt(streakSlider.value);
          if (streakValue) streakValue.textContent = val + "%";
          this.settings.streakThreshold = val;
          this.saveSettings();
          this.cache = {};
          this.updateStreaks();
        });
      }

      // Categories
      this.renderCategoriesList();
      this.updateCategoryDropdown();

      const addCatBtn = getEl("addCategoryBtn");
      const newCatInput = getEl("newCategoryInput");
      const newCatColor = getEl("newCategoryColor");
      if (addCatBtn && newCatInput && newCatColor) {
        addCatBtn.addEventListener("click", () => {
          const name = newCatInput.value.trim();
          if (!name) return;
          if ((this.settings.categories || []).some((c) => c.name.toLowerCase() === name.toLowerCase())) {
            MessageManager.warning("Category already exists");
            return;
          }
          this.settings.categories.push({ name, color: newCatColor.value });
          this.saveSettings();
          this.renderCategoriesList();
          this.updateCategoryDropdown();
          newCatInput.value = "";
          MessageManager.success(`Category "${name}" added`);
        });
      }

      // === Task Form ===
      const taskForm = getEl("taskForm");
      const taskInput = getEl("taskInput");
      const addBtn = getEl("addBtn");
      const copyPrevBtn = getEl("copyPrevBtn");
      let formSubmitting = false;

      if (copyPrevBtn) {
        copyPrevBtn.addEventListener("click", () => this.copyFromPreviousDay());
      }

      if (taskForm && taskInput) {
        taskInput.focus();

        taskForm.addEventListener("submit", (e) => {
          e.preventDefault();
          if (formSubmitting) return;
          const val = taskInput.value.trim();
          if (val.length > 0 && val.length <= CONFIG.MAX_TASK_LENGTH) {
            formSubmitting = true;
            if (addBtn) addBtn.disabled = true;
            this.addTask(val);
            taskInput.value = "";
            taskInput.focus();
            formSubmitting = false;
            if (addBtn) addBtn.disabled = true; // re-disable until input
          }
        });

        taskInput.addEventListener("input", () => {
          const valid = taskInput.value.trim().length > 0 && taskInput.value.length <= CONFIG.MAX_TASK_LENGTH;
          if (addBtn) addBtn.disabled = !valid || formSubmitting;
        });

        if (addBtn) addBtn.disabled = true;
      }

      // === Date Navigation ===
      const prevBtn = getEl("prevBtn");
      const nextBtn = getEl("nextBtn");
      const todayBtn = getEl("todayBtn");
      if (prevBtn) prevBtn.addEventListener("click", () => this.prevDate());
      if (nextBtn) nextBtn.addEventListener("click", () => this.nextDate());
      if (todayBtn) todayBtn.addEventListener("click", () => this.goToToday());

      // Date display opens calendar
      const dateDisplay = getEl("dateDisplay");
      if (dateDisplay) {
        dateDisplay.addEventListener("click", () => this.openCalendar());
        dateDisplay.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            this.openCalendar();
          }
        });
      }

      // === Filter & Sort ===
      document.querySelectorAll(".filter-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          document.querySelectorAll(".filter-pill").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          this.filterMode = btn.dataset.filter;
          this.renderTaskList();
          this.updateTaskCount();
        });
      });

      const sortSelect = getEl("sortSelect");
      if (sortSelect) {
        sortSelect.addEventListener("change", () => {
          this.sortMode = sortSelect.value;
          this.renderTaskList();
        });
      }

      // === Export/Import ===
      const exportBtn = getEl("exportBtn");
      const importBtn = getEl("importBtn");
      const importFile = getEl("importFile");
      const clearDayBtn = getEl("clearDayBtn");

      if (exportBtn) exportBtn.addEventListener("click", () => this.exportData());
      if (importBtn && importFile) {
        importBtn.addEventListener("click", () => importFile.click());
        importFile.addEventListener("change", (e) => {
          const file = e.target.files[0];
          if (file) {
            if (file.type !== "application/json" && !file.name.endsWith(".json")) {
              MessageManager.error("Please select a JSON file");
              return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => this.importData(ev.target.result);
            reader.onerror = () => MessageManager.error("Failed to read file");
            reader.readAsText(file);
          }
          e.target.value = "";
        });
      }
      if (clearDayBtn) clearDayBtn.addEventListener("click", () => this.clearDayTasks());

      // === Calendar Overlay ===
      const calCloseBtn = getEl("calCloseBtn");
      const calPrevMonth = getEl("calPrevMonth");
      const calNextMonth = getEl("calNextMonth");
      const calTodayBtn = getEl("calTodayBtn");
      const calOverlay = getEl("calendarOverlay");

      if (calCloseBtn) calCloseBtn.addEventListener("click", () => this.closeCalendar());
      if (calOverlay) {
        calOverlay.addEventListener("click", (e) => {
          if (e.target === calOverlay) this.closeCalendar();
        });
      }
      if (calPrevMonth) {
        calPrevMonth.addEventListener("click", () => {
          this.calendarDate.setMonth(this.calendarDate.getMonth() - 1);
          this.renderCalendar();
        });
      }
      if (calNextMonth) {
        calNextMonth.addEventListener("click", () => {
          this.calendarDate.setMonth(this.calendarDate.getMonth() + 1);
          this.renderCalendar();
        });
      }
      if (calTodayBtn) {
        calTodayBtn.addEventListener("click", () => {
          this.calendarDate = new Date();
          this.calendarDate.setHours(0, 0, 0, 0);
          this.goToToday();
          this.closeCalendar();
        });
      }

      // === Event Detail Overlay ===
      const eventCloseBtn = getEl("eventCloseBtn");
      const eventOverlay = getEl("eventOverlay");
      if (eventCloseBtn) eventCloseBtn.addEventListener("click", () => this.closeEventDetail());
      if (eventOverlay) {
        eventOverlay.addEventListener("click", (e) => {
          if (e.target === eventOverlay) this.closeEventDetail();
        });
      }

      // === Keyboard Shortcuts ===
      document.addEventListener("keydown", (e) => {
        // Escape closes overlays
        if (e.key === "Escape") {
          if (!document.getElementById("eventOverlay")?.classList.contains("hidden")) {
            this.closeEventDetail();
            return;
          }
          if (!document.getElementById("calendarOverlay")?.classList.contains("hidden")) {
            this.closeCalendar();
            return;
          }
        }
        // Don't trigger shortcuts when typing
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "SELECT") return;

        if (e.key === "ArrowLeft") { e.preventDefault(); this.prevDate(); }
        if (e.key === "ArrowRight") { e.preventDefault(); this.nextDate(); }
        if (e.key === "t" || e.key === "T") { this.goToToday(); }
        if (e.key === "c" || e.key === "C") { this.openCalendar(); }
        if (e.key === "n" || e.key === "N") { taskInput?.focus(); }
      });

      // Initial render
      this.render();
      Logger.log("PlannerApp v2 initialized successfully");
    } catch (error) {
      Logger.error("Critical error during initialization", error);
      MessageManager.error("Failed to initialize. Please refresh.");
    }
  }
}

// ===== UTILITIES =====
function escapeHtml(text) {
  if (typeof text !== "string") text = String(text);
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ===== BOOT =====
document.addEventListener("DOMContentLoaded", () => {
  try {
    Logger.log("DOM ready, starting PlannerApp v2");

    // Register Service Worker (once)
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("service-worker.js")
        .then((reg) => Logger.log("Service Worker registered:", reg.scope))
        .catch((err) => Logger.warn("SW registration failed:", err));
    }

    window.plannerApp = new PlannerApp();
  } catch (error) {
    Logger.error("Fatal error", error);
  }
});

// Global error handlers
window.addEventListener("error", (event) => Logger.error("Uncaught error", event.error));
window.addEventListener("unhandledrejection", (event) => Logger.error("Unhandled rejection", event.reason));
