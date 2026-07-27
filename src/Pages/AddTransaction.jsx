import { TextField, Button, MenuItem, Paper, Box, Typography, CircularProgress, Autocomplete, InputAdornment, IconButton } from "@mui/material";
import { useState, useMemo } from "react";
import PostAddIcon from "@mui/icons-material/PostAdd";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { addTransaction, getDataRows, getRowVal, capitalizeName, formatDateDisplay, formatDateForPicker, getTodayDisplay } from "../Services/SheetService";

function AddTransaction({ transactions = [], triggerRefresh, showNotification }) {
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Lent");
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState(() => getTodayDisplay());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const existingPersonNames = useMemo(() => {
    const rows = getDataRows(transactions);
    const names = rows.map((row) => capitalizeName(getRowVal(row, 1, "person", ""))).filter(Boolean);
    return Array.from(new Set(names));
  }, [transactions]);

  const saveData = async () => {
    if (!person || !type || (type !== "Settled" && !amount)) {
      if (showNotification) {
        showNotification({
          type: "error",
          title: "Missing Fields",
          message: type === "Settled"
            ? "Please provide Person Name and select Settled type."
            : "Please provide Person Name, Amount, and Transaction Type.",
        });
      } else {
        alert("Please fill all required fields");
      }
      return;
    }

    let finalAmount = parseFloat(amount) || 0;
    if (type === "Settled" && !finalAmount) {
      const rows = getDataRows(transactions);
      let calcBalance = 0;
      rows.forEach((row) => {
        const p = getRowVal(row, 1, "person", "");
        if (String(p).trim().toLowerCase() === String(person).trim().toLowerCase()) {
          const amt = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
          const t = String(getRowVal(row, 3, "type", "")).toLowerCase();
          if (t === "settled" || t.includes("settled")) calcBalance = 0;
          else if (t === "lent") calcBalance += amt;
          else if (t === "borrowed") calcBalance -= amt;
        }
      });
      finalAmount = Math.abs(calcBalance);
    }

    const data = {
      id: Date.now(),
      person: capitalizeName(person),
      amount: finalAmount,
      type: type || "Lent",
      notes: notes || (type === "Settled" ? (finalAmount > 0 ? `Account settled & closed (₹${finalAmount.toLocaleString("en-IN")})` : "Account settled & closed") : ""),
      date: formatDateDisplay(date || getTodayDisplay()),
      method: method || "Cash",
    };

    try {
      setLoading(true);
      await addTransaction(data);
      setLoading(false);

      if (triggerRefresh) triggerRefresh();

      if (showNotification) {
        showNotification({
          type: "success",
          title: type === "Settled" ? "Account Settled & Closed!" : "Saved!",
          message: type === "Settled"
            ? `Settlement recorded for "${person}". Account removed from active balances list while preserving transaction history ✅`
            : "New transaction recorded successfully",
        });
      } else {
        alert(type === "Settled" ? "Account Settled & Recorded in History" : "Saved successfully ✅");
      }

      setPerson("");
      setAmount("");
      setType("Lent");
      setMethod("Cash");
      setDate(getTodayDisplay());
      setNotes("");
    } catch (err) {
      console.error("Save failed:", err);
      setLoading(false);
      if (showNotification) {
        showNotification({
          type: "error",
          title: "Save Failed",
          message: "Could not save transaction to Google Sheets. Please try again.",
        });
      } else {
        alert("Failed to save");
      }
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: 3, sm: 4 },
        p: { xs: 2, sm: 3 },
        border: "1px solid rgba(148, 163, 184, 0.12)",
        background: "linear-gradient(145deg, #131B2E 0%, #0F172A 100%)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box display="flex" alignItems="center" gap={1.5} mb={{ xs: 2, sm: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: { xs: 36, sm: 44 },
            height: { xs: 36, sm: 44 },
            borderRadius: "12px",
            background: "rgba(16, 185, 129, 0.15)",
            color: "#10B981",
          }}
        >
          <PostAddIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ color: "#F8FAFC", fontSize: { xs: "1.05rem", sm: "1.25rem" } }}>
            Add Transaction
          </Typography>
          <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            Record new lending, borrowing, or settle an account
          </Typography>
        </Box>
      </Box>

      <Box display="flex" flexDirection="column" gap={{ xs: 2, sm: 2.5 }} flexGrow={1}>
        <Autocomplete
          freeSolo
          options={existingPersonNames}
          value={person}
          onInputChange={(event, newInputValue) => setPerson(newInputValue || "")}
          onBlur={() => setPerson((prev) => capitalizeName(prev))}
          disabled={loading}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Person Name"
              fullWidth
              size="small"
              placeholder="Name"
              variant="outlined"
            />
          )}
        />

        <Box display="flex" gap={2} sx={{ flexDirection: { xs: "column", sm: "row" } }}>
          <TextField
            label={type === "Settled" ? "Amount (Optional)" : "Amount (₹)"}
            type="number"
            fullWidth
            size="small"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={loading}
            placeholder={type === "Settled" ? "Not required" : "0.00"}
            variant="outlined"
          />

          <TextField
            select
            label="Type"
            fullWidth
            size="small"
            value={type}
            onChange={(e) => setType(e.target.value)}
            disabled={loading}
            variant="outlined"
          >
            <MenuItem value="Lent">Lent (I gave)</MenuItem>
            <MenuItem value="Borrowed">Borrowed (I received)</MenuItem>
            <MenuItem value="Settled" sx={{ color: "#F43F5E", fontWeight: 700 }}>
               Settled / Close Account
            </MenuItem>
          </TextField>

          <TextField
            select
            label="Method"
            fullWidth
            size="small"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            disabled={loading}
            variant="outlined"
          >
            <MenuItem value="Cash">Cash</MenuItem>
            <MenuItem value="GPay">GPay / UPI</MenuItem>
            <MenuItem value="Bank">Bank Transfer</MenuItem>
          </TextField>

          <TextField
            label="Date"
            fullWidth
            size="small"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={loading}
            variant="outlined"
            placeholder="DD/MM/YYYY"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end" sx={{ position: "relative" }}>
                  <IconButton size="small" sx={{ color: "#b5c8d0ff" }}>
                    <CalendarMonthIcon />
                  </IconButton>
                  <input
                    type="date"
                    value={formatDateForPicker(date)}
                    onChange={(e) => setDate(formatDateDisplay(e.target.value))}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      opacity: 0,
                      cursor: "pointer",
                    }}
                  />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <TextField
          label="Notes / Description"
          fullWidth
          multiline
          rows={2}
          size="small"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={loading}
          placeholder="Optional notes or reason..."
          variant="outlined"
        />

        <Box mt="auto" pt={1}>
          <Button
            variant="contained"
            fullWidth
            onClick={saveData}
            disabled={loading}
            sx={{
              py: { xs: 1.4, sm: 1.3 },
              minHeight: 46,
              borderRadius: 3,
              fontWeight: 700,
              fontSize: "0.95rem",
              background: type === "Settled"
                ? "linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)"
                : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              "&:hover": {
                background: type === "Settled"
                  ? "linear-gradient(135deg, #FB7185 0%, #F43F5E 100%)"
                  : "linear-gradient(135deg, #34D399 0%, #10B981 100%)",
              },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : type === "Settled" ? "Record Account Settlement" : "Save Transaction"}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default AddTransaction;
