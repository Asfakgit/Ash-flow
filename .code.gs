const DEFAULT_TAB = "transactions";
const USERS_SHEET_NAME = "Users";
const AUDIT_SHEET_NAME = "Audit_Logs";
const ADMIN_USERNAME = "ashflow";
const HEADERS = ["id", "person", "amount", "type", "date", "notes", "method"];
const AUDIT_HEADERS = [
  "audit_id",
  "transaction_id",
  "action",
  "previous_values",
  "updated_values",
  "timestamp",
  "user_id",
  "reason",
];
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
  "allow_admin_view",
  "reset_password_hash",
  "reset_salt",
  "avatar",
];

function doGet(e) {
  try {
    const params = e && e.parameter ? e.parameter : {};
    const token = params.token;

    if (
      params.action === "audit_get" ||
      params.action === "get_audits" ||
      params.type === "audit"
    ) {
      return handleGetAudits_(params);
    }

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

    if (action === "forgot_password") {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      lockAcquired = true;
      return handleForgotPassword_(data);
    }

    if (action === "admin_approve_reset") {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      lockAcquired = true;
      return handleAdminApproveReset_(data);
    }

    if (action === "admin_set_password") {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      lockAcquired = true;
      return handleAdminSetPassword_(data);
    }

    if (action === "update_admin_view_permission") {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      lockAcquired = true;
      return handleUpdateAdminViewPermission_(data);
    }

    if (action === "admin_get_user_transactions") {
      return handleAdminGetUserTransactions_(data);
    }

    if (action === "update_profile_avatar") {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      lockAcquired = true;
      return handleUpdateProfileAvatar_(data);
    }

    // ==========================================
    // 2.5. TRANSACTION AUDIT LOG ACTIONS
    // ==========================================
    if (action === "audit_add" || action === "add_audit") {
      lock = LockService.getScriptLock();
      lock.waitLock(10000);
      lockAcquired = true;
      return handleAddAudit_(data);
    }

    if (action === "audit_get" || action === "get_audits" || action === "get_audit") {
      return handleGetAudits_(data);
    }

    // ==========================================
    // 3. TRANSACTION DATA ACTIONS (add, update, delete)
    // ==========================================
    if (action === "add" || action === "update" || action === "delete") {
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

      let rowIndex = -1;
      const targetId = data.id !== undefined && data.id !== null ? String(data.id).trim() : "";

      if (targetId !== "" && targetId !== "0" && targetId.toLowerCase() !== "id") {
        for (let i = 1; i < rows.length; i++) {
          if (String(rows[i][0]).trim() === targetId) {
            rowIndex = i;
            break;
          }
        }
      }

      // Fallback for delete: match by person / notes if id is empty, 0, or not found
      if (rowIndex === -1 && action === "delete") {
        const targetPerson = String(data.person || "").trim().toLowerCase();
        const targetNotes = String(data.notes || "").trim().toLowerCase();
        for (let i = 1; i < rows.length; i++) {
          const rowPerson = String(rows[i][1] || "").trim().toLowerCase();
          const rowNotes = String(rows[i][5] || "").trim().toLowerCase();
          if (targetPerson && rowPerson === targetPerson) {
            rowIndex = i;
            break;
          }
          if (targetNotes && rowNotes === targetNotes) {
            rowIndex = i;
            break;
          }
        }
      }

      if (action === "add") {
        let cleanType = String(data.type || "Lent").trim();
        if (cleanType.toLowerCase() === "click" || !cleanType) {
          cleanType = "Lent";
        }

        const newId = targetId || new Date().getTime().toString();
        sheet.appendRow([
          newId,
          data.person || "",
          data.amount || 0,
          cleanType,
          data.date || "",
          data.notes || "",
          data.method || "Cash",
        ]);

        return json_({ success: true, message: "Transaction added.", id: newId });
      }

      if (action === "update") {
        if (rowIndex === -1) {
          return json_({ success: false, message: "Transaction not found." });
        }

        let cleanType = String(data.type || rows[rowIndex][3] || "Lent").trim();
        if (cleanType.toLowerCase() === "click" || !cleanType) {
          cleanType = "Lent";
        }

        sheet.getRange(rowIndex + 1, 1, 1, HEADERS.length).setValues([[
          targetId || rows[rowIndex][0],
          data.person || "",
          data.amount || 0,
          cleanType,
          data.date || "",
          data.notes || "",
          data.method || "Cash",
        ]]);

        return json_({ success: true, message: "Transaction updated." });
      }

      if (action === "delete") {
        if (rowIndex === -1) {
          return json_({ success: false, message: "Transaction not found or already deleted." });
        }

        sheet.deleteRow(rowIndex + 1);
        return json_({ success: true, message: "Transaction deleted." });
      }
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
      "YES",
      "",
      "",
      "",
    ]);
  } else {
    // Ensure all modern headers exist
    const lastCol = sheet.getLastColumn();
    if (lastCol < USERS_HEADERS.length) {
      sheet.getRange(1, 1, 1, USERS_HEADERS.length).setValues([USERS_HEADERS]);
      sheet.getRange(1, 1, 1, USERS_HEADERS.length).setFontWeight("bold");
    }
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
        allowAdminView: String(rows[i][10] || "NO").toUpperCase() === "YES",
        resetPasswordHash: rows[i][11] || "",
        resetSalt: rows[i][12] || "",
        avatar: rows[i][13] || "",
      };
    }
  }
  return null;
}

