/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
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
} from "@mui/material";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import soundEffects from "../Services/soundEffects";
import {
  getRowVal,
  getDataRows,
  addTransaction,
  capitalizeName,
  formatDateDisplay,
} from "../Services/SheetService";

function PersonBalance({
  transactions = [],
  setTransactions,
  triggerRefresh,
  showNotification,
}) {
  const theme = useTheme();
  const [balances, setBalances] = useState({});

  useEffect(() => {
    const rows = getDataRows(transactions);
    const balanceMap = {};
    const hasSettledMap = {};

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
      const amount = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
      const type = String(getRowVal(row, 3, "type", "")).toLowerCase();

      if (!balanceMap[person]) {
        balanceMap[person] = 0;
      }

      if (type === "settled" || type.includes("settled")) {
        balanceMap[person] = 0;
        hasSettledMap[person] = true;
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

    Object.keys(balanceMap).forEach((person) => {
      if (Math.abs(balanceMap[person]) < 0.01 || hasSettledMap[person]) {
        delete balanceMap[person];
      }
    });

    setBalances(balanceMap);
  }, [transactions]);

  const handleSettlePerson = (person, balance) => {
    const confirmMsg = `Record a full payment to close the account for "${person}"? This will add a Partial Payment transaction for the exact remaining balance, closing their account and removing them from the active balances list.`;

    const executeSettle = async () => {
      try {
        soundEffects.playSettle();
        const settleAmt = Math.abs(
          balance !== undefined ? balance : balances[person] || 0,
        );
        const settleTx = {
          id: Date.now(),
          person: capitalizeName(person),
          amount: settleAmt,
          type: "Partial Payment",
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

  const entries = Object.entries(balances);

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
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        mb={{ xs: 2, sm: 3 }}
      >
        <Box display="flex" alignItems="center" gap={1.5}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: 34, sm: 40 },
              height: { xs: 34, sm: 40 },
              borderRadius: { xs: "6px", sm: "8px" },
              background: theme.palette.custom.secondaryBoxBg,
              color: theme.palette.info.main,
            }}
          >
            <PeopleAltIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
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
              Person Balances
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
              }}
            >
              {entries.length} {entries.length === 1 ? "contact" : "contacts"}{" "}
              active
            </Typography>
          </Box>
        </Box>
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
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                  <Typography
                    variant="body2"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    No active balances.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              entries.map(([person, balance]) => {
                const initial = person ? person.charAt(0).toUpperCase() : "?";
                const isPositive = balance > 0;
                const isNegative = balance < 0;

                return (
                  <TableRow
                    key={person}
                    sx={{
                      "&:last-child td, &:last-child th": { border: 0 },
                      transition: "background-color 0.15s",
                      "&:hover": { backgroundColor: theme.palette.divider },
                    }}
                  >
                    <TableCell sx={{ py: 0.9, pl: { xs: 0, sm: 2 } }}>
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
                    </TableCell>

                    <TableCell
                      align="right"
                      sx={{ py: 0.9, pr: { xs: 0, sm: 2 } }}
                    >
                      <Tooltip title="Click to Settle Account">
                        <Chip
                          clickable
                          onClick={() => handleSettlePerson(person, balance)}
                          onDelete={() => handleSettlePerson(person, balance)}
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
                              : isNegative
                              ? `You Owe ₹${Math.abs(balance).toLocaleString(
                                  "en-IN",
                                )}`
                              : "Settled"
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
                                : isNegative
                                ? "rgba(244, 63, 94, 0.28)"
                                : "rgba(148, 163, 184, 0.28)",
                            },
                            "&:active": {
                              transform: "scale(0.95)",
                            },
                            fontSize: { xs: "0.7rem", sm: "0.75rem" },
                            backgroundColor: isPositive
                              ? "rgba(16, 185, 129, 0.15)"
                              : isNegative
                              ? "rgba(244, 63, 94, 0.15)"
                              : "rgba(148, 163, 184, 0.15)",
                            color: isPositive
                              ? theme.palette.primary.main
                              : isNegative
                              ? theme.palette.error.main
                              : theme.palette.text.secondary,
                            border: `1px solid ${
                              isPositive
                                ? "rgba(16, 185, 129, 0.3)"
                                : isNegative
                                ? "rgba(244, 63, 94, 0.3)"
                                : "rgba(148, 163, 184, 0.3)"
                            }`,
                          }}
                        />
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}

export default PersonBalance;
