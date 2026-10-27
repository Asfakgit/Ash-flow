const DEFAULT_TAB = "transactions";
const USERS_SHEET_NAME = "Users";
const ADMIN_USERNAME = "ashflow";
const HEADERS = ["id", "person", "amount", "type", "date", "notes", "method"];
const USERS_HEADERS = [
  "id",
  "username",
  "password_hash",
  "salt",
  "full_name",
  "role",
  "status",
  "sheet_name",
  "token",
  "created_at",
];

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const token = params.token;

    let sheetName = DEFAULT_TAB;

    if (token) {
      const user = findUserByToken_(token);
      if (!user) {
        return json_({
          success: false,
          error: "UNAUTHORIZED",
          message: "Invalid or expired session. Please log in again.",
        });
      }
      if (user.status !== "APPROVED") {
        return json_({
          success: false,
          error: "FORBIDDEN",
          message: "Your account is " + user.status + ".",
        });
      }
      sheetName =
        user.sheetName ||
        (user.role === "ADMIN" ? DEFAULT_TAB : "User_" + sanitizeSheetName_(user.username));
    }

    const sheet = getUserSheet_(sheetName);
    return json_(sheet.getDataRange().getValues());
  } catch (error) {
    return json_({ success: false, message: error.message });
  }
}

function doPost(e) {
  let lock;
  let lockAcquired = false;

  try {
    const data = JSON.parse(e?.postData?.contents || "{}");
    const action = String(data.action || "add").toLowerCase();

    // ==========================================
    // 1. AUTHENTICATION & REGISTRATION ACTIONS
    // ==========================================
    if (action === "register") {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      lockAcquired = true;
      return handleRegister_(data);
    }

    if (action === "login") {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      lockAcquired = true;
      return handleLogin_(data);
    }

    if (action === "logout") {
      if (data.token) {
        lock = LockService.getScriptLock();
        lock.waitLock(10000);
        lockAcquired = true;
        const user = findUserByToken_(data.token);
        if (user) {
          const sheet = getUsersSheet_();
          sheet.getRange(user.rowIndex, 9).setValue("");
        }
      }
      return json_({ success: true, message: "Logged out successfully." });
    }

    // ==========================================
    // 2. ADMIN USER MANAGEMENT ACTIONS
    // ==========================================
    if (action === "admin_get_users") {
      return handleAdminGetUsers_(data);
    }

    if (action === "admin_update_user_status") {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      lockAcquired = true;
      return handleAdminUpdateStatus_(data);
    }

    if (action === "admin_delete_user") {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      lockAcquired = true;
      return handleAdminDeleteUser_(data);
    }

    // ==========================================
    // 3. TRANSACTION DATA ACTIONS (add, update, delete)
    // ==========================================
    if (data.id === undefined || data.id === null || String(data.id).trim() === "") {
      throw new Error("Transaction id is required.");
    }

    lock = LockService.getScriptLock();
    lock.waitLock(10000);
    lockAcquired = true;

    // Backend strictly determines target user sheet from token
    let sheetName = DEFAULT_TAB;
    if (data.token) {
      const user = findUserByToken_(data.token);
      if (!user || user.status !== "APPROVED") {
        return json_({
          success: false,
          error: "UNAUTHORIZED",
          message: "Unauthorized or inactive account.",
        });
      }
      sheetName =
        user.sheetName ||
        (user.role === "ADMIN" ? DEFAULT_TAB : "User_" + sanitizeSheetName_(user.username));
    }

    const sheet = getUserSheet_(sheetName);
    const rows = sheet.getDataRange().getValues();
    const rowIndex = rows.findIndex(
      (row, index) => index > 0 && String(row[0]) === String(data.id)
    );

    if (action === "add") {
      if (rowIndex !== -1) {
        return json_({ success: true, message: "Transaction already exists." });
      }

      sheet.appendRow([
        data.id,
        data.person || "",
        data.amount || 0,
        data.type || "",
        data.date || "",
        data.notes || "",
        data.method || "Cash",
      ]);

      return json_({ success: true, message: "Transaction added." });
    }

    if (action === "update") {
      if (rowIndex === -1) {
        return json_({ success: false, message: "Transaction not found." });
      }

      sheet.getRange(rowIndex + 1, 1, 1, HEADERS.length).setValues([[
        data.id,
        data.person || "",
        data.amount || 0,
        data.type || "",
        data.date || "",
        data.notes || "",
        data.method || "Cash",
      ]]);

      return json_({ success: true, message: "Transaction updated." });
    }

    if (action === "delete") {
      if (rowIndex === -1) {
        return json_({ success: false, message: "Transaction not found." });
      }

      sheet.deleteRow(rowIndex + 1);
      return json_({ success: true, message: "Transaction deleted." });
    }

    return json_({ success: false, message: "Invalid action." });
  } catch (error) {
    return json_({ success: false, message: error.message });
  } finally {
    if (lockAcquired) {
      lock.releaseLock();
    }
  }
}

