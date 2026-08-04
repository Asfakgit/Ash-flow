import { supabase } from "../lib/supabase";

export const SHEETS_API_URL =
    "https://script.google.com/macros/s/AKfycbymgDOogJPt3DQsVqB0YVFXvqYqPIsBLjOV_AAGgNDc51HCKh7Vct2UaZLcMOrO4RC_/exec";

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
// GET ALL TRANSACTIONS (SUPABASE)
// =======================
export const getTransactions = async () => {
  try {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error("Supabase fetch error:", error);
      throw error;
    }
    return { data: data || [] };
  } catch (err) {
    console.error("Error fetching transactions from Supabase:", err);
    return { data: [] };
  }
};

// =======================
// ADD TRANSACTION (SUPABASE)
// =======================
export const addTransaction = async (data) => {
  const payload = {
    id: data.id || Date.now(),
    person: data.person,
    amount: data.amount,
    type: data.type,
    date: data.date,
    notes: data.notes || "",
    method: data.method || "Cash",
  };

  const { data: resData, error } = await supabase
    .from("transactions")
    .insert([payload])
    .select();

  if (error) {
    console.error("Supabase insert error:", error);
    throw error;
  }
  return { status: "success", data: resData };
};

// =======================
// UPDATE TRANSACTION (SUPABASE)
// =======================
export const updateTransaction = async (data) => {
  const payload = {
    person: data.person,
    amount: data.amount,
    type: data.type,
    date: data.date,
    notes: data.notes || "",
    method: data.method || "Cash",
  };

  const { data: resData, error } = await supabase
    .from("transactions")
    .update(payload)
    .eq("id", data.id)
    .select();

  if (error) {
    console.error("Supabase update error:", error);
    throw error;
  }
  return { status: "success", data: resData };
};

// =======================
// DELETE TRANSACTION (SUPABASE)
// =======================
export const deleteTransaction = async (id) => {
  const { data: resData, error } = await supabase
    .from("transactions")
    .delete()
    .eq("id", id)
    .select();

  if (error) {
    console.error("Supabase delete error:", error);
    throw error;
  }
  return { status: "success", data: resData };
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
