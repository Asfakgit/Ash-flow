/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
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
import { getRowVal, getDataRows, addTransaction, capitalizeName, formatDateDisplay } from "../Services/SheetService";

function PersonBalance({ transactions = [], triggerRefresh, showNotification }) {
  const [balances, setBalances] = useState({});

  useEffect(() => {
    const rows = getDataRows(transactions);
    const balanceMap = {};
    const latestTypeMap = {};

    rows.forEach((row) => {
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
      } else if (type === "lent") {
        balanceMap[person] += amount;
      } else if (type === "borrowed") {
        balanceMap[person] -= amount;
      }

      // Track latest transaction type for this person
      latestTypeMap[person] = type;
    });

    // Remove people whose latest transaction is "settled" (Closed accounts)
    Object.keys(latestTypeMap).forEach((person) => {
      if (latestTypeMap[person] === "settled" || latestTypeMap[person].includes("settled")) {
        delete balanceMap[person];
      }
    });

    setBalances(balanceMap);
  }, [transactions]);

  const handleSettlePerson = (person, balance) => {
    const confirmMsg = `Settle account for "${person}"? This will close their account and remove them from the active balances list, while preserving all their transaction records in history.`;

    const executeSettle = async () => {
      try {
        const settleAmt = Math.abs(balance !== undefined ? balance : (balances[person] || 0));
        const settleTx = {
          id: Date.now(),
          person: capitalizeName(person),
          amount: settleAmt,
          type: "Settled",
          notes: settleAmt > 0 ? `Payment settled (₹${settleAmt.toLocaleString("en-IN")})` : "Payment settled",
          date: formatDateDisplay(new Date().toISOString().split("T")[0]),
          method: "Cash",
        };

        await addTransaction(settleTx);
        if (triggerRefresh) triggerRefresh();
        if (showNotification) {
          showNotification({
            type: "success",
            title: "Account Settled & Closed!",
            message: `Account for "${person}" closed from active balances while keeping all records in history ✅`,
          });
        }
      } catch (err) {
        console.error("Settle failed:", err);
        if (showNotification) {
          showNotification({
            type: "error",
            title: "Error",
            message: "Failed to record settlement.",
          });
        }
      }
    };

    if (showNotification) {
      showNotification({
        type: "confirm",
        title: "Settle & Close Account?",
        message: confirmMsg,
        confirmText: "Settle Account",
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
            background: "rgba(59, 130, 246, 0.15)",
            color: "#3B82F6",
          }}
        >
          <PeopleAltIcon sx={{ fontSize: { xs: 22, sm: 24 } }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight="bold" sx={{ color: "#F8FAFC", fontSize: { xs: "1.05rem", sm: "1.25rem" } }}>
            Person Balances
          </Typography>
          <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: { xs: "0.75rem", sm: "0.875rem" } }}>
            {entries.length} {entries.length === 1 ? "contact" : "contacts"} active
          </Typography>
        </Box>
      </Box>

      <Box sx={{ overflowX: "auto", flexGrow: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ pl: { xs: 0, sm: 2 } }}>Person</TableCell>
              <TableCell align="right" sx={{ pr: { xs: 0, sm: 2 } }}>Status</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {entries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" sx={{ color: "#94A3B8" }}>
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
                      "&:hover": { backgroundColor: "rgba(148, 163, 184, 0.04)" },
                    }}
                  >
                    <TableCell sx={{ py: 1.5, pl: { xs: 0, sm: 2 } }}>
                      <Box display="flex" alignItems="center" gap={1.2}>
                        <Avatar
                          sx={{
                            width: { xs: 28, sm: 32 },
                            height: { xs: 28, sm: 32 },
                            fontSize: { xs: "0.75rem", sm: "0.85rem" },
                            fontWeight: "700",
                            bgcolor: isPositive
                              ? "rgba(16, 185, 129, 0.2)"
                              : isNegative
                              ? "rgba(244, 63, 94, 0.2)"
                              : "rgba(148, 163, 184, 0.2)",
                            color: isPositive
                              ? "#34D399"
                              : isNegative
                              ? "#FB7185"
                              : "#CBD5E1",
                          }}
                        >
                          {initial}
                        </Avatar>
                        <Typography variant="body2" fontWeight="600" sx={{ color: "#F8FAFC", fontSize: { xs: "0.85rem", sm: "0.875rem" } }}>
                          {person}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right" sx={{ py: 1.5, pr: { xs: 0, sm: 2 } }}>
                        <Chip
                          label={
                            isPositive
                              ? `You Lent ₹${balance.toLocaleString("en-IN")}`
                              : isNegative
                              ? `You Owe ₹${Math.abs(balance).toLocaleString("en-IN")}`
                              : "Settled"
                          }
                          size="small"
                          onDelete={() => handleSettlePerson(person, balance)}
                          deleteIcon={
                            <Tooltip title="Payment Settling">
                              <CheckCircleOutlineIcon sx={{ color: "inherit !important", "&:hover": { color: "#ffffff !important" } }} />
                            </Tooltip>
                          }
                          sx={{
                            fontWeight: 700,
                            borderRadius: "8px",
                            px: 0.5,
                            fontSize: { xs: "0.7rem", sm: "0.75rem" },
                            backgroundColor: isPositive
                              ? "rgba(16, 185, 129, 0.15)"
                              : isNegative
                              ? "rgba(244, 63, 94, 0.15)"
                              : "rgba(148, 163, 184, 0.15)",
                            color: isPositive
                              ? "#34D399"
                              : isNegative
                              ? "#FB7185"
                              : "#CBD5E1",
                            border: `1px solid ${
                              isPositive
                                ? "rgba(16, 185, 129, 0.3)"
                                : isNegative
                                ? "rgba(244, 63, 94, 0.3)"
                                : "rgba(148, 163, 184, 0.3)"
                            }`,
                          }}
                        />
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