// ==========================================
// SHEET ACCESS & INITIALIZATION HELPERS
// ==========================================
function getSpreadsheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) {
    throw new Error("No active spreadsheet. Bind this script to your spreadsheet.");
  }
  return spreadsheet;
}

function getUserSheet_(sheetName) {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function getTransactionsSheet_() {
  return getUserSheet_(DEFAULT_TAB);
}

function getUsersSheet_() {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(USERS_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(USERS_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(USERS_HEADERS);
    sheet.getRange(1, 1, 1, USERS_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);

    // Seed default Admin user
    const salt = generateRandomString_(16);
    const hash = hashPassword_("Ashflow@123", salt);
    sheet.appendRow([
      1,
      ADMIN_USERNAME,
      hash,
      salt,
      "Ashfak (Admin)",
      "ADMIN",
      "APPROVED",
      DEFAULT_TAB,
      "",
      new Date().toISOString(),
    ]);
  }

  return sheet;
}

// ==========================================
// SECURITY & CRYPTO HELPERS
// ==========================================
function hashPassword_(password, salt) {
  const rawBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    password + ":" + salt,
    Utilities.Charset.UTF_8
  );
  let hashStr = "";
  for (let i = 0; i < rawBytes.length; i++) {
    let byteVal = rawBytes[i];
    if (byteVal < 0) byteVal += 256;
    let hex = byteVal.toString(16);
    if (hex.length === 1) hex = "0" + hex;
    hashStr += hex;
  }
  return hashStr;
}

function generateRandomString_(len) {
  len = len || 32;
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function sanitizeSheetName_(name) {
  if (!name) return "user_" + Date.now();
  let clean = String(name).trim().replace(/[^a-zA-Z0-9_-]/g, "_");
  if (clean.length > 50) clean = clean.substring(0, 50);
  return clean;
}

function findUserByUsername_(username) {
  const sheet = getUsersSheet_();
  const rows = sheet.getDataRange().getValues();
  const raw = String(username || "").trim().toLowerCase();
  const noSpaces = raw.replace(/\s+/g, "");

  for (let i = 1; i < rows.length; i++) {
    const rowUser = String(rows[i][1]).trim().toLowerCase();
    const rowFullName = String(rows[i][4]).trim().toLowerCase();

    if (
      rowUser === raw ||
      rowUser === noSpaces ||
      rowFullName === raw ||
      rowFullName.replace(/\s+/g, "") === noSpaces
    ) {
      return {
        rowIndex: i + 1,
        id: rows[i][0],
        username: rows[i][1],
        passwordHash: rows[i][2],
        salt: rows[i][3],
        fullName: rows[i][4],
        role: rows[i][5],
        status: rows[i][6],
        sheetName: rows[i][7],
        token: rows[i][8],
        createdAt: rows[i][9],
      };
    }
  }
  return null;
}

function findUserByToken_(token) {
  if (!token) return null;
  const sheet = getUsersSheet_();
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][8]) === String(token)) {
      return {
        rowIndex: i + 1,
        id: rows[i][0],
        username: rows[i][1],
        passwordHash: rows[i][2],
        salt: rows[i][3],
        fullName: rows[i][4],
        role: rows[i][5],
        status: rows[i][6],
        sheetName: rows[i][7],
        token: rows[i][8],
        createdAt: rows[i][9],
      };
    }
  }
  return null;
}

