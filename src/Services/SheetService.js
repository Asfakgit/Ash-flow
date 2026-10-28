import axios from "axios";

export const SHEETS_API_URL =
  import.meta.env.VITE_SHEETS_API_URL ||
  "https://script.google.com/macros/s/AKfycbzm0DyTMqtHNKVJhUPgZqTRwNVSUYaGQ0h-HVwz1b2B-UtlFGCG7U9JXCNyjRITo0hq/exec";

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

// =======================
// AUTH & SESSION MANAGEMENT
// =======================
const AUTH_TOKEN_KEY = "money_app_auth_token";
const AUTH_USER_KEY = "money_app_auth_user";

export const getAuthToken = () => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

export const setAuthToken = (token) => {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch (err) {
    console.error("Failed to set auth token:", err);
  }
};

export const getAuthUser = () => {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setAuthUser = (user) => {
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch (err) {
    console.error("Failed to set auth user:", err);
  }
};

export const isUserAuthenticated = () => {
  const token = getAuthToken();
  const user = getAuthUser();
  const isAuth = localStorage.getItem("isAuthenticated") === "true";
  return Boolean(token && user && isAuth);
};

export const clearAuthSession = () => {
  try {
    // 1. Clear all user session / cache keys from localStorage
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith("money_app_") ||
          key === "isAuthenticated" ||
          key.includes("token") ||
          key.includes("user") ||
          key.includes("google") ||
          key.includes("auth"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));

    // Explicitly guarantee primary session keys are deleted
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem("isAuthenticated");

    // 2. Completely wipe sessionStorage
    sessionStorage.clear();
  } catch (err) {
    console.error("Failed to clear auth session:", err);
  }
};

export const logoutUser = async () => {
  const token = getAuthToken();
  clearAuthSession();

  if (token) {
    try {
      await axios
        .post(
          SHEETS_API_URL,
          JSON.stringify({ action: "logout", token }),
          {
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            transformResponse: (raw) => normalizeResponseData(raw),
            timeout: 4000,
          }
        )
        .catch(() => {});
    } catch {
      // Non-blocking: local session is wiped regardless
    }
  }
};

const postRequest = (payload) => {
  const token = getAuthToken();
  const dataToSend = {
    ...payload,
    ...(token ? { token } : {}),
  };

  return axios
    .post(SHEETS_API_URL, JSON.stringify(dataToSend), {
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      transformResponse: (raw) => normalizeResponseData(raw),
    })
    .then((response) => {
      if (response.data?.success === false) {
        throw new Error(response.data.message || "Google Sheets request failed");
      }
      return response;
    });
};

// =======================
// DATA HELPERS (Array & Object Support)
// =======================
export const getRowVal = (row, idx, prop, defaultVal = "") => {
  if (!row) return defaultVal;
  const val =
    row[idx] !== undefined
      ? row[idx]
      : row[prop] !== undefined
      ? row[prop]
      : row[prop.toLowerCase()] !== undefined
      ? row[prop.toLowerCase()]
      : row[prop.charAt(0).toUpperCase() + prop.slice(1).toLowerCase()] !== undefined
      ? row[prop.charAt(0).toUpperCase() + prop.slice(1).toLowerCase()]
      : row[prop.toUpperCase()] !== undefined
      ? row[prop.toUpperCase()]
      : defaultVal;
  return val !== null && val !== undefined ? val : defaultVal;
};

export const getDataRows = (transactions = []) => {
  if (!Array.isArray(transactions) || transactions.length === 0) return [];
  return transactions.filter((row) => {
    if (!row) return false;
    if (Array.isArray(row)) {
      const col0 = String(row[0] || "").toLowerCase().trim();
      const col1 = String(row[1] || "").toLowerCase().trim();
      const col2 = String(row[2] || "").toLowerCase().trim();
      const col3 = String(row[3] || "").toLowerCase().trim();
      const col4 = String(row[4] || "").toLowerCase().trim();
      const col5 = String(row[5] || "").toLowerCase().trim();
      const col6 = String(row[6] || "").toLowerCase().trim();

      if (
        col0 === "id" ||
        col0 === "person" ||
        col1 === "person" ||
        col2 === "amount" ||
        col3 === "type" ||
        col4 === "date" ||
        col5 === "notes" ||
        col6 === "method"
      ) {
        return false;
      }

      // Check if essentially empty or dummy header
      if (!col0 && !col1 && !col2) return false;
    } else if (typeof row === "object") {
      const idStr = String(row.id || "").toLowerCase().trim();
      const personStr = String(row.person || "").toLowerCase().trim();
      const typeStr = String(row.type || "").toLowerCase().trim();
      const methodStr = String(row.method || row.paymentMethod || "").toLowerCase().trim();
      const notesStr = String(row.notes || "").toLowerCase().trim();
      const dateStr = String(row.date || "").toLowerCase().trim();

      if (
        idStr === "id" ||
        personStr === "person" ||
        typeStr === "type" ||
        methodStr === "method" ||
        notesStr === "notes" ||
        dateStr === "date"
      ) {
        return false;
      }
      if (!personStr && !row.amount) return false;
    }
    return true;
  });
};

