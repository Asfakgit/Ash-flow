import { Card, CardContent, Typography, Box } from "@mui/material";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";

function DashboardCard({ title, amount, type = "balance" }) {
  const isPositive = amount >= 0;

  const getCardStyle = () => {
    switch (type) {
      case "lent":
        return {
          icon: <TrendingUpIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />,
          iconBg: "rgba(16, 185, 129, 0.15)",
          iconColor: "#10B981",
          borderColor: "rgba(16, 185, 129, 0.2)",
          hoverBorderColor: "rgba(16, 185, 129, 0.5)",
          gradient: "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(19, 27, 46, 0.6) 100%)",
          caption: "Receivable amount",
        };
      case "borrowed":
        return {
          icon: <TrendingDownIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />,
          iconBg: "rgba(99, 102, 241, 0.15)",
          iconColor: "#818CF8",
          borderColor: "rgba(99, 102, 241, 0.2)",
          hoverBorderColor: "rgba(99, 102, 241, 0.5)",
          gradient: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(19, 27, 46, 0.6) 100%)",
          caption: "Payable amount",
        };
      case "volume":
        return {
          icon: <SwapHorizIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />,
          iconBg: "rgba(168, 85, 247, 0.15)",
          iconColor: "#A855F7",
          borderColor: "rgba(168, 85, 247, 0.2)",
          hoverBorderColor: "rgba(168, 85, 247, 0.5)",
          gradient: "linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(19, 27, 46, 0.6) 100%)",
          caption: "Total money tracked",
        };
      default:
        return {
          icon: <AccountBalanceWalletIcon sx={{ fontSize: { xs: 16, sm: 20 } }} />,
          iconBg: isPositive ? "rgba(16, 185, 129, 0.15)" : "rgba(244, 63, 94, 0.15)",
          iconColor: isPositive ? "#10B981" : "#F43F5E",
          borderColor: isPositive ? "rgba(16, 185, 129, 0.2)" : "rgba(244, 63, 94, 0.2)",
          hoverBorderColor: isPositive ? "rgba(16, 185, 129, 0.5)" : "rgba(244, 63, 94, 0.5)",
          gradient: isPositive
            ? "linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(19, 27, 46, 0.6) 100%)"
            : "linear-gradient(135deg, rgba(244, 63, 94, 0.1) 0%, rgba(19, 27, 46, 0.6) 100%)",
          caption: isPositive ? "Net surplus" : "Net deficit",
        };
    }
  };

  const style = getCardStyle();

  return (
    <Card
      sx={{
        borderRadius: { xs: "10px", sm: "14px" },
        background: style.gradient,
        border: `1px solid ${style.borderColor}`,
        boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        "&:hover": {
          transform: "translateY(-4px)",
          borderColor: style.hoverBorderColor,
          boxShadow: `0 20px 40px -15px rgba(0, 0, 0, 0.7), 0 0 20px ${style.iconColor}22`,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 1, sm: 1.5 }, "&:last-child": { pb: { xs: 1, sm: 1.5 } } }}>
        {/* Top row: Title and Icon */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={{ xs: 0.5, sm: 1 }}>
          <Typography
            variant="body2"
            fontWeight="700"
            sx={{
              color: "#94A3B8",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              fontSize: { xs: "0.68rem", sm: "0.75rem" },
              lineHeight: 1.2,
            }}
          >
            {title}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: { xs: 26, sm: 36 },
              height: { xs: 26, sm: 36 },
              borderRadius: { xs: "6px", sm: "10px" },
              backgroundColor: style.iconBg,
              color: style.iconColor,
              flexShrink: 0,
            }}
          >
            {style.icon}
          </Box>
        </Box>

        {/* Big Amount */}
        <Box display="flex" alignItems="baseline">
          <Typography
            variant="h3"
            fontWeight="800"
            sx={{
              color: "#F8FAFC",
              letterSpacing: "-0.03em",
              lineHeight: 1,
              fontSize: { xs: "1.1rem", sm: "1.5rem" },
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            ₹{Math.abs(amount).toLocaleString("en-IN")}
          </Typography>
        </Box>

        {/* Caption: Hidden on mobile (xs) for maximum simple clean grid view */}
        <Box mt={0.5} sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", gap: 1 }}>
          <Typography variant="caption" sx={{ color: style.iconColor, fontWeight: 600, fontSize: "0.7rem" }}>
            {style.caption}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

export default DashboardCard;
