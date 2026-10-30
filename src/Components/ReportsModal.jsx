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
  Snackbar,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AssessmentIcon from "@mui/icons-material/Assessment";
import ArrowCircleUpIcon from "@mui/icons-material/ArrowCircleUp";
import ArrowCircleDownIcon from "@mui/icons-material/ArrowCircleDown";
import PersonIcon from "@mui/icons-material/Person";
import PaymentsIcon from "@mui/icons-material/Payments";
import BarChartIcon from "@mui/icons-material/BarChart";
import SpeedIcon from "@mui/icons-material/Speed";
import HubIcon from "@mui/icons-material/Hub";
import ElectricBoltIcon from "@mui/icons-material/ElectricBolt";
import InsightsIcon from "@mui/icons-material/Insights";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import ShieldIcon from "@mui/icons-material/Shield";
import soundEffects from "../Services/soundEffects";
import { getDataRows, getRowVal } from "../Services/SheetService";

const Transition = forwardRef(function Transition(props, ref) {
  return (
    <Zoom
      ref={ref}
      {...props}
      timeout={{ enter: 360, exit: 220 }}
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
  const [copiedToast, setCopiedToast] = useState(false);

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
    personBalances,
    activePeopleCount,
    totalCount,
    avgTxAmount,
    partialPaymentsCount,
    recoveryRate,
    recoveredAmount,
    topDebtor,
    concentrationPct,
    exposureRisk,
    exposureColor,
    recoveryStatus,
    recoveryColor,
    aiInsight,
    healthScore,
    healthLabel,
    healthColor,
    peakLentTx,
    peakBorrowedTx,
    lentShare,
    borrowedShare,
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

    let peakLent = { amount: 0, person: "None", date: "" };
    let peakBorrowed = { amount: 0, person: "None", date: "" };

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

    // Process rows for period-specific stats & peak milestones
    rows.forEach((row) => {
      const amount = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
      const type = String(getRowVal(row, 3, "type", "")).toLowerCase();
      const person = String(getRowVal(row, 1, "person", "")).trim();
      const method = String(
        getRowVal(row, 6, "method", getRowVal(row, 6, "paymentMethod", "Cash")),
      ).toLowerCase();
      const rawDate = getRowVal(row, 4, "date", "");

      // Track peak loans across all records
      if (type === "lent" && amount > peakLent.amount) {
        peakLent = { amount, person: person || "Unknown", date: String(rawDate) };
      }
      if (type === "borrowed" && amount > peakBorrowed.amount) {
        peakBorrowed = {
          amount,
          person: person || "Unknown",
          date: String(rawDate),
        };
      }

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

      // Track person period totals
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

    // Futuristic Intelligence Computations
    const recoveryRate =
      totalLent > 0
        ? Math.min(
            100,
            Math.max(
              0,
              Math.round(((totalLent - currentLent) / totalLent) * 100),
            ),
          )
        : 100;

    const recoveredAmount = Math.max(0, totalLent - currentLent);

    const topDebtor =
      personBalancesList.find((p) => p.net > 0) || { name: "None", net: 0 };

    const concentrationPct =
      currentLent > 0 && topDebtor.net > 0
        ? Math.min(100, Math.round((topDebtor.net / currentLent) * 100))
        : 0;

    let exposureRisk = "Distributed";
    let exposureColor = "#10b981";
    if (concentrationPct >= 80) {
      exposureRisk = "Concentrated";
      exposureColor = "#f59e0b";
    } else if (concentrationPct >= 50) {
      exposureRisk = "Moderate";
      exposureColor = "#06b6d4";
    }

    let recoveryStatus = "Optimal";
    let recoveryColor = "#10b981";
    if (recoveryRate < 40) {
      recoveryStatus = "Low Return";
      recoveryColor = "#f43f5e";
    } else if (recoveryRate < 70) {
      recoveryStatus = "Moderate";
      recoveryColor = "#f59e0b";
    }

    // Capital Ratio (Lent vs Borrowed)
    const totalActiveExposure = currentLent + currentBorrowed;
    const lentShare =
      totalActiveExposure > 0
        ? Math.round((currentLent / totalActiveExposure) * 100)
        : 100;
    const borrowedShare =
      totalActiveExposure > 0
        ? Math.round((currentBorrowed / totalActiveExposure) * 100)
        : 0;

    // Financial Health Score Algorithm (0-100)
    let score = 100;
    if (currentBorrowed > 0) {
      const debtPen = Math.min(
        40,
        Math.round((currentBorrowed / Math.max(currentLent, currentBorrowed, 1)) * 40),
      );
      score -= debtPen;
    }
    if (concentrationPct > 80 && currentLent > 1000) {
      score -= 10;
    }
    if (recoveryRate < 50) {
      score -= Math.round((50 - recoveryRate) * 0.25);
    }
    const healthScore = Math.max(15, Math.min(100, Math.round(score)));

    let healthLabel = "Pristine Liquidity";
    let healthColor = "#10b981";
    if (healthScore < 50) {
      healthLabel = "High Exposure";
      healthColor = "#ef4444";
    } else if (healthScore < 75) {
      healthLabel = "Moderate Leverage";
      healthColor = "#f59e0b";
    } else if (healthScore < 90) {
      healthLabel = "Stable Position";
      healthColor = "#06b6d4";
    }

    // Dynamic Futuristic AI Insight (Concise & Minimal)
    let aiInsight = "";
    if (currentBorrowed === 0 && currentLent > 0) {
      aiInsight = `Zero debt • ₹${currentLent.toLocaleString(
        "en-IN",
      )} lent across ${activePeopleCount} ${
        activePeopleCount === 1 ? "party" : "parties"
      }.`;
    } else if (currentBorrowed > 0 && currentLent > 0) {
      aiInsight = `₹${currentLent.toLocaleString(
        "en-IN",
      )} lent vs ₹${currentBorrowed.toLocaleString(
        "en-IN",
      )} debt • Top: ${topDebtor.name}.`;
    } else if (currentBorrowed > 0) {
      aiInsight = `Active debt: ₹${currentBorrowed.toLocaleString(
        "en-IN",
      )} • Zero lent out.`;
    } else {
      aiInsight = `All accounts settled • Zero active risk.`;
    }

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
      personBalances: personBalancesList,
      activePeopleCount,
      totalCount: validTxCount,
      avgTxAmount: avgTx,
      partialPaymentsCount,
      totalPartialPayments,
      recoveryRate,
      recoveredAmount,
      topDebtor,
      concentrationPct,
      exposureRisk,
      exposureColor,
      recoveryStatus,
      recoveryColor,
      aiInsight,
      healthScore,
      healthLabel,
      healthColor,
      peakLentTx: peakLent,
      peakBorrowedTx: peakBorrowed,
      lentShare,
      borrowedShare,
    };
  }, [transactions, timeRange]);

  // Handle Copy / Share Financial Digest
  const handleCopyDigest = () => {
    try {
      soundEffects.playAdd();
    } catch {
      // ignore
    }
    const dateStr = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const digestLines = [
      `📊 Ash Flow Portfolio Digest • ${dateStr}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🟢 Active Lent: ₹${summary.currentLent.toLocaleString("en-IN")} (${activePeopleCount} ${
        activePeopleCount === 1 ? "Debtor" : "Debtors"
      })`,
      `🔴 Active Borrowed: ₹${summary.currentBorrowed.toLocaleString("en-IN")} (${
        summary.currentBorrowed === 0 ? "Debt Free ✓" : "Payable"
      })`,
      `⚡ Recovery Velocity: ${recoveryRate}% (₹${recoveredAmount.toLocaleString(
        "en-IN",
      )} returned)`,
      `🛡️ Health Score: ${healthScore}/100 [${healthLabel}]`,
      topDebtor.net > 0
        ? `👥 Top Debtor: ${topDebtor.name} (${concentrationPct}% concentration)`
        : null,
      peakLentTx.amount > 0
        ? `🏆 Peak Loan Disbursed: ₹${peakLentTx.amount.toLocaleString(
            "en-IN",
          )} (${peakLentTx.person})`
        : null,
      `━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Generated by Ash Flow Finance Portal`,
    ]
      .filter(Boolean)
      .join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(digestLines)
        .then(() => setCopiedToast(true))
        .catch(() => setCopiedToast(true));
    } else {
      setCopiedToast(true);
    }
  };

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
            theme.palette.custom?.cardGradient ||
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
      {/* Header - Sleek, Compact on Mobile */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 1.5, sm: 3 },
          pt: "max(env(safe-area-inset-top), 10px)",
          pb: { xs: 1, sm: 1.2 },
          borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
          background: "rgba(15, 23, 42, 0.5)",
          backdropFilter: "blur(12px)",
        }}
      >
        <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 1.4 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: 28, sm: 38 },
              height: { xs: 28, sm: 38 },
              borderRadius: "8px",
              background:
                theme.palette.custom?.primaryGradient ||
                "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              boxShadow: "0 2px 10px rgba(16, 185, 129, 0.35)",
            }}
          >
            <AssessmentIcon sx={{ fontSize: { xs: 17, sm: 22 } }} />
          </Box>
          <Box>
            <Typography
              variant="h6"
              fontWeight="800"
              sx={{
                color: theme.palette.text.primary,
                fontSize: { xs: "0.95rem", sm: "1.2rem" },
                letterSpacing: "-0.02em",
                lineHeight: 1.15,
              }}
            >
              Reports & Analytics
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: { xs: "0.62rem", sm: "0.72rem" },
                display: { xs: "none", sm: "block" },
              }}
            >
              Real-time Portfolio Intelligence & Cash Flow
            </Typography>
          </Box>
        </Box>

        {/* Action Controls: One-Tap Digest Copy & Close */}
        <Box display="flex" alignItems="center" gap={0.8}>
          <Tooltip title="Copy Portfolio Digest" arrow>
            <IconButton
              onClick={handleCopyDigest}
              size="small"
              sx={{
                color: theme.palette.primary.main,
                p: { xs: 0.6, sm: 0.8 },
                borderRadius: "8px",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                backgroundColor: "rgba(16, 185, 129, 0.1)",
                "&:hover": {
                  backgroundColor: "rgba(16, 185, 129, 0.2)",
                },
              }}
            >
              <ContentCopyIcon sx={{ fontSize: { xs: 16, sm: 18 } }} />
            </IconButton>
          </Tooltip>

          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: theme.palette.text.secondary,
              p: { xs: 0.6, sm: 0.8 },
              borderRadius: "8px",
              border: "1px solid rgba(148, 163, 184, 0.15)",
              "&:hover": {
                color: theme.palette.text.primary,
                backgroundColor: "rgba(148, 163, 184, 0.12)",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: { xs: 17, sm: 20 } }} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent
        sx={{
          px: { xs: 1.2, sm: 3 },
          py: { xs: 1.2, sm: 2.4 },
          overflowY: "auto",
        }}
      >
        <Box
          sx={{
            maxWidth: 1050,
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: { xs: 1.2, sm: 2.2 },
            pb: 3,
          }}
        >
          {/* TOP HERO STATS: 2-COLUMN MINIMIZED CARDS ON MOBILE (NO NET AMOUNT) */}
          <Grid container spacing={{ xs: 1, sm: 2 }}>
            {/* LENT HERO CARD */}
            <Grid item xs={6} sm={6}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.2, sm: 2.2 },
                  borderRadius: { xs: "12px", sm: "16px" },
                  background:
                    "linear-gradient(135deg, rgba(16, 185, 129, 0.09) 0%, rgba(15, 23, 42, 0.8) 100%)",
                  border: "1px solid rgba(16, 185, 129, 0.28)",
                  backdropFilter: "blur(14px)",
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    boxShadow: "0 6px 20px rgba(16, 185, 129, 0.15)",
                  },
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={{ xs: 0.5, sm: 1 }}
                >
                  <Box display="flex" alignItems="center" gap={{ xs: 0.6, sm: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: { xs: 24, sm: 34 },
                        height: { xs: 24, sm: 34 },
                        borderRadius: "7px",
                        background: "rgba(16, 185, 129, 0.15)",
                        color: "#10b981",
                        border: "1px solid rgba(16, 185, 129, 0.35)",
                      }}
                    >
                      <ArrowCircleUpIcon sx={{ fontSize: { xs: 16, sm: 22 } }} />
                    </Box>
                    <Typography
                      variant="caption"
                      fontWeight="800"
                      sx={{
                        color: "#10b981",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        fontSize: { xs: "0.6rem", sm: "0.72rem" },
                      }}
                    >
                      Lent
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label={`${activePeopleCount} ${
                      activePeopleCount === 1 ? "Active" : "Active"
                    }`}
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "0.58rem", sm: "0.68rem" },
                      bgcolor: "rgba(16, 185, 129, 0.15)",
                      color: "#10b981",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      height: { xs: 18, sm: 22 },
                      px: { xs: 0.3, sm: 0.6 },
                    }}
                  />
                </Box>

                {/* Sized Bold Amount */}
                <Typography
                  variant="h4"
                  fontWeight="900"
                  sx={{
                    color: "#10b981",
                    fontSize: { xs: "1.2rem", sm: "2.3rem" },
                    letterSpacing: "-0.02em",
                    my: { xs: 0.2, sm: 0.5 },
                    textShadow: "0 0 16px rgba(16, 185, 129, 0.3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  ₹{summary.currentLent.toLocaleString("en-IN")}
                </Typography>

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  pt={{ xs: 0.6, sm: 1 }}
                  sx={{ borderTop: "1px dashed rgba(16, 185, 129, 0.18)" }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontSize: { xs: "0.58rem", sm: "0.72rem" },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Tot: ₹{summary.totalLent.toLocaleString("en-IN")}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "#10b981",
                      fontWeight: 700,
                      fontSize: { xs: "0.58rem", sm: "0.72rem" },
                    }}
                  >
                    {recoveryRate}%
                  </Typography>
                </Box>
              </Paper>
            </Grid>

            {/* BORROWED HERO CARD */}
            <Grid item xs={6} sm={6}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.2, sm: 2.2 },
                  borderRadius: { xs: "12px", sm: "16px" },
                  background:
                    "linear-gradient(135deg, rgba(239, 68, 68, 0.09) 0%, rgba(15, 23, 42, 0.8) 100%)",
                  border: "1px solid rgba(239, 68, 68, 0.28)",
                  backdropFilter: "blur(14px)",
                  position: "relative",
                  overflow: "hidden",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  "&:hover": {
                    boxShadow: "0 6px 20px rgba(239, 68, 68, 0.15)",
                  },
                }}
              >
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={{ xs: 0.5, sm: 1 }}
                >
                  <Box display="flex" alignItems="center" gap={{ xs: 0.6, sm: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: { xs: 24, sm: 34 },
                        height: { xs: 24, sm: 34 },
                        borderRadius: "7px",
                        background: "rgba(239, 68, 68, 0.15)",
                        color: "#ef4444",
                        border: "1px solid rgba(239, 68, 68, 0.35)",
                      }}
                    >
                      <ArrowCircleDownIcon sx={{ fontSize: { xs: 16, sm: 22 } }} />
                    </Box>
                    <Typography
                      variant="caption"
                      fontWeight="800"
                      sx={{
                        color: "#ef4444",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        fontSize: { xs: "0.6rem", sm: "0.72rem" },
                      }}
                    >
                      Borrowed
                    </Typography>
                  </Box>

                  <Chip
                    size="small"
                    label={
                      summary.currentBorrowed === 0 ? "Free ✓" : "Payable"
                    }
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "0.58rem", sm: "0.68rem" },
                      bgcolor:
                        summary.currentBorrowed === 0
                          ? "rgba(16, 185, 129, 0.15)"
                          : "rgba(239, 68, 68, 0.15)",
                      color:
                        summary.currentBorrowed === 0 ? "#10b981" : "#ef4444",
                      border: `1px solid ${
                        summary.currentBorrowed === 0
                          ? "rgba(16, 185, 129, 0.3)"
                          : "rgba(239, 68, 68, 0.3)"
                      }`,
                      height: { xs: 18, sm: 22 },
                      px: { xs: 0.3, sm: 0.6 },
                    }}
                  />
                </Box>

                {/* Sized Bold Amount */}
                <Typography
                  variant="h4"
                  fontWeight="900"
                  sx={{
                    color:
                      summary.currentBorrowed > 0
                        ? "#ef4444"
                        : theme.palette.text.secondary,
                    fontSize: { xs: "1.2rem", sm: "2.3rem" },
                    letterSpacing: "-0.02em",
                    my: { xs: 0.2, sm: 0.5 },
                    textShadow:
                      summary.currentBorrowed > 0
                        ? "0 0 16px rgba(239, 68, 68, 0.3)"
                        : "none",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  ₹{summary.currentBorrowed.toLocaleString("en-IN")}
                </Typography>

                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  pt={{ xs: 0.6, sm: 1 }}
                  sx={{ borderTop: "1px dashed rgba(239, 68, 68, 0.18)" }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: theme.palette.text.secondary,
                      fontSize: { xs: "0.58rem", sm: "0.72rem" },
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Tot: ₹{summary.totalBorrowed.toLocaleString("en-IN")}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color:
                        summary.currentBorrowed === 0 ? "#10b981" : "#ef4444",
                      fontWeight: 700,
                      fontSize: { xs: "0.58rem", sm: "0.72rem" },
                    }}
                  >
                    {summary.currentBorrowed === 0 ? "Clean" : "Due"}
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* NEW FEATURE: CAPITAL ALLOCATION & PORTFOLIO HEALTH BAR */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1, sm: 1.6 },
              borderRadius: { xs: "10px", sm: "14px" },
              background:
                "linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.4) 100%)",
              border: "1px solid rgba(148, 163, 184, 0.12)",
              backdropFilter: "blur(12px)",
            }}
          >
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={0.8}
            >
              <Box display="flex" alignItems="center" gap={0.8}>
                <ShieldIcon sx={{ fontSize: { xs: 15, sm: 18 }, color: healthColor }} />
                <Typography
                  variant="caption"
                  fontWeight="800"
                  sx={{
                    color: theme.palette.text.secondary,
                    letterSpacing: "0.06em",
                    fontSize: { xs: "0.62rem", sm: "0.74rem" },
                    textTransform: "uppercase",
                  }}
                >
                  Liquidity Health Score
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={0.8}>
                <Chip
                  size="small"
                  label={`${healthScore}/100 • ${healthLabel}`}
                  sx={{
                    height: { xs: 19, sm: 22 },
                    fontSize: { xs: "0.58rem", sm: "0.68rem" },
                    fontWeight: 800,
                    color: healthColor,
                    bgcolor: `${healthColor}16`,
                    border: `1px solid ${healthColor}35`,
                  }}
                />
              </Box>
            </Box>

            {/* Bi-color Segmented Allocation Gauge */}
            <Box
              sx={{
                height: { xs: 5, sm: 7 },
                borderRadius: "4px",
                overflow: "hidden",
                display: "flex",
                bgcolor: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(148, 163, 184, 0.12)",
              }}
            >
              <Box
                sx={{
                  width: `${lentShare}%`,
                  bgcolor: "#10b981",
                  transition: "width 0.5s ease",
                  boxShadow: "0 0 8px rgba(16, 185, 129, 0.6)",
                }}
              />
              <Box
                sx={{
                  width: `${borrowedShare}%`,
                  bgcolor: "#ef4444",
                  transition: "width 0.5s ease",
                  boxShadow: "0 0 8px rgba(239, 68, 68, 0.6)",
                }}
              />
            </Box>

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mt={0.6}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#10b981",
                  fontWeight: 700,
                  fontSize: { xs: "0.58rem", sm: "0.68rem" },
                }}
              >
                ● Lent {lentShare}%
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "#ef4444",
                  fontWeight: 700,
                  fontSize: { xs: "0.58rem", sm: "0.68rem" },
                }}
              >
                ● Borrowed {borrowedShare}%
              </Typography>
            </Box>
          </Paper>

          {/* FUTURISTIC INTELLIGENCE & TELEMETRY MATRIX (MINIMIZED ON MOBILE) */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.2, sm: 2 },
              borderRadius: { xs: "12px", sm: "16px" },
              background:
                "linear-gradient(135deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 41, 59, 0.4) 100%)",
              border: "1px solid rgba(148, 163, 184, 0.14)",
              backdropFilter: "blur(14px)",
            }}
          >
            {/* AI Live Intelligence Pulse Header */}
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              flexWrap="wrap"
              gap={0.8}
              mb={{ xs: 1, sm: 1.5 }}
              pb={{ xs: 0.8, sm: 1.2 }}
              sx={{ borderBottom: "1px solid rgba(148, 163, 184, 0.1)" }}
            >
              <Box display="flex" alignItems="center" gap={0.8}>
                <Box
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    bgcolor: "#10b981",
                    boxShadow: "0 0 8px #10b981",
                    animation: "pulse 2s infinite ease-in-out",
                    "@keyframes pulse": {
                      "0%": { opacity: 0.4, transform: "scale(0.8)" },
                      "50%": { opacity: 1, transform: "scale(1.25)" },
                      "100%": { opacity: 0.4, transform: "scale(0.8)" },
                    },
                  }}
                />
                <Typography
                  variant="caption"
                  fontWeight="800"
                  sx={{
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: theme.palette.text.secondary,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    fontSize: { xs: "0.65rem", sm: "0.74rem" },
                  }}
                >
                  <InsightsIcon sx={{ fontSize: { xs: 14, sm: 16 }, color: "#06b6d4" }} />
                  Neural Telemetry
                </Typography>
              </Box>

              <Chip
                size="small"
                icon={
                  <ElectricBoltIcon
                    sx={{
                      fontSize: { xs: "12px !important", sm: "14px !important" },
                      color: "#06b6d4",
                    }}
                  />
                }
                label="LIVE"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: "0.58rem", sm: "0.64rem" },
                  letterSpacing: "0.04em",
                  bgcolor: "rgba(6, 182, 212, 0.1)",
                  color: "#06b6d4",
                  border: "1px solid rgba(6, 182, 212, 0.28)",
                  height: { xs: 18, sm: 22 },
                }}
              />
            </Box>

            {/* Real-time Dynamic AI Stream Banner */}
            <Box
              sx={{
                p: { xs: 0.8, sm: 1.4 },
                mb: { xs: 1, sm: 1.6 },
                borderRadius: "10px",
                background: "rgba(6, 182, 212, 0.05)",
                border: "1px solid rgba(6, 182, 212, 0.18)",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.primary,
                  fontSize: { xs: "0.72rem", sm: "0.84rem" },
                  lineHeight: { xs: 1.35, sm: 1.5 },
                  fontWeight: 500,
                }}
              >
                <strong style={{ color: "#06b6d4" }}>Insight: </strong>
                {aiInsight}
              </Typography>
            </Box>

            {/* 3 Futuristic Metric Tiles - Side-by-side on Mobile (xs=4) */}
            <Grid container spacing={{ xs: 0.8, sm: 1.5 }}>
              {/* Tile 1: Capital Recovery Velocity */}
              <Grid item xs={4} sm={4}>
                <Box
                  sx={{
                    p: { xs: 0.8, sm: 1.4 },
                    borderRadius: "10px",
                    background: "rgba(15, 23, 42, 0.55)",
                    border: "1px solid rgba(148, 163, 184, 0.12)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={0.4}
                  >
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <SpeedIcon
                        sx={{ fontSize: { xs: 13, sm: 16 }, color: "#06b6d4" }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight="700"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.55rem", sm: "0.68rem" } }}
                      >
                        Velocity
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    variant="h6"
                    fontWeight="800"
                    sx={{
                      color: "#06b6d4",
                      my: 0.2,
                      fontSize: { xs: "0.92rem", sm: "1.35rem" },
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {recoveryRate}%
                  </Typography>

                  <LinearProgress
                    variant="determinate"
                    value={recoveryRate}
                    sx={{
                      height: { xs: 3, sm: 5 },
                      borderRadius: 2,
                      bgcolor: "rgba(148, 163, 184, 0.1)",
                      my: 0.4,
                      "& .MuiLinearProgress-bar": {
                        bgcolor: "#06b6d4",
                        borderRadius: 2,
                        boxShadow: "0 0 6px rgba(6, 182, 212, 0.5)",
                      },
                    }}
                  />

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: "0.55rem", sm: "0.68rem" },
                      display: { xs: "none", sm: "block" },
                    }}
                  >
                    ₹{recoveredAmount.toLocaleString("en-IN")} returned
                  </Typography>
                </Box>
              </Grid>

              {/* Tile 2: Exposure Concentration */}
              <Grid item xs={4} sm={4}>
                <Box
                  sx={{
                    p: { xs: 0.8, sm: 1.4 },
                    borderRadius: "10px",
                    background: "rgba(15, 23, 42, 0.55)",
                    border: "1px solid rgba(148, 163, 184, 0.12)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={0.4}
                  >
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <HubIcon
                        sx={{ fontSize: { xs: 13, sm: 16 }, color: "#818cf8" }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight="700"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.55rem", sm: "0.68rem" } }}
                      >
                        Exposure
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    variant="h6"
                    fontWeight="800"
                    sx={{
                      color: "#818cf8",
                      my: 0.2,
                      fontSize: { xs: "0.92rem", sm: "1.35rem" },
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {concentrationPct}%
                  </Typography>

                  <LinearProgress
                    variant="determinate"
                    value={concentrationPct}
                    sx={{
                      height: { xs: 3, sm: 5 },
                      borderRadius: 2,
                      bgcolor: "rgba(148, 163, 184, 0.1)",
                      my: 0.4,
                      "& .MuiLinearProgress-bar": {
                        bgcolor: "#818cf8",
                        borderRadius: 2,
                        boxShadow: "0 0 6px rgba(129, 140, 248, 0.5)",
                      },
                    }}
                  />

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: "0.55rem", sm: "0.68rem" },
                      display: { xs: "none", sm: "block" },
                    }}
                  >
                    Top: {topDebtor.name}
                  </Typography>
                </Box>
              </Grid>

              {/* Tile 3: Capital Turnover & Ticket */}
              <Grid item xs={4} sm={4}>
                <Box
                  sx={{
                    p: { xs: 0.8, sm: 1.4 },
                    borderRadius: "10px",
                    background: "rgba(15, 23, 42, 0.55)",
                    border: "1px solid rgba(148, 163, 184, 0.12)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={0.4}
                  >
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <ElectricBoltIcon
                        sx={{ fontSize: { xs: 13, sm: 16 }, color: "#f59e0b" }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight="700"
                        color="text.secondary"
                        sx={{ fontSize: { xs: "0.55rem", sm: "0.68rem" } }}
                      >
                        Events
                      </Typography>
                    </Box>
                  </Box>

                  <Typography
                    variant="h6"
                    fontWeight="800"
                    sx={{
                      color: "#f59e0b",
                      my: 0.2,
                      fontSize: { xs: "0.92rem", sm: "1.35rem" },
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {totalCount}
                  </Typography>

                  <Box sx={{ height: { xs: 3, sm: 5 }, my: 0.4 }} />

                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: { xs: "0.55rem", sm: "0.68rem" },
                      display: { xs: "none", sm: "block" },
                    }}
                  >
                    Avg ₹{avgTxAmount.toLocaleString("en-IN")}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* NEW FEATURE: ALL-TIME PEAK FINANCIAL MILESTONES */}
          <Box
            display="flex"
            gap={{ xs: 0.8, sm: 1.5 }}
            sx={{
              overflowX: "auto",
              py: 0.2,
              "&::-webkit-scrollbar": { display: "none" },
            }}
          >
            {/* Peak Loan Disbursed */}
            <Paper
              elevation={0}
              sx={{
                flex: "1 1 0",
                minWidth: { xs: "120px", sm: "180px" },
                p: { xs: 0.8, sm: 1.2 },
                borderRadius: "10px",
                background: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(148, 163, 184, 0.1)",
                display: "flex",
                alignItems: "center",
                gap: 0.8,
              }}
            >
              <EmojiEventsIcon
                sx={{ fontSize: { xs: 16, sm: 20 }, color: "#10b981" }}
              />
              <Box sx={{ overflow: "hidden" }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: { xs: "0.56rem", sm: "0.66rem" },
                    display: "block",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  Peak Loan Given
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="800"
                  sx={{
                    color: "#10b981",
                    fontSize: { xs: "0.75rem", sm: "0.88rem" },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  ₹{peakLentTx.amount.toLocaleString("en-IN")}{" "}
                  <span style={{ fontSize: "0.65em", color: theme.palette.text.secondary }}>
                    ({peakLentTx.person})
                  </span>
                </Typography>
              </Box>
            </Paper>

            {/* Active Repayment Velocity */}
            <Paper
              elevation={0}
              sx={{
                flex: "1 1 0",
                minWidth: { xs: "120px", sm: "180px" },
                p: { xs: 0.8, sm: 1.2 },
                borderRadius: "10px",
                background: "rgba(15, 23, 42, 0.45)",
                border: "1px solid rgba(148, 163, 184, 0.1)",
                display: "flex",
                alignItems: "center",
                gap: 0.8,
              }}
            >
              <SpeedIcon
                sx={{ fontSize: { xs: 16, sm: 20 }, color: "#06b6d4" }}
              />
              <Box sx={{ overflow: "hidden" }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: { xs: "0.56rem", sm: "0.66rem" },
                    display: "block",
                    textTransform: "uppercase",
                    fontWeight: 700,
                  }}
                >
                  Avg Ticket Size
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight="800"
                  sx={{
                    color: theme.palette.text.primary,
                    fontSize: { xs: "0.75rem", sm: "0.88rem" },
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  ₹{avgTxAmount.toLocaleString("en-IN")}{" "}
                  <span style={{ fontSize: "0.65em", color: theme.palette.text.secondary }}>
                    / tx
                  </span>
                </Typography>
              </Box>
            </Paper>
          </Box>

          {/* MONTHLY CASH FLOW DIAGRAM (MINIMIZED DIAGRAM ON MOBILE) */}
          <Paper
            elevation={0}
            sx={{
              p: { xs: 1.2, sm: 2 },
              borderRadius: { xs: "12px", sm: "16px" },
              backgroundColor:
                theme.palette.custom?.chartBg || "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(148, 163, 184, 0.14)",
              backdropFilter: "blur(14px)",
            }}
          >
            {/* Header with Title and Integrated Time Range Switcher */}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              mb={{ xs: 1, sm: 1.5 }}
              flexWrap="wrap"
              gap={1}
            >
              <Box display="flex" alignItems="center" gap={0.8}>
                <BarChartIcon
                  sx={{
                    color: theme.palette.primary.main,
                    fontSize: { xs: 17, sm: 20 },
                  }}
                />
                <Typography
                  variant="subtitle2"
                  fontWeight="800"
                  sx={{
                    color: theme.palette.text.primary,
                    fontSize: { xs: "0.8rem", sm: "0.95rem" },
                    letterSpacing: "-0.01em",
                  }}
                >
                  Cash Flow ({chartData.length}M)
                </Typography>
              </Box>

              {/* Time Range Toggle inside Chart Header */}
              <Box display="flex" alignItems="center" gap={0.8} flexWrap="wrap">
                {hoveredData && (
                  <Chip
                    size="small"
                    label={`${hoveredData.label}: L:₹${hoveredData.lent.toLocaleString(
                      "en-IN",
                    )} | B:₹${hoveredData.borrowed.toLocaleString("en-IN")}`}
                    sx={{
                      fontWeight: 700,
                      fontSize: { xs: "0.62rem", sm: "0.7rem" },
                      backgroundColor: "rgba(99, 102, 241, 0.15)",
                      color: theme.palette.secondary.main,
                      border: "1px solid rgba(99, 102, 241, 0.3)",
                      height: { xs: 20, sm: 24 },
                      display: { xs: "none", sm: "inline-flex" },
                    }}
                  />
                )}

                <ToggleButtonGroup
                  value={timeRange}
                  exclusive
                  onChange={(e, val) => val && setTimeRange(val)}
                  size="small"
                  sx={{
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "8px",
                    p: 0.2,
                    border: "1px solid rgba(148, 163, 184, 0.18)",
                    "& .MuiToggleButton-root": {
                      border: "none",
                      borderRadius: "6px",
                      px: { xs: 0.8, sm: 1.4 },
                      py: { xs: 0.1, sm: 0.25 },
                      fontSize: { xs: "0.62rem", sm: "0.72rem" },
                      fontWeight: 700,
                      color: theme.palette.text.secondary,
                      "&.Mui-selected": {
                        color: "#ffffff",
                        backgroundColor: theme.palette.primary.main,
                        boxShadow: `0 0 10px ${theme.palette.primary.main}55`,
                      },
                    },
                  }}
                >
                  <ToggleButton value="3m">3M</ToggleButton>
                  <ToggleButton value="6m">6M</ToggleButton>
                  <ToggleButton value="year">1Y</ToggleButton>
                  <ToggleButton value="all">ALL</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>

            {/* Minimized Chart Area on Mobile */}
            <Box
              sx={{
                height: { xs: 80, sm: 150 },
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: { xs: 0.5, sm: 1.8 },
                pt: { xs: 1, sm: 2 },
                pb: 0.5,
                px: { xs: 0.2, sm: 1.5 },
                position: "relative",
                borderBottom: "2px solid rgba(148, 163, 184, 0.2)",
              }}
            >
              {/* Grid Lines */}
              <Box
                sx={{
                  position: "absolute",
                  top: "25%",
                  left: 0,
                  right: 0,
                  borderBottom: "1px dashed rgba(148, 163, 184, 0.08)",
                  pointerEvents: "none",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  top: "65%",
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
                      <Box sx={{ p: 0.4 }}>
                        <Typography
                          variant="caption"
                          fontWeight="bold"
                          sx={{
                            color: theme.palette.text.primary,
                            display: "block",
                            mb: 0.3,
                          }}
                        >
                          {d.label}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#10b981",
                            display: "block",
                            fontWeight: 700,
                          }}
                        >
                          Lent: ₹{d.lent.toLocaleString("en-IN")}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            color: "#ef4444",
                            display: "block",
                            fontWeight: 700,
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
                        px: { xs: 0.2, sm: 0.6 },
                        borderRadius: "6px",
                        transition: "background-color 0.2s",
                        backgroundColor: isSelected
                          ? "rgba(148, 163, 184, 0.1)"
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
                            width: { xs: 7, sm: 20 },
                            height: `${lentHeight}%`,
                            background:
                              "linear-gradient(180deg, #10b981 0%, #059669 100%)",
                            borderRadius: "3px 3px 0 0",
                            boxShadow:
                              d.lent > 0
                                ? "0 0 8px rgba(16, 185, 129, 0.4)"
                                : "none",
                            transition:
                              "height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                          }}
                        />
                        {/* Borrowed Bar */}
                        <Box
                          sx={{
                            width: { xs: 7, sm: 20 },
                            height: `${borrowedHeight}%`,
                            background:
                              "linear-gradient(180deg, #ef4444 0%, #dc2626 100%)",
                            borderRadius: "3px 3px 0 0",
                            boxShadow:
                              d.borrowed > 0
                                ? "0 0 8px rgba(239, 68, 68, 0.4)"
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
              mt={0.8}
              px={{ xs: 0.2, sm: 0.8 }}
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
                    fontSize: { xs: "0.62rem", sm: "0.74rem" },
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
              gap={{ xs: 2, sm: 3 }}
              mt={1}
              pt={0.8}
              sx={{ borderTop: "1px dashed rgba(148, 163, 184, 0.12)" }}
            >
              <Box display="flex" alignItems="center" gap={0.8}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "2px",
                    backgroundColor: "#10b981",
                    boxShadow: "0 0 6px rgba(16, 185, 129, 0.6)",
                  }}
                />
                <Typography
                  variant="caption"
                  fontWeight="700"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: { xs: "0.65rem", sm: "0.74rem" },
                  }}
                >
                  Lent
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.8}>
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "2px",
                    backgroundColor: "#ef4444",
                    boxShadow: "0 0 6px rgba(239, 68, 68, 0.6)",
                  }}
                />
                <Typography
                  variant="caption"
                  fontWeight="700"
                  sx={{
                    color: theme.palette.text.secondary,
                    fontSize: { xs: "0.65rem", sm: "0.74rem" },
                  }}
                >
                  Borrowed
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* BOTTOM SECTION: PERSON DISTRIBUTION & PAYMENT METHODS */}
          <Grid container spacing={{ xs: 1.2, sm: 2 }}>
            {/* Top Active Person Balances */}
            <Grid item xs={12} md={7}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 1.2, sm: 2 },
                  borderRadius: { xs: "12px", sm: "16px" },
                  backgroundColor:
                    theme.palette.background.paper || "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  height: "100%",
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight="800"
                  sx={{
                    color: theme.palette.text.secondary,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                    mb: 1.2,
                    fontSize: { xs: "0.66rem", sm: "0.74rem" },
                  }}
                >
                  <PersonIcon
                    sx={{
                      fontSize: { xs: 15, sm: 17 },
                      color: theme.palette.primary.main,
                    }}
                  />
                  Top Person Balance Distribution
                </Typography>

                <Box display="flex" flexDirection="column" gap={0.8}>
                  {personBalances.length === 0 ? (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ py: 1.5, textAlign: "center", display: "block" }}
                    >
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
                            p: { xs: 0.8, sm: 1 },
                            borderRadius: "8px",
                            backgroundColor: "rgba(15, 23, 42, 0.5)",
                            border: `1px solid ${
                              theme.palette.divider ||
                              "rgba(148, 163, 184, 0.1)"
                            }`,
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
                                fontSize: { xs: "0.78rem", sm: "0.86rem" },
                              }}
                            >
                              {item.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              fontWeight="800"
                              sx={{
                                color: isLent ? "#10b981" : "#ef4444",
                                fontSize: { xs: "0.72rem", sm: "0.8rem" },
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
                              height: { xs: 4, sm: 5 },
                              borderRadius: 2,
                              backgroundColor: "rgba(148, 163, 184, 0.1)",
                              "& .MuiLinearProgress-bar": {
                                backgroundColor: isLent ? "#10b981" : "#ef4444",
                                borderRadius: 2,
                                boxShadow: `0 0 6px ${
                                  isLent
                                    ? "rgba(16, 185, 129, 0.5)"
                                    : "rgba(239, 68, 68, 0.5)"
                                }`,
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
                  p: { xs: 1.2, sm: 2 },
                  borderRadius: { xs: "12px", sm: "16px" },
                  backgroundColor:
                    theme.palette.background.paper || "rgba(15, 23, 42, 0.75)",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    fontWeight="800"
                    sx={{
                      color: theme.palette.text.secondary,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      gap: 0.8,
                      mb: 1.2,
                      fontSize: { xs: "0.66rem", sm: "0.74rem" },
                    }}
                  >
                    <PaymentsIcon
                      sx={{
                        fontSize: { xs: 15, sm: 17 },
                        color: theme.palette.secondary.main,
                      }}
                    />
                    Payment Methods Volume
                  </Typography>

                  {/* Multi-segmented Progress Bar */}
                  <Box
                    display="flex"
                    sx={{
                      height: { xs: 6, sm: 8 },
                      borderRadius: "4px",
                      overflow: "hidden",
                      backgroundColor: "rgba(15, 23, 42, 0.9)",
                      mb: 1.5,
                      border: "1px solid rgba(148, 163, 184, 0.12)",
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
                          backgroundColor: "#10b981",
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
                          backgroundColor: "#3b82f6",
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
                          backgroundColor: "#a855f7",
                        }}
                      />
                    )}
                  </Box>
                </Box>

                <Box display="flex" flexDirection="column" gap={0.8}>
                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={{ xs: 0.8, sm: 1 }}
                    sx={{
                      borderRadius: "7px",
                      backgroundColor: "rgba(15, 23, 42, 0.4)",
                      border: "1px solid rgba(148, 163, 184, 0.08)",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.8}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "2px",
                          backgroundColor: "#10b981",
                        }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight="700"
                        sx={{
                          color: theme.palette.text.secondary,
                          fontSize: { xs: "0.68rem", sm: "0.75rem" },
                        }}
                      >
                        Cash
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      fontWeight="800"
                      sx={{
                        color: theme.palette.text.primary,
                        fontSize: { xs: "0.72rem", sm: "0.8rem" },
                      }}
                    >
                      ₹{methodStats.Cash.toLocaleString("en-IN")}
                    </Typography>
                  </Box>

                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={{ xs: 0.8, sm: 1 }}
                    sx={{
                      borderRadius: "7px",
                      backgroundColor: "rgba(15, 23, 42, 0.4)",
                      border: "1px solid rgba(148, 163, 184, 0.08)",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.8}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "2px",
                          backgroundColor: "#3b82f6",
                        }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight="700"
                        sx={{
                          color: theme.palette.text.secondary,
                          fontSize: { xs: "0.68rem", sm: "0.75rem" },
                        }}
                      >
                        GPay / UPI
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      fontWeight="800"
                      sx={{
                        color: theme.palette.text.primary,
                        fontSize: { xs: "0.72rem", sm: "0.8rem" },
                      }}
                    >
                      ₹{methodStats.GPay.toLocaleString("en-IN")}
                    </Typography>
                  </Box>

                  <Box
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    p={{ xs: 0.8, sm: 1 }}
                    sx={{
                      borderRadius: "7px",
                      backgroundColor: "rgba(15, 23, 42, 0.4)",
                      border: "1px solid rgba(148, 163, 184, 0.08)",
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={0.8}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "2px",
                          backgroundColor: "#a855f7",
                        }}
                      />
                      <Typography
                        variant="caption"
                        fontWeight="700"
                        sx={{
                          color: theme.palette.text.secondary,
                          fontSize: { xs: "0.68rem", sm: "0.75rem" },
                        }}
                      >
                        Bank Transfer
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      fontWeight="800"
                      sx={{
                        color: theme.palette.text.primary,
                        fontSize: { xs: "0.72rem", sm: "0.8rem" },
                      }}
                    >
                      ₹{methodStats.Bank.toLocaleString("en-IN")}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      {/* Toast Notification on Copy Digest */}
      <Snackbar
        open={copiedToast}
        autoHideDuration={2400}
        onClose={() => setCopiedToast(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setCopiedToast(false)}
          severity="success"
          icon={<CheckIcon fontSize="inherit" />}
          sx={{
            bgcolor: "#0f172a",
            color: "#10b981",
            border: "1px solid rgba(16, 185, 129, 0.35)",
            boxShadow: "0 6px 20px rgba(0, 0, 0, 0.5)",
            fontWeight: 700,
            fontSize: "0.82rem",
            borderRadius: "10px",
          }}
        >
          Portfolio digest copied to clipboard!
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

export default ReportsModal;