// =======================
// USER-SCOPED OFFLINE STORAGE & SYNC ENGINE
// =======================
const getCacheKey = () => {
  const user = getAuthUser();
  const id = user?.username ? String(user.username).toLowerCase() : "default";
  return `money_app_transactions_cache_${id}`;
};

const getQueueKey = () => {
  const user = getAuthUser();
  const id = user?.username ? String(user.username).toLowerCase() : "default";
  return `money_app_offline_queue_${id}`;
};

export const getCachedTransactions = () => {
  try {
    const raw = localStorage.getItem(getCacheKey());
    const parsed = raw ? JSON.parse(raw) : [];
    return getDataRows(parsed);
  } catch (err) {
    console.error("Failed to read cache:", err);
    return [];
  }
};

export const setCachedTransactions = (data = []) => {
  try {
    localStorage.setItem(getCacheKey(), JSON.stringify(data));
  } catch (err) {
    console.error("Failed to write cache:", err);
  }
};

export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(getQueueKey());
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveOfflineQueue = (queue = []) => {
  try {
    localStorage.setItem(getQueueKey(), JSON.stringify(queue));
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
  if (isSyncing || (typeof navigator !== "undefined" && !navigator.onLine)) return;
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
// AUTHENTICATION API CALLS
// =======================
export const loginUser = async (username, password) => {
  const trimmedUser = String(username || "").trim().toLowerCase();
  const rawPassword = String(password || "");

  try {
    const res = await axios.post(
      SHEETS_API_URL,
      JSON.stringify({
        action: "login",
        username: trimmedUser,
        password: rawPassword,
      }),
      {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        transformResponse: (raw) => normalizeResponseData(raw),
      }
    );

    const result = res.data;

    if (result && typeof result === "object") {
      if (result.success && result.token) {
        setAuthToken(result.token);
        setAuthUser(result.user);
        localStorage.setItem("isAuthenticated", "true");
        return { success: true, user: result.user, token: result.token };
      }

      // Check if the current backend is legacy and returned "Invalid Action"
      if (result.success === false && result.message === "Invalid Action") {
        return handleLegacyAdminLoginFallback(trimmedUser, rawPassword);
      }

      return {
        success: false,
        status: result.status || "ERROR",
        message: result.message || "Invalid username or password.",
      };
    }

    return { success: false, message: "Unexpected response from server." };
  } catch (err) {
    console.error("Login request error:", err);
    return handleLegacyAdminLoginFallback(trimmedUser, rawPassword, err.message);
  }
};

const handleLegacyAdminLoginFallback = (username, password, errMsg = "") => {
  const validUsername = String(import.meta.env.VITE_APP_USERNAME || "ashflow").trim().toLowerCase();
  const validPassword = String(import.meta.env.VITE_APP_PASSWORD || "Ashflow@123").trim();

  if (username === validUsername && password === validPassword) {
    const adminUser = {
      id: 1,
      username: validUsername,
      fullName: "Ashfak (Admin)",
      role: "ADMIN",
      status: "APPROVED",
      sheetName: "transactions",
      isLegacyFallback: true,
    };
    const mockToken = "legacy_admin_token_" + Date.now();
    setAuthToken(mockToken);
    setAuthUser(adminUser);
    localStorage.setItem("isAuthenticated", "true");
    return {
      success: true,
      user: adminUser,
      token: mockToken,
      legacyWarning: true,
      message: "Logged in as Admin. Note: Google Apps Script can be updated with .code.gs to enable user registration and tab isolation.",
    };
  }

  return {
    success: false,
    message: errMsg || "Invalid username or password.",
  };
};

export const registerUser = async ({ username, password, fullName }) => {
  const trimmedUser = String(username || "").trim().toLowerCase();
  const rawPassword = String(password || "");
  const trimmedName = String(fullName || "").trim();

  try {
    const res = await axios.post(
      SHEETS_API_URL,
      JSON.stringify({
        action: "register",
        username: trimmedUser,
        password: rawPassword,
        fullName: trimmedName,
      }),
      {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        transformResponse: (raw) => normalizeResponseData(raw),
      }
    );

    const result = res.data;
    if (result && result.success) {
      return {
        success: true,
        message: result.message || "Registration submitted! Your account is pending admin approval.",
      };
    }

    if (result && result.message === "Invalid Action") {
      return {
        success: false,
        message: "Google Apps Script needs to be updated with .code.gs to support user registration.",
      };
    }

    return {
      success: false,
      message: result?.message || "Registration failed. Please try again.",
    };
  } catch (err) {
    console.error("Register request error:", err);
    return {
      success: false,
      message: err.response?.data?.message || err.message || "Network error during registration.",
    };
  }
};

// =======================
// ADMIN USER MANAGEMENT CALLS
// =======================
export const adminGetUsers = async () => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token required");

  try {
    const res = await axios.post(
      SHEETS_API_URL,
      JSON.stringify({
        action: "admin_get_users",
        token: token,
      }),
      {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        transformResponse: (raw) => normalizeResponseData(raw),
      }
    );

    const result = res.data;
    if (result && result.success) {
      return { success: true, users: result.users || [] };
    }

    throw new Error(result?.message || "Failed to load users list");
  } catch (err) {
    console.error("adminGetUsers error:", err);
    throw err;
  }
};

export const adminUpdateUserStatus = async (targetUsername, newStatus) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token required");

  try {
    const res = await axios.post(
      SHEETS_API_URL,
      JSON.stringify({
        action: "admin_update_user_status",
        token: token,
        targetUsername: targetUsername,
        newStatus: newStatus,
      }),
      {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        transformResponse: (raw) => normalizeResponseData(raw),
      }
    );

    const result = res.data;
    if (result && result.success) {
      return {
        success: true,
        message: result.message,
        sheetName: result.sheetName,
      };
    }

    throw new Error(result?.message || "Failed to update user status");
  } catch (err) {
    console.error("adminUpdateUserStatus error:", err);
    throw err;
  }
};

