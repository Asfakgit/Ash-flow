import {
  TextField,
  Button,
  MenuItem,
  Paper,
  Box,
  Typography,
  CircularProgress,
  Autocomplete,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { useState, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
import PostAddIcon from "@mui/icons-material/PostAdd";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import {
  addTransaction,
  getDataRows,
  getRowVal,
  capitalizeName,
  formatDateDisplay,
  formatDateForPicker,
  getTodayDisplay,
  isValidDate,
} from "../Services/SheetService";
import soundEffects from "../Services/soundEffects";
function AddTransaction({
  transactions = [],
  setTransactions,
  showNotification,
}) {
  const theme = useTheme();
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Lent");
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState(() => getTodayDisplay());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const existingPersonNames = useMemo(() => {
    const rows = getDataRows(transactions);
    const names = rows
      .map((row) => capitalizeName(getRowVal(row, 1, "person", "")))
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [transactions]);
  const saveData = async () => {
    if (!person || !type || (type !== "Settled" && !amount)) {
      if (showNotification) {
        showNotification({
          type: "error",
          title: "Missing Fields",
          message:
            type === "Settled"
              ? "Please provide Person Name and select Settled type."
              : "Please provide Person Name, Amount, and Transaction Type.",
        });
      } else {
        alert("Please fill all required fields");
      }
      return;
    }
    if (!date || !isValidDate(date)) {
      if (showNotification) {
        showNotification({
          type: "error",
          title: "Invalid Date",
          message:
            "Please enter a valid date in DD/MM/YYYY format before saving.",
        });
      } else {
        alert("Please enter a valid date in DD/MM/YYYY format before saving");
      }
      return;
    }
    if (
      type !== "Settled" &&
      (String(amount).includes("-") ||
        parseFloat(amount) <= 0 ||
        isNaN(parseFloat(amount)))
    ) {
      if (showNotification) {
        showNotification({
          type: "error",
          title: "Invalid Amount",
          message:
            "Amount must be a positive number greater than 0 (cannot be negative or zero).",
        });
      } else {
        alert(
          "Amount must be a positive number greater than 0 (cannot be negative or zero)",
        );
      }
      return;
    }
    if (amount && (String(amount).includes("-") || parseFloat(amount) < 0)) {
      if (showNotification) {
        showNotification({
          type: "error",
          title: "Invalid Amount",
          message: "Amount cannot be negative.",
        });
      } else {
        alert("Amount cannot be negative");
      }
      return;
    }
    let finalAmount = parseFloat(amount) || 0;
    if (type === "Settled" && !finalAmount) {
      const rows = getDataRows(transactions);
      let calcBalance = 0;
      rows.forEach((row) => {
        const p = getRowVal(row, 1, "person", "");
        if (
          String(p).trim().toLowerCase() === String(person).trim().toLowerCase()
        ) {
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
      notes:
        notes ||
        (type === "Settled"
          ? finalAmount > 0
            ? `Account settled & closed (₹${finalAmount.toLocaleString(
                "en-IN",
              )})`
            : "Account settled & closed"
          : ""),
      date: formatDateDisplay(date || getTodayDisplay()),
      method: method || "Cash",
    };
    if (loading) return;
    setLoading(true);

    try {
      if (type === "Settled") {
        soundEffects.playSettle();
      } else {
        soundEffects.playAdd();
      }

      if (setTransactions) {
        // Optimistic UI update
        const newRow = {
          id: data.id,
          person: data.person,
          amount: data.amount,
          type: data.type,
          date: data.date,
          notes: data.notes,
          method: data.method,
        };
        setTransactions((prev) => [newRow, ...prev]);
      }
      
      // Fire API in background without blocking UI
      addTransaction(data).catch((err) => {
        console.error("Save failed:", err);
        if (showNotification) {
          showNotification({
            type: "error",
            title: "Save Failed",
            message: "Could not sync transaction to Supabase. Please check your Row Level Security (RLS) policies or connection.",
          });
        }
      });
      
      if (showNotification) {
        showNotification({
          type: "success",
          title: type === "Settled" ? "Account Settled & Closed!" : "Saved!",
          message:
            type === "Settled"
              ? `Settlement recorded for "${person}". Account removed from active balances list while preserving transaction history ✅`
              : "New transaction recorded successfully",
        });
      }

      setPerson("");
      setAmount("");
      setType("Lent");
      setMethod("Cash");
      setDate(getTodayDisplay());
      setNotes("");
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setLoading(false);
    }
  };
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: "6px", sm: "8px" },
        p: { xs: 1.75, sm: 2.5 },
        border: `1px solid ${theme.palette.divider}`,
        background: theme.palette.custom.cardGradient,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box display="flex" alignItems="center" gap={1.5} mb={{ xs: 2, sm: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: { xs: 34, sm: 40 },
            height: { xs: 34, sm: 40 },
            borderRadius: { xs: "6px", sm: "8px" },
            background: theme.palette.custom.successBoxBg,
            color: theme.palette.primary.main,
          }}
        >
          <PostAddIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
        </Box>
        <Box>
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{
              color: theme.palette.text.primary,
              fontSize: { xs: "1.05rem", sm: "1.25rem" },
            }}
          >
            Add Transaction
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
            }}
          >
            Record new lending, borrowing, or settle an account
          </Typography>
        </Box>
      </Box>
      <Box
        display="flex"
        flexDirection="column"
        gap={{ xs: 2, sm: 2.5 }}
        flexGrow={1}
      >
        <Autocomplete
          freeSolo
          options={existingPersonNames}
          value={person}
          onInputChange={(event, newInputValue) =>
            setPerson(newInputValue || "")
          }
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
        <Box
          display="flex"
          gap={2}
          sx={{ flexDirection: { xs: "column", sm: "row" } }}
        >
          <TextField
            label={type === "Settled" ? "Amount (Optional)" : "Amount (₹)"}
            type="number"
            fullWidth
            size="small"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (val.includes("-") || parseFloat(val) < 0) return;
              setAmount(val);
            }}
            onKeyDown={(e) => {
              if (
                e.key === "-" ||
                e.key === "e" ||
                e.key === "E" ||
                e.key === "+"
              ) {
                e.preventDefault();
              }
            }}
            inputProps={{ min: "0", step: "any" }}
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
            <MenuItem
              value="Settled"
              sx={{ color: theme.palette.error.main, fontWeight: 700 }}
            >
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
            error={Boolean(date && !isValidDate(date))}
            helperText={date && !isValidDate(date) ? "Invalid date" : ""}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end" sx={{ position: "relative" }}>
                  <IconButton size="small" sx={{ color: theme.palette.text.secondary }}>
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
              py: { xs: 1.2, sm: 1.2 },
              minHeight: 44,
              borderRadius: 1.5,
              fontWeight: 700,
              fontSize: "0.92rem",
              background:
                type === "Settled"
                  ? theme.palette.custom.errorGradient
                  : theme.palette.custom.primaryGradient,
              "&:hover": {
                background:
                  type === "Settled"
                    ? theme.palette.custom.errorHoverGradient
                    : theme.palette.custom.primaryHoverGradient,
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : type === "Settled" ? (
              "Record Account Settlement"
            ) : (
              "Save Transaction"
            )}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}
export default AddTransaction;