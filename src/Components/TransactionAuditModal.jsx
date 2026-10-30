import { useState, useEffect, forwardRef } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Slide,
  CircularProgress,
  Paper,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ManageHistoryIcon from "@mui/icons-material/ManageHistory";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditNoteIcon from "@mui/icons-material/EditNote";
import ScheduleIcon from "@mui/icons-material/Schedule";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PersonIcon from "@mui/icons-material/Person";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  getRowVal,
  formatDateDisplay,
  cleanNotesDisplay,
  capitalizeName,
  getAuditHistoryForTransaction,
  AUDIT_FEATURE_START_DATE,
} from "../Services/SheetService";

const Transition = forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={{ enter: 360, exit: 220 }}
      style={{
        transitionTimingFunction: props.in
          ? "cubic-bezier(0.32, 0.72, 0, 1)"
          : "cubic-bezier(0.4, 0, 0.22, 1)",
      }}
    />
  );
});

const formatAuditTimestamp = (isoStr) => {
  if (!isoStr) return "-";
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return String(isoStr);
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    const month = monthNames[d.getMonth()];
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
  } catch {
    return String(isoStr);
  }
};

const getDiffFields = (prev, next) => {
  if (!prev || !next) return [];
  const fields = [
    { key: "person", label: "Person Name" },
    { key: "amount", label: "Amount", isMoney: true },
    { key: "type", label: "Type" },
    { key: "method", label: "Payment Method" },
    { key: "date", label: "Date" },
    { key: "notes", label: "Notes" },
  ];

  const diffs = [];
  fields.forEach(({ key, label, isMoney }) => {
    let oldVal = prev[key] !== undefined ? prev[key] : "";
    let newVal = next[key] !== undefined ? next[key] : "";

    if (isMoney) {
      const oldNum = parseFloat(oldVal) || 0;
      const newNum = parseFloat(newVal) || 0;
      if (oldNum !== newNum) {
        diffs.push({
          field: label,
          from: `₹${oldNum.toLocaleString("en-IN")}`,
          to: `₹${newNum.toLocaleString("en-IN")}`,
        });
      }
    } else {
      const oldStr = String(oldVal || "").trim();
      const newStr = String(newVal || "").trim();
      if (oldStr !== newStr) {
        diffs.push({
          field: label,
          from: oldStr || "(empty)",
          to: newStr || "(empty)",
        });
      }
    }
  });

  return diffs;
};

