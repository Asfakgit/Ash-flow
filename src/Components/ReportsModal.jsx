import { useState, useMemo, forwardRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Slide,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Paper,
  Tooltip,
  Divider,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import AssessmentIcon from "@mui/icons-material/Assessment";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import BalanceIcon from "@mui/icons-material/Balance";
import PaymentsIcon from "@mui/icons-material/Payments";
import { getDataRows, getRowVal, formatDateForPicker } from "../Services/SheetService";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function ReportsModal({ open, onClose, transactions = [] }) {
  const [timeframe, setTimeframe] = useState("monthly");
  const [hoveredData, setHoveredData] = useState(null);

  const handleTimeframeChange = (event, newAlignment) => {
    if (newAlignment !== null) {
      setTimeframe(newAlignment);
      setHoveredData(null);
    }
  };

  // Aggregate Data for Chart
  const { chartData, maxVal, summary, methodStats } = useMemo(() => {
    const rows = getDataRows(transactions);
    const now = new Date();

    let data = [];
    let totalLent = 0;
    let totalBorrowed = 0;
    let peakLent = { label: "-", val: 0 };
    let peakBorrowed = { label: "-", val: 0 };
    let methods = { Cash: 0, GPay: 0, Bank: 0 };

    // Process all rows for method breakdown and totals
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

    if (timeframe === "monthly") {
      // Create map for last 6 months including current
      const monthMap = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = `${MONTH_NAMES[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`;
        monthMap[key] = { key, label, lent: 0, borrowed: 0 };
      }

      rows.forEach((row) => {
        const dateStr = formatDateForPicker(getRowVal(row, 4, "date", ""));
        const amount = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
        const type = String(getRowVal(row, 3, "type", "")).toLowerCase();

        if (dateStr && dateStr.length >= 7) {
          const key = dateStr.substring(0, 7);
          if (monthMap[key]) {
            if (type === "lent") monthMap[key].lent += amount;
            if (type === "borrowed") monthMap[key].borrowed += amount;
          } else {
            // If older or future month not in default 6, add it
            const [y, m] = key.split("-");
            const mIdx = parseInt(m, 10) - 1;
            if (!isNaN(mIdx) && mIdx >= 0 && mIdx < 12) {
              const label = `${MONTH_NAMES[mIdx]} '${y.slice(2)}`;
              monthMap[key] = { key, label, lent: type === "lent" ? amount : 0, borrowed: type === "borrowed" ? amount : 0 };
            }
          }
        }
      });

      data = Object.values(monthMap).sort((a, b) => a.key.localeCompare(b.key));
    } else {
      // Weekly View: Last 6 Weeks
      const weekBuckets = [
        { label: "5 Wks Ago", lent: 0, borrowed: 0, minDay: 35, maxDay: 41 },
        { label: "4 Wks Ago", lent: 0, borrowed: 0, minDay: 28, maxDay: 34 },
        { label: "3 Wks Ago", lent: 0, borrowed: 0, minDay: 21, maxDay: 27 },
        { label: "2 Wks Ago", lent: 0, borrowed: 0, minDay: 14, maxDay: 20 },
        { label: "Last Week", lent: 0, borrowed: 0, minDay: 7, maxDay: 13 },
        { label: "This Week", lent: 0, borrowed: 0, minDay: 0, maxDay: 6 },
      ];

      rows.forEach((row) => {
        const dateStr = formatDateForPicker(getRowVal(row, 4, "date", ""));
        const amount = parseFloat(getRowVal(row, 2, "amount", 0)) || 0;
        const type = String(getRowVal(row, 3, "type", "")).toLowerCase();

        if (dateStr) {
          const txDate = new Date(dateStr);
          if (!isNaN(txDate.getTime())) {
            const diffDays = Math.floor((now - txDate) / (1000 * 60 * 60 * 24));
            weekBuckets.forEach((bucket) => {
              if (diffDays >= bucket.minDay && diffDays <= bucket.maxDay) {
                if (type === "lent") bucket.lent += amount;
                if (type === "borrowed") bucket.borrowed += amount;
              }
            });
          }
        }
      });

      data = weekBuckets;
    }

    // Find peak values and max bar height
    let max = 5000;
    data.forEach((d) => {
      if (d.lent > max) max = d.lent;
      if (d.borrowed > max) max = d.borrowed;
      if (d.lent > peakLent.val) peakLent = { label: d.label, val: d.lent };
      if (d.borrowed > peakBorrowed.val) peakBorrowed = { label: d.label, val: d.borrowed };
    });

    return {
      chartData: data,
      maxVal: max,
      summary: { totalLent, totalBorrowed, peakLent, peakBorrowed },
      methodStats: methods,
    };
  }, [transactions, timeframe]);

  const activeData = hoveredData || chartData[chartData.length - 1] || { label: "-", lent: 0, borrowed: 0 };

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
          borderRadius: { xs: 3, sm: 4 },
          background: "linear-gradient(145deg, #131B2E 0%, #0F172A 100%)",
          border: "1px solid rgba(148, 163, 184, 0.15)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
          overflow: "hidden",
          m: { xs: 1.5, sm: 2 },
          maxHeight: "90vh",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, sm: 3.5 },
          pt: { xs: 2.5, sm: 3 },
          pb: 2,
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
              background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
              color: "#ffffff",
              boxShadow: "0 4px 15px rgba(16, 185, 129, 0.4)",
            }}
          >
            <AssessmentIcon sx={{ fontSize: { xs: 22, sm: 26 } }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="800" sx={{ color: "#F8FAFC", fontSize: { xs: "1.1rem", sm: "1.35rem" } }}>
              Reports & Analytics
            </Typography>
            <Typography variant="caption" sx={{ color: "#94A3B8", fontSize: "0.75rem" }}>
              Interactive cash flow and trend visualization
            </Typography>
          </Box>
        </Box>

        <Box display="flex" alignItems="center" gap={1.5}>
          <ToggleButtonGroup
            size="small"
            value={timeframe}
            exclusive
            onChange={handleTimeframeChange}
            sx={{
              backgroundColor: "rgba(15, 23, 42, 0.8)",
              borderRadius: "10px",
              p: 0.5,
              border: "1px solid rgba(148, 163, 184, 0.15)",
              "& .MuiToggleButton-root": {
                color: "#94A3B8",
                fontWeight: 700,
                fontSize: { xs: "0.7rem", sm: "0.8rem" },
                px: { xs: 1.5, sm: 2 },
                py: 0.6,
                borderRadius: "8px !important",
                border: "none",
                textTransform: "none",
                transition: "all 0.2s",
                "&.Mui-selected": {
                  color: "#ffffff",
                  background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
                  boxShadow: "0 2px 10px rgba(99, 102, 241, 0.4)",
                },
                "&:hover:not(.Mui-selected)": {
                  color: "#F8FAFC",
                  backgroundColor: "rgba(148, 163, 184, 0.1)",
                },
              },
            }}
          >
            <ToggleButton value="monthly">Monthly</ToggleButton>
            <ToggleButton value="weekly">Weekly</ToggleButton>
          </ToggleButtonGroup>

          <IconButton
            onClick={onClose}
            sx={{
              color: "#94A3B8",
              "&:hover": { color: "#F8FAFC", backgroundColor: "rgba(148, 163, 184, 0.1)" },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: { xs: 2, sm: 3.5 }, py: { xs: 2.5, sm: 3 }, overflowY: "auto" }}>
        {/* Active Hover / Current Summary Banner */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 1.5, sm: 2 },
            mb: 3,
            borderRadius: 3,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            border: "1px solid rgba(148, 163, 184, 0.12)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="caption" fontWeight="700" sx={{ color: "#818CF8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {hoveredData ? `Inspecting Period: ${activeData.label}` : `Latest Period: ${activeData.label}`}
            </Typography>
            <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: "0.75rem" }}>
              Hover or tap any bar column below for detailed period breakdown
            </Typography>
          </Box>
          <Box display="flex" gap={{ xs: 2, sm: 4 }}>
            <Box>
              <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>Lent</Typography>
              <Typography variant="subtitle1" fontWeight="800" sx={{ color: "#34D399" }}>
                ₹{activeData.lent.toLocaleString("en-IN")}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>Borrowed</Typography>
              <Typography variant="subtitle1" fontWeight="800" sx={{ color: "#818CF8" }}>
                ₹{activeData.borrowed.toLocaleString("en-IN")}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "#94A3B8", display: "block" }}>Net Flow</Typography>
              <Typography
                variant="subtitle1"
                fontWeight="800"
                sx={{ color: activeData.lent - activeData.borrowed >= 0 ? "#10B981" : "#F43F5E" }}
              >
                ₹{(activeData.lent - activeData.borrowed).toLocaleString("en-IN")}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* Custom Animated SVG/CSS Dual Bar Chart */}
        <Box
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 3,
            backgroundColor: "rgba(19, 27, 46, 0.5)",
            border: "1px solid rgba(148, 163, 184, 0.1)",
            mb: 3.5,
          }}
        >
          <Typography variant="subtitle2" fontWeight="700" sx={{ color: "#F8FAFC", mb: 2, display: "flex", alignItems: "center", gap: 1 }}>
            <AssessmentIcon sx={{ color: "#10B981", fontSize: 18 }} />
            {timeframe === "monthly" ? "Monthly Lending vs Borrowing Flow" : "Weekly Activity Trend"}
          </Typography>

          {/* Chart Area */}
          <Box
            sx={{
              height: { xs: 220, sm: 260 },
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: { xs: 1, sm: 2 },
              pt: 4,
              pb: 1,
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
                      <Typography variant="caption" fontWeight="bold" sx={{ color: "#ffffff", display: "block", mb: 0.5 }}>
                        {d.label}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#34D399", display: "block" }}>
                        Lent: ₹{d.lent.toLocaleString("en-IN")}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#818CF8", display: "block" }}>
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
                      backgroundColor: isSelected ? "rgba(148, 163, 184, 0.08)" : "transparent",
                    }}
                  >
                    {/* Bar Group */}
                    <Box display="flex" alignItems="flex-end" gap={{ xs: 0.3, sm: 0.8 }} sx={{ height: "100%", width: "100%", justifyContent: "center" }}>
                      {/* Lent Bar */}
                      <Box
                        sx={{
                          width: { xs: 12, sm: 22 },
                          height: `${lentHeight}%`,
                          background: "linear-gradient(180deg, #34D399 0%, #10B981 100%)",
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
                          background: "linear-gradient(180deg, #818CF8 0%, #6366F1 100%)",
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
                  color: hoveredData && hoveredData.label === d.label ? "#F8FAFC" : "#94A3B8",
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
          <Box display="flex" justifyContent="center" gap={3} mt={2.5} pt={1.5} sx={{ borderTop: "1px dashed rgba(148, 163, 184, 0.1)" }}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 12, height: 12, borderRadius: "3px", backgroundColor: "#34D399" }} />
              <Typography variant="caption" fontWeight="600" sx={{ color: "#CBD5E1" }}>Total Lent</Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 12, height: 12, borderRadius: "3px", backgroundColor: "#818CF8" }} />
              <Typography variant="caption" fontWeight="600" sx={{ color: "#CBD5E1" }}>Total Borrowed</Typography>
            </Box>
          </Box>
        </Box>

        {/* Summary Insights Grid */}
        <Typography variant="subtitle2" fontWeight="700" sx={{ color: "#F8FAFC", mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
          <BalanceIcon sx={{ color: "#818CF8", fontSize: 18 }} />
          Analytical Insights & Breakdown
        </Typography>

        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                height: "100%",
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrendingUpIcon sx={{ color: "#10B981", fontSize: 20 }} />
                <Typography variant="caption" fontWeight="700" sx={{ color: "#10B981", textTransform: "uppercase" }}>
                  Peak Lending Period
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="800" sx={{ color: "#F8FAFC" }}>
                ₹{summary.peakLent.val.toLocaleString("en-IN")}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                Recorded in {summary.peakLent.label}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "rgba(99, 102, 241, 0.08)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                height: "100%",
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TrendingDownIcon sx={{ color: "#818CF8", fontSize: 20 }} />
                <Typography variant="caption" fontWeight="700" sx={{ color: "#818CF8", textTransform: "uppercase" }}>
                  Peak Borrowing Period
                </Typography>
              </Box>
              <Typography variant="h5" fontWeight="800" sx={{ color: "#F8FAFC" }}>
                ₹{summary.peakBorrowed.val.toLocaleString("en-IN")}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                Recorded in {summary.peakBorrowed.label}
              </Typography>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2,
                borderRadius: 3,
                backgroundColor: "rgba(168, 85, 247, 0.08)",
                border: "1px solid rgba(168, 85, 247, 0.2)",
                height: "100%",
              }}
            >
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <PaymentsIcon sx={{ color: "#C084FC", fontSize: 20 }} />
                <Typography variant="caption" fontWeight="700" sx={{ color: "#C084FC", textTransform: "uppercase" }}>
                  Overall Net Flow
                </Typography>
              </Box>
              <Typography
                variant="h5"
                fontWeight="800"
                sx={{ color: summary.totalLent - summary.totalBorrowed >= 0 ? "#34D399" : "#FB7185" }}
              >
                ₹{Math.abs(summary.totalLent - summary.totalBorrowed).toLocaleString("en-IN")}
              </Typography>
              <Typography variant="caption" sx={{ color: "#94A3B8" }}>
                {summary.totalLent - summary.totalBorrowed >= 0 ? "Net surplus overall" : "Net deficit overall"}
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Payment Methods Breakdown Bar */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: 3,
            backgroundColor: "rgba(19, 27, 46, 0.4)",
            border: "1px solid rgba(148, 163, 184, 0.12)",
          }}
        >
          <Typography variant="caption" fontWeight="700" sx={{ color: "#94A3B8", textTransform: "uppercase", display: "block", mb: 1.5 }}>
            Payment Method Volume Distribution
          </Typography>

          {/* Progress Bar Distribution */}
          <Box display="flex" sx={{ height: 12, borderRadius: "6px", overflow: "hidden", backgroundColor: "rgba(15, 23, 42, 0.8)", mb: 1.5 }}>
            {methodStats.Cash > 0 && (
              <Box
                sx={{
                  width: `${(methodStats.Cash / Math.max(summary.totalLent + summary.totalBorrowed, 1)) * 100}%`,
                  backgroundColor: "#34D399",
                }}
              />
            )}
            {methodStats.GPay > 0 && (
              <Box
                sx={{
                  width: `${(methodStats.GPay / Math.max(summary.totalLent + summary.totalBorrowed, 1)) * 100}%`,
                  backgroundColor: "#60A5FA",
                }}
              />
            )}
            {methodStats.Bank > 0 && (
              <Box
                sx={{
                  width: `${(methodStats.Bank / Math.max(summary.totalLent + summary.totalBorrowed, 1)) * 100}%`,
                  backgroundColor: "#C084FC",
                }}
              />
            )}
          </Box>

          <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: "#34D399" }} />
              <Typography variant="caption" sx={{ color: "#CBD5E1" }}>
                 Cash: <strong>₹{methodStats.Cash.toLocaleString("en-IN")}</strong>
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: "#60A5FA" }} />
              <Typography variant="caption" sx={{ color: "#CBD5E1" }}>
                 GPay: <strong>₹{methodStats.GPay.toLocaleString("en-IN")}</strong>
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Box sx={{ width: 10, height: 10, borderRadius: "2px", backgroundColor: "#C084FC" }} />
              <Typography variant="caption" sx={{ color: "#CBD5E1" }}>
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
