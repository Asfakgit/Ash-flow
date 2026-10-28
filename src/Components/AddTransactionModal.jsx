import React, { useState, useMemo, forwardRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Slide,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Autocomplete,
  InputAdornment,
  CircularProgress,
  Chip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
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

const Transition = forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={{ enter: 380, exit: 240 }}
      style={{
        transitionTimingFunction: props.in
          ? "cubic-bezier(0.16, 1, 0.3, 1)"
          : "cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    />
  );
});

const sanitizeType = (raw) => {
  if (!raw) return "Lent";
  const s = String(raw).trim().toLowerCase();
  if (s === "borrowed" || s === "borrow") return "Borrowed";
  if (s === "partial payment" || s === "partial") return "Partial Payment";
  return "Lent";
};

export default function AddTransactionModal({
  open,
  onClose,
  transactions = [],
  setTransactions,
  showNotification,
  initialPerson = "",
  initialType = "Lent",
}) {
  const theme = useTheme();

  const [person, setPerson] = useState(initialPerson || "");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState(() => sanitizeType(initialType));
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState(() => getTodayDisplay());
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  // Extract unique contacts for autocomplete and quick suggestion pills
  const existingPersonNames = useMemo(() => {
    const rows = getDataRows(transactions);
    const names = rows
      .map((row) => capitalizeName(getRowVal(row, 1, "person", "")))
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [transactions]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPerson(initialPerson || "");
      setAmount("");
      setType(sanitizeType(initialType));
      setMethod("Cash");
      setDate(getTodayDisplay());
      setNotes("");
      setLoading(false);

      const origBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origBodyOverflow;
      };
    }
  }, [open, initialPerson, initialType]);

  const saveData = async () => {
    if (!person || !type || !amount) {
      if (showNotification) {
        showNotification({
          type: "error",
          title: "Missing Fields",
          message: "Please provide Person Name, Amount, and Transaction Type.",
        });
      }
      return;
    }

    const parsedAmt = parseFloat(amount);
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      if (showNotification) {
        showNotification({
          type: "error",
          title: "Invalid Amount",
          message: "Amount must be a positive number greater than 0.",
        });
      }
      return;
    }

    if (!date || !isValidDate(date)) {
      if (showNotification) {
        showNotification({
          type: "error",
          title: "Invalid Date",
          message: "Please enter a valid date in DD/MM/YYYY format.",
        });
      }
      return;
    }

    if (loading) return;
    setLoading(true);

    const newId = Date.now();
    const data = {
      id: newId,
      person: capitalizeName(person),
      amount: parsedAmt,
      type: type || "Lent",
      notes: notes || "",
      date: formatDateDisplay(date || getTodayDisplay()),
      method: method || "Cash",
    };

    try {
      if (type === "Partial Payment") {
        soundEffects.playSettle();
      } else {
        soundEffects.playAdd();
      }

      if (setTransactions) {
        // Optimistic UI update
        setTransactions((prev) => [data, ...prev]);
      }

      // Sync to Google Sheets in background
      addTransaction(data).catch((err) => {
        console.error("Save to Sheets failed:", err);
        if (showNotification) {
          showNotification({
            type: "error",
            title: "Sync Issue",
            message: "Saved to offline queue. Will sync once connected.",
          });
        }
      });

      if (showNotification) {
        showNotification({
          type: "success",
          title: type === "Partial Payment" ? "Payment Recorded!" : "Saved!",
          message:
            type === "Partial Payment"
              ? `Partial payment recorded for "${data.person}".`
              : "New transaction recorded successfully.",
        });
      }

      setPerson("");
      setAmount("");
      setType("Lent");
      setNotes("");
      onClose();
    } catch (err) {
      console.error("Save transaction error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={Boolean(open)}
      TransitionComponent={Transition}
      keepMounted
      onClose={loading ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: 2.5, sm: 3 },
          background: theme.palette.custom.dialogGradient,
          backdropFilter: "blur(40px) saturate(190%)",
          WebkitBackdropFilter: "blur(40px) saturate(190%)",
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: theme.palette.custom.dialogShadow || "0 25px 60px -15px rgba(0, 0, 0, 0.85)",
          overflow: "hidden",
          m: { xs: 1.5, sm: 2 },
        },
      }}
    >
      {/* Dialog Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2.5, sm: 3 },
          pt: { xs: 2.2, sm: 2.8 },
          pb: { xs: 1.5, sm: 2 },
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: 36, sm: 42 },
              height: { xs: 36, sm: 42 },
              borderRadius: "10px",
              background: theme.palette.custom.successBoxBg,
              color: theme.palette.primary.main,
              boxShadow: `0 2px 10px ${theme.palette.primary.main}33`,
            }}
          >
            <PostAddIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              fontWeight="800"
              sx={{
                color: theme.palette.text.primary,
                fontSize: { xs: "1.05rem", sm: "1.2rem" },
                letterSpacing: "-0.02em",
              }}
            >
              Add Transaction
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: { xs: "0.75rem", sm: "0.82rem" },
              }}
            >
              Record new lending, borrowing, or a partial payment
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          disabled={loading}
          size="small"
          sx={{
            color: theme.palette.text.secondary,
            "&:hover": {
              color: theme.palette.text.primary,
              backgroundColor: "rgba(148, 163, 184, 0.1)",
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Form Content */}
      <DialogContent
        sx={{
          px: { xs: 2.5, sm: 3 },
          pt: { xs: 2.5, sm: 3 },
          pb: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: { xs: 2, sm: 2.5 },
        }}
      >
        {/* Person Name Autocomplete */}
        <Box>
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
        </Box>

        {/* Amount, Type, Method, Date Flex Row */}
        <Box
          display="flex"
          gap={1.8}
          sx={{ flexDirection: { xs: "column", sm: "row" } }}
        >
          <TextField
            label="Amount (₹)"
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
              if (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+") {
                e.preventDefault();
              }
            }}
            inputProps={{ min: "0", step: "any" }}
            disabled={loading}
            placeholder="0.00"
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
            <MenuItem value="Lent" sx={{ color: "#10B981", fontWeight: 700 }}>
              ↑ Lent (I gave)
            </MenuItem>
            <MenuItem value="Borrowed" sx={{ color: "#EF4444", fontWeight: 700 }}>
              ↓ Borrowed (I received)
            </MenuItem>
            <MenuItem value="Partial Payment" sx={{ color: "#0A84FF", fontWeight: 700 }}>
              💳 Partial Payment
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
                    <CalendarMonthIcon fontSize="small" />
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

        {/* Notes / Description */}
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
      </DialogContent>

      {/* Modal Actions */}
      <DialogActions
        sx={{
          px: { xs: 2.5, sm: 3 },
          pt: 1.5,
          pb: { xs: 2.5, sm: 3 },
          gap: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={loading}
          sx={{
            flex: { xs: 1, sm: "none" },
            px: 3,
            py: 1,
            borderRadius: 1.5,
            fontWeight: 700,
            textTransform: "none",
            borderColor: theme.palette.divider,
            color: theme.palette.text.secondary,
            "&:hover": {
              borderColor: theme.palette.text.primary,
              backgroundColor: "rgba(148, 163, 184, 0.05)",
            },
          }}
        >
          Cancel
        </Button>

        {(() => {
          const isLent = type === "Lent";
          const isBorrowed = type === "Borrowed";
          const btnColor = isLent ? "#10B981" : isBorrowed ? "#EF4444" : "#0A84FF";
          const btnGradient = isLent
            ? "linear-gradient(135deg, #10B981 0%, #059669 100%)"
            : isBorrowed
            ? "linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
            : "linear-gradient(135deg, #0A84FF 0%, #0066CC 100%)";
          const btnHoverGradient = isLent
            ? "linear-gradient(135deg, #34D399 0%, #10B981 100%)"
            : isBorrowed
            ? "linear-gradient(135deg, #F87171 0%, #EF4444 100%)"
            : "linear-gradient(135deg, #38BDF8 0%, #0A84FF 100%)";

          return (
            <Button
              variant="contained"
              onClick={saveData}
              disabled={loading}
              sx={{
                flex: { xs: 2, sm: "none" },
                px: 4,
                py: 1,
                borderRadius: 1.5,
                fontWeight: 700,
                fontSize: "0.92rem",
                textTransform: "none",
                color: "#ffffff",
                background: btnGradient,
                boxShadow: `0 4px 14px ${btnColor}44`,
                transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                "&:hover": {
                  background: btnHoverGradient,
                  transform: "translateY(-1px)",
                  boxShadow: `0 6px 18px ${btnColor}66`,
                },
                "&:active": {
                  transform: "scale(0.97)",
                },
              }}
            >
              {loading ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                "Save"
              )}
            </Button>
          );
        })()}
      </DialogActions>
    </Dialog>
  );
}
