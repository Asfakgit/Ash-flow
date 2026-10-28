import axios from "axios";

export const SHEETS_API_URL =
  import.meta.env.VITE_SHEETS_API_URL ||
  "https://script.google.com/macros/s/AKfycbxVZSbaxOUJYIum5CjkWq7Tv43HV3i8lZVQ9H-G9XTI0AK_JJgEBlTXMUwQkO6fZ0LM/exec";

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
    localStorage.removeItem("app_avatar_img");

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
  let val =
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

  if (val === null || val === undefined) return defaultVal;

  // Sanitize corrupt values like "click" (from click event leak) in the type column
  if (prop === "type" || idx === 3) {
    const s = String(val).trim();
    if (s.toLowerCase() === "click") {
      return "Lent";
    }
  }

  return val;
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

      // Check for any header cells
      if (
        col0 === "id" ||
        col0 === "person" ||
        col1 === "person" ||
        col2 === "amount" ||
        col3 === "type" ||
        col4 === "date" ||
        col5 === "notes" ||
        col6 === "method" ||
        col3 === "method" ||
        col4 === "method"
      ) {
        return false;
      }

      // Check if essentially empty or dummy row
      if (!col0 && !col1 && !col2) return false;
      if (col1 === "person") return false;
    } else if (typeof row === "object") {
      const idStr = String(row.id || "").toLowerCase().trim();
      const personStr = String(row.person || row.Person || "").toLowerCase().trim();
      const typeStr = String(row.type || row.Type || "").toLowerCase().trim();
      const methodStr = String(row.method || row.Method || row.paymentMethod || "").toLowerCase().trim();
      const notesStr = String(row.notes || row.Notes || "").toLowerCase().trim();
      const dateStr = String(row.date || row.Date || "").toLowerCase().trim();

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
        if (result.user?.avatar) {
          setUserAvatar(result.user.avatar, result.user);
        }
        localStorage.setItem("isAuthenticated", "true");
        window.dispatchEvent(new Event("avatar_updated"));
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
// PASSWORD RESET & SHEET PRIVACY APIS
// =======================
export const requestPasswordReset = async (username, newPassword) => {
  const cleanUsername = String(username || "").trim().toLowerCase();
  try {
    const res = await axios.post(
      SHEETS_API_URL,
      JSON.stringify({
        action: "forgot_password",
        username: cleanUsername,
        newPassword: newPassword,
      }),
      {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        transformResponse: (raw) => normalizeResponseData(raw),
      }
    );

    const result = res.data;
    if (result && result.success) {
      return result;
    }
    throw new Error(result?.message || "Failed to submit password reset request.");
  } catch (err) {
    console.error("requestPasswordReset error:", err);
    throw err;
  }
};

export const adminApprovePasswordReset = async (targetUsername) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token required");

  try {
    const res = await axios.post(
      SHEETS_API_URL,
      JSON.stringify({
        action: "admin_approve_reset",
        token: token,
        targetUsername: String(targetUsername || "").trim().toLowerCase(),
      }),
      {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        transformResponse: (raw) => normalizeResponseData(raw),
      }
    );

    const result = res.data;
    if (result && result.success) {
      return result;
    }
    throw new Error(result?.message || "Failed to approve password reset.");
  } catch (err) {
    console.error("adminApprovePasswordReset error:", err);
    throw err;
  }
};

export const adminSetUserPassword = async (targetUsername, newPassword) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token required");

  try {
    const res = await axios.post(
      SHEETS_API_URL,
      JSON.stringify({
        action: "admin_set_password",
        token: token,
        targetUsername: String(targetUsername || "").trim().toLowerCase(),
        newPassword: newPassword,
      }),
      {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        transformResponse: (raw) => normalizeResponseData(raw),
      }
    );

    const result = res.data;
    if (result && result.success) {
      return result;
    }
    throw new Error(result?.message || "Failed to set user password.");
  } catch (err) {
    console.error("adminSetUserPassword error:", err);
    throw err;
  }
};

export const updateAdminViewPermission = async (allowAdminView) => {
  const token = getAuthToken();
  const curr = getAuthUser();
  const allowBool = Boolean(allowAdminView);

  // 1. Instantly update local session state
  if (curr) {
    curr.allowAdminView = allowBool;
    setAuthUser(curr);
    window.dispatchEvent(new Event("auth_user_updated"));
  }

  // 2. Sync to cloud backend
  try {
    const res = await axios.post(
      SHEETS_API_URL,
      JSON.stringify({
        action: "update_admin_view_permission",
        token: token || "",
        username: curr?.username || "",
        allowAdminView: allowBool,
      }),
      {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        transformResponse: (raw) => normalizeResponseData(raw),
        timeout: 9000,
      }
    );

    const result = res.data;
    if (result && result.success) {
      if (curr) {
        curr.allowAdminView = Boolean(result.allowAdminView !== undefined ? result.allowAdminView : allowBool);
        setAuthUser(curr);
        window.dispatchEvent(new Event("auth_user_updated"));
      }
      return result;
    }
    return { success: true, allowAdminView: allowBool };
  } catch (err) {
    console.warn("updateAdminViewPermission network sync issue (saved locally):", err);
    return { success: true, allowAdminView: allowBool, offline: true };
  }
};

// =======================
// USER-ISOLATED AVATAR PROFILE HELPERS
// =======================
export const getUserAvatarKey = (user) => {
  const target = user || getAuthUser();
  const username = target?.username || (target?.id ? String(target.id) : null);
  return username ? `app_avatar_img_${String(username).trim().toLowerCase()}` : null;
};

