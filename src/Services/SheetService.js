import axios from "axios";

export const SHEETS_API_URL =
  "https://script.google.com/macros/s/AKfycbyiiap4TVUSKZYWMn2gBlaMP7tBrSx_2vmDckaM_TgzGO3HJZct5XYEyU76T-VdAv6x/exec";

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

const postRequest = (payload) => {
  return axios.post(SHEETS_API_URL, JSON.stringify(payload), {
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    transformResponse: (raw) => normalizeResponseData(raw),
  });
};

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
// GET ALL TRANSACTIONS
// =======================
export const getTransactions = () => {
  return axios.get(SHEETS_API_URL, {
    transformResponse: (raw) => normalizeResponseData(raw),
  });
};

// =======================
// ADD TRANSACTION
// =======================
export const addTransaction = (data) => {
  return postRequest({
    action: "add",
    ...data,
  });
};

// =======================
// UPDATE TRANSACTION
// =======================
export const updateTransaction = (data) => {
  return postRequest({
    action: "update",
    ...data,
  });
};

// =======================
// DELETE TRANSACTION
// =======================
export const deleteTransaction = (id) => {
  return postRequest({
    action: "delete",
    id,
  });
};

// =======================
// DATE HELPERS (DD/MM/YYYY formatting & Local Timezone Support)
// =======================
export const getTodayForPicker = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getTodayDisplay = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${day}/${month}/${year}`;
};

export const formatDateDisplay = (dateStr) => {
  if (!dateStr) return "-";
  if (dateStr instanceof Date || (typeof dateStr === "string" && (dateStr.includes("T") || dateStr.includes("Z")))) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${day}/${month}/${year}`;
    }
  }
  const str = String(dateStr).split("T")[0];
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const [, year, month, day] = ymdMatch;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`;
  }
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
