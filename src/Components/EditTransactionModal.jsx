import { useState, useEffect, forwardRef, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  CircularProgress,
  Box,
  Slide,
  IconButton,
  Typography,
  Autocomplete,
  InputAdornment,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { updateTransaction, getRowVal, getDataRows, formatDateForPicker, capitalizeName, formatDateDisplay, getTodayDisplay } from "../Services/SheetService";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function EditTransactionModal({
  open,
  onClose,
  transaction,
  onSuccess,
  onError,
  transactions = [],
}) {
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Lent");
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const existingPersonNames = useMemo(() => {
    const rows = getDataRows(transactions);
    const names = rows.map((row) => capitalizeName(getRowVal(row, 1, "person", ""))).filter(Boolean);
    return Array.from(new Set(names));
  }, [transactions]);

  useEffect(() => {
    if (transaction && open) {
      setPerson(capitalizeName(getRowVal(transaction, 1, "person", "")));
      setAmount(getRowVal(transaction, 2, "amount", ""));
      setType(getRowVal(transaction, 3, "type", ""));
      setNotes(getRowVal(transaction, 5, "notes", ""));
      setMethod(getRowVal(transaction, 6, "method") || getRowVal(transaction, 6, "paymentMethod") || "Cash");
      const rawDate = getRowVal(transaction, 4, "date", "");
      setDate(formatDateDisplay(rawDate));
    }
  }, [transaction, open]);

  const handleSave = async () => {
    if (!person || !amount || !type) {
      if (onError) onError("Please fill in Person, Amount, and Type fields.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        id: getRowVal(transaction, 0, "id", Date.now()),
        person: capitalizeName(person),
        amount: parseFloat(amount),
        type,
        notes: notes || "",
        date: formatDateDisplay(date || getRowVal(transaction, 4, "date", getTodayDisplay())),
        method: method || "Cash",
      };

      await updateTransaction(payload);

      setLoading(false);
      onClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error("Update failed:", err);
      setLoading(false);
      if (onError) onError("Failed to update transaction. Please try again.");
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
          borderRadius: { xs: 3, sm: 4 },
          background: "linear-gradient(145deg, #172036 0%, #0F172A 100%)",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
          overflow: "hidden",
          m: { xs: 1.5, sm: 2 },
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 3 },
          pb: { xs: 1.5, sm: 2 },
          borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
        }}
      >
        <Box display="flex" alignItems="center" gap={1.2}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: 36, sm: 44 },
              height: { xs: 36, sm: 44 },
              borderRadius: "12px",
              background: "rgba(99, 102, 241, 0.15)",
              color: "#818CF8",
            }}
          >
            <EditNoteIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold" sx={{ color: "#F8FAFC", fontSize: { xs: "1.05rem", sm: "1.25rem" } }}>
              Edit Transaction
            </Typography>
            <Typography variant="caption" sx={{ color: "#94A3B8" }}>
              ID: {getRowVal(transaction, 0, "id", "N/A")}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={loading}
          sx={{
            color: "#94A3B8",
            "&:hover": { color: "#F8FAFC", backgroundColor: "rgba(148, 163, 184, 0.1)" },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 3 }, pb: 1, mt: 1 }}>
        <Box display="flex" flexDirection="column" gap={{ xs: 2, sm: 2.5 }}>
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
                placeholder="e.g. Razi, Rayya"
                variant="outlined"
              />
            )}
          />

          <Box display="flex" gap={2} sx={{ flexDirection: { xs: "column", sm: "row" } }}>
            <TextField
              label="Amount (₹)"
              type="number"
              fullWidth
              size="small"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={loading}
              placeholder="0.00"
              variant="outlined"
            />

            <TextField
              select
              label="Transaction Type"
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
              label="Date (DD/MM/YYYY)"
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
                    <IconButton size="small" sx={{ color: "#38BDF8" }}>
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
            placeholder="Add any details or reason..."
            variant="outlined"
          />
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          pt: 2,
          pb: { xs: 2, sm: 3 },
          gap: 1.5,
          borderTop: "1px solid rgba(148, 163, 184, 0.1)",
          mt: 2,
          flexDirection: { xs: "column-reverse", sm: "row" },
        }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={loading}
          fullWidth={{ xs: true, sm: false }}
          sx={{
            px: 3,
            py: { xs: 1.2, sm: 1 },
            borderColor: "rgba(148, 163, 184, 0.2)",
            color: "#94A3B8",
            "&:hover": {
              borderColor: "rgba(148, 163, 184, 0.4)",
              backgroundColor: "rgba(148, 163, 184, 0.05)",
              color: "#F8FAFC",
            },
          }}
        >
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={handleSave}
          disabled={loading}
          fullWidth={{ xs: true, sm: false }}
          sx={{
            px: 4,
            py: { xs: 1.2, sm: 1 },
            minWidth: 140,
            background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #818CF8 0%, #6366F1 100%)",
            },
          }}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : "Save Changes"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default EditTransactionModal;
