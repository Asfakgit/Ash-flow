import { useEffect, useState, useMemo, forwardRef } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Box,
  Typography,
  Chip,
  Avatar,
  Tooltip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Slide,
} from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import HistoryIcon from "@mui/icons-material/History";
import PaymentsIcon from "@mui/icons-material/Payments";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import soundEffects from "../Services/soundEffects";
import TransactionAuditModal from "./TransactionAuditModal";
import EditTransactionModal from "./EditTransactionModal";
import {
  getRowVal,
  getDataRows,
  addTransaction,
  capitalizeName,
  formatDateDisplay,
  getTodayDisplay,
  cleanNotesDisplay,
} from "../Services/SheetService";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function PersonBalance({
  transactions = [],
  setTransactions,
  triggerRefresh,
  showNotification,
  onOpenAdd,
}) {
  const theme = useTheme();
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [selectedTxForAudit, setSelectedTxForAudit] = useState(null);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState(null);

  // Compute full transaction history for selected person
  const personHistory = useMemo(() => {
    if (!selectedPerson) return [];
    const rows = getDataRows(transactions);
    return rows
      .filter((row) => {
        const p = String(getRowVal(row, 1, "person", "")).trim().toLowerCase();
        return p === selectedPerson.toLowerCase();
      })
      .sort((a, b) => {
        const idA = Number(getRowVal(a, 0, "id", 0)) || 0;
        const idB = Number(getRowVal(b, 0, "id", 0)) || 0;
        return idB - idA;
      });
  }, [transactions, selectedPerson]);

  // Compute precise stats for selected person
  const personStats = useMemo(() => {
    if (!personHistory.length) {
      return { lent: 0, borrowed: 0, net: 0, count: 0 };
    }
    let totalLent = 0;
    let totalBorrowed = 0;
    let net = 0;

    const chronological = [...personHistory].sort((a, b) => {
      const idA = Number(getRowVal(a, 0, "id", 0)) || 0;
      const idB = Number(getRowVal(b, 0, "id", 0)) || 0;
      return idA - idB;
    });

    chronological.forEach((r) => {
      const amt = parseFloat(getRowVal(r, 2, "amount", 0)) || 0;
      const type = String(getRowVal(r, 3, "type", "")).toLowerCase();
      const notes = String(getRowVal(r, 5, "notes", "")).toLowerCase();

      if (type === "lent") {
        totalLent += amt;
        net += amt;
      } else if (type === "borrowed") {
        totalBorrowed += amt;
        net -= amt;
      } else if (type === "partial payment") {
        if (net > 0) {
          net = Math.max(0, net - amt);
        } else if (net < 0) {
          net = Math.min(0, net + amt);
        }
      } else if (type.includes("settled")) {
        if (notes.includes("full payment") || notes.includes("close account")) {
          net = 0;
        } else {
          if (net > 0) {
            net = Math.max(0, net - amt);
          } else if (net < 0) {
            net = Math.min(0, net + amt);
          }
        }
      }
    });

    return {
      lent: totalLent,
      borrowed: totalBorrowed,
      net,
      count: personHistory.length,
    };
  }, [personHistory]);

  // Type filter for person transaction history ('all' | 'lent' | 'borrowed' | 'partial')
  const [historyFilter, setHistoryFilter] = useState("all");

  // Reset filter when person changes
  useEffect(() => {
    setHistoryFilter("all");
  }, [selectedPerson]);

  const filterCounts = useMemo(() => {
    let lent = 0;
    let borrowed = 0;
    let partial = 0;
    let settled = 0;
    personHistory.forEach((r) => {
      const t = String(getRowVal(r, 3, "type", "")).toLowerCase();
      if (t === "lent") lent++;
      else if (t === "borrowed") borrowed++;
      else if (t === "partial payment") partial++;
      else if (t.includes("settled")) settled++;
    });
    return { all: personHistory.length, lent, borrowed, partial, settled };
  }, [personHistory]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return personHistory;
    return personHistory.filter((r) => {
      const t = String(getRowVal(r, 3, "type", "")).toLowerCase();
      if (historyFilter === "lent") return t === "lent";
      if (historyFilter === "borrowed") return t === "borrowed";
      if (historyFilter === "partial") return t === "partial payment";
      if (historyFilter === "settled") return t.includes("settled");
      return true;
    });
  }, [personHistory, historyFilter]);

  const handleQuickAddForPerson = (type) => {
    if (onOpenAdd && selectedPerson) {
      const p = selectedPerson;
      setSelectedPerson(null);
      setTimeout(() => {
        onOpenAdd({ person: capitalizeName(p), type: type || "Lent" });
      }, 80);
    }
  };

  // Track transaction IDs that have already been settled/closed by a settlement history entry
  const closedRowIds = useMemo(() => {
    const set = new Set();
    const rows = getDataRows(transactions);
    rows.forEach((r) => {
      const t = String(getRowVal(r, 3, "type", "")).toLowerCase();
      const n = String(getRowVal(r, 5, "notes", ""));
      const relId = r.relatedId || r.refId;
      if (relId) {
        set.add(String(relId).trim());
      }
      if (t.includes("settled")) {
        const match = n.match(/(?:ID|ref):\s*([^\s)•\]]+)/i);
        if (match && match[1]) {
          set.add(String(match[1]).trim());
        }
      }
    });
    return set;
  }, [transactions]);

  const [balanceFilter, setBalanceFilter] = useState("active"); // 'active' | 'settled'

  // Calculate both active balances and closed/settled accounts
  const { activeEntries, settledEntries } = useMemo(() => {
    const rows = getDataRows(transactions);
    const balanceMap = {};
    const hasSettledMap = {};
    const allPeople = new Set();

    // Sort rows from oldest to newest by id so running balance is calculated chronologically
    const sortedRows = [...rows].sort((a, b) => {
      const idA = Number(getRowVal(a, 0, "id", 0)) || 0;
      const idB = Number(getRowVal(b, 0, "id", 0)) || 0;
      return idA - idB;
    });

    sortedRows.forEach((row) => {
      const rawPerson = getRowVal(row, 1, "person", "");
      if (!rawPerson || !String(rawPerson).trim()) return;
      const person = capitalizeName(rawPerson);
      allPeople.add(person);
      const amount = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
      const type = String(getRowVal(row, 3, "type", "")).toLowerCase();
      const notes = String(getRowVal(row, 5, "notes", "")).toLowerCase();

      if (!balanceMap[person]) {
        balanceMap[person] = 0;
      }

      if (type === "settled" || type.includes("settled")) {
        if (notes.includes("full payment") || notes.includes("close account")) {
          balanceMap[person] = 0;
          hasSettledMap[person] = true;
        } else {
          if (balanceMap[person] > 0) {
            balanceMap[person] = Math.max(0, balanceMap[person] - amount);
          } else if (balanceMap[person] < 0) {
            balanceMap[person] = Math.min(0, balanceMap[person] + amount);
          }
        }
      } else if (type === "lent") {
        balanceMap[person] += amount;
        hasSettledMap[person] = false;
      } else if (type === "borrowed") {
        balanceMap[person] -= amount;
        hasSettledMap[person] = false;
      } else if (type === "partial payment") {
        if (balanceMap[person] > 0) {
          balanceMap[person] -= amount;
        } else if (balanceMap[person] < 0) {
          balanceMap[person] += amount;
        }
        hasSettledMap[person] = false;
      }
    });

    const active = [];
    const settled = [];

    allPeople.forEach((person) => {
      const bal = balanceMap[person] || 0;
      if (Math.abs(bal) >= 0.01 && !hasSettledMap[person]) {
        active.push([person, bal]);
      } else {
        settled.push([person, 0]);
      }
    });

    // Sort active by absolute balance descending
    active.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    // Sort settled alphabetically
    settled.sort((a, b) => a[0].localeCompare(b[0]));

    return { activeEntries: active, settledEntries: settled };
  }, [transactions]);

  const displayedEntries =
    balanceFilter === "active" ? activeEntries : settledEntries;

  const handleSettlePerson = (person, balance) => {
    const confirmMsg = `Record a full payment to close the account for "${person}"? This will add a 'Settled' transaction for the exact remaining balance, closing their account and removing them from the active balances list.`;

    const executeSettle = async () => {
      try {
        soundEffects.playSettle();
        const settleAmt = Math.abs(balance !== undefined ? balance : 0);
        const settleTx = {
          id: Date.now(),
          person: capitalizeName(person),
          amount: settleAmt,
          type: "Settled",
          notes: "Full payment to close account",
          date: formatDateDisplay(new Date().toISOString().split("T")[0]),
          method: "Cash",
        };

        if (setTransactions) {
          const newRow = {
            id: settleTx.id,
            person: settleTx.person,
            amount: settleTx.amount,
            type: settleTx.type,
            date: settleTx.date,
            notes: settleTx.notes,
            method: settleTx.method,
          };
          setTransactions((prev) => [newRow, ...prev]);
        }

        addTransaction(settleTx).catch((err) => {
          console.error("Settle failed:", err);
          if (triggerRefresh) triggerRefresh();
        });

        setSelectedPerson(null);

        if (showNotification) {
          showNotification({
            type: "success",
            title: "Payment Recorded & Account Closed!",
            message: `Full payment recorded for "${person}". Account closed from active balances ✅`,
          });
        }
      } catch (err) {
        console.error("Settle failed:", err);
      }
    };

    if (showNotification) {
      showNotification({
        type: "confirm",
        title: "Record Full Payment & Close Account?",
        message: confirmMsg,
        confirmText: "Record Payment",
        onConfirm: executeSettle,
      });
    } else {
      if (window.confirm(confirmMsg)) {
        executeSettle();
      }
    }
  };

  const handleCloseSingleTransaction = (row) => {
    const rowId = getRowVal(row, 0, "id", "");
    const person = capitalizeName(getRowVal(row, 1, "person", selectedPerson || ""));
    const amt = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
    const type = String(getRowVal(row, 3, "type", "Lent"));
    const notesVal = getRowVal(row, 5, "notes", "");
    const methodVal =
      getRowVal(row, 6, "method", getRowVal(row, 6, "paymentMethod", "Cash")) ||
      "Cash";

    const isSettled = String(type).toLowerCase().includes("settled");
    if (isSettled || (rowId && closedRowIds.has(String(rowId)))) return;

    try {
      soundEffects.playSettle();

      const newId = Date.now();
      const cleanUserNote = cleanNotesDisplay(notesVal);
      const newSettledTx = {
        id: newId,
        person: person,
        amount: amt,
        type: "Settled",
        date: getTodayDisplay(),
        notes: cleanUserNote ? `Closed ${type} • ${cleanUserNote} [ref:${rowId}]` : `Closed ${type} [ref:${rowId}]`,
        method: methodVal,
        relatedId: rowId,
      };

      // Create new history entry in the transactions history
      if (setTransactions) {
        setTransactions((prev) => [newSettledTx, ...prev]);
      }

      // Persist to Google Sheets in background
      addTransaction(newSettledTx).catch((err) => {
        console.error("Failed to add settled transaction to Sheets:", err);
        if (triggerRefresh) triggerRefresh();
      });

      if (showNotification) {
        showNotification({
          type: "success",
          title: "Payment Closed & History Recorded!",
          message: `Created a new Settled history record of ₹${amt.toLocaleString("en-IN")} for "${person}".`,
        });
      }
    } catch (err) {
      console.error("handleCloseSingleTransaction error:", err);
    }
  };

  return (
    <>
    <Paper
      elevation={0}
      sx={{
        borderRadius: { xs: "8px", sm: "10px" },
        p: { xs: 1.25, sm: 2.2 },
        border: `1px solid ${theme.palette.divider}`,
        background: theme.palette.custom.cardGradient,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={1}
        mb={{ xs: 1.2, sm: 2 }}
      >
        <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 1.2 }} sx={{ minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: 28, sm: 36 },
              height: { xs: 28, sm: 36 },
              borderRadius: "8px",
              background: theme.palette.custom.secondaryBoxBg,
              color: theme.palette.info.main,
              flexShrink: 0,
            }}
          >
            <PeopleAltIcon sx={{ fontSize: { xs: 17, sm: 20 } }} />
          </Box>
          <Box display="flex" alignItems="center" gap={0.8} sx={{ minWidth: 0, flexWrap: "wrap" }}>
            <Typography
              variant="subtitle1"
              fontWeight="800"
              sx={{
                color: theme.palette.text.primary,
                fontSize: { xs: "0.92rem", sm: "1.15rem" },
                whiteSpace: "nowrap",
                letterSpacing: "-0.01em",
              }}
            >
              Person Balances
            </Typography>
            <Box display="flex" alignItems="center" gap={0.5}>
              <Chip
                size="small"
                clickable
                onClick={() => setBalanceFilter("active")}
                label={`Active (${activeEntries.length})`}
                sx={{
                  height: 20,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  color: balanceFilter === "active" ? "#10b981" : theme.palette.text.secondary,
                  bgcolor:
                    balanceFilter === "active"
                      ? "rgba(16, 185, 129, 0.16)"
                      : "rgba(148, 163, 184, 0.1)",
                  border: `1px solid ${
                    balanceFilter === "active"
                      ? "rgba(16, 185, 129, 0.4)"
                      : theme.palette.divider
                  }`,
                }}
              />
              <Chip
                size="small"
                clickable
                onClick={() => setBalanceFilter("settled")}
                label={`Settled (${settledEntries.length})`}
                sx={{
                  height: 20,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  color: balanceFilter === "settled" ? "#94a3b8" : theme.palette.text.secondary,
                  bgcolor:
                    balanceFilter === "settled"
                      ? "rgba(148, 163, 184, 0.22)"
                      : "rgba(148, 163, 184, 0.08)",
                  border: `1px solid ${
                    balanceFilter === "settled"
                      ? "rgba(148, 163, 184, 0.4)"
                      : theme.palette.divider
                  }`,
                }}
              />
            </Box>
          </Box>
        </Box>

        {/* "+ Add Transaction" Compact Button */}
        {onOpenAdd && (
          <Button
            variant="contained"
            onClick={() => onOpenAdd({ person: "", type: "Lent" })}
            startIcon={<AddIcon sx={{ fontSize: { xs: "16px !important", sm: "18px !important" } }} />}
            sx={{
              borderRadius: "16px",
              px: { xs: 1.3, sm: 2 },
              py: { xs: 0.45, sm: 0.65 },
              fontWeight: 800,
              fontSize: { xs: "0.76rem", sm: "0.85rem" },
              textTransform: "none",
              whiteSpace: "nowrap",
              flexShrink: 0,
              color: "#ffffff",
              background: theme.palette.custom.primaryGradient,
              boxShadow: `0 3px 10px ${theme.palette.primary.main}44`,
              transition: "all 0.18s cubic-bezier(0.16, 1, 0.3, 1)",
              "&:hover": {
                background: theme.palette.custom.primaryHoverGradient,
                transform: "translateY(-1px)",
                boxShadow: `0 5px 14px ${theme.palette.primary.main}66`,
              },
              "&:active": {
                transform: "scale(0.97)",
              },
            }}
          >
            Add Transaction
          </Button>
        )}
      </Box>

      <Box
        sx={{
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: { xs: 460, sm: 520 },
          flexGrow: 1,
          pr: 0.5,
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-y",
          overscrollBehaviorY: "auto",
          "&::-webkit-scrollbar": { width: "5px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: theme.palette.custom.scrollbarThumb,
            borderRadius: "4px",
          },
        }}
      >
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  pl: { xs: 1, sm: 2 },
                  backgroundColor:
                    theme.palette.custom.tableHeaderBg ||
                    theme.palette.background.paper,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: theme.palette.text.secondary,
                }}
              >
                Person
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  pr: { xs: 1, sm: 2 },
                  backgroundColor:
                    theme.palette.custom.tableHeaderBg ||
                    theme.palette.background.paper,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: theme.palette.text.secondary,
                }}
              >
                Status
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {displayedEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {balanceFilter === "active"
                      ? "No active balances."
                      : "No settled or closed accounts."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedEntries.map(([person, balance]) => {
                const initial = person ? person.charAt(0).toUpperCase() : "?";
                const isPositive = balance > 0;
                const isNegative = balance < 0;
                const isSettledRow = balanceFilter === "settled" || Math.abs(balance) < 0.01;

                return (
                  <TableRow
                    key={person}
                    hover
                    onClick={() => setSelectedPerson(person)}
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      transition: "background-color 0.15s",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor:
                          theme.palette.mode === "dark"
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    <TableCell sx={{ py: 0.9, pl: { xs: 0, sm: 2 } }}>
                      <Tooltip title="Click to view complete history">
                        <Box display="flex" alignItems="center" gap={1.2}>
                          <Avatar
                            sx={{
                              width: { xs: 28, sm: 32 },
                              height: { xs: 28, sm: 32 },
                              fontSize: { xs: "0.75rem", sm: "0.85rem" },
                              fontWeight: "700",
                              bgcolor: isPositive
                                ? theme.palette.custom.successBoxBorder
                                : isNegative
                                ? theme.palette.custom.errorBoxBorder
                                : "rgba(148, 163, 184, 0.2)",
                              color: isPositive
                                ? theme.palette.primary.main
                                : isNegative
                                ? theme.palette.error.main
                                : theme.palette.text.secondary,
                            }}
                          >
                            {initial}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body2"
                              fontWeight="600"
                              sx={{
                                color: theme.palette.text.primary,
                                fontSize: { xs: "0.85rem", sm: "0.875rem" },
                              }}
                            >
                              {person}
                            </Typography>
                          </Box>
                        </Box>
                      </Tooltip>
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{ py: 0.9, pr: { xs: 0, sm: 2 } }}
                    >
                      {isSettledRow ? (
                        <Chip
                          label="Settled Account ✓"
                          size="small"
                          sx={{
                            fontWeight: 700,
                            borderRadius: "6px",
                            px: 0.75,
                            py: 1.5,
                            fontSize: { xs: "0.7rem", sm: "0.75rem" },
                            backgroundColor: "rgba(148, 163, 184, 0.14)",
                            color: "#94a3b8",
                            border: "1px solid rgba(148, 163, 184, 0.25)",
                          }}
                        />
                      ) : (
                        <Tooltip title="Click to Settle Account">
                          <Chip
                            clickable
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSettlePerson(person, balance);
                            }}
                            onDelete={(e) => {
                              e.stopPropagation();
                              handleSettlePerson(person, balance);
                            }}
                            deleteIcon={
                              <CheckCircleOutlineIcon
                                sx={{
                                  fontSize: "0.95rem !important",
                                  color: "inherit !important",
                                  marginLeft: "4px !important",
                                  marginRight: "-2px !important",
                                  opacity: 0.95,
                                }}
                              />
                            }
                            label={
                              isPositive
                                ? `You Lent ₹${balance.toLocaleString("en-IN")}`
                                : `You Owe ₹${Math.abs(balance).toLocaleString("en-IN")}`
                            }
                            size="small"
                            sx={{
                              fontWeight: 700,
                              borderRadius: "6px",
                              px: 0.75,
                              py: 1.5,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              "&:hover": {
                                transform: "scale(1.04)",
                                backgroundColor: isPositive
                                  ? "rgba(16, 185, 129, 0.28)"
                                  : "rgba(244, 63, 94, 0.28)",
                              },
                              "&:active": {
                                transform: "scale(0.95)",
                              },
                              fontSize: { xs: "0.7rem", sm: "0.75rem" },
                              backgroundColor: isPositive
                                ? "rgba(16, 185, 129, 0.15)"
                                : "rgba(244, 63, 94, 0.15)",
                              color: isPositive
                                ? theme.palette.primary.main
                                : theme.palette.error.main,
                              border: `1px solid ${
                                isPositive
                                  ? theme.palette.custom.successBoxBorder
                                  : theme.palette.custom.errorBoxBorder
                              }`,
                            }}
                          />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>
    </Paper>

    {/* Complete Person Transaction History Modal */}
    <Dialog
      open={Boolean(selectedPerson)}
      onClose={() => setSelectedPerson(null)}
      TransitionComponent={Transition}
      maxWidth="sm"
      fullWidth
      sx={{ zIndex: 1300 }}
      disableEnforceFocus
      disableRestoreFocus
      disableAutoFocus
      PaperProps={{
        sx: {
          borderRadius: { xs: 3, sm: 3.5 },
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(175deg, #18191d 0%, #101114 100%)"
              : "#ffffff",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7)",
          overflow: "hidden",
          m: { xs: 1.5, sm: 2 },
          maxHeight: { xs: "90vh", sm: "85vh" },
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
          px: { xs: 2.2, sm: 3 },
          py: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Avatar
            sx={{
              width: 44,
              height: 44,
              fontWeight: 800,
              fontSize: "1.15rem",
              background: theme.palette.custom.primaryGradient,
              color: "#ffffff",
              boxShadow: `0 4px 14px ${theme.palette.primary.main}44`,
            }}
          >
            {selectedPerson ? selectedPerson.charAt(0).toUpperCase() : "?"}
          </Avatar>
          <Box>
            <Typography
              variant="h6"
              fontWeight="800"
              sx={{
                color: theme.palette.text.primary,
                fontSize: { xs: "1.1rem", sm: "1.25rem" },
                lineHeight: 1.2,
              }}
            >
              {capitalizeName(selectedPerson || "")}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary, fontWeight: 600 }}
            >
              {personStats.count} {personStats.count === 1 ? "entry" : "entries"} recorded
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={() => setSelectedPerson(null)}
          size="small"
          sx={{
            color: theme.palette.text.secondary,
            borderRadius: "50%",
            p: 0.8,
            "&:hover": {
              backgroundColor: theme.palette.divider,
              color: theme.palette.text.primary,
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent
        sx={{
          px: { xs: 1.5, sm: 2.5 },
          py: { xs: 1.2, sm: 2 },
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: { xs: 1.2, sm: 1.8 },
          "&::-webkit-scrollbar": { width: "5px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: theme.palette.custom.scrollbarThumb,
            borderRadius: "4px",
          },
        }}
      >
        {/* Quick Action Payment Buttons: Lent | Borrow | Partial */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: theme.palette.text.secondary,
              fontSize: "0.68rem",
              display: "block",
              mb: 0.5,
            }}
          >
            Record Payment for {capitalizeName(selectedPerson || "")}
          </Typography>

          <Box display="flex" gap={0.8}>
            <Button
              size="small"
              fullWidth
              onClick={() => handleQuickAddForPerson("Lent")}
              sx={{
                py: { xs: 0.65, sm: 0.8 },
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: { xs: "0.76rem", sm: "0.82rem" },
                textTransform: "none",
                bgcolor: "rgba(16, 185, 129, 0.14)",
                color: "#10b981",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                transition: "all 0.15s ease",
                "&:hover": {
                  bgcolor: "rgba(16, 185, 129, 0.24)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              + Lent
            </Button>

            <Button
              size="small"
              fullWidth
              onClick={() => handleQuickAddForPerson("Borrowed")}
              sx={{
                py: { xs: 0.65, sm: 0.8 },
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: { xs: "0.76rem", sm: "0.82rem" },
                textTransform: "none",
                bgcolor: "rgba(239, 68, 68, 0.14)",
                color: "#ef4444",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                transition: "all 0.15s ease",
                "&:hover": {
                  bgcolor: "rgba(239, 68, 68, 0.24)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              + Borrow
            </Button>

            <Button
              size="small"
              fullWidth
              onClick={() => handleQuickAddForPerson("Partial Payment")}
              sx={{
                py: { xs: 0.65, sm: 0.8 },
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: { xs: "0.76rem", sm: "0.82rem" },
                textTransform: "none",
                bgcolor: "rgba(10, 132, 255, 0.14)",
                color: "#0a84ff",
                border: "1px solid rgba(10, 132, 255, 0.3)",
                transition: "all 0.15s ease",
                "&:hover": {
                  bgcolor: "rgba(10, 132, 255, 0.24)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              + Partial
            </Button>
          </Box>
        </Box>

        {/* Person Summary Stats Card */}
        <Box
          sx={{
            p: { xs: 1.25, sm: 1.8 },
            borderRadius: { xs: 2, sm: 2.5 },
            background:
              personStats.net > 0
                ? "linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))"
                : personStats.net < 0
                ? "linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.02))"
                : "linear-gradient(135deg, rgba(148, 163, 184, 0.1), rgba(148, 163, 184, 0.02))",
            border: `1px solid ${
              personStats.net > 0
                ? "rgba(16, 185, 129, 0.22)"
                : personStats.net < 0
                ? "rgba(239, 68, 68, 0.22)"
                : "rgba(148, 163, 184, 0.18)"
            }`,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontSize: "0.65rem",
                }}
              >
                Current Net Position
              </Typography>
              {personStats.net !== 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => handleSettlePerson(selectedPerson, personStats.net)}
                  sx={{
                    py: 0.1,
                    px: 0.8,
                    height: 20,
                    borderRadius: "5px",
                    fontWeight: 700,
                    fontSize: "0.62rem",
                    textTransform: "none",
                    color: "#94a3b8",
                    borderColor: "rgba(148, 163, 184, 0.3)",
                    bgcolor: "rgba(148, 163, 184, 0.08)",
                    "&:hover": {
                      bgcolor: "rgba(148, 163, 184, 0.2)",
                      borderColor: "rgba(148, 163, 184, 0.5)",
                      color: "#ffffff",
                    },
                  }}
                >
                  Full Payment to Close
                </Button>
              )}
            </Box>
            <Typography
              variant="h6"
              fontWeight="900"
              sx={{
                color:
                  personStats.net > 0
                    ? "#10B981"
                    : personStats.net < 0
                    ? "#EF4444"
                    : theme.palette.text.secondary,
                mt: 0.1,
                fontSize: { xs: "1.15rem", sm: "1.35rem" },
                lineHeight: 1.15,
              }}
            >
              {personStats.net > 0
                ? `You Lent ₹${personStats.net.toLocaleString("en-IN")}`
                : personStats.net < 0
                ? `You Owe ₹${Math.abs(personStats.net).toLocaleString("en-IN")}`
                : "All Settled Up (₹0)"}
            </Typography>
          </Box>

          <Box display="flex" gap={1.5}>
            <Box textAlign="right">
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary, display: "block", fontSize: "0.68rem" }}
              >
                Total Lent
              </Typography>
              <Typography
                variant="body2"
                fontWeight="800"
                sx={{ color: "#10B981", fontSize: { xs: "0.82rem", sm: "0.875rem" } }}
              >
                ₹{personStats.lent.toLocaleString("en-IN")}
              </Typography>
            </Box>
            <Box textAlign="right">
              <Typography
                variant="caption"
                sx={{ color: theme.palette.text.secondary, display: "block", fontSize: "0.68rem" }}
              >
                Total Borrowed
              </Typography>
              <Typography
                variant="body2"
                fontWeight="800"
                sx={{ color: "#ef4444", fontSize: { xs: "0.82rem", sm: "0.875rem" } }}
              >
                ₹{personStats.borrowed.toLocaleString("en-IN")}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Transaction History Section Header & Filter Pills */}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
        >
          <Typography
            variant="subtitle2"
            fontWeight="700"
            sx={{
              color: theme.palette.text.primary,
              letterSpacing: "-0.01em",
              fontSize: "0.85rem",
            }}
          >
            Transaction History
          </Typography>

          {/* Filter Pills */}
          <Box display="flex" gap={0.6} flexWrap="wrap">
            <Chip
              label={`All (${filterCounts.all})`}
              size="small"
              onClick={() => setHistoryFilter("all")}
              sx={{
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 24,
                bgcolor:
                  historyFilter === "all"
                    ? theme.palette.mode === "dark"
                      ? "#ffffff"
                      : "#1e293b"
                    : "rgba(148, 163, 184, 0.1)",
                color:
                  historyFilter === "all"
                    ? theme.palette.mode === "dark"
                      ? "#000000"
                      : "#ffffff"
                    : theme.palette.text.secondary,
                border: `1px solid ${historyFilter === "all" ? "transparent" : theme.palette.divider}`,
              }}
            />

            <Chip
              label={`Lent (${filterCounts.lent})`}
              size="small"
              onClick={() => setHistoryFilter("lent")}
              sx={{
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 24,
                bgcolor:
                  historyFilter === "lent"
                    ? "rgba(16, 185, 129, 0.25)"
                    : "rgba(148, 163, 184, 0.1)",
                color:
                  historyFilter === "lent"
                    ? "#10b981"
                    : theme.palette.text.secondary,
                border: `1px solid ${
                  historyFilter === "lent"
                    ? "rgba(16, 185, 129, 0.4)"
                    : theme.palette.divider
                }`,
              }}
            />

            <Chip
              label={`Borrowed (${filterCounts.borrowed})`}
              size="small"
              onClick={() => setHistoryFilter("borrowed")}
              sx={{
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 24,
                bgcolor:
                  historyFilter === "borrowed"
                    ? "rgba(239, 68, 68, 0.25)"
                    : "rgba(148, 163, 184, 0.1)",
                color:
                  historyFilter === "borrowed"
                    ? "#ef4444"
                    : theme.palette.text.secondary,
                border: `1px solid ${
                  historyFilter === "borrowed"
                    ? "rgba(239, 68, 68, 0.4)"
                    : theme.palette.divider
                }`,
              }}
            />

            <Chip
              label={`Partial (${filterCounts.partial})`}
              size="small"
              onClick={() => setHistoryFilter("partial")}
              sx={{
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.7rem",
                height: 24,
                bgcolor:
                  historyFilter === "partial"
                    ? "rgba(10, 132, 255, 0.25)"
                    : "rgba(148, 163, 184, 0.1)",
                color:
                  historyFilter === "partial"
                    ? "#0a84ff"
                    : theme.palette.text.secondary,
                border: `1px solid ${
                  historyFilter === "partial"
                    ? "rgba(10, 132, 255, 0.4)"
                    : theme.palette.divider
                }`,
              }}
            />

            {filterCounts.settled > 0 && (
              <Chip
                label={`Settled (${filterCounts.settled})`}
                size="small"
                onClick={() => setHistoryFilter("settled")}
                sx={{
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: "0.7rem",
                  height: 24,
                  bgcolor:
                    historyFilter === "settled"
                      ? "rgba(148, 163, 184, 0.25)"
                      : "rgba(148, 163, 184, 0.1)",
                  color:
                    historyFilter === "settled"
                      ? "#94a3b8"
                      : theme.palette.text.secondary,
                  border: `1px solid ${
                    historyFilter === "settled"
                      ? "rgba(148, 163, 184, 0.4)"
                      : theme.palette.divider
                  }`,
                }}
              />
            )}
          </Box>
        </Box>

        {/* History List */}
        {filteredHistory.length === 0 ? (
          <Box py={4} textAlign="center">
            <Typography
              variant="body2"
              sx={{ color: theme.palette.text.secondary }}
            >
              No {historyFilter !== "all" ? historyFilter : ""} transactions found.
            </Typography>
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={0.7}>
            {filteredHistory.map((row, idx) => {
              const idVal = getRowVal(row, 0, "id", "");
              const amt = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
              const type = String(getRowVal(row, 3, "type", "Lent"));
              const dateVal = getRowVal(row, 4, "date", "");
              const notesVal = getRowVal(row, 5, "notes", "");
              const methodVal =
                getRowVal(row, 6, "method", getRowVal(row, 6, "paymentMethod", "Cash")) ||
                "Cash";

              const typeLower = type.toLowerCase();
              const isLent = typeLower === "lent";
              const isBorrowed = typeLower === "borrowed";
              const isPartial = typeLower === "partial payment";
              const isSettled = typeLower.includes("settled");
              const isClosed = isSettled || Boolean(idVal && closedRowIds.has(String(idVal)));

              const badgeColor = isLent
                ? "#10b981"
                : isBorrowed
                ? "#ef4444"
                : isPartial
                ? "#0a84ff"
                : "#94a3b8";

              return (
                <Box
                  key={getRowVal(row, 0, "id", idx)}
                  onClick={() => setSelectedTxForAudit(row)}
                  sx={{
                    py: { xs: 0.85, sm: 1.1 },
                    px: { xs: 1.3, sm: 1.6 },
                    borderRadius: "8px",
                    cursor: "pointer",
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.025)"
                        : "rgba(0, 0, 0, 0.02)",
                    border: `1px solid ${
                      theme.palette.mode === "dark"
                        ? "rgba(255, 255, 255, 0.06)"
                        : "rgba(0, 0, 0, 0.05)"
                    }`,
                    borderLeft: `3px solid ${isClosed ? "rgba(148, 163, 184, 0.4)" : badgeColor}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.2,
                    transition: "all 0.15s ease",
                    "&:hover": {
                      backgroundColor:
                        theme.palette.mode === "dark"
                          ? "rgba(255, 255, 255, 0.045)"
                          : "rgba(0, 0, 0, 0.035)",
                      borderColor: badgeColor,
                    },
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box display="flex" alignItems="center" gap={0.7} flexWrap="wrap">
                      <Typography
                        variant="body2"
                        fontWeight="700"
                        sx={{
                          color: theme.palette.text.primary,
                          fontSize: { xs: "0.82rem", sm: "0.88rem" },
                          lineHeight: 1.2,
                        }}
                      >
                        {type}
                      </Typography>
                      <Chip
                        label={methodVal}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.64rem",
                          height: 18,
                          px: 0.4,
                          color: theme.palette.text.secondary,
                          bgcolor: "rgba(148, 163, 184, 0.12)",
                          borderRadius: "4px",
                        }}
                      />
                    </Box>

                    {(() => {
                      const cleanNote = cleanNotesDisplay(notesVal);
                      return (
                        <Tooltip
                          title={cleanNote ? `${formatDateDisplay(dateVal)} • ${cleanNote}` : formatDateDisplay(dateVal)}
                          arrow
                          enterTouchDelay={100}
                          placement="top-start"
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              color: theme.palette.text.secondary,
                              fontSize: "0.7rem",
                              display: "block",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              lineHeight: 1.3,
                              mt: 0.2,
                              cursor: cleanNote ? "pointer" : "default",
                            }}
                          >
                            {formatDateDisplay(dateVal)}
                            {cleanNote && ` • ${cleanNote}`}
                          </Typography>
                        </Tooltip>
                      );
                    })()}
                  </Box>

                  <Box
                    display="flex"
                    flexDirection="column"
                    alignItems="flex-end"
                    justifyContent="center"
                    gap={0.4}
                    sx={{ flexShrink: 0 }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight="800"
                      sx={{
                        color: isClosed ? "#94a3b8" : badgeColor,
                        fontSize: { xs: "0.9rem", sm: "0.98rem" },
                        lineHeight: 1.1,
                      }}
                    >
                      {isSettled
                        ? `₹${amt.toLocaleString("en-IN")}`
                        : `${isLent ? "+" : isBorrowed ? "-" : ""}₹${amt.toLocaleString("en-IN")}`}
                    </Typography>

                    <Box display="flex" alignItems="center" gap={0.4}>
                      {isClosed ? (
                        <Chip
                          label="Closed"
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            bgcolor: "rgba(148, 163, 184, 0.12)",
                            color: "#94a3b8",
                            border: "1px solid rgba(148, 163, 184, 0.22)",
                            borderRadius: "4px",
                          }}
                        />
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloseSingleTransaction(row);
                          }}
                          sx={{
                            height: 20,
                            minWidth: 46,
                            px: 0.8,
                            fontSize: "0.64rem",
                            fontWeight: 700,
                            textTransform: "none",
                            borderRadius: "5px",
                            color: badgeColor,
                            borderColor: isLent
                              ? "rgba(16, 185, 129, 0.35)"
                              : isBorrowed
                              ? "rgba(239, 68, 68, 0.35)"
                              : "rgba(10, 132, 255, 0.35)",
                            bgcolor: isLent
                              ? "rgba(16, 185, 129, 0.08)"
                              : isBorrowed
                              ? "rgba(239, 68, 68, 0.08)"
                              : "rgba(10, 132, 255, 0.08)",
                            transition: "all 0.15s ease",
                            "&:hover": {
                              bgcolor: isLent
                                ? "rgba(16, 185, 129, 0.22)"
                                : isBorrowed
                                ? "rgba(239, 68, 68, 0.22)"
                                : "rgba(10, 132, 255, 0.22)",
                              borderColor: badgeColor,
                            },
                          }}
                        >
                          Close
                        </Button>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>

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
        setSelectedTxForAudit(null);
        setSelectedPerson(null);
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
    </>
  );
}

export default PersonBalance;
