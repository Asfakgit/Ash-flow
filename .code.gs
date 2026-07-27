function doGet() {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("transactions");

  const data = sheet.getDataRange().getValues();

  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName("transactions");

  const data = JSON.parse(e.postData.contents);

  const action = data.action || "add";

  // ==========================
  // ADD
  // ==========================
  if (action === "add") {

    sheet.appendRow([
      data.id,
      data.person,
      data.amount,
      data.type,
      data.date,
      data.notes,
      data.method || "Cash"
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: "Transaction Added"
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ==========================
  // UPDATE
  // ==========================
  if (action === "update") {

    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {

      if (String(rows[i][0]) === String(data.id)) {

        sheet.getRange(i + 1, 2).setValue(data.person);
        sheet.getRange(i + 1, 3).setValue(data.amount);
        sheet.getRange(i + 1, 4).setValue(data.type);
        sheet.getRange(i + 1, 5).setValue(data.date);
        sheet.getRange(i + 1, 6).setValue(data.notes);
        sheet.getRange(i + 1, 7).setValue(data.method || "Cash");

        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: "Transaction Updated"
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: "Transaction Not Found"
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  // ==========================
  // DELETE
  // ==========================
  if (action === "delete") {

    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {

      if (String(rows[i][0]) === String(data.id)) {

        sheet.deleteRow(i + 1);

        return ContentService
          .createTextOutput(JSON.stringify({
            success: true,
            message: "Transaction Deleted"
          }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        message: "Transaction Not Found"
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      message: "Invalid Action"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}