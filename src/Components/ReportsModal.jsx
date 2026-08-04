import { useState, useMemo, forwardRef } from "react";
import { useTheme } from "@mui/material/styles";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Slide,
  Grid,
  Paper,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AssessmentIcon from "@mui/icons-material/Assessment";
import BalanceIcon from "@mui/icons-material/Balance";
import ArrowCircleUpIcon from "@mui/icons-material/ArrowCircleUp";
import ArrowCircleDownIcon from "@mui/icons-material/ArrowCircleDown";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { getDataRows, getRowVal } from "../Services/SheetService";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ReportsModal({ open, onClose, transactions = [] }) {
  const theme = useTheme();
  const [hoveredData, setHoveredData] = useState(null);

  // Aggregate Data
  const { chartData, maxVal, summary, methodStats } = useMemo(() => {
    const rows = getDataRows(transactions);
    const now = new Date();

    let totalLent = 0;
    let totalBorrowed = 0;
    let methods = { Cash: 0, GPay: 0, Bank: 0 };

    // Process all rows for all-time totals and methods
    rows.forEach((row) => {
      const amount = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
      const type = String(getRowVal(row, 3, "type", "")).toLowerCase();
      const method = String(getRowVal(row, 6, "method", getRowVal(row, 6, "paymentMethod", "Cash"))).toLowerCase();

      if (type === "lent") totalLent += amount;
      if (type === "borrowed") totalBorrowed += amount;

      if (method === "gpay") methods.GPay += amount;
      else if (method === "bank") methods.Bank += amount;
      else methods.Cash += amount;
    });

    // Create map for last 6 months for the chart
    const monthMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
      monthMap[key] = { key, label, lent: 0, borrowed: 0 };
    }

    rows.forEach((row) => {
      let rawDate = getRowVal(row, 4, "date", "");
      if (!rawDate) return;

      let parsedDate = null;
      if (rawDate instanceof Date) {
        parsedDate = rawDate;
      } else if (typeof rawDate === "string") {
        const dmyMatch = rawDate.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
        if (dmyMatch) {
          parsedDate = new Date(parseInt(dmyMatch[3], 10), parseInt(dmyMatch[2], 10) - 1, parseInt(dmyMatch[1], 10));
        } else {
          parsedDate = new Date(rawDate);
        }
      }

      if (parsedDate && !isNaN(parsedDate.getTime())) {
        const rowYear = parsedDate.getFullYear();
        const rowMonth = String(parsedDate.getMonth() + 1).padStart(2, "0");
        const key = `${rowYear}-${rowMonth}`;

        if (monthMap[key]) {
          const amount = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
          const type = String(getRowVal(row, 3, "type", "")).toLowerCase();

          if (type === "lent") monthMap[key].lent += amount;
          if (type === "borrowed") monthMap[key].borrowed += amount;
        }
      }
    });

    const data = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key));
    let max = 5000;
    data.forEach((d) => {
      if (d.lent > max) max = d.lent;
      if (d.borrowed > max) max = d.borrowed;
    });

    return {
      chartData: data,
      maxVal: max,
      summary: { totalLent, totalBorrowed },
      methodStats: methods,
    };
  }, [transactions]);

  return (
    <Dialog
      open={Boolean(open)}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: 2.5, sm: 4 },
          background: theme.palette.custom.cardGradient,
          border: "1px solid rgba(148, 163, 184, 0.15)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
          overflow: "hidden",
          m: { xs: 1, sm: 2 },
          maxHeight: "92vh",
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
          pt: 2,
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
              width: { xs: 38, sm: 46 },
              height: { xs: 38, sm: 46 },
              borderRadius: "14px",
              background: theme.palette.custom.primaryGradient,
              color: theme.palette.text.primary,
              boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
            }}
          >
            <AssessmentIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="800" sx={{ color: theme.palette.text.primary, fontSize: { xs: "1.1rem", sm: "1.35rem" } }}>
              Reports & Analytics
            </Typography>
            <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: "0.75rem" }}>
              All-time cash flow and monthly visualization
            </Typography>
          </Box>
        </Box>

        <IconButton
          onClick={onClose}
          sx={{
            color: theme.palette.text.secondary,
            "&:hover": { color: theme.palette.text.primary, backgroundColor: theme.palette.divider },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3 }, py: { xs: 1, sm: 1.5 }, overflowY: "hidden" }}>
        
        {/* ALL-TIME SUMMARY CARDS */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Typography variant="subtitle2" fontWeight="700" sx={{ color: theme.palette.text.primary, display: "flex", alignItems: "center", gap: 1 }}>
            <AccountBalanceWalletIcon sx={{ color: theme.palette.primary.main, fontSize: 18 }} />
            Analytical Insights & Breakdown
          </Typography>
        </Box>

        <Grid container spacing={1} mb={1.5}>
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                backgroundColor: theme.palette.custom.successBoxBg,
                border: "1px solid rgba(16, 185, 129, 0.2)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <ArrowCircleUpIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                <Typography variant="caption" fontWeight="800" sx={{ color: theme.palette.primary.main, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Total Lent
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="800" sx={{ color: theme.palette.primary.main, mb: 0 }}>
                ₹{summary.totalLent.toLocaleString("en-IN")}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: "none" }}></Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                backgroundColor: theme.palette.custom.secondaryBoxBg,
                border: "1px solid rgba(99, 102, 241, 0.2)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <ArrowCircleDownIcon sx={{ color: theme.palette.secondary.main, fontSize: 20 }} />
                <Typography variant="caption" fontWeight="800" sx={{ color: theme.palette.secondary.main, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Total Borrowed
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="800" sx={{ color: theme.palette.secondary.main, mb: 0 }}>
                ₹{summary.totalBorrowed.toLocaleString("en-IN")}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: "none" }}></Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                backgroundColor: summary.totalLent - summary.totalBorrowed >= 0 ? theme.palette.custom.netPositiveBoxBg : theme.palette.custom.errorBoxBg,
                border: summary.totalLent - summary.totalBorrowed >= 0 ? "1px solid rgba(168, 85, 247, 0.2)" : "1px solid rgba(244, 63, 94, 0.2)",
                height: "100%",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                <BalanceIcon sx={{ color: summary.totalLent - summary.totalBorrowed >= 0 ? theme.palette.custom.netPositiveColor : theme.palette.error.main, fontSize: 20 }} />
                <Typography variant="caption" fontWeight="800" sx={{ color: summary.totalLent - summary.totalBorrowed >= 0 ? theme.palette.custom.netPositiveColor : theme.palette.error.main, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Net Difference
                </Typography>
              </Box>
              <Typography
                variant="h5"
                fontWeight="800"
                sx={{ color: summary.totalLent - summary.totalBorrowed >= 0 ? theme.palette.custom.netPositiveColor : theme.palette.error.main, mb: 0 }}
              >
                ₹{(summary.totalLent - summary.totalBorrowed).toLocaleString("en-IN")}
              </Typography>
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary, display: "none" }}></Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* MONTHLY BAR CHART */}
        <Box
          sx={{
            p: 1,
            borderRadius: 1.5,
            backgroundColor: theme.palette.custom.chartBg,
            border: "1px solid rgba(148, 163, 184, 0.1)",
            mb: 1.5,
          }}
        >
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="subtitle2" fontWeight="700" sx={{ color: theme.palette.text.primary, display: "flex", alignItems: "center", gap: 1 }}>
              <AssessmentIcon sx={{ color: theme.palette.primary.main, fontSize: 18 }} />
              Monthly Activity Trend (Last 6 Months)
            </Typography>
            {hoveredData && (
              <Typography variant="caption" sx={{ color: theme.palette.secondary.main, fontWeight: 700 }}>
                {hoveredData.label}: Lent ₹{hoveredData.lent.toLocaleString("en-IN")} | Borrowed ₹{hoveredData.borrowed.toLocaleString("en-IN")}
              </Typography>
            )}
          </Box>

          {/* Chart Area */}
          <Box
            sx={{
              height: { xs: 120, sm: 130 },
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
            {/* Background Grid Lines */}
            <Box sx={{ position: "absolute", top: "15%", left: 0, right: 0, borderBottom: "1px dashed rgba(148, 163, 184, 0.08)", pointerEvents: "none" }} />
            <Box sx={{ position: "absolute", top: "55%", left: 0, right: 0, borderBottom: "1px dashed rgba(148, 163, 184, 0.08)", pointerEvents: "none" }} />

            {chartData.map((d, i) => {
              const lentHeight = Math.max(Math.round((d.lent / maxVal) * 100), d.lent > 0 ? 6 : 2);
              const borrowedHeight = Math.max(Math.round((d.borrowed / maxVal) * 100), d.borrowed > 0 ? 6 : 2);
              const isSelected = hoveredData && hoveredData.label === d.label;

              return (
                <Tooltip
                  key={i}
                  title={
                    <Box sx={{ p: 0.5 }}>
                      <Typography variant="caption" fontWeight="bold" sx={{ color: theme.palette.text.primary, display: "block", mb: 0.5 }}>
                        {d.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.primary.main, display: "block" }}>
                        Lent: ₹{d.lent.toLocaleString("en-IN")}
                      </Typography>
                      <Typography variant="caption" sx={{ color: theme.palette.secondary.main, display: "block" }}>
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
                      px: { xs: 0.5, sm: 1 },
                      borderRadius: "8px",
                      transition: "background-color 0.2s",
                      backgroundColor: isSelected ? theme.palette.custom.chartGrid : "transparent",
                    }}
                  >
                    {/* Bar Group */}
                    <Box display="flex" alignItems="flex-end" gap={{ xs: 0.3, sm: 0.8 }} sx={{ height: "100%", width: "100%", justifyContent: "center" }}>
                      {/* Lent Bar */}
                      <Box
                        sx={{
                          width: { xs: 12, sm: 22 },
                          height: `${lentHeight}%`,
                          background: theme.palette.custom.primaryGradient,
                          borderRadius: "4px 4px 0 0",
                          boxShadow: d.lent > 0 ? "0 0 10px rgba(16, 185, 129, 0.4)" : "none",
                          transition: "height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                      />
                      {/* Borrowed Bar */}
                      <Box
                        sx={{
                          width: { xs: 12, sm: 22 },
                          height: `${borrowedHeight}%`,
                          background: theme.palette.custom.secondaryGradient,
                          borderRadius: "4px 4px 0 0",
                          boxShadow: d.borrowed > 0 ? "0 0 10px rgba(99, 102, 241, 0.4)" : "none",
                          transition: "height 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        }}
                      />
                    </Box>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          {/* X Axis Labels */}
          <Box display="flex" justifyContent="space-between" mt={1} px={{ xs: 0.5, sm: 1 }}>
            {chartData.map((d, i) => (
              <Typography
                key={i}
                variant="caption"
                sx={{
                  color: hoveredData && hoveredData.label === d.label ? theme.palette.text.primary : theme.palette.text.secondary,
                  fontWeight: hoveredData && hoveredData.label === d.label ? 700 : 500,
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
          <Box display="flex" justifyContent="center" gap={3} mt={1.5} pt={1} sx={{ borderTop: "1px dashed rgba(148, 163, 184, 0.1)" }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 12, height: 12, borderRadius: "3px", backgroundColor: theme.palette.primary.main }} />
              <Typography variant="caption" fontWeight="600" sx={{ color: theme.palette.text.secondary }}>Monthly Lent</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 12, height: 12, borderRadius: "3px", backgroundColor: theme.palette.secondary.main }} />
              <Typography variant="caption" fontWeight="600" sx={{ color: theme.palette.text.secondary }}>Monthly Borrowed</Typography>
            </Box>
          </Box>
        </Box>

        {/* Payment Methods Breakdown Bar */}
        <Paper
          elevation={0}
          sx={{
            p: 1.2,
            borderRadius: 1.5,
            backgroundColor: theme.palette.background.paper,
            border: "1px solid rgba(148, 163, 184, 0.12)",
          }}
        >
          <Typography variant="caption" fontWeight="700" sx={{ color: theme.palette.text.secondary, textTransform: "uppercase", display: "block", mb: 1 }}>
            Payment Method Volume (All-Time)
          </Typography>

          {/* Progress Bar Distribution */}
          <Box display="flex" sx={{ height: 8, borderRadius: "4px", overflow: "hidden", backgroundColor: "rgba(15, 23, 42, 0.8)", mb: 1 }}>
            {methodStats.Cash > 0 && (
              <Box
                sx={{
                  width: `${(methodStats.Cash / Math.max(summary.totalLent + summary.totalBorrowed, 1)) * 100}%`,
                  backgroundColor: theme.palette.primary.main,
                }}
              />
            )}
            {methodStats.GPay > 0 && (
              <Box
                sx={{
                  width: `${(methodStats.GPay / Math.max(summary.totalLent + summary.totalBorrowed, 1)) * 100}%`,
                  backgroundColor: theme.palette.secondary.main,
                }}
              />
            )}
            {methodStats.Bank > 0 && (
              <Box
                sx={{
                  width: `${(methodStats.Bank / Math.max(summary.totalLent + summary.totalBorrowed, 1)) * 100}%`,
                  backgroundColor: theme.palette.custom.netPositiveColor,
                }}
              />
            )}
          </Box>

          <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: theme.palette.primary.main }} />
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                 Cash: <strong>₹{methodStats.Cash.toLocaleString("en-IN")}</strong>
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: theme.palette.secondary.main }} />
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                 GPay: <strong>₹{methodStats.GPay.toLocaleString("en-IN")}</strong>
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: theme.palette.custom.netPositiveColor }} />
              <Typography variant="caption" sx={{ color: theme.palette.text.secondary }}>
                 Bank: <strong>₹{methodStats.Bank.toLocaleString("en-IN")}</strong>
              </Typography>
            </Box>
          </Box>
        </Paper>
      </DialogContent>
    </Dialog>
  );
}

export default ReportsModal;
