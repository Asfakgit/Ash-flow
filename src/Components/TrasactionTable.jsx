import { useState, useRef, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import {
  getRowVal,
  getDataRows,
  formatDateDisplay,
  cleanNotesDisplay,
  capitalizeName,
} from "../Services/SheetService";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Box,
  Typography,
  Chip,
  Paper,
  InputAdornment,
  TextField,
  Stack,
  Divider,
  Tooltip,
  IconButton,
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import ManageHistoryIcon from "@mui/icons-material/ManageHistory";
import TransactionAuditModal from "./TransactionAuditModal";
import EditTransactionModal from "./EditTransactionModal";

function Transactions({
  transactions,
  setTransactions,
  triggerRefresh,
  showNotification,
}) {
  const theme = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTxForAudit, setSelectedTxForAudit] = useState(null);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState(null);
  const desktopScrollRef = useRef(null);
  const mobileScrollRef = useRef(null);

  // Automatically reset scroll position when filtering
  useEffect(() => {
    if (desktopScrollRef.current) {
      desktopScrollRef.current.scrollTop = 0;
    }
    if (mobileScrollRef.current) {
      mobileScrollRef.current.scrollTop = 0;
    }
  }, [searchQuery]);

  const rows = getDataRows(transactions);
  const filteredRows = rows.filter((row) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;

    const person = String(getRowVal(row, 1, "person", "")).toLowerCase();
    const amountNum = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
    const amountStr = String(amountNum);
    const amountFormatted = amountNum.toLocaleString("en-IN").toLowerCase();
    const type = String(getRowVal(row, 3, "type", "")).toLowerCase();
    const rawDate = String(getRowVal(row, 4, "date", "")).toLowerCase();
    const displayDate = formatDateDisplay(rawDate).toLowerCase();
    const notes = String(getRowVal(row, 5, "notes", "")).toLowerCase();
    const method = String(
      getRowVal(row, 6, "method", getRowVal(row, 6, "paymentMethod", "Cash")),
    ).toLowerCase();

    const qCleanAmt = q.replace(/[₹,\s]/g, "");

    return (
      person.includes(q) ||
      type.includes(q) ||
      notes.includes(q) ||
      method.includes(q) ||
      rawDate.includes(q) ||
      displayDate.includes(q) ||
      (qCleanAmt && (amountStr.includes(qCleanAmt) || amountFormatted.includes(qCleanAmt)))
    );
  });

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        flexDirection={{ xs: "column", sm: "row" }}
        gap={2}
        mb={2}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: 34, sm: 40 },
              height: { xs: 34, sm: 40 },
              borderRadius: "8px",
              background: theme.palette.custom.successBoxBg,
              color: theme.palette.primary.main,
            }}
          >
            <ReceiptLongIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
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
              Transaction History
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              {rows.length} {rows.length === 1 ? "record" : "records"} found
            </Typography>
          </Box>
        </Box>

        <TextField
          size="small"
          placeholder="Search by name, amount, date, type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: { xs: "100%", sm: 280 },
            "& .MuiOutlinedInput-root": {
              backgroundColor: theme.palette.custom.inputBg,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: theme.palette.text.secondary, fontSize: 20 }} />
              </InputAdornment>
            ),
            endAdornment: searchQuery ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={() => setSearchQuery("")}
                  edge="end"
                  aria-label="clear search"
                  sx={{ color: theme.palette.text.secondary, p: 0.5 }}
                >
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>

      {/* 1. DESKTOP / TABLET VIEW (Standard Table) */}
      <Box sx={{ display: { xs: "none", md: "block" } }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: 1.5,
            overflow: "hidden",
            border: `1px solid ${theme.palette.divider}`,
            backgroundColor: theme.palette.background.paper,
          }}
        >
          <Box
            ref={desktopScrollRef}
            sx={{
              overflowX: "auto",
              maxHeight: 480,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              scrollbarWidth: "thin",
              scrollbarColor: `${theme.palette.divider} transparent`,
              "&::-webkit-scrollbar": {
                width: "6px",
                height: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: theme.palette.custom?.scrollbarThumb || theme.palette.divider,
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "transparent",
              },
            }}
          >
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ py: 1 }}>Person</TableCell>
                  <TableCell sx={{ py: 1 }}>Amount</TableCell>
                  <TableCell sx={{ py: 1 }}>Type</TableCell>
                  <TableCell sx={{ py: 1 }}>Method</TableCell>
                  <TableCell sx={{ py: 1 }}>Date</TableCell>
                  <TableCell sx={{ py: 1 }}>Notes</TableCell>
                  <TableCell align="right" sx={{ py: 1, pr: 2 }}>Actions</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" sx={{ color: theme.palette.text.secondary }}>
                        No transactions found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRows.map((row, index) => {
                    const idVal = getRowVal(row, 0, "id", index);
                    const personName = capitalizeName(
                      getRowVal(row, 1, "person", "-"),
                    );
                    const amountNum =
                      parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
                    const typeVal = getRowVal(row, 3, "type", "N/A");
                    const dateVal = getRowVal(row, 4, "date", "");
                    const notesVal = getRowVal(row, 5, "notes", "");
                    const methodVal = getRowVal(
                      row,
                      6,
                      "method",
                      getRowVal(row, 6, "paymentMethod", "Cash"),
                    );
                    const isLent = String(typeVal).toLowerCase() === "lent";
                    const isPartialPayment = String(typeVal).toLowerCase() === "partial payment";
                    const isSettled = String(typeVal)
                      .toLowerCase()
                      .includes("settled");

                    return (
                      <TableRow
                        key={idVal || index}
                        onClick={() => setSelectedTxForAudit(row)}
                        sx={{
                          cursor: "pointer",
                          transition: "background-color 0.15s",
                          "&:hover": {
                            backgroundColor: theme.palette.divider,
                          },
                        }}
                      >
                        <TableCell
                          sx={{
                            py: 0.75,
                            fontWeight: 600,
                            color: theme.palette.text.primary,
                            fontSize: "0.9rem",
                          }}
                        >
                          {personName}
                        </TableCell>
                        <TableCell
                          sx={{
                            py: 0.75,
                            fontWeight: 700,
                            fontSize: "0.95rem",
                            color: isSettled
                              ? "#94A3B8"
                              : isPartialPayment
                                ? "#0A84FF"
                                : isLent
                                  ? "#10B981"
                                  : "#EF4444",
                          }}
                        >
                          ₹{amountNum.toLocaleString("en-IN")}
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip
                            label={typeVal}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              height: 22,
                              fontSize: "0.7rem",
                              borderRadius: "6px",
                              backgroundColor: isSettled
                                ? "rgba(148, 163, 184, 0.14)"
                                : isPartialPayment
                                  ? "rgba(10, 132, 255, 0.14)"
                                  : isLent
                                    ? "rgba(16, 185, 129, 0.14)"
                                    : "rgba(239, 68, 68, 0.14)",
                              color: isSettled
                                ? "#94A3B8"
                                : isPartialPayment
                                  ? "#0A84FF"
                                  : isLent
                                    ? "#10B981"
                                    : "#EF4444",
                              border: `1px solid ${
                                isSettled
                                  ? "rgba(148, 163, 184, 0.3)"
                                  : isPartialPayment
                                    ? "rgba(10, 132, 255, 0.3)"
                                    : isLent
                                      ? "rgba(16, 185, 129, 0.3)"
                                      : "rgba(239, 68, 68, 0.3)"
                              }`,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ py: 0.75 }}>
                          <Chip
                            label={methodVal || "Cash"}
                            size="small"
                            sx={{
                              fontWeight: 600,
                              height: 22,
                              borderRadius: "6px",
                              fontSize: "0.7rem",
                              backgroundColor:
                                String(methodVal).toLowerCase() === "gpay"
                                  ? theme.palette.custom.secondaryBoxBg
                                  : String(methodVal).toLowerCase() === "bank"
                                    ? theme.palette.custom.netPositiveBoxBg
                                    : theme.palette.custom.successBoxBg,
                              color:
                                String(methodVal).toLowerCase() === "gpay"
                                  ? theme.palette.secondary.main
                                  : String(methodVal).toLowerCase() === "bank"
                                    ? theme.palette.custom.netPositiveColor
                                    : theme.palette.primary.main,
                              border: `1px solid ${
                                String(methodVal).toLowerCase() === "gpay"
                                  ? theme.palette.custom.secondaryBoxBorder
                                  : String(methodVal).toLowerCase() === "bank"
                                    ? theme.palette.custom.netPositiveBoxBorder
                                    : theme.palette.custom.successBoxBorder
                              }`,
                            }}
                          />
                        </TableCell>
                        <TableCell
                          sx={{
                            py: 0.75,
                            color: theme.palette.text.secondary,
                            fontSize: "0.8rem",
                          }}
                        >
                          {formatDateDisplay(dateVal)}
                        </TableCell>
                        <TableCell
                          sx={{ py: 0.75, color: theme.palette.text.secondary, maxWidth: 220 }}
                        >
                          {(() => {
                            const cleanNote = cleanNotesDisplay(notesVal);
                            return cleanNote ? (
                              <Tooltip
                                title={cleanNote}
                                arrow
                                placement="top-start"
                                enterDelay={150}
                                componentsProps={{
                                  tooltip: {
                                    sx: {
                                      bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#0f172a",
                                      color: "#f8fafc",
                                      fontSize: "0.78rem",
                                      p: 1.2,
                                      borderRadius: "8px",
                                      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                                      border: `1px solid ${theme.palette.divider}`,
                                      maxWidth: 340,
                                      wordBreak: "break-word",
                                    },
                                  },
                                  arrow: {
                                    sx: {
                                      color: theme.palette.mode === "dark" ? "#1e293b" : "#0f172a",
                                    },
                                  },
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  sx={{
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    fontSize: "0.8rem",
                                    cursor: "pointer",
                                    "&:hover": {
                                      color: theme.palette.text.primary,
                                      textDecoration: "underline dotted",
                                    },
                                  }}
                                >
                                  {cleanNote}
                                </Typography>
                              </Tooltip>
                            ) : (
                              <Typography
                                variant="body2"
                                sx={{ fontSize: "0.8rem", color: theme.palette.text.secondary }}
                              >
                                -
                              </Typography>
                            );
                          })()}
                        </TableCell>
                        <TableCell align="right" sx={{ py: 0.5, pr: 1.5 }}>
                          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                            <Tooltip title="View Audit History" arrow>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTxForAudit(row);
                                }}
                                sx={{
                                  color: theme.palette.text.secondary,
                                  p: 0.5,
                                  "&:hover": {
                                    color: "#10b981",
                                    backgroundColor: "rgba(16, 185, 129, 0.12)",
                                  },
                                }}
                              >
                                <ManageHistoryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </Box>

      {/* 2. MOBILE VIEW (Native List Cards - Zero Horizontal Scrolling) */}
      <Box
        ref={mobileScrollRef}
        sx={{
          display: { xs: "block", md: "none" },
          maxHeight: { xs: 400, sm: 480 },
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
          pr: 0.5,
          scrollbarWidth: "thin",
          scrollbarColor: `${theme.palette.divider} transparent`,
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: theme.palette.custom?.scrollbarThumb || theme.palette.divider,
            borderRadius: "4px",
          },
        }}
      >
        {filteredRows.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 4,
              textAlign: "center",
              borderRadius: 1.5,
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
              No transactions found.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={0.5}>
            {filteredRows.map((row, index) => {
              const idVal = getRowVal(row, 0, "id", index);
              const personName = capitalizeName(
                getRowVal(row, 1, "person", "-"),
              );
              const amountNum = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
              const typeVal = getRowVal(row, 3, "type", "N/A");
              const dateVal = getRowVal(row, 4, "date", "");
              const notesVal = getRowVal(row, 5, "notes", "");
              const methodVal = getRowVal(
                row,
                6,
                "method",
                getRowVal(row, 6, "paymentMethod", "Cash"),
              );
              const isLent = String(typeVal).toLowerCase() === "lent";
              const isPartialPayment = String(typeVal).toLowerCase() === "partial payment";
              const isSettled = String(typeVal)
                .toLowerCase()
                .includes("settled");

              return (
                <Paper
                  key={idVal || index}
                  elevation={0}
                  onClick={() => setSelectedTxForAudit(row)}
                  sx={{
                    px: 1.2,
                    py: 0.5,
                    borderRadius: "7px",
                    backgroundColor: theme.palette.custom.cardGradient || theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    width: "100%",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    transition: "border-color 0.2s, background-color 0.15s",
                    "&:active": {
                      borderColor: theme.palette.primary.main,
                    },
                  }}
                >
                  {/* Top row: Person Name & Amount */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={0}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight="700"
                      sx={{ color: theme.palette.text.primary, fontSize: "0.85rem", lineHeight: 1.2 }}
                    >
                      {personName}
                    </Typography>
                    <Typography
                      variant="subtitle2"
                      fontWeight="800"
                      sx={{
                        color: isSettled
                          ? "#94A3B8"
                          : isPartialPayment
                            ? "#0A84FF"
                            : isLent
                              ? "#10B981"
                              : "#EF4444",
                        fontSize: "0.88rem",
                        lineHeight: 1.2,
                      }}
                    >
                      ₹{amountNum.toLocaleString("en-IN")}
                    </Typography>
                  </Box>

                  <Divider
                    sx={{ borderColor: "rgba(148, 163, 184, 0.08)", my: 0.25 }}
                  />

                  {/* Middle row: Type chip, Method chip, Date & Actions */}
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={0.6}
                      flexWrap="wrap"
                    >
                      <Chip
                        label={typeVal}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          height: 20,
                          fontSize: "0.64rem",
                          borderRadius: "5px",
                          backgroundColor: isSettled
                            ? "rgba(148, 163, 184, 0.14)"
                            : isPartialPayment
                              ? "rgba(10, 132, 255, 0.14)"
                              : isLent
                                ? "rgba(16, 185, 129, 0.14)"
                                : "rgba(239, 68, 68, 0.14)",
                          color: isSettled
                            ? "#94A3B8"
                            : isPartialPayment
                              ? "#0A84FF"
                              : isLent
                                ? "#10B981"
                                : "#EF4444",
                          border: `1px solid ${
                            isSettled
                              ? "rgba(148, 163, 184, 0.3)"
                              : isPartialPayment
                                ? "rgba(10, 132, 255, 0.3)"
                                : isLent
                                  ? "rgba(16, 185, 129, 0.3)"
                                  : "rgba(239, 68, 68, 0.3)"
                          }`,
                        }}
                      />
                      <Chip
                        label={methodVal || "Cash"}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          height: 20,
                          fontSize: "0.64rem",
                          borderRadius: "5px",
                          backgroundColor:
                            String(methodVal).toLowerCase() === "gpay"
                              ? theme.palette.custom.secondaryBoxBg
                              : String(methodVal).toLowerCase() === "bank"
                                ? theme.palette.custom.netPositiveBoxBg
                                : theme.palette.custom.successBoxBg,
                          color:
                            String(methodVal).toLowerCase() === "gpay"
                              ? theme.palette.secondary.main
                              : String(methodVal).toLowerCase() === "bank"
                                ? theme.palette.custom.netPositiveColor
                                : theme.palette.primary.main,
                          border: `1px solid ${
                            String(methodVal).toLowerCase() === "gpay"
                              ? theme.palette.custom.secondaryBoxBorder
                              : String(methodVal).toLowerCase() === "bank"
                                ? theme.palette.custom.netPositiveBoxBorder
                                : theme.palette.custom.successBoxBorder
                          }`,
                        }}
                      />
                      <Typography
                        variant="caption"
                        sx={{ color: theme.palette.text.secondary, fontSize: "0.68rem" }}
                      >
                        {formatDateDisplay(dateVal)}
                      </Typography>
                    </Box>

                    {/* Mobile Action Buttons: History & Edit */}
                    <Box display="flex" alignItems="center" gap={0.4}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTxForAudit(row);
                        }}
                        sx={{
                          p: 0.4,
                          color: theme.palette.text.secondary,
                          "&:hover": { color: "#10b981" },
                        }}
                      >
                        <ManageHistoryIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Bottom row: Notes if available */}
                  {(() => {
                    const cleanNote = cleanNotesDisplay(notesVal);
                    if (!cleanNote) return null;
                    return (
                      <Box
                        mt={0.75}
                        pt={0.5}
                        sx={{
                          borderTop: "1px dashed rgba(148, 163, 184, 0.1)",
                        }}
                      >
                        <Tooltip
                          title={cleanNote}
                          arrow
                          enterTouchDelay={50}
                          placement="top-start"
                          componentsProps={{
                            tooltip: {
                              sx: {
                                bgcolor: theme.palette.mode === "dark" ? "#1e293b" : "#0f172a",
                                color: "#f8fafc",
                                fontSize: "0.75rem",
                                p: 1.2,
                                borderRadius: "8px",
                                maxWidth: 280,
                                wordBreak: "break-word",
                                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                                border: `1px solid ${theme.palette.divider}`,
                              },
                            },
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: theme.palette.text.secondary,
                              fontStyle: "italic",
                              display: "block",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              cursor: "pointer",
                            }}
                          >
                            "{cleanNote}"
                          </Typography>
                        </Tooltip>
                      </Box>
                    );
                  })()}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Transaction Audit History Modal */}
      <TransactionAuditModal
        open={Boolean(selectedTxForAudit)}
        onClose={() => setSelectedTxForAudit(null)}
        transaction={selectedTxForAudit}
        onEdit={(tx) => setSelectedTxForEdit(tx)}
      />

      {/* Edit Transaction Modal with Reason & Audit History Confirmation */}
      <EditTransactionModal
        open={Boolean(selectedTxForEdit)}
        onClose={() => setSelectedTxForEdit(null)}
        transaction={selectedTxForEdit}
        transactions={transactions}
        setTransactions={setTransactions}
        onSuccess={(msg) => {
          setSelectedTxForEdit(null);
          if (showNotification) {
            showNotification({
              type: "success",
              title: "Transaction Updated",
              message: msg || "Transaction and audit record saved successfully.",
            });
          }
          if (triggerRefresh) triggerRefresh();
        }}
        onError={(err) => {
          if (showNotification) {
            showNotification({
              type: "error",
              title: "Update Error",
              message: err,
            });
          }
        }}
      />
    </Box>
  );
}

export default Transactions;