// ==========================================
// USER AUTHENTICATION & APPROVAL HANDLERS
// ==========================================
function handleRegister_(data) {
  const username = String(data.username || "").trim().toLowerCase();
  const password = String(data.password || "");
  const fullName = String(data.fullName || "").trim();

  if (!username || username.length < 3) {
    return json_({ success: false, message: "Username must be at least 3 characters." });
  }
  if (!/^[a-zA-Z0-9_@.-]+$/.test(username)) {
    return json_({ success: false, message: "Username can only contain letters, numbers, underscores, dots, hyphens, and @." });
  }
  if (!password || password.length < 6) {
    return json_({ success: false, message: "Password must be at least 6 characters." });
  }

  const existing = findUserByUsername_(username);
  if (existing) {
    return json_({ success: false, message: "Username is already registered." });
  }

  const salt = generateRandomString_(16);
  const hash = hashPassword_(password, salt);
  const sheet = getUsersSheet_();
  const newId = Date.now();
  const createdAt = new Date().toISOString();

  sheet.appendRow([
    newId,
    username,
    hash,
    salt,
    fullName || username,
    "USER",
    "PENDING",
    "", // assigned upon admin approval
    "",
    createdAt,
  ]);

  return json_({
    success: true,
    message: "Registration submitted successfully. Waiting for admin approval.",
  });
}

function handleLogin_(data) {
  const username = String(data.username || "").trim().toLowerCase();
  const password = String(data.password || "");

  let user = findUserByUsername_(username);

  // Auto-seed admin if logging in as admin and user row is not yet present
  if (!user && (username === ADMIN_USERNAME || username === "admin")) {
    const salt = generateRandomString_(16);
    const hash = hashPassword_(password, salt);
    const sheet = getUsersSheet_();
    sheet.appendRow([
      Date.now(),
      username,
      hash,
      salt,
      "Administrator",
      "ADMIN",
      "APPROVED",
      DEFAULT_TAB,
      "",
      new Date().toISOString(),
    ]);
    user = findUserByUsername_(username);
  }

  if (!user) {
    return json_({ success: false, message: "Invalid username or password." });
  }

  // 1. Check approval status FIRST before password verification
  if (user.status === "PENDING") {
    return json_({
      success: false,
      status: "PENDING",
      message: "Your account is pending admin approval. You will be able to log in once the administrator approves your account.",
    });
  }
  if (user.status === "REJECTED") {
    return json_({
      success: false,
      status: "REJECTED",
      message: "Your registration has been rejected by the administrator.",
    });
  }
  if (user.status === "DISABLED") {
    return json_({
      success: false,
      status: "DISABLED",
      message: "Your account has been disabled. Please contact the administrator.",
    });
  }
  if (user.status !== "APPROVED") {
    return json_({
      success: false,
      status: user.status,
      message: "Account status: " + user.status + ". You cannot log in.",
    });
  }

  // 2. Once account is approved, verify password
  const checkHash = hashPassword_(password, user.salt);
  if (checkHash !== user.passwordHash) {
    return json_({ success: false, message: "Invalid username or password." });
  }

  const token = generateRandomString_(48);
  const sheet = getUsersSheet_();
  sheet.getRange(user.rowIndex, 9).setValue(token);

  let sheetName = user.sheetName;
  if (!sheetName) {
    sheetName = user.role === "ADMIN" ? DEFAULT_TAB : "User_" + sanitizeSheetName_(user.username);
    sheet.getRange(user.rowIndex, 8).setValue(sheetName);
  }
  getUserSheet_(sheetName);

  return json_({
    success: true,
    token: token,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      status: user.status,
      sheetName: sheetName,
    },
  });
}