function TransactionAuditModal({ open, onClose, transaction, onEdit }) {
  const theme = useTheme();
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);

  const txId = transaction ? String(getRowVal(transaction, 0, "id", "")) : "";
  const person = transaction ? capitalizeName(getRowVal(transaction, 1, "person", "-")) : "-";
  const amount = transaction ? parseFloat(getRowVal(transaction, 2, "amount", 0)) || 0 : 0;
  const type = transaction ? String(getRowVal(transaction, 3, "type", "Lent")) : "Lent";
  const date = transaction ? formatDateDisplay(getRowVal(transaction, 4, "date", "")) : "-";
  const notes = transaction ? cleanNotesDisplay(getRowVal(transaction, 5, "notes", "")) : "";
  const method = transaction
    ? getRowVal(transaction, 6, "method", getRowVal(transaction, 6, "paymentMethod", "Cash"))
    : "Cash";

  const isLent = type.toLowerCase() === "lent";
  const isBorrowed = type.toLowerCase() === "borrowed";
  const isPartial = type.toLowerCase() === "partial payment";
  const isSettled = type.toLowerCase().includes("settled");

  const badgeColor = isSettled
    ? "#94a3b8"
    : isPartial
    ? "#0a84ff"
    : isLent
    ? "#10b981"
    : "#ef4444";

  // Lock background scroll
  useEffect(() => {
    if (open) {
      const origBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origBodyOverflow;
      };
    }
  }, [open]);

  // Load audit history
  useEffect(() => {
    let isMounted = true;
    if (open && txId) {
      setLoading(true);
      getAuditHistoryForTransaction(txId)
        .then((records) => {
          if (isMounted) {
            setAudits(records || []);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error loading audit history:", err);
          if (isMounted) {
            setAudits([]);
            setLoading(false);
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [open, txId]);

  return (
    <Dialog
      open={Boolean(open)}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
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
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, sm: 3 },
          pt: { xs: 2, sm: 2.4 },
          pb: 1.5,
          borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
          background: "rgba(15, 23, 42, 0.4)",
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
            <ManageHistoryIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </Box>
          <Box>
            <Typography
              variant="subtitle1"
              fontWeight="800"
              sx={{
                color: theme.palette.text.primary,
                fontSize: { xs: "0.98rem", sm: "1.15rem" },
                letterSpacing: "-0.01em",
                lineHeight: 1.2,
              }}
            >
              Transaction Audit History
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary, fontSize: "0.7rem" }}
            >
              ID: #{txId || "N/A"}
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
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

      {/* Content */}
      <DialogContent
        sx={{
          px: { xs: 1.8, sm: 3 },
          py: { xs: 1.8, sm: 2.5 },
          overflowY: "auto",
        }}
      >
        <Box display="flex" flexDirection="column" gap={2}>
          {/* Current State Summary Banner */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.4, sm: 1.8 },
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.5) 100%)",
              border: `1px solid ${theme.palette.divider || "rgba(148, 163, 184, 0.14)"}`,
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="flex-start"
              mb={1}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <Box
                  sx={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: "rgba(148, 163, 184, 0.14)",
                    color: theme.palette.text.primary,
                  }}
                >
                  <PersonIcon sx={{ fontSize: 18 }} />
                </Box>
                <Box>
                  <Typography
                    variant="subtitle2"
                    fontWeight="800"
                    sx={{ color: theme.palette.text.primary, fontSize: "0.92rem" }}
                  >
                    {person}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: theme.palette.text.secondary, fontSize: "0.72rem" }}
                  >
                    Recorded Date: {date}
                  </Typography>
                </Box>
              </Box>

              <Box textAlign="right">
                <Typography
                  variant="h6"
                  fontWeight="900"
                  sx={{ color: badgeColor, fontSize: "1.1rem" }}
                >
                  {isSettled
                    ? `₹${amount.toLocaleString("en-IN")}`
                    : `${isLent ? "+" : isBorrowed ? "-" : ""}₹${amount.toLocaleString("en-IN")}`}
                </Typography>
                <Chip
                  label={type}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    bgcolor: `${badgeColor}18`,
                    color: badgeColor,
                    border: `1px solid ${badgeColor}35`,
                  }}
                />
              </Box>
            </Box>

            <Divider sx={{ my: 0.8, borderColor: "rgba(148, 163, 184, 0.1)" }} />

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary, fontSize: "0.72rem" }}
              >
                Method: <strong style={{ color: theme.palette.text.primary }}>{method}</strong>
              </Typography>
              {notes && (
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontStyle: "italic",
                    maxWidth: "60%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: "0.72rem",
                  }}
                >
                  "{notes}"
                </Typography>
              )}
            </Box>
          </Paper>

          {/* Timeline Section */}
          <Box>
            <Typography
              variant="caption"
              fontWeight="800"
              sx={{
                color: theme.palette.text.secondary,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontSize: "0.72rem",
                display: "block",
                mb: 1.5,
              }}
            >
              Modification Timeline
            </Typography>

            {loading ? (
              <Box py={4} textAlign="center">
                <CircularProgress size={28} sx={{ color: theme.palette.primary.main }} />
                <Typography
                  variant="caption"
                  sx={{ display: "block", mt: 1, color: theme.palette.text.secondary }}
                >
                  Fetching audit history...
                </Typography>
              </Box>
            ) : audits.length === 0 ? (
              /* No History Case */
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, sm: 2.5 },
                  borderRadius: "12px",
                  background: "rgba(15, 23, 42, 0.45)",
                  border: "1px dashed rgba(148, 163, 184, 0.2)",
                  textAlign: "center",
                }}
              >
                <InfoOutlinedIcon
                  sx={{ fontSize: 32, color: theme.palette.text.secondary, mb: 1, opacity: 0.8 }}
                />
                <Typography
                  variant="subtitle2"
                  fontWeight="700"
                  sx={{ color: theme.palette.text.primary, mb: 0.5 }}
                >
                  No Modification History Recorded
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    display: "block",
                    lineHeight: 1.5,
                    maxWidth: 420,
                    mx: "auto",
                    fontSize: "0.75rem",
                  }}
                >
                  Audit tracking started on <strong>{AUDIT_FEATURE_START_DATE}</strong>.
                  This record has not been modified since tracking commenced. Any future edits will be captured automatically.
                </Typography>
              </Paper>
            ) : (
              /* Audit Timeline Entries */
              <Box
                sx={{
                  position: "relative",
                  pl: { xs: 2.2, sm: 3 },
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    left: { xs: 7, sm: 11 },
                    top: 10,
                    bottom: 10,
                    width: "2px",
                    background: "rgba(148, 163, 184, 0.18)",
                  },
                }}
              >
                {audits.map((audit, idx) => {
                  const isCreate = audit.action === "CREATE";
                  const isUpdate = audit.action === "UPDATE";
                  const diffs = isUpdate
                    ? getDiffFields(audit.previousValues, audit.updatedValues)
                    : [];

                  return (
                    <Box
                      key={audit.auditId || idx}
                      sx={{
                        position: "relative",
                        mb: idx === audits.length - 1 ? 0 : 2,
                      }}
                    >
                      {/* Timeline Icon Node */}
                      <Box
                        sx={{
                          position: "absolute",
                          left: { xs: -17, sm: -24 },
                          top: 4,
                          width: { xs: 20, sm: 24 },
                          height: { xs: 20, sm: 24 },
                          borderRadius: "50%",
                          bgcolor: isCreate ? "#10b981" : "#f59e0b",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: `0 0 10px ${isCreate ? "rgba(16, 185, 129, 0.6)" : "rgba(245, 158, 11, 0.6)"}`,
                        }}
                      >
                        {isCreate ? (
                          <CheckCircleIcon sx={{ fontSize: { xs: 13, sm: 16 } }} />
                        ) : (
                          <EditNoteIcon sx={{ fontSize: { xs: 13, sm: 16 } }} />
                        )}
                      </Box>

                      {/* Audit Event Card */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: { xs: 1.4, sm: 1.8 },
                          borderRadius: "10px",
                          background: "rgba(15, 23, 42, 0.6)",
                          border: `1px solid ${
                            isCreate
                              ? "rgba(16, 185, 129, 0.25)"
                              : "rgba(245, 158, 11, 0.25)"
                          }`,
                        }}
                      >
                        {/* Event Header */}
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          flexWrap="wrap"
                          gap={0.8}
                          mb={0.8}
                        >
                          <Box display="flex" alignItems="center" gap={0.8}>
                            <Chip
                              size="small"
                              label={isCreate ? "CREATED" : "MODIFIED"}
                              sx={{
                                height: 20,
                                fontSize: "0.64rem",
                                fontWeight: 800,
                                bgcolor: isCreate
                                  ? "rgba(16, 185, 129, 0.15)"
                                  : "rgba(245, 158, 11, 0.15)",
                                color: isCreate ? "#10b981" : "#f59e0b",
                                border: `1px solid ${
                                  isCreate
                                    ? "rgba(16, 185, 129, 0.35)"
                                    : "rgba(245, 158, 11, 0.35)"
                                }`,
                              }}
                            />
                            <Typography
                              variant="caption"
                              fontWeight="700"
                              sx={{ color: theme.palette.text.secondary, fontSize: "0.72rem" }}
                            >
                              by @{audit.userId || "user"}
                            </Typography>
                          </Box>

                          <Box display="flex" alignItems="center" gap={0.4}>
                            <ScheduleIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                            <Typography
                              variant="caption"
                              sx={{ color: theme.palette.text.secondary, fontSize: "0.7rem" }}
                            >
                              {formatAuditTimestamp(audit.timestamp)}
                            </Typography>
                          </Box>
                        </Box>

                        {/* Reason Box */}
                        {audit.reason && (
                          <Box
                            sx={{
                              p: 1,
                              my: 0.8,
                              borderRadius: "6px",
                              bgcolor: "rgba(15, 23, 42, 0.85)",
                              border: "1px solid rgba(148, 163, 184, 0.12)",
                            }}
                          >
                            <Typography
                              variant="caption"
                              sx={{
                                color: theme.palette.text.primary,
                                fontSize: "0.76rem",
                                display: "block",
                              }}
                            >
                              <strong style={{ color: "#38bdf8" }}>Reason: </strong>
                              "{audit.reason}"
                            </Typography>
                          </Box>
                        )}

                        {/* Diffs Highlight for Updates */}
                        {isUpdate && diffs.length > 0 && (
                          <Box mt={1}>
                            <Typography
                              variant="caption"
                              fontWeight="700"
                              sx={{
                                color: theme.palette.text.secondary,
                                fontSize: "0.68rem",
                                textTransform: "uppercase",
                                display: "block",
                                mb: 0.5,
                              }}
                            >
                              Fields Changed ({diffs.length}):
                            </Typography>

                            <Box display="flex" flexDirection="column" gap={0.5}>
                              {diffs.map((diff, dIdx) => (
                                <Box
                                  key={dIdx}
                                  sx={{
                                    px: 1,
                                    py: 0.5,
                                    borderRadius: "6px",
                                    bgcolor: "rgba(255, 255, 255, 0.02)",
                                    border: "1px solid rgba(148, 163, 184, 0.08)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    flexWrap: "wrap",
                                    gap: 0.5,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    fontWeight="700"
                                    sx={{
                                      color: theme.palette.text.secondary,
                                      fontSize: "0.72rem",
                                    }}
                                  >
                                    {diff.field}:
                                  </Typography>
                                  <Box display="flex" alignItems="center" gap={0.6}>
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      sx={{
                                        color: "#ef4444",
                                        textDecoration: "line-through",
                                        opacity: 0.85,
                                        fontSize: "0.72rem",
                                      }}
                                    >
                                      {diff.from}
                                    </Typography>
                                    <ArrowForwardIcon sx={{ fontSize: 11, color: "text.secondary" }} />
                                    <Typography
                                      component="span"
                                      variant="caption"
                                      fontWeight="800"
                                      sx={{
                                        color: "#10b981",
                                        fontSize: "0.74rem",
                                      }}
                                    >
                                      {diff.to}
                                    </Typography>
                                  </Box>
                                </Box>
                              ))}
                            </Box>
                          </Box>
                        )}

                        {/* Initial Created Values */}
                        {isCreate && audit.updatedValues && (
                          <Typography
                            variant="caption"
                            sx={{
                              color: theme.palette.text.secondary,
                              fontSize: "0.7rem",
                              display: "block",
                              mt: 0.5,
                            }}
                          >
                            Initial: ₹{audit.updatedValues.amount?.toLocaleString("en-IN") || 0} • {audit.updatedValues.type} via {audit.updatedValues.method}
                          </Typography>
                        )}
                      </Paper>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>

      {/* Footer Actions */}
      <DialogActions
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderTop: "1px solid rgba(148, 163, 184, 0.12)",
          justifyContent: "space-between",
        }}
      >
        <Button
          variant="outlined"
          onClick={onClose}
          size="small"
          sx={{
            color: theme.palette.text.secondary,
            borderColor: "rgba(148, 163, 184, 0.2)",
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "8px",
          }}
        >
          Close
        </Button>

        {onEdit && !isSettled && (
          <Button
            variant="contained"
            onClick={() => {
              onClose();
              onEdit(transaction);
            }}
            size="small"
            startIcon={<EditNoteIcon />}
            sx={{
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
            Edit Transaction
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default TransactionAuditModal;

