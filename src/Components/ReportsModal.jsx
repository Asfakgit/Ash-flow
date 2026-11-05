import { useState, useMemo, forwardRef, useEffect, useCallback } from "react";
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
  TextField,
  InputAdornment,
  CircularProgress,
  Tabs,
  Tab,
  Button,
  Avatar,
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
import WorkspacePremiumIcon from "@mui/icons-material/WorkspacePremium";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import TableChartIcon from "@mui/icons-material/TableChart";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import BlockIcon from "@mui/icons-material/Block";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import soundEffects from "../Services/soundEffects";
import { getDataRows, getRowVal, adminGetUsers, adminGetPremiumAudits } from "../Services/SheetService";

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

function ReportsModal({ open, onClose, transactions = [], currentUser }) {
  const theme = useTheme();
  const [hoveredData, setHoveredData] = useState(null);
  const [timeRange, setTimeRange] = useState("6m"); // '3m', '6m', 'year', 'all'
  const [copiedToast, setCopiedToast] = useState(false);

  // Admin Users & Subscription Report State
  const isAdmin = currentUser?.role === "ADMIN";
  const [adminReportTab, setAdminReportTab] = useState("OVERVIEW"); // 'OVERVIEW' | 'DIRECTORY' | 'LEDGER'
  const [usersList, setUsersList] = useState([]);
  const [auditList, setAuditList] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userFilterTab, setUserFilterTab] = useState("ALL"); // 'ALL' | 'APPROVED' | 'PENDING' | 'PREMIUM' | 'STANDARD' | 'INACTIVE'
  const [copiedText, setCopiedText] = useState("Portfolio digest copied to clipboard!");

  const fetchAdminData = useCallback(async () => {
    setAdminLoading(true);
    try {
      const [usersRes, auditsRes] = await Promise.allSettled([
        adminGetUsers(),
        adminGetPremiumAudits(),
      ]);

      if (usersRes.status === "fulfilled" && usersRes.value?.success) {
        setUsersList(usersRes.value.users || []);
      }
      if (auditsRes.status === "fulfilled" && auditsRes.value?.success) {
        setAuditList(auditsRes.value.audits || []);
      }
    } catch (err) {
      console.warn("Failed to load user report data:", err);
    } finally {
      setAdminLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open && isAdmin) {
      fetchAdminData();
    }
  }, [open, isAdmin, fetchAdminData]);

  // Aggregate user statistics
  const userStats = useMemo(() => {
    const total = usersList.length;
    const pending = usersList.filter((u) => u.status === "PENDING").length;
    const approved = usersList.filter((u) => u.status === "APPROVED").length;
    const inactive = usersList.filter(
      (u) => u.status === "DISABLED" || u.status === "REJECTED"
    ).length;

    let activePremium = 0;
    let standard = 0;
    let expired = 0;
    let revoked = 0;
    let expiringSoon = 0;
    let totalRevenue = 0;
    const plansCount = {};
    const methodsCount = {};
    const tabsBound = usersList.filter((u) => u.sheetTab && u.sheetTab !== "None").length;

    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    usersList.forEach((u) => {
      const expTime = u.premiumExpiresAt ? new Date(u.premiumExpiresAt).getTime() : null;
      const isAct = Boolean(
        u.isPremiumActive ||
          (u.membershipStatus === "PREMIUM" && (!expTime || expTime > now))
      );

      if (isAct) {
        activePremium++;
        if (expTime && expTime - now < thirtyDays) {
          expiringSoon++;
        }
      } else if (u.membershipStatus === "EXPIRED" || (expTime && expTime <= now)) {
        expired++;
      } else if (u.membershipStatus === "REVOKED") {
        revoked++;
      } else {
        standard++;
      }

      const amt = parseFloat(u.premiumAmountPaid) || 0;
      if (amt > 0) {
        totalRevenue += amt;
      }

      const planName = u.premiumPlan || (isAct ? "Premium Pass" : "Standard Free");
      plansCount[planName] = (plansCount[planName] || 0) + 1;

      if (u.premiumPaymentMethod) {
        methodsCount[u.premiumPaymentMethod] =
          (methodsCount[u.premiumPaymentMethod] || 0) + 1;
      }
    });

    let auditRevenue = 0;
    auditList.forEach((a) => {
      const amt = parseFloat(a.amountPaid) || 0;
      if (amt > 0 && String(a.paymentStatus || "PAID").toUpperCase() === "PAID") {
        auditRevenue += amt;
      }
    });

    const finalRevenue = Math.max(totalRevenue, auditRevenue);
    const avgRevenue = activePremium > 0 ? Math.round(finalRevenue / activePremium) : 0;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 100;
    const premiumConversionRate = total > 0 ? Math.round((activePremium / total) * 100) : 0;

    return {
      total,
      pending,
      approved,
      inactive,
      activePremium,
      standard,
      expired,
      revoked,
      expiringSoon,
      totalRevenue: finalRevenue,
      avgRevenue,
      approvalRate,
      premiumConversionRate,
      tabsBound,
      plansCount,
      methodsCount,
    };
  }, [usersList, auditList]);

  // Filtered users for directory tab
  const filteredUsersList = useMemo(() => {
    let list = [...usersList];

    if (userFilterTab === "APPROVED") {
      list = list.filter((u) => u.status === "APPROVED");
    } else if (userFilterTab === "PENDING") {
      list = list.filter((u) => u.status === "PENDING");
    } else if (userFilterTab === "PREMIUM") {
      list = list.filter((u) => u.isPremiumActive);
    } else if (userFilterTab === "STANDARD") {
      list = list.filter((u) => !u.isPremiumActive && u.status === "APPROVED");
    } else if (userFilterTab === "INACTIVE") {
      list = list.filter((u) => u.status === "DISABLED" || u.status === "REJECTED");
    }

    if (userSearchQuery.trim()) {
      const q = userSearchQuery.toLowerCase().trim();
      list = list.filter((u) => {
        return (
          String(u.username || "").toLowerCase().includes(q) ||
          String(u.fullName || "").toLowerCase().includes(q) ||
          String(u.sheetTab || "").toLowerCase().includes(q) ||
          String(u.premiumPlan || "").toLowerCase().includes(q) ||
          String(u.premiumPaymentMethod || "").toLowerCase().includes(q) ||
          String(u.premiumPaymentRef || "").toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [usersList, userFilterTab, userSearchQuery]);

  // Handle Copy / Share Executive User Digest
  const handleCopyUserReport = () => {
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
    const reportLines = [
      `👥 Ash Flow • Users & Subscription Report (${dateStr})`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `📊 Total Registered Members: ${userStats.total}`,
      `   • Approved: ${userStats.approved} (${userStats.approvalRate}%)`,
      `   • Pending Approval: ${userStats.pending}`,
      `   • Inactive/Disabled: ${userStats.inactive}`,
      `   • Google Sheets Tabs Bound: ${userStats.tabsBound}`,
      ``,
      `👑 Premium Memberships & Revenue:`,
      `   • Active Premium Users: ${userStats.activePremium} (${userStats.premiumConversionRate}%)`,
      `   • Total Subscription Revenue: ₹${userStats.totalRevenue.toLocaleString("en-IN")}`,
      `   • Average Revenue Per Active User: ₹${userStats.avgRevenue.toLocaleString("en-IN")}`,
      `   • Expiring in < 30 Days: ${userStats.expiringSoon}`,
      `   • Expired / Revoked: ${userStats.expired + userStats.revoked}`,
      ``,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `Generated by Ash Flow Administration Intelligence`,
    ].join("\n");

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(reportLines)
        .then(() => {
          setCopiedText("User & Subscription Report copied to clipboard!");
          setCopiedToast(true);
        })
        .catch(() => {
          setCopiedText("User & Subscription Report copied to clipboard!");
          setCopiedToast(true);
        });
    } else {
      setCopiedText("User & Subscription Report copied to clipboard!");
      setCopiedToast(true);
    }
  };

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
    recoveryRate,
    recoveredAmount,
    topDebtor,
    concentrationPct,
    aiInsight,
    healthScore,
    healthLabel,
    healthColor,
    peakLentTx,
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
              background: isAdmin
                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                : theme.palette.custom?.primaryGradient ||
                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              boxShadow: "0 2px 10px rgba(16, 185, 129, 0.35)",
            }}
          >
            {isAdmin ? (
              <PeopleAltIcon sx={{ fontSize: { xs: 18, sm: 22 } }} />
            ) : (
              <AssessmentIcon sx={{ fontSize: { xs: 17, sm: 22 } }} />
            )}
          </Box>
          <Box>
            <Box display="flex" alignItems="center" gap={0.8}>
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
                {isAdmin ? "Users & Membership Analytics Report" : "Reports & Analytics"}
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                fontSize: { xs: "0.62rem", sm: "0.72rem" },
                display: { xs: "none", sm: "block" },
              }}
            >
              {isAdmin
                ? "Real-time Member Intelligence, Subscription Revenue, Lifecycle Metrics & Directory Details"
                : "Real-time Portfolio Intelligence & Cash Flow"}
            </Typography>
          </Box>
        </Box>

        {/* Action Controls: Refresh, One-Tap Digest Copy & Close */}
        <Box display="flex" alignItems="center" gap={0.8}>
          {isAdmin && (
            <Tooltip title="Refresh User & Payment Records" arrow>
              <IconButton
                onClick={fetchAdminData}
                disabled={adminLoading}
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
                <RefreshIcon
                  sx={{
                    fontSize: { xs: 16, sm: 18 },
                    animation: adminLoading ? "spin 1s linear infinite" : "none",
                  }}
                />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title={isAdmin ? "Copy Executive User Report" : "Copy Portfolio Digest"} arrow>
            <IconButton
              onClick={isAdmin ? handleCopyUserReport : handleCopyDigest}
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
        {isAdmin ? (
          <Box
            sx={{
              maxWidth: 1100,
              mx: "auto",
              display: "flex",
              flexDirection: "column",
              gap: { xs: 1.5, sm: 2.5 },
              pb: 3,
            }}
          >
            {/* Top Navigation Tabs */}
            <Paper
              elevation={0}
              sx={{
                p: 0.6,
                borderRadius: 2,
                background:
                  theme.palette.mode === "dark"
                    ? "rgba(25, 25, 30, 0.7)"
                    : "rgba(240, 243, 246, 0.8)",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Tabs
                value={adminReportTab}
                onChange={(e, val) => setAdminReportTab(val)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{
                  minHeight: 40,
                  "& .MuiTab-root": {
                    minHeight: 40,
                    py: 0.6,
                    px: { xs: 1.5, sm: 2.5 },
                    borderRadius: 1.5,
                    fontWeight: 700,
                    fontSize: { xs: "0.78rem", sm: "0.85rem" },
                    textTransform: "none",
                    color: theme.palette.text.secondary,
                    "&.Mui-selected": {
                      color: "#ffffff",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    },
                  },
                  "& .MuiTabs-indicator": { display: "none" },
                }}
              >
                <Tab
                  value="OVERVIEW"
                  label="Overview & Intelligence"
                  icon={<BarChartIcon sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                />
                <Tab
                  value="DIRECTORY"
                  label={`User Directory & Details (${userStats.total})`}
                  icon={<PeopleAltIcon sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                />
                <Tab
                  value="LEDGER"
                  label={`Subscription Receipts Ledger (${auditList.length})`}
                  icon={<ReceiptLongIcon sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                />
              </Tabs>
            </Paper>

            {/* TAB 1: OVERVIEW & INTELLIGENCE */}
            {adminReportTab === "OVERVIEW" && (
              <>
                {/* KPI Cards Grid */}
                <Grid container spacing={{ xs: 1, sm: 2 }}>
                  {/* Card 1: Total Users */}
                  <Grid item xs={6} sm={3}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 1.5, sm: 2.2 },
                        borderRadius: 2.5,
                        background:
                          theme.palette.mode === "dark"
                            ? "linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(20, 20, 24, 0.95) 100%)"
                            : "linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" sx={{ color: "#10b981", fontWeight: 800 }}>
                          TOTAL USERS
                        </Typography>
                        <PeopleAltIcon sx={{ fontSize: 20, color: "#10b981" }} />
                      </Box>
                      <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: "-0.02em", mb: 0.5 }}>
                        {userStats.total}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {userStats.approved} Active • {userStats.pending} Pending • {userStats.inactive} Inactive
                      </Typography>
                    </Paper>
                  </Grid>

                  {/* Card 2: Active Premium Members */}
                  <Grid item xs={6} sm={3}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 1.5, sm: 2.2 },
                        borderRadius: 2.5,
                        background:
                          theme.palette.mode === "dark"
                            ? "linear-gradient(145deg, rgba(229, 193, 88, 0.14) 0%, rgba(20, 20, 24, 0.95) 100%)"
                            : "linear-gradient(145deg, rgba(229, 193, 88, 0.1) 0%, rgba(255, 255, 255, 0.95) 100%)",
                        border: "1px solid rgba(229, 193, 88, 0.45)",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" sx={{ color: "#F5D77F", fontWeight: 800 }}>
                          ACTIVE PREMIUM
                        </Typography>
                        <WorkspacePremiumIcon sx={{ fontSize: 20, color: "#E5C158" }} />
                      </Box>
                      <Typography
                        variant="h4"
                        fontWeight="800"
                        sx={{ color: "#F5D77F", letterSpacing: "-0.02em", mb: 0.5 }}
                      >
                        {userStats.activePremium}{" "}
                        <span style={{ fontSize: "0.9rem", color: theme.palette.text.secondary }}>
                          ({userStats.premiumConversionRate}%)
                        </span>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {userStats.expiringSoon > 0
                          ? `${userStats.expiringSoon} Expiring Soon (<30d)`
                          : "All active in good standing"}
                      </Typography>
                    </Paper>
                  </Grid>

                  {/* Card 3: Subscription Revenue */}
                  <Grid item xs={6} sm={3}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 1.5, sm: 2.2 },
                        borderRadius: 2.5,
                        background:
                          theme.palette.mode === "dark"
                            ? "linear-gradient(145deg, rgba(56, 189, 248, 0.12) 0%, rgba(20, 20, 24, 0.95) 100%)"
                            : "linear-gradient(145deg, rgba(56, 189, 248, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
                        border: "1px solid rgba(56, 189, 248, 0.35)",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" sx={{ color: "#38bdf8", fontWeight: 800 }}>
                          SUBSCRIPTION REVENUE
                        </Typography>
                        <PaymentsIcon sx={{ fontSize: 20, color: "#38bdf8" }} />
                      </Box>
                      <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: "-0.02em", mb: 0.5 }}>
                        ₹{userStats.totalRevenue.toLocaleString("en-IN")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ARPU: ₹{userStats.avgRevenue.toLocaleString("en-IN")} • {auditList.length} Receipts
                      </Typography>
                    </Paper>
                  </Grid>

                  {/* Card 4: Google Sheets Tabs Provisioned */}
                  <Grid item xs={6} sm={3}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: { xs: 1.5, sm: 2.2 },
                        borderRadius: 2.5,
                        background:
                          theme.palette.mode === "dark"
                            ? "linear-gradient(145deg, rgba(168, 85, 247, 0.12) 0%, rgba(20, 20, 24, 0.95) 100%)"
                            : "linear-gradient(145deg, rgba(168, 85, 247, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)",
                        border: "1px solid rgba(168, 85, 247, 0.35)",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                        <Typography variant="caption" sx={{ color: "#c084fc", fontWeight: 800 }}>
                          SHEETS TABS BOUND
                        </Typography>
                        <TableChartIcon sx={{ fontSize: 20, color: "#c084fc" }} />
                      </Box>
                      <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: "-0.02em", mb: 0.5 }}>
                        {userStats.tabsBound} / {userStats.total}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        19-Column Schema & Live Audits Tab
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* Visual Analytics Grid */}
                <Grid container spacing={{ xs: 1.5, sm: 2 }}>
                  {/* Subscriptions by Plan */}
                  <Grid item xs={12} md={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2.5,
                        borderRadius: 2.5,
                        background: theme.palette.custom?.cardGradient || "rgba(25, 25, 30, 0.6)",
                        border: `1px solid ${theme.palette.divider}`,
                        height: "100%",
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1} mb={2}>
                        <WorkspacePremiumIcon sx={{ color: "#E5C158", fontSize: 22 }} />
                        <Typography variant="subtitle1" fontWeight="800">
                          Subscription Plans Breakdown
                        </Typography>
                      </Box>

                      <Box display="flex" flexDirection="column" gap={1.8}>
                        {[
                          { id: "1M", label: "Monthly", period: "1 Month", color: "#8b5cf6" },
                          { id: "6M", label: "Half-Yearly", period: "6 Months", color: "#06b6d4" },
                          { id: "1Y", label: "Yearly", period: "1 Year", color: "#E5C158" },
                        ].map((plan) => {
                          const count = usersList.filter((u) => {
                            const p = String(u.premiumPlan || "").toLowerCase();
                            return (
                              p.includes(plan.id.toLowerCase()) ||
                              p.includes(plan.label.toLowerCase()) ||
                              p.includes(plan.period.toLowerCase())
                            );
                          }).length;
                          const pct =
                            userStats.total > 0
                              ? Math.round((count / userStats.total) * 100)
                              : 0;

                          return (
                            <Box key={plan.id}>
                              <Box
                                display="flex"
                                justifyContent="space-between"
                                alignItems="center"
                                mb={0.6}
                              >
                                <Typography variant="caption" fontWeight="700">
                                  {plan.label}{" "}
                                  <span style={{ color: theme.palette.text.secondary }}>
                                    ({plan.period})
                                  </span>
                                </Typography>
                                <Typography
                                  variant="caption"
                                  fontWeight="800"
                                  sx={{ color: plan.color }}
                                >
                                  {count} users ({pct}%)
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={pct}
                                sx={{
                                  height: 7,
                                  borderRadius: 4,
                                  bgcolor: "rgba(255, 255, 255, 0.06)",
                                  "& .MuiLinearProgress-bar": {
                                    bgcolor: plan.color,
                                    borderRadius: 4,
                                  },
                                }}
                              />
                            </Box>
                          );
                        })}
                      </Box>
                    </Paper>
                  </Grid>

                  {/* Payment Methods Breakdown & Lifecycle Radar */}
                  <Grid item xs={12} md={6}>
                    <Box display="flex" flexDirection="column" gap={2} height="100%">
                      {/* Payment Methods */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.5,
                          borderRadius: 2.5,
                          background:
                            theme.palette.custom?.cardGradient || "rgba(25, 25, 30, 0.6)",
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <PaymentsIcon sx={{ color: "#10b981", fontSize: 22 }} />
                          <Typography variant="subtitle1" fontWeight="800">
                            Payment Methods & Channels
                          </Typography>
                        </Box>

                        <Box display="flex" flexDirection="column" gap={1.6}>
                          {[
                            {
                              label: "UPI (GPay)",
                              count: usersList.filter(
                                (u) =>
                                  String(u.premiumPaymentMethod || "").toLowerCase().includes("upi") ||
                                  String(u.premiumPaymentMethod || "").toLowerCase().includes("gpay")
                              ).length,
                              color: "#10b981",
                            },
                            {
                              label: "Bank Transfer (NEFT / IMPS)",
                              count: usersList.filter((u) =>
                                String(u.premiumPaymentMethod || "").toLowerCase().includes("bank")
                              ).length,
                              color: "#06b6d4",
                            },
                            {
                              label: "Cash In-Hand",
                              count: usersList.filter((u) =>
                                String(u.premiumPaymentMethod || "").toLowerCase().includes("cash")
                              ).length,
                              color: "#f59e0b",
                            },
                            {
                              label: "Cards / Online NetBanking",
                              count: usersList.filter(
                                (u) =>
                                  String(u.premiumPaymentMethod || "").toLowerCase().includes("card") ||
                                  String(u.premiumPaymentMethod || "").toLowerCase().includes("net")
                              ).length,
                              color: "#8b5cf6",
                            },
                            {
                              label: "Complimentary / Admin Waiver",
                              count: usersList.filter(
                                (u) =>
                                  String(u.premiumPaymentMethod || "")
                                    .toLowerCase()
                                    .includes("complimentary") ||
                                  String(u.premiumPaymentMethod || "")
                                    .toLowerCase()
                                    .includes("waiver")
                              ).length,
                              color: "#94a3b8",
                            },
                          ].map((pm) => {
                            const pct =
                              userStats.activePremium > 0
                                ? Math.round((pm.count / userStats.activePremium) * 100)
                                : 0;
                            return (
                              <Box key={pm.label}>
                                <Box
                                  display="flex"
                                  justifyContent="space-between"
                                  alignItems="center"
                                  mb={0.5}
                                >
                                  <Typography variant="caption" fontWeight="700">
                                    {pm.label}
                                  </Typography>
                                  <Typography
                                    variant="caption"
                                    fontWeight="800"
                                    sx={{ color: pm.color }}
                                  >
                                    {pm.count} paid
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={pct}
                                  sx={{
                                    height: 6,
                                    borderRadius: 4,
                                    bgcolor: "rgba(255, 255, 255, 0.06)",
                                    "& .MuiLinearProgress-bar": {
                                      bgcolor: pm.color,
                                      borderRadius: 4,
                                    },
                                  }}
                                />
                              </Box>
                            );
                          })}
                        </Box>
                      </Paper>

                      {/* Membership Lifecycle Horizon */}
                      <Paper
                        elevation={0}
                        sx={{
                          p: 2.2,
                          borderRadius: 2.5,
                          background:
                            theme.palette.custom?.cardGradient || "rgba(25, 25, 30, 0.6)",
                          border: `1px solid ${theme.palette.divider}`,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight="800" mb={1.5}>
                          Membership Lifecycle Horizon
                        </Typography>
                        <Grid container spacing={1}>
                          <Grid item xs={6} sm={3}>
                            <Box
                              p={1.2}
                              borderRadius={2}
                              bgcolor="rgba(16, 185, 129, 0.1)"
                              border="1px solid rgba(16, 185, 129, 0.25)"
                              textAlign="center"
                            >
                              <Typography
                                variant="h6"
                                fontWeight="800"
                                sx={{ color: "#10b981", lineHeight: 1.1 }}
                              >
                                {userStats.activePremium - userStats.expiringSoon}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ fontSize: "0.68rem", color: "text.secondary" }}
                              >
                                Active &gt;30d
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Box
                              p={1.2}
                              borderRadius={2}
                              bgcolor="rgba(245, 158, 11, 0.1)"
                              border="1px solid rgba(245, 158, 11, 0.25)"
                              textAlign="center"
                            >
                              <Typography
                                variant="h6"
                                fontWeight="800"
                                sx={{ color: "#f59e0b", lineHeight: 1.1 }}
                              >
                                {userStats.expiringSoon}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ fontSize: "0.68rem", color: "text.secondary" }}
                              >
                                Expiring &lt;30d
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Box
                              p={1.2}
                              borderRadius={2}
                              bgcolor="rgba(239, 68, 68, 0.1)"
                              border="1px solid rgba(239, 68, 68, 0.25)"
                              textAlign="center"
                            >
                              <Typography
                                variant="h6"
                                fontWeight="800"
                                sx={{ color: "#ef4444", lineHeight: 1.1 }}
                              >
                                {userStats.expired + userStats.revoked}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ fontSize: "0.68rem", color: "text.secondary" }}
                              >
                                Expired/Revoked
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Box
                              p={1.2}
                              borderRadius={2}
                              bgcolor="rgba(148, 163, 184, 0.1)"
                              border="1px solid rgba(148, 163, 184, 0.25)"
                              textAlign="center"
                            >
                              <Typography
                                variant="h6"
                                fontWeight="800"
                                sx={{ color: "#94a3b8", lineHeight: 1.1 }}
                              >
                                {userStats.standard}
                              </Typography>
                              <Typography
                                variant="caption"
                                sx={{ fontSize: "0.68rem", color: "text.secondary" }}
                              >
                                Standard Free
                              </Typography>
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Box>
                  </Grid>
                </Grid>
              </>
            )}

            {/* TAB 2: USER DIRECTORY & RELATED DETAILS */}
            {adminReportTab === "DIRECTORY" && (
              <Box display="flex" flexDirection="column" gap={2}>
                {/* Search & Category Filter Toolbar */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    background:
                      theme.palette.custom?.cardGradient || "rgba(25, 25, 30, 0.6)",
                    border: `1px solid ${theme.palette.divider}`,
                    display: "flex",
                    flexDirection: { xs: "column", md: "row" },
                    alignItems: { xs: "stretch", md: "center" },
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  <Tabs
                    value={userFilterTab}
                    onChange={(e, val) => setUserFilterTab(val)}
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{
                      minHeight: 34,
                      "& .MuiTab-root": {
                        minHeight: 32,
                        py: 0.4,
                        px: 1.6,
                        borderRadius: 1.5,
                        fontWeight: 700,
                        fontSize: "0.76rem",
                        textTransform: "none",
                        color: theme.palette.text.secondary,
                        "&.Mui-selected": {
                          color: "#ffffff",
                          background: theme.palette.primary.main,
                        },
                      },
                      "& .MuiTabs-indicator": { display: "none" },
                    }}
                  >
                    <Tab value="ALL" label={`All (${userStats.total})`} />
                    <Tab value="APPROVED" label={`Approved (${userStats.approved})`} />
                    <Tab value="PENDING" label={`Pending (${userStats.pending})`} />
                    <Tab value="PREMIUM" label={`Premium (${userStats.activePremium})`} />
                    <Tab value="STANDARD" label={`Standard (${userStats.standard})`} />
                    <Tab value="INACTIVE" label={`Inactive (${userStats.inactive})`} />
                  </Tabs>

                  <TextField
                    size="small"
                    placeholder="Search member, plan, tab, ref..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    sx={{ width: { xs: "100%", md: 260 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Paper>

                {/* User Detail Cards */}
                {adminLoading ? (
                  <Box textAlign="center" py={6}>
                    <CircularProgress size={36} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Loading member details from Google Sheets...
                    </Typography>
                  </Box>
                ) : filteredUsersList.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 6,
                      textAlign: "center",
                      borderRadius: 2.5,
                      background:
                        theme.palette.custom?.cardGradient || "rgba(25, 25, 30, 0.6)",
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <PeopleAltIcon
                      sx={{ fontSize: 48, color: "text.secondary", opacity: 0.4, mb: 1 }}
                    />
                    <Typography variant="subtitle1" fontWeight="700">
                      No users matched your filter
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Try adjusting your search query or switching tabs.
                    </Typography>
                  </Paper>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1.5}>
                    {filteredUsersList.map((u) => {
                      const daysLeft = u.premiumExpiresAt
                        ? Math.max(
                            0,
                            Math.ceil(
                              (new Date(u.premiumExpiresAt).getTime() - Date.now()) /
                                (1000 * 60 * 60 * 24)
                            )
                          )
                        : null;

                      return (
                        <Paper
                          key={u.id || u.username}
                          elevation={0}
                          sx={{
                            p: { xs: 2, sm: 2.4 },
                            borderRadius: 2.5,
                            background:
                              theme.palette.custom?.cardGradient || "rgba(25, 25, 30, 0.6)",
                            border: `1px solid ${
                              u.isPremiumActive
                                ? "rgba(229, 193, 88, 0.35)"
                                : theme.palette.divider
                            }`,
                            transition: "all 0.2s ease",
                            "&:hover": {
                              borderColor: u.isPremiumActive
                                ? "#E5C158"
                                : theme.palette.primary.main,
                              boxShadow: u.isPremiumActive
                                ? "0 4px 18px rgba(229, 193, 88, 0.15)"
                                : `0 4px 16px ${theme.palette.primary.main}1A`,
                            },
                          }}
                        >
                          <Grid container spacing={2} alignItems="center">
                            {/* User Identity */}
                            <Grid item xs={12} sm={4}>
                              <Box display="flex" alignItems="center" gap={1.8}>
                                <Avatar
                                  src={u.avatar || u.photoURL || undefined}
                                  sx={{
                                    width: 44,
                                    height: 44,
                                    bgcolor: u.isPremiumActive
                                      ? "rgba(229, 193, 88, 0.2)"
                                      : "rgba(16, 185, 129, 0.2)",
                                    color: u.isPremiumActive ? "#F5D77F" : "#10b981",
                                    fontWeight: 800,
                                    fontSize: "0.95rem",
                                    border: u.isPremiumActive
                                      ? "1.5px solid rgba(229, 193, 88, 0.5)"
                                      : "1.5px solid rgba(16, 185, 129, 0.3)",
                                  }}
                                >
                                  {String(u.fullName || u.username || "U")
                                    .charAt(0)
                                    .toUpperCase()}
                                </Avatar>
                                <Box minWidth={0}>
                                  <Box display="flex" alignItems="center" gap={0.8} flexWrap="wrap">
                                    <Typography
                                      variant="subtitle2"
                                      fontWeight="800"
                                      noWrap
                                      sx={{
                                        color: u.isPremiumActive
                                          ? "#F5D77F"
                                          : theme.palette.text.primary,
                                      }}
                                    >
                                      {u.fullName || u.username}
                                    </Typography>
                                    {u.role === "ADMIN" && (
                                      <Chip
                                        size="small"
                                        label="ADMIN"
                                        sx={{
                                          height: 18,
                                          fontSize: "0.62rem",
                                          fontWeight: 800,
                                          bgcolor: "rgba(16, 185, 129, 0.15)",
                                          color: "#10b981",
                                          border: "1px solid rgba(16, 185, 129, 0.3)",
                                        }}
                                      />
                                    )}
                                  </Box>
                                  <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                    noWrap
                                  >
                                    @{u.username} •{" "}
                                    {u.joined || u.createdAt
                                      ? `Joined: ${u.joined || u.createdAt}`
                                      : "Registered Member"}
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>

                            {/* Status & Plan */}
                            <Grid item xs={6} sm={3}>
                              <Box display="flex" flexDirection="column" gap={0.6}>
                                <Box display="flex" alignItems="center" gap={0.8} flexWrap="wrap">
                                  <Chip
                                    size="small"
                                    label={u.status || "APPROVED"}
                                    sx={{
                                      height: 20,
                                      fontSize: "0.68rem",
                                      fontWeight: 800,
                                      bgcolor:
                                        u.status === "APPROVED"
                                          ? "rgba(16, 185, 129, 0.15)"
                                          : u.status === "PENDING"
                                          ? "rgba(245, 158, 11, 0.15)"
                                          : "rgba(107, 114, 128, 0.15)",
                                      color:
                                        u.status === "APPROVED"
                                          ? "#10b981"
                                          : u.status === "PENDING"
                                          ? "#f59e0b"
                                          : "#9ca3af",
                                      border: `1px solid ${
                                        u.status === "APPROVED"
                                          ? "rgba(16, 185, 129, 0.3)"
                                          : u.status === "PENDING"
                                          ? "rgba(245, 158, 11, 0.3)"
                                          : "rgba(107, 114, 128, 0.3)"
                                      }`,
                                    }}
                                  />

                                  {u.isPremiumActive ? (
                                    <Chip
                                      size="small"
                                      icon={
                                        <WorkspacePremiumIcon
                                          sx={{ fontSize: 13, color: "#1a1500" }}
                                        />
                                      }
                                      label={
                                        daysLeft !== null
                                          ? `PREMIUM • ${daysLeft}d left`
                                          : "PREMIUM"
                                      }
                                      sx={{
                                        height: 20,
                                        fontSize: "0.68rem",
                                        fontWeight: 800,
                                        bgcolor: "#E5C158",
                                        color: "#1a1500",
                                      }}
                                    />
                                  ) : (
                                    <Chip
                                      size="small"
                                      label="STANDARD"
                                      sx={{
                                        height: 20,
                                        fontSize: "0.68rem",
                                        fontWeight: 700,
                                        bgcolor: "rgba(255, 255, 255, 0.05)",
                                        color: "text.secondary",
                                      }}
                                    />
                                  )}
                                </Box>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: theme.palette.text.secondary,
                                    fontWeight: 600,
                                  }}
                                >
                                  {u.premiumPlan ||
                                    (u.isPremiumActive ? "Active VIP Pass" : "Standard Tier")}
                                </Typography>
                              </Box>
                            </Grid>

                            {/* Subscription Financials & Payment Method */}
                            <Grid item xs={6} sm={3}>
                              <Box display="flex" flexDirection="column" gap={0.4}>
                                <Typography variant="body2" fontWeight="800">
                                  {u.premiumAmountPaid
                                    ? `₹${Number(u.premiumAmountPaid).toLocaleString("en-IN")}`
                                    : "₹0"}
                                  <span
                                    style={{
                                      fontSize: "0.74rem",
                                      fontWeight: 500,
                                      color: theme.palette.text.secondary,
                                      marginLeft: 6,
                                    }}
                                  >
                                    {u.premiumPaymentMethod || "None"}
                                  </span>
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {u.premiumPaymentRef
                                    ? `Ref: ${u.premiumPaymentRef}`
                                    : "No payment ref"}
                                </Typography>
                              </Box>
                            </Grid>

                            {/* Sheet Tab & Validity Horizon */}
                            <Grid item xs={12} sm={2}>
                              <Box
                                display="flex"
                                flexDirection="column"
                                gap={0.4}
                                textAlign={{ xs: "left", sm: "right" }}
                              >
                                <Chip
                                  size="small"
                                  icon={
                                    <TableChartIcon
                                      sx={{ fontSize: 12, color: "#10b981 !important" }}
                                    />
                                  }
                                  label={u.sheetTab || "No Tab"}
                                  sx={{
                                    height: 20,
                                    fontSize: "0.68rem",
                                    fontWeight: 700,
                                    fontFamily: "monospace",
                                    bgcolor: "rgba(16, 185, 129, 0.08)",
                                    color: "#10b981",
                                    alignSelf: { xs: "flex-start", sm: "flex-end" },
                                  }}
                                />
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ fontSize: "0.68rem" }}
                                >
                                  {u.premiumExpiresAt
                                    ? `Expires: ${new Date(
                                        u.premiumExpiresAt
                                      ).toLocaleDateString()}`
                                    : "Standard Account"}
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Paper>
                      );
                    })}
                  </Box>
                )}
              </Box>
            )}

            {/* TAB 3: SUBSCRIPTION RECEIPTS LEDGER */}
            {adminReportTab === "LEDGER" && (
              <Box display="flex" flexDirection="column" gap={2}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    background:
                      theme.palette.custom?.cardGradient || "rgba(25, 25, 30, 0.6)",
                    border: `1px solid ${theme.palette.divider}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.2}>
                    <ReceiptLongIcon sx={{ color: "#E5C158", fontSize: 24 }} />
                    <Box>
                      <Typography variant="subtitle2" fontWeight="800">
                        Subscription Payments Audit Ledger
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Immutable, chronological payment stream recorded across all member subscriptions
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    size="small"
                    label={`${auditList.length} Receipts`}
                    sx={{
                      fontWeight: 800,
                      bgcolor: "rgba(229, 193, 88, 0.15)",
                      color: "#F5D77F",
                    }}
                  />
                </Paper>

                {adminLoading ? (
                  <Box textAlign="center" py={6}>
                    <CircularProgress size={36} />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                      Loading payment receipts...
                    </Typography>
                  </Box>
                ) : auditList.length === 0 ? (
                  <Paper
                    elevation={0}
                    sx={{
                      p: 6,
                      textAlign: "center",
                      borderRadius: 2.5,
                      background:
                        theme.palette.custom?.cardGradient || "rgba(25, 25, 30, 0.6)",
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <ReceiptLongIcon
                      sx={{ fontSize: 48, color: "text.secondary", opacity: 0.4, mb: 1 }}
                    />
                    <Typography variant="subtitle1" fontWeight="700">
                      No subscription receipts recorded yet
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Payments recorded via "Enter Subscription Payment" will appear in this ledger.
                    </Typography>
                  </Paper>
                ) : (
                  <Box display="flex" flexDirection="column" gap={1.2}>
                    {auditList.map((aud, idx) => (
                      <Paper
                        key={aud.id || idx}
                        elevation={0}
                        sx={{
                          p: { xs: 1.8, sm: 2.2 },
                          borderRadius: 2,
                          background:
                            theme.palette.custom?.cardGradient || "rgba(25, 25, 30, 0.6)",
                          border: "1px solid rgba(229, 193, 88, 0.25)",
                        }}
                      >
                        <Grid container spacing={1.5} alignItems="center">
                          <Grid item xs={12} sm={3}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Chip
                                size="small"
                                label={aud.action || "ACTIVATE"}
                                sx={{
                                  height: 20,
                                  fontSize: "0.68rem",
                                  fontWeight: 800,
                                  bgcolor:
                                    aud.action === "REVOKE"
                                      ? "rgba(239, 68, 68, 0.15)"
                                      : "rgba(16, 185, 129, 0.15)",
                                  color: aud.action === "REVOKE" ? "#ef4444" : "#10b981",
                                }}
                              />
                              <Typography variant="subtitle2" fontWeight="800">
                                @{aud.username || aud.targetUsername}
                              </Typography>
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              {aud.timestamp
                                ? new Date(aud.timestamp).toLocaleString()
                                : "Recent"}
                            </Typography>
                          </Grid>

                          <Grid item xs={6} sm={3}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Plan / Membership
                            </Typography>
                            <Typography variant="body2" fontWeight="700">
                              {aud.planName || "Annual VIP Pass"}
                            </Typography>
                          </Grid>

                          <Grid item xs={6} sm={3}>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Amount Paid & Mode
                            </Typography>
                            <Typography
                              variant="body2"
                              fontWeight="800"
                              sx={{ color: "#10b981" }}
                            >
                              +₹{Number(aud.amountPaid || 0).toLocaleString("en-IN")}{" "}
                              <span
                                style={{
                                  fontSize: "0.74rem",
                                  color: theme.palette.text.secondary,
                                }}
                              >
                                ({aud.paymentMethod || "UPI"})
                              </span>
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                              noWrap
                            >
                              {aud.paymentReference
                                ? `Ref: ${aud.paymentReference}`
                                : "No UTR"}
                            </Typography>
                          </Grid>

                          <Grid
                            item
                            xs={12}
                            sm={3}
                            textAlign={{ xs: "left", sm: "right" }}
                          >
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Validity Window
                            </Typography>
                            <Typography variant="caption" fontWeight="700">
                              {aud.validUntil ? `Until: ${aud.validUntil}` : "Lifetime"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              display="block"
                            >
                              Admin: @{aud.adminUsername || "admin"}
                            </Typography>
                          </Grid>
                        </Grid>
                      </Paper>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        ) : (
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
        )}
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
          {copiedText}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}

export default ReportsModal;
