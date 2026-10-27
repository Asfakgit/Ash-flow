import axios from "axios";

export const SHEETS_API_URL =
  "https://script.google.com/macros/s/AKfycbyHl5Y5loM1AzDzEkeqdlpEpqcZQij9XE5kyAdebDYHQJrywQ_iqK7DptsbbNaP-i37/exec";

const normalizeResponseData = (data) => {
  if (typeof data === "string") {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  return data;
};

const postRequest = (payload) =>
  axios.post(SHEETS_API_URL, JSON.stringify(payload), {
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    transformResponse: (raw) => normalizeResponseData(raw),
  }).then((response) => {
    if (response.data?.success === false) {
      throw new Error(response.data.message || "Google Sheets request failed");
    }
    return response;
  });

// =======================
// DATA HELPERS (Array & Object Support)
// =======================
export const getRowVal = (row, idx, prop, defaultVal = "") => {
  if (!row) return defaultVal;
  const val =
    row[idx] !== undefined ? row[idx] :
    row[prop] !== undefined ? row[prop] :
    row[prop.toLowerCase()] !== undefined ? row[prop.toLowerCase()] :
    row[prop.charAt(0).toUpperCase() + prop.slice(1).toLowerCase()] !== undefined ? row[prop.charAt(0).toUpperCase() + prop.slice(1).toLowerCase()] :
    row[prop.toUpperCase()] !== undefined ? row[prop.toUpperCase()] : defaultVal;
  return val !== null && val !== undefined ? val : defaultVal;
};

export const getDataRows = (transactions = []) => {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  const first = transactions[0];
  if (Array.isArray(first)) {
    const firstCol = String(first[0] || "").toLowerCase();
    const secondCol = String(first[1] || "").toLowerCase();
    if (firstCol === "id" || secondCol === "person" || firstCol === "person") {
      return transactions.slice(1);
    }
  }
  return transactions;
};

// =======================
// OFFLINE STORAGE & SYNC ENGINE
// =======================
const CACHE_KEY = "money_app_transactions_cache";
const QUEUE_KEY = "money_app_offline_queue";

export const getCachedTransactions = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Failed to read cache:", err);
    return [];
  }
};

export const setCachedTransactions = (data = []) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Failed to write cache:", err);
  }
};

export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfflineQueue = (queue = []) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error("Failed to save offline queue:", err);
  }
};

export const addToOfflineQueue = (item) => {
  const queue = getOfflineQueue();
  queue.push(item);
  saveOfflineQueue(queue);
};

let isSyncing = false;

export const syncOfflineQueue = async () => {
  if (isSyncing || typeof navigator !== "undefined" && !navigator.onLine) return;
  const queue = getOfflineQueue();
  if (!queue || queue.length === 0) return;

  isSyncing = true;
  console.log(`Online detected: Syncing ${queue.length} offline actions to Google Sheets...`);

  const remainingQueue = [];
  for (const item of queue) {
    try {
      if (item.action === "add") {
        await postRequest({ action: "add", ...item.payload });
      } else if (item.action === "update") {
        await postRequest({ action: "update", ...item.payload });
      } else if (item.action === "delete") {
        await postRequest({ action: "delete", id: item.id });
      }
    } catch (err) {
      console.error("Sync item failed:", item, err);
      remainingQueue.push(item);
    }
  }

  saveOfflineQueue(remainingQueue);
  isSyncing = false;
};

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    syncOfflineQueue().catch(() => {});
  });
}

// =======================
// GET ALL TRANSACTIONS (GOOGLE SHEETS + OFFLINE CACHE)
// =======================
export const getTransactions = async () => {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    syncOfflineQueue().catch(() => {});
  }

  try {
    const { data } = await axios.get(SHEETS_API_URL, {
      transformResponse: (raw) => normalizeResponseData(raw),
    });

    if (!Array.isArray(data)) {
      throw new Error(data?.message || "Unexpected response from Google Sheets");
    }

    const list = data;
    setCachedTransactions(list);
    return { data: list };
  } catch (err) {
    console.warn("Offline or network issue: Loading transactions from local cache.", err);
    const cached = getCachedTransactions();
    return { data: cached };
  }
};