export const getUserAvatar = (user) => {
  const target = user || getAuthUser();
  if (!target) return null;
  const key = getUserAvatarKey(target);
  if (key) {
    try {
      const local = localStorage.getItem(key);
      if (local) return local;
    } catch {}
  }
  return target.avatar || null;
};

export const setUserAvatar = (avatarDataUrl, user) => {
  const target = user || getAuthUser();
  const key = getUserAvatarKey(target);
  if (key) {
    try {
      if (avatarDataUrl) {
        localStorage.setItem(key, avatarDataUrl);
      } else {
        localStorage.removeItem(key);
      }
    } catch (err) {
      console.warn("Failed to write avatar to localStorage:", err);
    }
  }

  // Remove any legacy global key so no avatar leaks across users
  try {
    localStorage.removeItem("app_avatar_img");
  } catch {}

  // Update cached auth user
  const curr = getAuthUser();
  if (curr && target && (curr.username === target.username || curr.id === target.id)) {
    curr.avatar = avatarDataUrl || "";
    setAuthUser(curr);
  }

  window.dispatchEvent(new Event("avatar_updated"));
};

export const updateUserProfileAvatar = async (avatarDataUrl) => {
  const curr = getAuthUser();
  setUserAvatar(avatarDataUrl, curr);

  const token = getAuthToken();
  if (token) {
    try {
      const res = await axios.post(
        SHEETS_API_URL,
        JSON.stringify({
          action: "update_profile_avatar",
          token: token,
          avatar: avatarDataUrl || "",
        }),
        {
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          transformResponse: (raw) => normalizeResponseData(raw),
          timeout: 8000,
        }
      );
      return res.data;
    } catch (err) {
      console.warn("Could not sync avatar to cloud backend (saved locally):", err);
    }
  }
  return { success: true };
};

export const adminGetUserTransactions = async (targetUsername) => {
  const token = getAuthToken();
  if (!token) throw new Error("Authentication token required");

  try {
    const res = await axios.post(
      SHEETS_API_URL,
      JSON.stringify({
        action: "admin_get_user_transactions",
        token: token,
        targetUsername: String(targetUsername || "").trim().toLowerCase(),
      }),
      {
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        transformResponse: (raw) => normalizeResponseData(raw),
      }
    );

    const result = res.data;
    if (result && result.success) {
      return result;
    }
    throw new Error(result?.message || "Failed to fetch user sheet transactions.");
  } catch (err) {
    console.error("adminGetUserTransactions error:", err);
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
  const rawType = String(data.type || "").trim();
  const normalizedType =
    rawType.toLowerCase() === "borrowed" || rawType.toLowerCase() === "borrow"
      ? "Borrowed"
      : rawType.toLowerCase() === "partial payment" || rawType.toLowerCase() === "partial"
      ? "Partial Payment"
      : rawType.toLowerCase().includes("settled")
      ? "Settled"
      : "Lent"; // Defaults safely to "Lent" (fixes "click" event leak)

  const payload = {
    id: data.id || Date.now(),
    person: data.person,
    amount: data.amount,
    type: normalizedType,
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
  const updatedCache = currentCache.map((item) => {
    if (String(getRowVal(item, 0, "id")) === String(payload.id)) {
      if (Array.isArray(item)) {
        const arr = [
          payload.id,
          payload.person,
          payload.amount,
          payload.type,
          payload.date,
          payload.notes,
          payload.method,
        ];
        arr.id = payload.id;
        arr.person = payload.person;
        arr.amount = payload.amount;
        arr.type = payload.type;
        arr.date = payload.date;
        arr.notes = payload.notes;
        arr.method = payload.method;
        return arr;
      }
      return {
        ...item,
        ...payload,
        0: payload.id,
        1: payload.person,
        2: payload.amount,
        3: payload.type,
        4: payload.date,
        5: payload.notes,
        6: payload.method,
      };
    }
    return item;
  });
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
export const deleteTransaction = async (id, extra = {}) => {
  const currentCache = getDataRows(getCachedTransactions());
  const updatedCache = currentCache.filter((item) => {
    const itemId = String(getRowVal(item, 0, "id", ""));
    if (id !== undefined && id !== null && String(id).trim() !== "" && itemId === String(id).trim()) {
      return false;
    }
    if (extra && extra.person) {
      const p = String(getRowVal(item, 1, "person", "")).trim().toLowerCase();
      if (p === String(extra.person).trim().toLowerCase()) return false;
    }
    return true;
  });
  setCachedTransactions(updatedCache);

  const payload = {
    action: "delete",
    id: id || 0,
    person: extra?.person || "",
    notes: extra?.notes || "",
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    addToOfflineQueue(payload);
    return { status: "success", offline: true };
  }

  try {
    return await postRequest(payload);
  } catch (err) {
    console.warn("Delete request failed, saved to offline queue:", err);
    addToOfflineQueue(payload);
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

export const cleanNotesDisplay = (notes) => {
  if (!notes) return "";
  let s = String(notes);
  s = s.replace(/\s*\(\s*ID\s*:\s*[^)]+\)/gi, "");
  s = s.replace(/\s*\[\s*(?:ref|ID)\s*:\s*[^\]]+\]/gi, "");
  s = s.replace(/\s*\(?\s*ID\s*:\s*[\w\d]+\s*\)?/gi, "");
  s = s.replace(/\s*•\s*$/, "").replace(/^\s*•\s*/, "").trim();
  return s;
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