function findUserByToken_(token) {
  if (!token) return null;
  const sheet = getUsersSheet_();
  const rows = sheet.getDataRange().getValues();
  const cleanToken = String(token).trim();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][8]).trim() === cleanToken) {
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
        allowAdminView: String(rows[i][10] || "NO").toUpperCase() === "YES",
        resetPasswordHash: rows[i][11] || "",
        resetSalt: rows[i][12] || "",
        avatar: rows[i][13] || "",
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
    "NO",
    "",
    "",
    "", // avatar
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
  if (user.status === "RESET_PENDING") {
    return json_({
      success: false,
      status: "RESET_PENDING",
      message: "Password reset request is pending admin approval. You will be able to log in once approved.",
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
      allowAdminView: user.allowAdminView,
      avatar: user.avatar || "",
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
      allowAdminView: String(r[10] || "NO").toUpperCase() === "YES",
      hasResetPending: r[6] === "RESET_PENDING" || Boolean(r[11]),
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

  if (!["APPROVED", "REJECTED", "DISABLED", "DELETED"].includes(newStatus)) {
    return json_({ success: false, message: "Invalid status value: " + newStatus });
  }

  const targetUser = findUserByUsername_(targetUsername);
  if (!targetUser) {
    return json_({ success: false, message: "Target user not found." });
  }

  if (targetUser.username === adminUser.username && newStatus !== "APPROVED") {
    return json_({ success: false, message: "You cannot disable, reject, or delete your own admin account." });
  }

  if (newStatus === "DELETED") {
    return handleAdminDeleteUser_(data);
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

function handleForgotPassword_(data) {
  const username = String(data.username || "").trim().toLowerCase();
  const newPassword = String(data.newPassword || "");

  if (!username) {
    return json_({ success: false, message: "Username or email is required." });
  }

  if (!newPassword || newPassword.length < 6) {
    return json_({ success: false, message: "New password must be at least 6 characters long." });
  }

  const user = findUserByUsername_(username);
  if (!user) {
    return json_({ success: false, message: "Account not found for the provided username or email." });
  }

  const resetSalt = generateRandomString_(16);
  const resetHash = hashPassword_(newPassword, resetSalt);

  const sheet = getUsersSheet_();
  // Column 7: status -> RESET_PENDING
  sheet.getRange(user.rowIndex, 7).setValue("RESET_PENDING");
  // Column 12: reset_password_hash
  sheet.getRange(user.rowIndex, 12).setValue(resetHash);
  // Column 13: reset_salt
  sheet.getRange(user.rowIndex, 13).setValue(resetSalt);

  return json_({
    success: true,
    message: "Password reset request submitted successfully. The administrator must approve your reset before you can sign in.",
  });
}

function handleAdminApproveReset_(data) {
  const adminUser = findUserByToken_(data.token);
  if (!adminUser || adminUser.role !== "ADMIN" || adminUser.status !== "APPROVED") {
    return json_({ success: false, message: "Unauthorized. Admin privileges required." });
  }

  const targetUsername = String(data.targetUsername || "").trim().toLowerCase();
  const targetUser = findUserByUsername_(targetUsername);
  if (!targetUser) {
    return json_({ success: false, message: "User not found." });
  }

  if (!targetUser.resetPasswordHash) {
    return json_({ success: false, message: "User does not have a pending password reset request." });
  }

  const sheet = getUsersSheet_();
  // Apply reset hash as actual password hash (Col 3) & salt (Col 4)
  sheet.getRange(targetUser.rowIndex, 3).setValue(targetUser.resetPasswordHash);
  sheet.getRange(targetUser.rowIndex, 4).setValue(targetUser.resetSalt);
  // Restore status to APPROVED (Col 7)
  sheet.getRange(targetUser.rowIndex, 7).setValue("APPROVED");
  // Invalidate current token so user must re-login with new password (Col 9)
  sheet.getRange(targetUser.rowIndex, 9).setValue("");
  // Clear reset columns (Col 12, 13)
  sheet.getRange(targetUser.rowIndex, 12).setValue("");
  sheet.getRange(targetUser.rowIndex, 13).setValue("");

  return json_({
    success: true,
    message: "Password reset approved for @" + targetUsername + ". The user can now log in with their new password.",
  });
}

function handleAdminSetPassword_(data) {
  const adminUser = findUserByToken_(data.token);
  if (!adminUser || adminUser.role !== "ADMIN" || adminUser.status !== "APPROVED") {
    return json_({ success: false, message: "Unauthorized. Admin privileges required." });
  }

  const targetUsername = String(data.targetUsername || "").trim().toLowerCase();
  const newPassword = String(data.newPassword || "");

  if (!newPassword || newPassword.length < 6) {
    return json_({ success: false, message: "New password must be at least 6 characters." });
  }

  const targetUser = findUserByUsername_(targetUsername);
  if (!targetUser) {
    return json_({ success: false, message: "User not found." });
  }

  const salt = generateRandomString_(16);
  const hash = hashPassword_(newPassword, salt);

  const sheet = getUsersSheet_();
  // Set password hash (Col 3) & salt (Col 4)
  sheet.getRange(targetUser.rowIndex, 3).setValue(hash);
  sheet.getRange(targetUser.rowIndex, 4).setValue(salt);
  // Ensure status is APPROVED (Col 7)
  sheet.getRange(targetUser.rowIndex, 7).setValue("APPROVED");
  // Invalidate old token (Col 9)
  sheet.getRange(targetUser.rowIndex, 9).setValue("");
  // Clear any pending reset (Col 12, 13)
  sheet.getRange(targetUser.rowIndex, 12).setValue("");
  sheet.getRange(targetUser.rowIndex, 13).setValue("");

  return json_({
    success: true,
    message: "Password successfully updated for @" + targetUsername + ".",
  });
}

function handleUpdateAdminViewPermission_(data) {
  let user = findUserByToken_(data.token);
  if (!user && data.username) {
    user = findUserByUsername_(data.username);
  }
  if (!user || user.status !== "APPROVED") {
    return json_({ success: false, message: "Unauthorized or inactive session." });
  }

  const allow = Boolean(
    data.allowAdminView === true ||
    String(data.allowAdminView).toLowerCase() === "true" ||
    String(data.allowAdminView).toUpperCase() === "YES"
  );
  const sheet = getUsersSheet_();
  sheet.getRange(user.rowIndex, 11).setValue(allow ? "YES" : "NO");

  return json_({
    success: true,
    allowAdminView: allow,
    message: allow
      ? "Permission granted. Admin can now view your sheet records."
      : "Privacy enabled. Admin cannot view your sheet records without your permission.",
  });
}

function handleUpdateProfileAvatar_(data) {
  const user = findUserByToken_(data.token);
  if (!user || user.status !== "APPROVED") {
    return json_({ success: false, message: "Unauthorized or inactive session." });
  }

  const avatar = String(data.avatar || "").trim();
  const sheet = getUsersSheet_();
  // Column 14 (avatar)
  sheet.getRange(user.rowIndex, 14).setValue(avatar);

  return json_({
    success: true,
    avatar: avatar,
    message: avatar ? "Profile photo updated successfully." : "Profile photo removed.",
  });
}

function handleAdminGetUserTransactions_(data) {
  const adminUser = findUserByToken_(data.token);
  if (!adminUser || adminUser.role !== "ADMIN" || adminUser.status !== "APPROVED") {
    return json_({ success: false, message: "Unauthorized. Admin privileges required." });
  }

  const targetUsername = String(data.targetUsername || "").trim().toLowerCase();
  const targetUser = findUserByUsername_(targetUsername);
  if (!targetUser) {
    return json_({ success: false, message: "Target user not found." });
  }

  // Strict User Privacy Enforcement: Admin cannot see sheet unless user has granted permission
  if (!targetUser.allowAdminView) {
    return json_({
      success: false,
      error: "PERMISSION_DENIED",
      message: "Access Restricted: @" + targetUsername + " has kept their sheet private. The admin can only view this sheet with explicit permission from the user.",
    });
  }

  const userTabName = targetUser.sheetName || ("User_" + sanitizeSheetName_(targetUser.username));
  const sheet = getUserSheet_(userTabName);
  const rows = sheet.getDataRange().getValues();

  return json_({
    success: true,
    username: targetUser.username,
    sheetName: userTabName,
    transactions: rows,
  });
}

// ==========================================
// 8. AUDIT HISTORY REPOSITORY & SYNC
// ==========================================
function getAuditSheet_() {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(AUDIT_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(AUDIT_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(AUDIT_HEADERS);
    sheet.getRange(1, 1, 1, AUDIT_HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function handleAddAudit_(data) {
  const auditId = String(data.auditId || data.audit_id || "").trim();
  if (!auditId) {
    return json_({ success: false, message: "Missing auditId." });
  }

  const sheet = getAuditSheet_();
  const rows = sheet.getDataRange().getValues();

  // Prevent duplicate audit entries during synchronization
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === auditId) {
      return json_({ success: true, message: "Duplicate audit entry ignored." });
    }
  }

  const prevVals =
    typeof data.previousValues === "object"
      ? JSON.stringify(data.previousValues || {})
      : String(data.previousValues || "");
  const updatedVals =
    typeof data.updatedValues === "object"
      ? JSON.stringify(data.updatedValues || {})
      : String(data.updatedValues || "");

  sheet.appendRow([
    auditId,
    String(data.transactionId || data.transaction_id || ""),
    String(data.action || "CREATE"),
    prevVals,
    updatedVals,
    String(data.timestamp || new Date().toISOString()),
    String(data.userId || data.user_id || ""),
    String(data.reason || ""),
  ]);

  return json_({ success: true, message: "Audit logged successfully." });
}

function handleGetAudits_(data) {
  const sheet = getAuditSheet_();
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) {
    return json_({ success: true, audits: [] });
  }

  const targetTxId = data.transactionId || data.transaction_id
    ? String(data.transactionId || data.transaction_id).trim()
    : null;
  const targetUser = data.userId || data.user_id
    ? String(data.userId || data.user_id).trim().toLowerCase()
    : null;

  const audits = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rowAuditId = String(row[0] || "");
    const rowTxId = String(row[1] || "");
    const rowAction = String(row[2] || "");
    let rowPrev = row[3];
    let rowUpdated = row[4];
    const rowTimestamp = String(row[5] || "");
    const rowUserId = String(row[6] || "");
    const rowReason = String(row[7] || "");

    if (targetTxId && rowTxId !== targetTxId) continue;
    if (targetUser && rowUserId.toLowerCase() !== targetUser) continue;

    try {
      if (
        typeof rowPrev === "string" &&
        (rowPrev.startsWith("{") || rowPrev.startsWith("["))
      ) {
        rowPrev = JSON.parse(rowPrev);
      }
    } catch (e) {}

    try {
      if (
        typeof rowUpdated === "string" &&
        (rowUpdated.startsWith("{") || rowUpdated.startsWith("["))
      ) {
        rowUpdated = JSON.parse(rowUpdated);
      }
    } catch (e) {}

    audits.push({
      auditId: rowAuditId,
      transactionId: rowTxId,
      action: rowAction,
      previousValues: rowPrev,
      updatedValues: rowUpdated,
      timestamp: rowTimestamp,
      userId: rowUserId,
      reason: rowReason,
    });
  }

  return json_({ success: true, audits: audits });
}

function json_(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