// =======================
// ADD TRANSACTION (GOOGLE SHEETS + OFFLINE QUEUE)
// =======================
export const addTransaction = async (data) => {
  const payload = {
    id: data.id || Date.now(),
    person: data.person,
    amount: data.amount,
    type: data.type,
    date: formatDateDisplay(data.date),
    notes: data.notes || "",
    method: data.method || "Cash",
  };

  const currentCache = getCachedTransactions();
  const updatedCache = [payload, ...currentCache.filter((r) => String(getRowVal(r, 0, "id")) !== String(payload.id))];
  setCachedTransactions(updatedCache);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    addToOfflineQueue({ action: "add", payload });
    return { status: "success", offline: true, data: [payload] };
  }

  try {
    return await postRequest({ action: "add", ...payload });
  } catch (err) {
    console.warn("Insert request failed, saved to offline queue:", err);
    addToOfflineQueue({ action: "add", payload });
    return { status: "success", offline: true, data: [payload] };
  }
};

// =======================
// UPDATE TRANSACTION (GOOGLE SHEETS + OFFLINE QUEUE)
// =======================
export const updateTransaction = async (data) => {
  const payload = {
    id: data.id,
    person: data.person,
    amount: data.amount,
    type: data.type,
    date: formatDateDisplay(data.date),
    notes: data.notes || "",
    method: data.method || "Cash",
  };

  const currentCache = getCachedTransactions();
  const updatedCache = currentCache.map((item) =>
    String(getRowVal(item, 0, "id")) === String(payload.id) ? { ...item, ...payload } : item
  );
  setCachedTransactions(updatedCache);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    addToOfflineQueue({ action: "update", payload });
    return { status: "success", offline: true, data: [payload] };
  }

  try {
    return await postRequest({ action: "update", ...payload });
  } catch (err) {
    console.warn("Update request failed, saved to offline queue:", err);
    addToOfflineQueue({ action: "update", payload });
    return { status: "success", offline: true, data: [payload] };
  }
};

// =======================
// DELETE TRANSACTION (GOOGLE SHEETS + OFFLINE QUEUE)
// =======================
export const deleteTransaction = async (id) => {
  const currentCache = getCachedTransactions();
  const updatedCache = currentCache.filter(
    (item) => String(getRowVal(item, 0, "id")) !== String(id)
  );
  setCachedTransactions(updatedCache);

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    addToOfflineQueue({ action: "delete", id });
    return { status: "success", offline: true };
  }

  try {
    return await postRequest({ action: "delete", id });
  } catch (err) {
    console.warn("Delete request failed, saved to offline queue:", err);
    addToOfflineQueue({ action: "delete", id });
    return { status: "success", offline: true };
  }
};

// =======================
// DATE HELPERS (DD/MM/YYYY formatting & Local Timezone Support)
// =======================
const _formatDMY = (d) => {
  if (!d || isNaN(d.getTime())) return "-";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
};

export const getTodayForPicker = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

export const getTodayDisplay = () => _formatDMY(new Date());

export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "-";
  if (dateStr instanceof Date) return _formatDMY(dateStr);

  const rawStr = String(dateStr).trim();

  // Numeric timestamps or ISO strings
  if (typeof dateStr === "number" || /^\d{10,13}$/.test(rawStr) || rawStr.includes("T") || rawStr.includes("Z")) {
    const d = new Date(Number(rawStr) || rawStr);
    if (!isNaN(d.getTime())) return _formatDMY(d);
  }

  const str = rawStr.split("T")[0].split(" ")[0];

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }

  const d = new Date(rawStr);
  if (!isNaN(d.getTime())) return _formatDMY(d);

  return str;
};

export const formatDateForPicker = (dateStr) => {
  if (!dateStr) return getTodayForPicker();
  if (dateStr instanceof Date || (typeof dateStr === "string" && (dateStr.includes("T") || dateStr.includes("Z")))) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }
  const str = String(dateStr).split("T")[0];
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return getTodayForPicker();
};

export const isValidDate = (dateStr) => {
  if (!dateStr || !String(dateStr).trim()) return false;
  if (dateStr instanceof Date) return !isNaN(dateStr.getTime());

  const str = String(dateStr).trim().split("T")[0];

  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const testDate = new Date(year, month - 1, day);
    return (
      testDate.getFullYear() === year &&
      testDate.getMonth() === month - 1 &&
      testDate.getDate() === day
    );
  }

  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    const year = parseInt(y, 10);
    const month = parseInt(m, 10);
    const day = parseInt(d, 10);
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
    const testDate = new Date(year, month - 1, day);
    return (
      testDate.getFullYear() === year &&
      testDate.getMonth() === month - 1 &&
      testDate.getDate() === day
    );
  }

  return false;
};

// =======================
// NAME CAPITALIZATION HELPER
// =======================
export const capitalizeName = (name) => {
  if (!name) return "";
  return String(name)
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};