export const adminDeleteUser = async (targetUsername) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token required");

  const cleanTarget = String(targetUsername || "").trim().toLowerCase();

  try {
    const res = await axios.post(
      SHEETS_API_URL,
      JSON.stringify({
        action: "admin_delete_user",
        token: token,
        targetUsername: cleanTarget,
        id: 0,
      }),
      {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        transformResponse: (raw) => normalizeResponseData(raw),
      }
    );

    const result = res.data;
    if (result && result.success) {
      return {
        success: true,
        message: result.message,
      };
    }

    // Fallback: try admin_update_user_status with DELETED
    const fallbackRes = await axios.post(
      SHEETS_API_URL,
      JSON.stringify({
        action: "admin_update_user_status",
        token: token,
        targetUsername: cleanTarget,
        newStatus: "DELETED",
        id: 0,
      }),
      {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        transformResponse: (raw) => normalizeResponseData(raw),
      }
    );

    if (fallbackRes.data && fallbackRes.data.success) {
      return {
        success: true,
        message: fallbackRes.data.message || "User deleted.",
      };
    }

    throw new Error(
      result?.message || fallbackRes.data?.message || "Failed to delete user"
    );
  } catch (err) {
    console.error("adminDeleteUser error:", err);
    throw err;
  }
};

// =======================
// GET ALL TRANSACTIONS (GOOGLE SHEETS + OFFLINE CACHE)
// =======================
export const getTransactions = async () => {
  if (typeof navigator !== "undefined" && navigator.onLine) {
    syncOfflineQueue().catch(() => {});
  }

  try {
    const token = getAuthToken();
    const url = token
      ? `${SHEETS_API_URL}?token=${encodeURIComponent(token)}`
      : SHEETS_API_URL;

    const { data } = await axios.get(url, {
      transformResponse: (raw) => normalizeResponseData(raw),
    });

    if (!Array.isArray(data)) {
      if (data && data.success === false) {
        if (data.error === "UNAUTHORIZED" || data.error === "FORBIDDEN") {
          clearAuthSession();
          window.location.reload();
        }
        throw new Error(data.message || data.error || "Failed to fetch transactions");
      }
      throw new Error(data?.message || "Unexpected response from Google Sheets");
    }

    const dataRows = getDataRows(data);
    const list = dataRows.sort(
      (a, b) =>
        (Number(getRowVal(b, 0, "id", 0)) || 0) -
        (Number(getRowVal(a, 0, "id", 0)) || 0)
    );
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

  const currentCache = getDataRows(getCachedTransactions());
  const updatedCache = [
    payload,
    ...currentCache.filter((r) => String(getRowVal(r, 0, "id")) !== String(payload.id)),
  ];
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

  const currentCache = getDataRows(getCachedTransactions());
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
  const currentCache = getDataRows(getCachedTransactions());
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
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;
};

export const getTodayDisplay = () => _formatDMY(new Date());

export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "-";
  if (dateStr instanceof Date) return _formatDMY(dateStr);

  const rawStr = String(dateStr).trim();

  // Numeric timestamps or ISO strings
  if (
    typeof dateStr === "number" ||
    /^\d{10,13}$/.test(rawStr) ||
    rawStr.includes("T") ||
    rawStr.includes("Z")
  ) {
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
  if (
    dateStr instanceof Date ||
    (typeof dateStr === "string" && (dateStr.includes("T") || dateStr.includes("Z")))
  ) {
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
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31)
      return false;
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
    if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31)
      return false;
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
