import { useState, useEffect, forwardRef, useMemo } from "react";
import { useTheme } from "@mui/material/styles";
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
  Paper,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditNoteIcon from "@mui/icons-material/EditNote";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  updateTransaction,
  getRowVal,
  getDataRows,
  formatDateForPicker,
  capitalizeName,
  formatDateDisplay,
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
          ? "cubic-bezier(0.32, 0.72, 0, 1)"
          : "cubic-bezier(0.4, 0, 0.22, 1)",
      }}
    />
  );
});

function EditTransactionModal({
  open,
  onClose,
  transaction,
  onSuccess,
  onError,
  transactions = [],
  setTransactions,
}) {
  const theme = useTheme();
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("Lent");
  const [method, setMethod] = useState("Cash");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  const [loading, setLoading] = useState(false);

  // Confirmation step state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detectedDiffs, setDetectedDiffs] = useState([]);

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (open) {
      const origBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origBodyOverflow;
      };
    }
  }, [open]);

  const existingPersonNames = useMemo(() => {
    const rows = getDataRows(transactions);
    const names = rows
      .map((row) => capitalizeName(getRowVal(row, 1, "person", "")))
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [transactions]);

  // Original Values capture before editing
  const originalValues = useMemo(() => {
    if (!transaction) return null;
    return {
      id: getRowVal(transaction, 0, "id", ""),
      person: capitalizeName(getRowVal(transaction, 1, "person", "")),
      amount: parseFloat(getRowVal(transaction, 2, "amount", 0)) || 0,
      type: getRowVal(transaction, 3, "type", "Lent"),
      date: formatDateDisplay(getRowVal(transaction, 4, "date", "")),
      notes: getRowVal(transaction, 5, "notes", "") || "",
      method:
        getRowVal(transaction, 6, "method") ||
        getRowVal(transaction, 6, "paymentMethod") ||
        "Cash",
    };
  }, [transaction]);

  useEffect(() => {
    if (originalValues && open) {
      setPerson(originalValues.person);
      setAmount(String(originalValues.amount));
      setType(originalValues.type);
      setNotes(originalValues.notes);
      setMethod(originalValues.method);
      setDate(originalValues.date);
      setReason("");
      setReasonError(false);
      setConfirmOpen(false);
      setDetectedDiffs([]);
    }
  }, [originalValues, open]);

  // Compute field diffs between original and modified values
  const computeDiffs = () => {
    if (!originalValues) return [];
    const diffs = [];

    const newPerson = capitalizeName(person);
    if (originalValues.person !== newPerson) {
      diffs.push({
        field: "Person Name",
        from: originalValues.person,
        to: newPerson,
      });
    }

    const newAmt = parseFloat(amount) || 0;
    if (originalValues.amount !== newAmt) {
      diffs.push({
        field: "Amount",
        from: `₹${originalValues.amount.toLocaleString("en-IN")}`,
        to: `₹${newAmt.toLocaleString("en-IN")}`,
      });
    }

    if (originalValues.type !== type) {
      diffs.push({
        field: "Type",
        from: originalValues.type,
        to: type,
      });
    }

    if (originalValues.method !== method) {
      diffs.push({
        field: "Payment Method",
        from: originalValues.method,
        to: method,
      });
    }

    const formattedDate = formatDateDisplay(date);
    if (originalValues.date !== formattedDate) {
      diffs.push({
        field: "Date",
        from: originalValues.date,
        to: formattedDate,
      });
    }

    const cleanNewNotes = String(notes || "").trim();
    const cleanOldNotes = String(originalValues.notes || "").trim();
    if (cleanOldNotes !== cleanNewNotes) {
      diffs.push({
        field: "Notes",
        from: cleanOldNotes || "(empty)",
        to: cleanNewNotes || "(empty)",
      });
    }

    return diffs;
  };

  const handleReview = () => {
    if (!person || !amount || !type) {
      if (onError) onError("Please fill in Person, Amount, and Type fields.");
      return;
    }

    if (!date || !isValidDate(date)) {
      if (onError) onError("Please enter a valid date in DD/MM/YYYY format.");
      return;
    }

    if (
      String(amount).includes("-") ||
      parseFloat(amount) <= 0 ||
      isNaN(parseFloat(amount))
    ) {
      if (onError)
        onError("Amount must be a positive number greater than 0.");
      return;
    }

    // Reason is strictly mandatory for audit compliance
    if (!reason.trim()) {
      setReasonError(true);
      if (onError)
        onError("Reason for modification is required to maintain audit history.");
      return;
    }

    const diffs = computeDiffs();
    if (diffs.length === 0) {
      if (onError)
        onError("No values were modified. Change at least one field or cancel.");
      return;
    }

    setDetectedDiffs(diffs);
    setConfirmOpen(true);
  };

  const handleConfirmedSave = async () => {
    setLoading(true);
    soundEffects.playEdit();

    const payload = {
      id: originalValues.id || Date.now(),
      person: capitalizeName(person),
      amount: parseFloat(amount),
      type,
      notes: notes || "",
      date: formatDateDisplay(date || originalValues.date || getTodayDisplay()),
      method: method || "Cash",
    };

    try {
      // Atomic Update: Saves updated transaction and audit record with reason & previous values
      await updateTransaction(payload, {
        previousValues: originalValues,
        reason: reason.trim(),
      });

      // Optimistic Update
      if (setTransactions) {
        setTransactions((prev) =>
          prev.map((row) => {
            if (String(getRowVal(row, 0, "id", null)) === String(payload.id)) {
              return {
                ...row,
                id: payload.id,
                person: payload.person,
                amount: payload.amount,
                type: payload.type,
                date: payload.date,
                notes: payload.notes,
                method: payload.method,
              };
            }
            return row;
          })
        );
      }

      setLoading(false);
      setConfirmOpen(false);
      onClose();
      if (onSuccess)
        onSuccess("Transaction updated and audit history recorded successfully!");
    } catch (err) {
      console.error("Update failed:", err);
      setLoading(false);
      if (onError) onError("Failed to update transaction on the server.");
    }
  };

  return (
    <>
      <Dialog
        open={Boolean(open)}
        TransitionComponent={Transition}
        keepMounted
        onClose={loading ? undefined : onClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: { xs: 2, sm: 2.5 },
            background:
              theme.palette.custom?.dialogGradient ||
              "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            border: "1px solid rgba(148, 163, 184, 0.16)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
            overflow: "hidden",
            m: { xs: 1.2, sm: 2 },
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: { xs: 2, sm: 3 },
            pt: { xs: 2, sm: 2.5 },
            pb: 1.5,
            borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
          }}
        >
          <Box display="flex" alignItems="center" gap={1.2}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: { xs: 34, sm: 40 },
                height: { xs: 34, sm: 40 },
                borderRadius: "10px",
                background: "rgba(16, 185, 129, 0.15)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
              }}
            >
              <EditNoteIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
            </Box>
            <Box>
              <Typography
                variant="subtitle1"
                fontWeight="800"
                sx={{
                  color: theme.palette.text.primary,
                  fontSize: { xs: "1.05rem", sm: "1.25rem" },
                  letterSpacing: "-0.01em",
                }}
              >
                Edit Transaction
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary, fontSize: "0.72rem" }}
              >
                ID: #{originalValues?.id || "N/A"}
              </Typography>
            </Box>
          </Box>

          <IconButton
            onClick={onClose}
            disabled={loading}
            size="small"
            sx={{
              color: theme.palette.text.secondary,
              p: 0.8,
              borderRadius: "8px",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              "&:hover": {
                color: theme.palette.text.primary,
                backgroundColor: "rgba(148, 163, 184, 0.12)",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{ px: { xs: 2, sm: 3 }, pt: { xs: 2, sm: 2.5 }, pb: 1, mt: 0.5 }}
        >
          <Box display="flex" flexDirection="column" gap={{ xs: 1.8, sm: 2.2 }}>
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
                  label="Person Name *"
                  fullWidth
                  size="small"
                  placeholder="e.g. Thanuja, Jaseem"
                  variant="outlined"
                />
              )}
            />

            <Box
              display="flex"
              gap={1.5}
              sx={{ flexDirection: { xs: "column", sm: "row" } }}
            >
              <TextField
                label="Amount (₹) *"
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
                placeholder="0.00"
                variant="outlined"
              />

              <TextField
                select
                label="Transaction Type *"
                fullWidth
                size="small"
                value={type}
                onChange={(e) => setType(e.target.value)}
                disabled={loading}
                variant="outlined"
              >
                <MenuItem value="Lent" sx={{ color: "#10B981", fontWeight: 700 }}>
                  ↑ Lent (You gave)
                </MenuItem>
                <MenuItem
                  value="Borrowed"
                  sx={{ color: "#EF4444", fontWeight: 700 }}
                >
                  ↓ Borrowed (You received)
                </MenuItem>
                <MenuItem
                  value="Partial Payment"
                  sx={{ color: "#0A84FF", fontWeight: 700 }}
                >
                  💳 Partial Payment
                </MenuItem>
                <MenuItem
                  value="Settled"
                  sx={{ color: "#94A3B8", fontWeight: 700 }}
                >
                  ✓ Settled / Closed
                </MenuItem>
              </TextField>
            </Box>

            <Box
              display="flex"
              gap={1.5}
              sx={{ flexDirection: { xs: "column", sm: "row" } }}
            >
              <TextField
                select
                label="Payment Method *"
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
                label="Date (DD/MM/YYYY) *"
                fullWidth
                size="small"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={loading}
                variant="outlined"
                placeholder="DD/MM/YYYY"
                error={Boolean(date && !isValidDate(date))}
                helperText={date && !isValidDate(date) ? "Invalid date format" : ""}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end" sx={{ position: "relative" }}>
                      <IconButton
                        size="small"
                        sx={{ color: theme.palette.text.secondary }}
                      >
                        <CalendarMonthIcon fontSize="small" />
                      </IconButton>
                      <input
                        type="date"
                        value={formatDateForPicker(date)}
                        onChange={(e) =>
                          setDate(formatDateDisplay(e.target.value))
                        }
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
              placeholder="e.g. Lunch split, shopping, rent..."
              variant="outlined"
            />

            {/* MANDATORY REASON FOR CHANGE (AUDIT REQUIREMENT) */}
          
              <TextField
                label="Reason for Modification *"
                fullWidth
                multiline
                rows={2}
                size="small"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (e.target.value.trim()) setReasonError(false);
                }}
                disabled={loading}
                error={reasonError}
                placeholder="Explain why this change is being made"
                variant="outlined"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "rgba(0, 0, 0, 0.25)",
                  },
                }}
              />
          </Box>
        </DialogContent>

        <DialogActions
          sx={{
            px: { xs: 2, sm: 3 },
            pt: 1.8,
            pb: { xs: 2, sm: 2.5 },
            gap: 1.2,
            borderTop: "1px solid rgba(148, 163, 184, 0.12)",
            mt: 1.5,
            justifyContent: "space-between",
          }}
        >
          <Button
            variant="outlined"
            onClick={onClose}
            disabled={loading}
            size="small"
            sx={{
              px: 2.5,
              borderColor: "rgba(148, 163, 184, 0.2)",
              color: theme.palette.text.secondary,
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
            }}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleReview}
            disabled={loading}
            size="small"
            sx={{
              px: 3.5,
              py: 0.9,
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "8px",
              boxShadow: "0 2px 10px rgba(16, 185, 129, 0.3)",
              "&:hover": {
                background: "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
              },
            }}
          >
            Review & Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* CONFIRMATION DIALOG (AUDIT CONFIRMATION REQUIREMENT) */}
      <Dialog
        open={confirmOpen}
        onClose={() => (loading ? null : setConfirmOpen(false))}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: "14px",
            background:
              theme.palette.custom?.dialogGradient ||
              "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            border: "1px solid rgba(16, 185, 129, 0.3)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.9)",
            p: 1,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1, pt: 2, px: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningAmberIcon sx={{ color: "#f59e0b", fontSize: 24 }} />
            <Typography variant="subtitle1" fontWeight="800">
              Confirm Transaction Edit
            </Typography>
          </Box>
          <Typography
            variant="caption"
            sx={{ color: theme.palette.text.secondary, display: "block", mt: 0.5 }}
          >
            Original Transaction ID: #{originalValues?.id}
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ px: 2, py: 1 }}>
          <Typography
            variant="caption"
            fontWeight="700"
            sx={{
              color: theme.palette.text.secondary,
              textTransform: "uppercase",
              display: "block",
              mb: 1,
            }}
          >
            Detected Modifications ({detectedDiffs.length}):
          </Typography>

          <Box display="flex" flexDirection="column" gap={0.8} mb={1.8}>
            {detectedDiffs.map((diff, idx) => (
              <Box
                key={idx}
                sx={{
                  p: 1,
                  borderRadius: "6px",
                  bgcolor: "rgba(15, 23, 42, 0.7)",
                  border: "1px solid rgba(148, 163, 184, 0.1)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 0.5,
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight="700"
                  color="text.secondary"
                >
                  {diff.field}:
                </Typography>
                <Box display="flex" alignItems="center" gap={0.6}>
                  <Typography
                    variant="caption"
                    sx={{ color: "#ef4444", textDecoration: "line-through" }}
                  >
                    {diff.from}
                  </Typography>
                  <ArrowForwardIcon sx={{ fontSize: 11, color: "text.secondary" }} />
                  <Typography
                    variant="caption"
                    fontWeight="800"
                    sx={{ color: "#10b981" }}
                  >
                    {diff.to}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>

          <Box
            sx={{
              p: 1.2,
              borderRadius: "8px",
              bgcolor: "rgba(16, 185, 129, 0.08)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}
          >
            <Typography variant="caption" sx={{ color: theme.palette.text.primary, display: "block" }}>
              <strong style={{ color: "#38bdf8" }}>Reason: </strong>
              "{reason.trim()}"
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: "0.68rem",
                display: "block",
                mt: 0.5,
              }}
            >
              ✓ This action will be permanently recorded in the Audit History.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 2, pb: 2, pt: 1, gap: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => setConfirmOpen(false)}
            disabled={loading}
            sx={{
              color: theme.palette.text.secondary,
              borderColor: "rgba(148, 163, 184, 0.2)",
              textTransform: "none",
            }}
          >
            Back to Edit
          </Button>

          <Button
            size="small"
            variant="contained"
            onClick={handleConfirmedSave}
            disabled={loading}
            sx={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              textTransform: "none",
              fontWeight: 800,
            }}
          >
            {loading ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              "Confirm & Update"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default EditTransactionModal;