function handleAdminGetUsers_(data) {
  const adminUser = findUserByToken_(data.token);
  if (!adminUser || adminUser.role !== "ADMIN" || adminUser.status !== "APPROVED") {
    return json_({ success: false, message: "Unauthorized. Admin privileges required." });
  }

  const sheet = getUsersSheet_();
  const rows = sheet.getDataRange().getValues();
  const users = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    users.push({
      id: r[0],
      username: r[1],
      fullName: r[4],
      role: r[5],
      status: r[6],
      sheetName: r[7],
      createdAt: r[9],
    });
  }

  return json_({ success: true, users: users });
}

function handleAdminUpdateStatus_(data) {
  const adminUser = findUserByToken_(data.token);
  if (!adminUser || adminUser.role !== "ADMIN" || adminUser.status !== "APPROVED") {
    return json_({ success: false, message: "Unauthorized. Admin privileges required." });
  }

  const targetUsername = String(data.targetUsername || "").trim().toLowerCase();
  const newStatus = String(data.newStatus || "").toUpperCase();

  if (!["APPROVED", "REJECTED", "DISABLED"].includes(newStatus)) {
    return json_({ success: false, message: "Invalid status value: " + newStatus });
  }

  const targetUser = findUserByUsername_(targetUsername);
  if (!targetUser) {
    return json_({ success: false, message: "Target user not found." });
  }

  if (targetUser.username === adminUser.username && newStatus !== "APPROVED") {
    return json_({ success: false, message: "You cannot disable or reject your own admin account." });
  }

  const sheet = getUsersSheet_();

  if (newStatus === "APPROVED") {
    let sheetName = targetUser.sheetName;
    if (!sheetName) {
      sheetName = targetUser.role === "ADMIN" ? DEFAULT_TAB : "User_" + sanitizeSheetName_(targetUser.username);
    }
    getUserSheet_(sheetName);
    sheet.getRange(targetUser.rowIndex, 8).setValue(sheetName);
    sheet.getRange(targetUser.rowIndex, 7).setValue("APPROVED");

    return json_({
      success: true,
      message: "User approved and Google Sheet tab '" + sheetName + "' ready.",
      sheetName: sheetName,
    });
  }

  if (newStatus === "REJECTED" || newStatus === "DISABLED") {
    sheet.getRange(targetUser.rowIndex, 9).setValue("");
    sheet.getRange(targetUser.rowIndex, 7).setValue(newStatus);

    return json_({
      success: true,
      message: "User status updated to " + newStatus + ".",
    });
  }
}

function handleAdminDeleteUser_(data) {
  const adminUser = findUserByToken_(data.token);
  if (!adminUser || adminUser.role !== "ADMIN" || adminUser.status !== "APPROVED") {
    return json_({ success: false, message: "Unauthorized. Admin privileges required." });
  }

  const targetUsername = String(data.targetUsername || "").trim().toLowerCase();
  const targetUser = findUserByUsername_(targetUsername);

  if (!targetUser) {
    return json_({ success: false, message: "Target user not found." });
  }

  if (targetUser.username === adminUser.username || targetUser.role === "ADMIN") {
    return json_({ success: false, message: "Cannot delete the admin account." });
  }

  const ss = getSpreadsheet_();

  // 1. Delete the user's personal Google Sheet tab if it exists
  if (targetUser.sheetName && targetUser.sheetName !== DEFAULT_TAB) {
    const userTab = ss.getSheetByName(targetUser.sheetName);
    if (userTab) {
      ss.deleteSheet(userTab);
    }
  }

  // 2. Delete row from Users sheet
  const usersSheet = getUsersSheet_();
  usersSheet.deleteRow(targetUser.rowIndex);

  return json_({
    success: true,
    message: "User @" + targetUsername + " and their Google Sheet tab were deleted.",
  });
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

