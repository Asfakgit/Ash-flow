import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import {
  deleteTransaction,
  getRowVal,
  getDataRows,
  formatDateDisplay,
  capitalizeName,
} from "../Services/SheetService";
import EditTransactionModal from "./EditTransactionModal";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
  Box,
  Typography,
  Chip,
  Paper,
  InputAdornment,
  TextField,
  Stack,
  Divider,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import SearchIcon from "@mui/icons-material/Search";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import soundEffects from "../Services/soundEffects";

function Transactions({
  transactions,
  setTransactions,
  triggerRefresh,
  showNotification,
}) {
  const theme = useTheme();
  const [editingRow, setEditingRow] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const handleEditClick = (row) => {
    setEditingRow(row);
  };

  const handleEditClose = () => {
    setEditingRow(null);
  };

  const handleEditSuccess = () => {
    if (triggerRefresh) triggerRefresh();
    if (showNotification) {
      showNotification({
        type: "success",
        title: "Updated!",
        message: "Transaction has been updated successfully",
      });
    }
  };

  const handleEditError = (errMessage) => {
    if (showNotification) {
      showNotification({
        type: "error",
        title: "Update Failed",
        message: errMessage || "Could not update transaction.",
      });
    }
  };

  const handleDeleteClick = (row) => {
    const personName = getRowVal(row, 1, "person", "Unknown");
    const amountNum = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
    const idVal = getRowVal(row, 0, "id", null);

    if (showNotification) {
      showNotification({
        type: "confirm",
        title: "Delete Transaction?",
        message: `Are you sure you want to delete the transaction for "${personName}" (₹${amountNum})? This action cannot be undone.`,
        confirmText: "Delete",
        onConfirm: async () => {
          soundEffects.playDelete();
          if (setTransactions) {
            setTransactions(prev => prev.filter(r => getRowVal(r, 0, "id", null) !== idVal));
          }
          
          // Fire in background
          deleteTransaction(idVal).catch(error => {
            console.error("Delete failed:", error);
            if (triggerRefresh) triggerRefresh();
            showNotification({
              type: "error",
              title: "Error",
              message: "Failed to delete transaction.",
            });
          });

          showNotification({
            type: "success",
            title: "Deleted!",
            message: "Transaction deleted successfully.",
          });
        },
      });
    } else {
      const confirmDelete = window.confirm(
        `Delete transaction for "${personName}"?`,
      );
      if (confirmDelete && idVal) {
        if (setTransactions) {
          setTransactions(prev => prev.filter(r => getRowVal(r, 0, "id", null) !== idVal));
        }
        deleteTransaction(idVal).catch(() => {
          if (triggerRefresh) triggerRefresh();
        });
      }
    }
  };

  const rows = getDataRows(transactions);
  const filteredRows = rows.filter((row) => {
    const person = String(getRowVal(row, 1, "person", "")).toLowerCase();
    const type = String(getRowVal(row, 3, "type", "")).toLowerCase();
    const notes = String(getRowVal(row, 5, "notes", "")).toLowerCase();
    const method = String(
      getRowVal(row, 6, "method", getRowVal(row, 6, "paymentMethod", "Cash")),
    ).toLowerCase();
    const query = searchQuery.toLowerCase();
    return (
      person.includes(query) ||
      type.includes(query) ||
      notes.includes(query) ||
      method.includes(query)
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
          placeholder="Search by name, type, method..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{
            width: { xs: "100%", sm: 260 },
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
            sx={{
              overflowX: "auto",
              maxHeight: 480,
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              touchAction: "pan-y",
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
                  <TableCell align="center" sx={{ py: 1 }}>
                    Actions
                  </TableCell>
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
                    const isSettled = String(typeVal)
                      .toLowerCase()
                      .includes("settled");

                    return (
                      <TableRow
                        key={idVal || index}
                        sx={{
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
                              ? theme.palette.error.main
                              : isLent
                                ? theme.palette.primary.main
                                : theme.palette.secondary.main,
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
                                ? theme.palette.custom.errorBoxBg
                                : isLent
                                  ? theme.palette.custom.successBoxBg
                                  : theme.palette.custom.secondaryBoxBg,
                              color: isSettled
                                ? theme.palette.error.main
                                : isLent
                                  ? theme.palette.primary.main
                                  : theme.palette.secondary.main,
                              border: `1px solid ${
                                isSettled
                                  ? theme.palette.custom.errorBoxBorder
                                  : isLent
                                    ? theme.palette.custom.successBoxBorder
                                    : theme.palette.custom.secondaryBoxBorder
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
                          <Typography
                            variant="body2"
                            sx={{
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontSize: "0.8rem",
                            }}
                          >
                            {notesVal || "-"}
                          </Typography>
                        </TableCell>

                        <TableCell align="center" sx={{ py: 0.75 }}>
                          <Box display="flex" justifyContent="center" gap={0.5}>
                            <Tooltip title="Edit Transaction">
                              <IconButton
                                size="small"
                                onClick={() => handleEditClick(row)}
                                sx={{
                                  color: theme.palette.secondary.main,
                                  "&:hover": {
                                    backgroundColor: theme.palette.custom.secondaryBoxBg,
                                  },
                                }}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete Transaction">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteClick(row)}
                                sx={{
                                  color: theme.palette.error.main,
                                  "&:hover": {
                                    backgroundColor: theme.palette.custom.errorBoxBg,
                                  },
                                }}
                              >
                                <DeleteIcon fontSize="small" />
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
        sx={{
          display: { xs: "block", md: "none" },
          maxHeight: { xs: 400, sm: 480 },
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          overscrollBehaviorY: "auto",
          pr: 0.5,
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: theme.palette.custom.scrollbarThumb,
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
          <Stack spacing={0.75}>
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
              const isSettled = String(typeVal)
                .toLowerCase()
                .includes("settled");

              return (
                <Paper
                  key={idVal || index}
                  elevation={0}
                  sx={{
                    px: 1.25,
                    py: 0.75,
                    borderRadius: { xs: "6px", sm: "8px" },
                    backgroundColor: theme.palette.custom.cardGradient || theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                    width: "100%",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
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
                      variant="subtitle1"
                      fontWeight="700"
                      sx={{ color: theme.palette.text.primary, fontSize: "0.88rem" }}
                    >
                      {personName}
                    </Typography>
                    <Typography
                      variant="subtitle1"
                      fontWeight="800"
                      sx={{
                        color: isSettled
                          ? theme.palette.error.main
                          : isLent
                            ? theme.palette.primary.main
                            : theme.palette.secondary.main,
                        fontSize: "0.92rem",
                      }}
                    >
                      ₹{amountNum.toLocaleString("en-IN")}
                    </Typography>
                  </Box>

                  <Divider
                    sx={{ borderColor: "rgba(148, 163, 184, 0.08)", my: 0.4 }}
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
                      gap={0.75}
                      flexWrap="wrap"
                    >
                      <Chip
                        label={typeVal}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          height: 22,
                          fontSize: "0.68rem",
                          borderRadius: "6px",
                          backgroundColor: isSettled
                            ? theme.palette.custom.errorBoxBg
                            : isLent
                              ? theme.palette.custom.successBoxBg
                              : theme.palette.custom.secondaryBoxBg,
                          color: isSettled
                            ? theme.palette.error.main
                            : isLent
                              ? theme.palette.primary.main
                              : theme.palette.secondary.main,
                          border: `1px solid ${
                            isSettled
                              ? theme.palette.custom.errorBoxBorder
                              : isLent
                                ? theme.palette.custom.successBoxBorder
                                : theme.palette.custom.secondaryBoxBorder
                          }`,
                        }}
                      />
                      <Chip
                        label={methodVal || "Cash"}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          height: 22,
                          fontSize: "0.68rem",
                          borderRadius: "6px",
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
                        sx={{ color: theme.palette.text.secondary, fontSize: "0.72rem" }}
                      >
                        {formatDateDisplay(dateVal)}
                      </Typography>
                    </Box>

                    {/* Touch-optimized Action Buttons */}
                    <Box display="flex" gap={0.5}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(row)}
                        sx={{
                          color: theme.palette.secondary.main,
                          backgroundColor: "rgba(99, 102, 241, 0.1)",
                          width: 28,
                          height: 28,
                          borderRadius: "6px",
                        }}
                      >
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>

                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(row)}
                        sx={{
                          color: theme.palette.error.main,
                          backgroundColor: "rgba(244, 63, 94, 0.1)",
                          width: 28,
                          height: 28,
                          borderRadius: "6px",
                        }}
                      >
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Box>
                  </Box>

                  {/* Bottom row: Notes if available */}
                  {notesVal && (
                    <Box
                      mt={0.75}
                      pt={0.5}
                      sx={{
                        borderTop: "1px dashed rgba(148, 163, 184, 0.1)",
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          color: theme.palette.text.secondary,
                          fontStyle: "italic",
                          display: "block",
                        }}
                      >
                        "{notesVal}"
                      </Typography>
                    </Box>
                  )}
                </Paper>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Edit Modal */}
      <EditTransactionModal
        open={Boolean(editingRow)}
        onClose={handleEditClose}
        transaction={editingRow}
        onSuccess={handleEditSuccess}
        onError={handleEditError}
        transactions={transactions}
        setTransactions={setTransactions}
      />
    </Box>
  );
}

export default Transactions;
