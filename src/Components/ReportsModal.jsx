import { useState, useMemo, forwardRef, useEffect } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Zoom,
  Grid,
  Paper,
  Tooltip,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  LinearProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BalanceIcon from "@mui/icons-material/Balance";
import ArrowCircleUpIcon from "@mui/icons-material/ArrowCircleUp";
import ArrowCircleDownIcon from "@mui/icons-material/ArrowCircleDown";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import PersonIcon from "@mui/icons-material/Person";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import PaymentsIcon from "@mui/icons-material/Payments";
import BarChartIcon from "@mui/icons-material/BarChart";
import { getDataRows, getRowVal } from "../Services/SheetService";

const Transition = forwardRef(function Transition(props, ref) {
  return (
    <Zoom
      ref={ref}
      {...props}
      timeout={{ enter: 400, exit: 260 }}
      style={{
        transformOrigin: "center center",
        transitionTimingFunction: props.in
          ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
          : "cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    />
  );
});

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function ReportsModal({ open, onClose, transactions = [] }) {
  const theme = useTheme();
  const [hoveredData, setHoveredData] = useState(null);
  const [timeRange, setTimeRange] = useState("6m"); // '3m', '6m', 'year', 'all'

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (open) {
      const origBodyOverflow = document.body.style.overflow;
      const origHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overflow = origHtmlOverflow;
      };
    }
  }, [open]);

  // Comprehensive Analytics Calculation
  const {
    chartData,
    maxVal,
    summary,
    methodStats,
    topLentPerson,
    topBorrowedPerson,
    personBalances,
    activePeopleCount,
    totalCount,
    avgTxAmount,
    partialPaymentsCount,
    totalPartialPayments,
  } = useMemo(() => {
    const rows = getDataRows(transactions);
    const now = new Date();

    let totalLent = 0;
    let totalBorrowed = 0;
    let partialPaymentsCount = 0;
    let totalPartialPayments = 0;
    let totalTxSum = 0;
    let validTxCount = 0;
    let methods = { Cash: 0, GPay: 0, Bank: 0 };
    const personMap = {};

    // Determine cutoff date based on selected timeRange
    let cutoffDate = null;
    if (timeRange === "3m") {
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (timeRange === "6m") {
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (timeRange === "year") {
      cutoffDate = new Date(now.getFullYear(), 0, 1);
    }

    // Chronologically sort all rows for accurate running balances
    const sortedRows = [...rows].sort((a, b) => {
      const idA = Number(getRowVal(a, 0, "id", 0)) || 0;
      const idB = Number(getRowVal(b, 0, "id", 0)) || 0;
      return idA - idB;
    });

    const trueBalanceMap = {};
    const hasSettledMap = {};

    sortedRows.forEach((row) => {
      const person = String(getRowVal(row, 1, "person", "")).trim();
      if (!person) return;
      const amount = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
      const type = String(getRowVal(row, 3, "type", "")).toLowerCase();

      if (!trueBalanceMap[person]) {
        trueBalanceMap[person] = { lent: 0, borrowed: 0, net: 0 };
      }

      if (type === "settled" || type.includes("settled")) {
        trueBalanceMap[person].net = 0;
        hasSettledMap[person] = true;
      } else if (type === "lent") {
        trueBalanceMap[person].lent += amount;
        trueBalanceMap[person].net += amount;
        hasSettledMap[person] = false;
      } else if (type === "borrowed") {
        trueBalanceMap[person].borrowed += amount;
        trueBalanceMap[person].net -= amount;
        hasSettledMap[person] = false;
      } else if (type === "partial payment") {
        if (trueBalanceMap[person].net > 0) {
          trueBalanceMap[person].net -= amount;
        } else if (trueBalanceMap[person].net < 0) {
          trueBalanceMap[person].net += amount;
        }
        hasSettledMap[person] = false;
      }
    });

    // Determine currently active people (non-zero balance and not settled)
    Object.keys(trueBalanceMap).forEach((person) => {
      if (
        Math.abs(trueBalanceMap[person].net) < 0.01 ||
        hasSettledMap[person]
      ) {
        delete trueBalanceMap[person];
      }
    });

    // Process rows for period-specific stats
    rows.forEach((row) => {
      const amount = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
      const type = String(getRowVal(row, 3, "type", "")).toLowerCase();
      const person = String(getRowVal(row, 1, "person", "")).trim();
      const method = String(
        getRowVal(row, 6, "method", getRowVal(row, 6, "paymentMethod", "Cash")),
      ).toLowerCase();
      const rawDate = getRowVal(row, 4, "date", "");

      // Parse row date
      let parsedDate = null;
      if (rawDate instanceof Date) {
        parsedDate = rawDate;
      } else if (typeof rawDate === "string") {
        const dmyMatch = rawDate.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (dmyMatch) {
          parsedDate = new Date(
            parseInt(dmyMatch[3], 10),
            parseInt(dmyMatch[2], 10) - 1,
            parseInt(dmyMatch[1], 10),
          );
        } else {
          parsedDate = new Date(rawDate);
        }
      }

      // Check date filter
      if (
        cutoffDate &&
        parsedDate &&
        !isNaN(parsedDate.getTime()) &&
        parsedDate < cutoffDate
      ) {
        return;
      }

      validTxCount++;
      totalTxSum += amount;

      if (type === "lent") totalLent += amount;
      if (type === "borrowed") totalBorrowed += amount;
      if (type === "partial payment") {
        partialPaymentsCount++;
        totalPartialPayments += amount;
      }

      if (method === "gpay") methods.GPay += amount;
      else if (method === "bank") methods.Bank += amount;
      else methods.Cash += amount;

      // Track person period totals for top lent/borrowed stats
      if (person) {
        if (!personMap[person]) personMap[person] = { lent: 0, borrowed: 0 };
        if (type === "lent") personMap[person].lent += amount;
        if (type === "borrowed") personMap[person].borrowed += amount;
      }
    });

    // Build dynamic monthly chart data
    const monthCount = timeRange === "3m" ? 3 : timeRange === "year" ? 12 : 6;
    const monthMap = {};

    for (let i = monthCount - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0",
      )}`;
      const label = `${MONTH_NAMES[d.getMonth()]} '${String(
        d.getFullYear(),
      ).slice(2)}`;
      monthMap[key] = { key, label, lent: 0, borrowed: 0 };
    }

    rows.forEach((row) => {
      const rawDate = getRowVal(row, 4, "date", "");
      if (!rawDate) return;

      let parsedDate = null;
      if (rawDate instanceof Date) {
        parsedDate = rawDate;
      } else if (typeof rawDate === "string") {
        const dmyMatch = rawDate.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (dmyMatch) {
          parsedDate = new Date(
            parseInt(dmyMatch[3], 10),
            parseInt(dmyMatch[2], 10) - 1,
            parseInt(dmyMatch[1], 10),
          );
        } else {
          parsedDate = new Date(rawDate);
        }
      }

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        const key = `${parsedDate.getFullYear()}-${String(
          parsedDate.getMonth() + 1,
        ).padStart(2, "0")}`;
        if (monthMap[key]) {
          const amount = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
          const type = String(getRowVal(row, 3, "type", "")).toLowerCase();
          if (type === "lent") monthMap[key].lent += amount;
          if (type === "borrowed") monthMap[key].borrowed += amount;
        }
      }
    });

    const data = Object.values(monthMap).sort((a, b) =>
      a.key.localeCompare(b.key),
    );
    let max = 5000;
    data.forEach((d) => {
      if (d.lent > max) max = d.lent;
      if (d.borrowed > max) max = d.borrowed;
    });

    // Find top person lent to & top person borrowed from
    let topLent = { name: "N/A", amount: 0 };
    let topBorrowed = { name: "N/A", amount: 0 };

    Object.entries(personMap).forEach(([name, p]) => {
      // Only include people whose accounts are currently active (not closed/settled)
      if (trueBalanceMap[name]) {
        if (p.lent > topLent.amount) topLent = { name, amount: p.lent };
        if (p.borrowed > topBorrowed.amount)
          topBorrowed = { name, amount: p.borrowed };
      }
    });

    // Top active person balances (sorted by absolute net) from TRUE balances
    let currentLent = 0;
    let currentBorrowed = 0;

    const activePeopleCount = Object.keys(trueBalanceMap).length;
    const personBalancesList = Object.entries(trueBalanceMap)
      .map(([name, val]) => {
        if (val.net > 0) currentLent += val.net;
        if (val.net < 0) currentBorrowed += Math.abs(val.net);
        return { name, ...val };
      })
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
      .slice(0, 5);

    const avgTx = validTxCount > 0 ? Math.round(totalTxSum / validTxCount) : 0;

    return {
      chartData: data,
      maxVal: max,
      summary: {
        totalLent,
        totalBorrowed,
        totalPartialPayments,
        currentLent,
        currentBorrowed,
      },
      methodStats: methods,
      topLentPerson: topLent,
      topBorrowedPerson: topBorrowed,
      personBalances: personBalancesList,
      activePeopleCount,
      totalCount: validTxCount,
      avgTxAmount: avgTx,
      partialPaymentsCount,
      totalPartialPayments,
    };
  }, [transactions, timeRange]);

  const netBalance = summary.currentLent - summary.currentBorrowed;

  return (
    <Dialog
      open={Boolean(open)}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      fullScreen
      PaperProps={{
        sx: {
          borderRadius: 0,
          background:
            theme.palette.custom.cardGradient ||
            theme.palette.background.default,
          border: "none",
          boxShadow: "none",
          overflow: "hidden",
          m: 0,
          width: "100%",
          height: "100%",
          maxHeight: "100vh",
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
          pt: "max(env(safe-area-inset-top), 16px)",
          pb: 1.5,
          borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
          flexWrap: "wrap",
          gap: 1.5,
        }}
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
              background: theme.palette.custom.primaryGradient,
              color: theme.palette.text.primary,
              boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
            }}
          >
            <AssessmentIcon sx={{ fontSize: { xs: 20, sm: 24 } }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              fontWeight="800"
              sx={{
                color: theme.palette.text.primary,
                fontSize: { xs: "1.1rem", sm: "1.35rem" },
              }}
            >
              Reports & Analytics
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}
            >
              Comprehensive financial breakdown & cash flow metrics
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          sx={{
            color: theme.palette.text.secondary,
            "&:hover": {
              color: theme.palette.text.primary,
              backgroundColor: theme.palette.divider,
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent
        sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1.5, sm: 2 }, overflowY: "auto" }}
      >
        {/* TIME RANGE CONTROLS */}
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1.5}
          mb={2}
        >
          <Typography
            variant="subtitle2"
            fontWeight="700"
            sx={{
              color: theme.palette.text.primary,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <AccountBalanceWalletIcon
              sx={{ color: theme.palette.primary.main, fontSize: 18 }}
            />
            Overview Summary
          </Typography>

          <ToggleButtonGroup
            value={timeRange}
            exclusive
            onChange={(e, val) => val && setTimeRange(val)}
            size="small"
            sx={{
              backgroundColor: "rgba(15, 23, 42, 0.5)",
              borderRadius: "8px",
              p: 0.3,
              border: "1px solid rgba(148, 163, 184, 0.15)",
              "& .MuiToggleButton-root": {
                border: "none",
                borderRadius: "6px",
                px: { xs: 1.2, sm: 1.8 },
                py: 0.3,
                fontSize: "0.75rem",
                fontWeight: 700,
                color: theme.palette.text.secondary,
                "&.Mui-selected": {
                  color: "#ffffff",
                  backgroundColor: theme.palette.primary.main,
                  boxShadow: `0 0 12px ${theme.palette.primary.main}66`,
                },
              },
            }}
          >
            <ToggleButton value="3m">3 Months</ToggleButton>
            <ToggleButton value="6m">6 Months</ToggleButton>
            <ToggleButton value="year">This Year</ToggleButton>
            <ToggleButton value="all">All Time</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* PRIMARY FINANCIAL SUMMARY CARDS */}
        <Grid container spacing={1.5} mb={2}>
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.custom.successBoxBg}, rgba(16, 185, 129, 0.05))`,
                border: "1px solid rgba(16, 185, 129, 0.2)",
                boxShadow: "0 4px 20px rgba(16, 185, 129, 0.05)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* decorative circle */}
              <Box
                sx={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(16, 185, 129, 0.1)",
                }}
              />

              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={1.5}
                position="relative"
              >
                <Typography
                  variant="caption"
                  fontWeight="800"
                  sx={{
                    color: theme.palette.primary.main,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Lent Overview
                </Typography>
                <ArrowCircleUpIcon
                  sx={{
                    color: theme.palette.primary.main,
                    fontSize: 24,
                    opacity: 0.8,
                  }}
                />
              </Box>

              <Box
                display="flex"
                flexDirection="column"
                gap={0.5}
                position="relative"
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  Outstanding (To Receive)
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight="800"
                  sx={{
                    color: theme.palette.primary.main,
                    mb: 1,
                    textShadow: "0 2px 10px rgba(16,185,129,0.2)",
                  }}
                >
                  ₹{summary.currentLent.toLocaleString("en-IN")}
                </Typography>

                <Box
                  display="flex"
                  flexDirection="column"
                  gap={0.5}
                  sx={{
                    mt: 1,
                    pt: 1.5,
                    borderTop: "1px dashed rgba(16, 185, 129, 0.2)",
                  }}
                >
                  <Box display="flex" justifyContent="space-between">
                    <Typography
                      variant="caption"
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Total Volume
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight="700"
                      sx={{ color: theme.palette.text.primary }}
                    >
                      ₹{summary.totalLent.toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography
                      variant="caption"
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Top: {topLentPerson.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight="700"
                      sx={{ color: theme.palette.text.primary }}
                    >
                      ₹{topLentPerson.amount.toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${theme.palette.custom.secondaryBoxBg}, rgba(99, 102, 241, 0.05))`,
                border: "1px solid rgba(99, 102, 241, 0.2)",
                boxShadow: "0 4px 20px rgba(99, 102, 241, 0.05)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background: "rgba(99, 102, 241, 0.1)",
                }}
              />

              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={1.5}
                position="relative"
              >
                <Typography
                  variant="caption"
                  fontWeight="800"
                  sx={{
                    color: theme.palette.secondary.main,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Borrowed Overview
                </Typography>
                <ArrowCircleDownIcon
                  sx={{
                    color: theme.palette.secondary.main,
                    fontSize: 24,
                    opacity: 0.8,
                  }}
                />
              </Box>

              <Box
                display="flex"
                flexDirection="column"
                gap={0.5}
                position="relative"
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  Outstanding (To Pay)
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight="800"
                  sx={{
                    color: theme.palette.secondary.main,
                    mb: 1,
                    textShadow: "0 2px 10px rgba(99,102,241,0.2)",
                  }}
                >
                  ₹{summary.currentBorrowed.toLocaleString("en-IN")}
                </Typography>

                <Box
                  display="flex"
                  flexDirection="column"
                  gap={0.5}
                  sx={{
                    mt: 1,
                    pt: 1.5,
                    borderTop: "1px dashed rgba(99, 102, 241, 0.2)",
                  }}
                >
                  <Box display="flex" justifyContent="space-between">
                    <Typography
                      variant="caption"
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Total Volume
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight="700"
                      sx={{ color: theme.palette.text.primary }}
                    >
                      ₹{summary.totalBorrowed.toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between">
                    <Typography
                      variant="caption"
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Top: {topBorrowedPerson.name}
                    </Typography>
                    <Typography
                      variant="caption"
                      fontWeight="700"
                      sx={{ color: theme.palette.text.primary }}
                    >
                      ₹{topBorrowedPerson.amount.toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 2,
                background:
                  netBalance >= 0
                    ? `linear-gradient(135deg, ${theme.palette.custom.netPositiveBoxBg}, rgba(168, 85, 247, 0.05))`
                    : `linear-gradient(135deg, ${theme.palette.custom.errorBoxBg}, rgba(244, 63, 94, 0.05))`,
                border:
                  netBalance >= 0
                    ? "1px solid rgba(168, 85, 247, 0.2)"
                    : "1px solid rgba(244, 63, 94, 0.2)",
                boxShadow:
                  netBalance >= 0
                    ? "0 4px 20px rgba(168, 85, 247, 0.05)"
                    : "0 4px 20px rgba(244, 63, 94, 0.05)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  top: -20,
                  right: -20,
                  width: 80,
                  height: 80,
                  borderRadius: "50%",
                  background:
                    netBalance >= 0
                      ? "rgba(168, 85, 247, 0.1)"
                      : "rgba(244, 63, 94, 0.1)",
                }}
              />

              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                mb={1.5}
                position="relative"
              >
                <Typography
                  variant="caption"
                  fontWeight="800"
                  sx={{
                    color:
                      netBalance >= 0
                        ? theme.palette.custom.netPositiveColor
                        : theme.palette.error.main,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Net Balance
                </Typography>
                <BalanceIcon
                  sx={{
                    color:
                      netBalance >= 0
                        ? theme.palette.custom.netPositiveColor
                        : theme.palette.error.main,
                    fontSize: 24,
                    opacity: 0.8,
                  }}
                />
              </Box>

              <Box
                display="flex"
                flexDirection="column"
                gap={0.5}
                position="relative"
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}
                >
                  Current Net Position
                </Typography>
                <Typography
                  variant="h4"
                  fontWeight="800"
                  sx={{
                    color:
                      netBalance >= 0
                        ? theme.palette.custom.netPositiveColor
                        : theme.palette.error.main,
                    mb: 1,
                    textShadow:
                      netBalance >= 0
                        ? "0 2px 10px rgba(168,85,247,0.2)"
                        : "0 2px 10px rgba(244,63,94,0.2)",
                  }}
                >
                  ₹{Math.abs(netBalance).toLocaleString("en-IN")}
                </Typography>

                <Box
                  display="flex"
                  flexDirection="column"
                  gap={0.5}
                  sx={{
                    mt: 1,
                    pt: 1.5,
                    borderTop:
                      netBalance >= 0
                        ? "1px dashed rgba(168, 85, 247, 0.2)"
                        : "1px dashed rgba(244, 63, 94, 0.2)",
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: theme.palette.text.secondary }}
                  >
                    {netBalance > 0
                      ? "You are currently in surplus."
                      : netBalance < 0
                      ? "You currently owe more than lent."
                      : "All settled up."}
                  </Typography>
                  <Typography
                    variant="caption"
                    fontWeight="700"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    Status: {netBalance >= 0 ? "Net Positive" : "Net Negative"}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* QUICK STATS STRIP */}
        <Grid container spacing={1.5} mb={2}>
          <Grid item xs={6} sm={3}>
            <Paper
              elevation={0}
              sx={{
                p: 1.25,
                borderRadius: 1,
                backgroundColor: "rgba(15, 23, 42, 0.4)",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Recorded Entries
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight="800"
                color="text.primary"
              >
                {totalCount} Transactions
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper
              elevation={0}
              sx={{
                p: 1.25,
                borderRadius: 1,
                backgroundColor: "rgba(15, 23, 42, 0.4)",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Average Tx Size
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight="800"
                color="text.primary"
              >
                ₹{avgTxAmount.toLocaleString("en-IN")}
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper
              elevation={0}
              sx={{
                p: 1.25,
                borderRadius: 1,
                backgroundColor: "rgba(15, 23, 42, 0.4)",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Partial Payments
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight="800"
                color="info.main"
              >
                {partialPaymentsCount} (₹
                {totalPartialPayments.toLocaleString("en-IN")})
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper
              elevation={0}
              sx={{
                p: 1.25,
                borderRadius: 1,
                backgroundColor: "rgba(15, 23, 42, 0.4)",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Active People
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight="800"
                color="secondary.main"
              >
                {activePeopleCount} People
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* MONTHLY BAR CHART VISUALIZATION */}
        <Box
          sx={{
            p: 1.5,
            borderRadius: 1,
            backgroundColor: theme.palette.custom.chartBg,
            border: "1px solid rgba(148, 163, 184, 0.1)",
            mb: 2,
          }}
        >
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            mb={1}
            flexWrap="wrap"
            gap={1}
          >
            <Typography
              variant="subtitle2"
              fontWeight="700"
              sx={{
                color: theme.palette.text.primary,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <BarChartIcon
                sx={{ color: theme.palette.primary.main, fontSize: 18 }}
              />
              Monthly Cash Flow Trend ({chartData.length} Months)
            </Typography>
            {hoveredData && (
              <Chip
                size="small"
                label={`${
                  hoveredData.label
                }: Lent ₹${hoveredData.lent.toLocaleString(
                  "en-IN",
                )} | Borrowed ₹${hoveredData.borrowed.toLocaleString("en-IN")}`}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  backgroundColor: "rgba(99, 102, 241, 0.15)",
                  color: theme.palette.secondary.main,
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                }}
              />
            )}
          </Box>

          {/* Chart Area */}
          <Box
            sx={{
              height: { xs: 130, sm: 145 },
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: { xs: 1, sm: 2 },
              pt: 2.5,
              pb: 0.5,
              px: { xs: 1, sm: 2 },
              position: "relative",
              borderBottom: "2px solid rgba(148, 163, 184, 0.2)",
            }}
          >
            {/* Grid Lines */}
            <Box
              sx={{
                position: "absolute",
                top: "20%",
                left: 0,
                right: 0,
                borderBottom: "1px dashed rgba(148, 163, 184, 0.08)",
                pointerEvents: "none",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: "60%",
                left: 0,
                right: 0,
                borderBottom: "1px dashed rgba(148, 163, 184, 0.08)",
                pointerEvents: "none",
              }}
            />

            {chartData.map((d, i) => {
              const lentHeight = Math.max(
                Math.round((d.lent / maxVal) * 100),
                d.lent > 0 ? 8 : 3,
              );
              const borrowedHeight = Math.max(
                Math.round((d.borrowed / maxVal) * 100),
                d.borrowed > 0 ? 8 : 3,
              );
              const isSelected = hoveredData && hoveredData.label === d.label;

              return (
                <Tooltip
                  key={i}
                  title={
                    <Box sx={{ p: 0.5 }}>
                      <Typography
                        variant="caption"
                        fontWeight="bold"
                        sx={{
                          color: theme.palette.text.primary,
                          display: "block",
                          mb: 0.5,
                        }}
                      >
                        {d.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: theme.palette.primary.main,
                          display: "block",
                        }}
                      >
                        Lent: ₹{d.lent.toLocaleString("en-IN")}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: theme.palette.secondary.main,
                          display: "block",
                        }}
                      >
                        Borrowed: ₹{d.borrowed.toLocaleString("en-IN")}
                      </Typography>
                    </Box>
                  }
                  placement="top"
                  arrow
                >
                  <Box
                    onMouseEnter={() => setHoveredData(d)}
                    onMouseLeave={() => setHoveredData(null)}
                    onClick={() => setHoveredData(d)}
                    sx={{
                      flexGrow: 1,
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                      alignItems: "center",
                      cursor: "pointer",
                      px: { xs: 0.3, sm: 0.8 },
                      borderRadius: "6px",
                      transition: "background-color 0.2s",
                      backgroundColor: isSelected
                        ? theme.palette.custom.chartGrid
                        : "transparent",
                    }}
                  >
                    {/* Bar Group */}
                    <Box
                      display="flex"
                      alignItems="flex-end"
                      gap={{ xs: 0.3, sm: 0.8 }}
                      sx={{
                        height: "100%",
                        width: "100%",
                        justifyContent: "center",
                      }}
                    >
                      {/* Lent Bar */}
                      <Box
                        sx={{
                          width: { xs: 10, sm: 22 },
                          height: `${lentHeight}%`,
                          background: theme.palette.custom.primaryGradient,
                          borderRadius: "4px 4px 0 0",
                          boxShadow:
                            d.lent > 0
                              ? "0 0 10px rgba(16, 185, 129, 0.4)"
                              : "none",
                          transition:
                            "height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                      />
                      {/* Borrowed Bar */}
                      <Box
                        sx={{
                          width: { xs: 10, sm: 22 },
                          height: `${borrowedHeight}%`,
                          background: theme.palette.custom.secondaryGradient,
                          borderRadius: "4px 4px 0 0",
                          boxShadow:
                            d.borrowed > 0
                              ? "0 0 10px rgba(99, 102, 241, 0.4)"
                              : "none",
                          transition:
                            "height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                      />
                    </Box>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          {/* X-Axis Labels */}
          <Box
            display="flex"
            justifyContent="space-between"
            mt={1}
            px={{ xs: 0.5, sm: 1 }}
          >
            {chartData.map((d, i) => (
              <Typography
                key={i}
                variant="caption"
                sx={{
                  color:
                    hoveredData && hoveredData.label === d.label
                      ? theme.palette.text.primary
                      : theme.palette.text.secondary,
                  fontWeight:
                    hoveredData && hoveredData.label === d.label ? 700 : 500,
                  fontSize: { xs: "0.65rem", sm: "0.75rem" },
                  textAlign: "center",
                  flexGrow: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {d.label}
              </Typography>
            ))}
          </Box>

          {/* Legend */}
          <Box
            display="flex"
            justifyContent="center"
            gap={3}
            mt={1.5}
            pt={1}
            sx={{ borderTop: "1px dashed rgba(148, 163, 184, 0.1)" }}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "2px",
                  backgroundColor: theme.palette.primary.main,
                }}
              />
              <Typography
                variant="caption"
                fontWeight="600"
                sx={{ color: theme.palette.text.secondary }}
              >
                Lent Amount
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "2px",
                  backgroundColor: theme.palette.secondary.main,
                }}
              />
              <Typography
                variant="caption"
                fontWeight="600"
                sx={{ color: theme.palette.text.secondary }}
              >
                Borrowed Amount
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* BOTTOM SECTION: PERSON BALANCES DISTRIBUTION & PAYMENT METHODS */}
        <Grid container spacing={2}>
          {/* Top Active Person Balances */}
          <Grid item xs={12} md={7}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 1,
                backgroundColor: theme.palette.background.paper,
                border: "1px solid rgba(148, 163, 184, 0.12)",
                height: "100%",
              }}
            >
              <Typography
                variant="caption"
                fontWeight="700"
                sx={{
                  color: theme.palette.text.secondary,
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.8,
                  mb: 1.5,
                }}
              >
                <PersonIcon
                  sx={{ fontSize: 16, color: theme.palette.primary.main }}
                />
                Top Person Balance Distribution
              </Typography>

              <Box display="flex" flexDirection="column" gap={1}>
                {personBalances.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">
                    No active person balances found.
                  </Typography>
                ) : (
                  personBalances.map((item, index) => {
                    const isLent = item.net >= 0;
                    const maxAbsNet = Math.max(
                      ...personBalances.map((p) => Math.abs(p.net)),
                      1,
                    );
                    const pct = Math.min(
                      Math.round((Math.abs(item.net) / maxAbsNet) * 100),
                      100,
                    );

                    return (
                      <Box
                        key={index}
                        sx={{
                          p: 1,
                          borderRadius: "6px",
                          backgroundColor: "rgba(15, 23, 42, 0.4)",
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={0.5}
                        >
                          <Typography
                            variant="subtitle2"
                            fontWeight="700"
                            sx={{
                              color: theme.palette.text.primary,
                              fontSize: "0.85rem",
                            }}
                          >
                            {item.name}
                          </Typography>
                          <Typography
                            variant="caption"
                            fontWeight="800"
                            sx={{
                              color: isLent
                                ? theme.palette.primary.main
                                : theme.palette.secondary.main,
                            }}
                          >
                            {isLent
                              ? `+₹${item.net.toLocaleString(
                                  "en-IN",
                                )} (Owes you)`
                              : `-₹${Math.abs(item.net).toLocaleString(
                                  "en-IN",
                                )} (You owe)`}
                          </Typography>
                        </Box>

                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 5,
                            borderRadius: 3,
                            backgroundColor: "rgba(148, 163, 184, 0.1)",
                            "& .MuiLinearProgress-bar": {
                              backgroundColor: isLent
                                ? theme.palette.primary.main
                                : theme.palette.secondary.main,
                              borderRadius: 3,
                            },
                          }}
                        />
                      </Box>
                    );
                  })
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Payment Methods Breakdown */}
          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 1,
                backgroundColor: theme.palette.background.paper,
                border: "1px solid rgba(148, 163, 184, 0.12)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography
                  variant="caption"
                  fontWeight="700"
                  sx={{
                    color: theme.palette.text.secondary,
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                    mb: 1.5,
                  }}
                >
                  <PaymentsIcon
                    sx={{ fontSize: 16, color: theme.palette.secondary.main }}
                  />
                  Payment Methods Volume
                </Typography>

                {/* Progress Bar Distribution */}
                <Box
                  display="flex"
                  sx={{
                    height: 10,
                    borderRadius: "5px",
                    overflow: "hidden",
                    backgroundColor: "rgba(15, 23, 42, 0.8)",
                    mb: 2,
                  }}
                >
                  {methodStats.Cash > 0 && (
                    <Box
                      sx={{
                        width: `${
                          (methodStats.Cash /
                            Math.max(
                              summary.totalLent + summary.totalBorrowed,
                              1,
                            )) *
                          100
                        }%`,
                        backgroundColor: theme.palette.primary.main,
                      }}
                    />
                  )}
                  {methodStats.GPay > 0 && (
                    <Box
                      sx={{
                        width: `${
                          (methodStats.GPay /
                            Math.max(
                              summary.totalLent + summary.totalBorrowed,
                              1,
                            )) *
                          100
                        }%`,
                        backgroundColor: theme.palette.secondary.main,
                      }}
                    />
                  )}
                  {methodStats.Bank > 0 && (
                    <Box
                      sx={{
                        width: `${
                          (methodStats.Bank /
                            Math.max(
                              summary.totalLent + summary.totalBorrowed,
                              1,
                            )) *
                          100
                        }%`,
                        backgroundColor: theme.palette.custom.netPositiveColor,
                      }}
                    />
                  )}
                </Box>
              </Box>

              <Box display="flex" flexDirection="column" gap={1.2}>
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={1}
                  sx={{
                    borderRadius: "6px",
                    backgroundColor: "rgba(15, 23, 42, 0.3)",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "2px",
                        backgroundColor: theme.palette.primary.main,
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight="600"
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Cash Payment
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    fontWeight="800"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    ₹{methodStats.Cash.toLocaleString("en-IN")}
                  </Typography>
                </Box>

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={1}
                  sx={{
                    borderRadius: "6px",
                    backgroundColor: "rgba(15, 23, 42, 0.3)",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "2px",
                        backgroundColor: theme.palette.secondary.main,
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight="600"
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      GPay / UPI
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    fontWeight="800"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    ₹{methodStats.GPay.toLocaleString("en-IN")}
                  </Typography>
                </Box>

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  p={1}
                  sx={{
                    borderRadius: "6px",
                    backgroundColor: "rgba(15, 23, 42, 0.3)",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "2px",
                        backgroundColor: theme.palette.custom.netPositiveColor,
                      }}
                    />
                    <Typography
                      variant="caption"
                      fontWeight="600"
                      sx={{ color: theme.palette.text.secondary }}
                    >
                      Bank Transfer
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    fontWeight="800"
                    sx={{ color: theme.palette.text.primary }}
                  >
                    ₹{methodStats.Bank.toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}

export default ReportsModal;
