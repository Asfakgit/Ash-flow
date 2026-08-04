import { useState, useEffect, useMemo } from "react";
import {
  Container,
  Box,
  Typography,
  ThemeProvider,
  CssBaseline,
  Fade,
} from "@mui/material";

import { useTheme } from "@mui/material/styles";

import Navbar from "./Components/Navebar";
import AddTransaction from "./Pages/AddTransaction";
import Transactions from "./Components/TrasactionTable";
import PersonBalance from "./Components/PersonBalance";
import CustomDialog from "./Components/CustomDialog";
import ReportsModal from "./Components/ReportsModal";

import useTransactions from "./Hooks/useTransactions";

const financialQuotes = [
  "\"Price is what you pay. Value is what you get.\" – Warren Buffett",
  "\"Time is money.\" – Benjamin Franklin",
  "\"Money is a terrible master but an excellent servant.\" – P.T. Barnum",
  "\"The more you learn, the more you earn.\" – Warren Buffett",
  "\"Rich people acquire assets. The poor acquire liabilities.\" – Robert Kiyosaki",
  "\"A penny saved is a penny earned.\" – Benjamin Franklin",
  "\"Compound interest is the eighth wonder of the world.\" – Albert Einstein",
  "\"Beware of little expenses; a small leak will sink a great ship.\" – Benjamin Franklin",
  "\"It’s not how much you make, but how much you keep.\" – Robert Kiyosaki",
  "\"Charity does not decrease wealth.\" – Prophet Muhammad (ﷺ)",
  "\"An investment in knowledge pays the best interest.\" – Benjamin Franklin",
  "\"Wealth consists not in having great possessions, but in having few wants.\" – Epictetus",
  "\"Do not save what is left after spending; spend what is left after saving.\" – Warren Buffett",
  "\"Every time you borrow money, you're robbing your future self.\" – Nathan W. Morris",
  "\"A budget is telling your money where to go instead of wondering where it went.\" – John C. Maxwell",
  "\"Risk comes from not knowing what you're doing.\" – Warren Buffett",
  "\"Wealth is largely the result of habit.\" – John Jacob Astor",
  "\"Never depend on a single income. Invest to create a second source.\" – Warren Buffett",
  "\"Frugality includes all the other virtues.\" – Cicero",
  "\"The quickest way to double your money is to fold it and put it in your pocket.\" – Will Rogers",
  "\"Capital as such is not evil; it is its wrong use that is evil.\" – Mahatma Gandhi",
  "\"Don’t tell me your priorities. Show me where you spend your money.\" – James W. Frick",
  "\"He who buys what he does not need, steals from himself.\" – Swedish Proverb",
  "\"You must gain control over your money or it will forever control you.\" – Dave Ramsey",
  "\"Money grows on the tree of persistence.\" – Japanese Proverb",
  "\"The secret to wealth is simple: Find a way to do more for others.\" – Jim Rohn",
  "\"Empty pockets never held anyone back. Only empty heads and empty hearts can do that.\" – Norman Vincent Peale",
  "\"Wealth is not his that has it, but his that enjoys it.\" – Benjamin Franklin",
  "\"To acquire wealth is difficult, to preserve it more difficult, but to spend it wisely most difficult of all.\" – Edward Day",
  "\"Rule No. 1: Never lose money. Rule No. 2: Never forget Rule No. 1.\" – Warren Buffett"
];

function App() {
  const [refresh, setRefresh] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);

  const [notification, setNotification] = useState({
    open: false,
    type: "success",
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const triggerRefresh = () => {
    setRefresh((prev) => !prev);
  };

  const theme = useTheme();

  const showNotification = ({
    type = "success",
    title = "",
    message = "",
    confirmText = "Confirm",
    cancelText = "Cancel",
    onConfirm = null,
  }) => {
    setNotification({
      open: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm: async () => {
        if (onConfirm) {
          await onConfirm();
        }
        setNotification((prev) => ({ ...prev, open: false }));
      },
    });
  };

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };

  const { transactions, setTransactions } = useTransactions(refresh);

  // Track the current date string so the app re-renders when the day changes
  const [todayStr, setTodayStr] = useState(new Date().toDateString());

  // Automatically update the quote if the user leaves the tab open overnight
  useEffect(() => {
    const checkDate = () => setTodayStr(new Date().toDateString());
    
    const handleVisibility = () => {
      if (document.visibilityState === "visible") checkDate();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", checkDate);
    
    // Also check periodically in the background
    const interval = setInterval(checkDate, 1000 * 60 * 60);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", checkDate);
      clearInterval(interval);
    };
  }, []);

  // Compute the quote safely using UTC to avoid Daylight Saving Time bugs
  const dailyQuote = useMemo(() => {
    const now = new Date(todayStr);
    const currentUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    const startUTC = Date.UTC(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((currentUTC - startUTC) / (1000 * 60 * 60 * 24));
    
    return financialQuotes[dayOfYear % financialQuotes.length];
  }, [todayStr]);

  return (
    <>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          pb: { xs: 4, md: 8 },
          background: theme.palette.custom.pageBackground || theme.palette.background.default,
          transition: "background 0.3s ease, color 0.3s ease",
        }}
      >
        <Navbar onOpenReports={() => setReportsOpen(true)} />

        <Container
          maxWidth="lg"
          sx={{ mt: { xs: 1.5, md: 4 }, px: { xs: 1, sm: 3 } }}
        >
          <Fade in timeout={600}>
            <Box mb={{ xs: 3, md: 5 }} textAlign="center">
              <Typography
                variant="h3"
                fontWeight="800"
                sx={{
                  fontSize: { xs: "1.6rem", sm: "2.25rem", md: "2.75rem" },
                  background: theme.palette.custom.titleGradient,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  mb: 0.5,
                  letterSpacing: "-0.03em",
                }}
              >
                Financial Overview
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: theme.palette.text.secondary,
                  maxWidth: 580,
                  mx: "auto",
                  fontSize: { xs: "0.85rem", sm: "1rem" },
                  px: 1,
                }}
              >
                {dailyQuote}
              </Typography>
            </Box>
          </Fade>

          {/* Two Column Layout for Balance & Add Form on larger screens */}
          <Box
            display="grid"
            gridTemplateColumns={{ xs: "1fr", lg: "1fr 1fr" }}
            gap={{ xs: 2.5, md: 4 }}
            mb={{ xs: 3, md: 5 }}
            alignItems="start"
          >
          
            <AddTransaction
              transactions={transactions}
              setTransactions={setTransactions}
              showNotification={showNotification}
            />
              <PersonBalance
              transactions={transactions}
              setTransactions={setTransactions}
              triggerRefresh={triggerRefresh}
              showNotification={showNotification}
            />
          </Box>

          <Box>
            <Transactions
              transactions={transactions}
              setTransactions={setTransactions}
              triggerRefresh={triggerRefresh}
              showNotification={showNotification}
            />
          </Box>
        </Container>

        {/* Centralized Custom Notification Dialog */}
        <CustomDialog
          open={notification.open}
          onClose={closeNotification}
          onConfirm={notification.onConfirm}
          type={notification.type}
          title={notification.title}
          message={notification.message}
          confirmText={notification.confirmText}
          cancelText={notification.cancelText}
        />

        {/* Reports & Analytics Modal */}
        <ReportsModal
          open={reportsOpen}
          onClose={() => setReportsOpen(false)}
          transactions={transactions}
        />
      </Box>
    </>
  );
}

export default App;
