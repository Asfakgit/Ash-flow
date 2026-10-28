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
import Login from "./Components/Login";
import AddTransactionModal from "./Components/AddTransactionModal";
import Transactions from "./Components/TrasactionTable";
import PersonBalance from "./Components/PersonBalance";
import CustomDialog from "./Components/CustomDialog";
import ReportsModal from "./Components/ReportsModal";
import AdminUserModal from "./Components/AdminUserModal";

import useTransactions from "./Hooks/useTransactions";
import {
  getAuthUser,
  logoutUser,
  adminGetUsers,
  isUserAuthenticated,
  clearAuthSession,
} from "./Services/SheetService";

const financialQuotes = [
  "\"Price is what you pay. Value is what you get.\" – Warren Buffett",
  "\"Time is money.\" – Benjamin Franklin",
  "\"Money is a terrible master but an excellent servant.\" – P.T. Barnum",
  "\"The more you learn, the more you earn.\" – Warren Buffett",
  "\"Rich people acquire assets. The poor acquire liabilities.\" – Robert Kiyosaki",
  "\"A penny saved is a penny earned.\" – Benjamin Franklin",
  "\"Every rupee has a job. Give it one.\"",
  "\"Beware of little expenses; a small leak will sink a great ship.\" – Benjamin Franklin",
  "\"It’s not how much you make, but how much you keep.\" – Robert Kiyosaki",
  "\"Charity does not decrease wealth.\" – Prophet Muhammad (ﷺ)",
  "\"Small savings today create big opportunities tomorrow.\"",
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
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return isUserAuthenticated();
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (isUserAuthenticated()) {
      return getAuthUser();
    }
    clearAuthSession();
    return null;
  });

  const [refresh, setRefresh] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [adminUsersOpen, setAdminUsersOpen] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalDefaults, setAddModalDefaults] = useState({ person: "", type: "Lent" });
  const [pendingUsersCount, setPendingUsersCount] = useState(0);

  const [notification, setNotification] = useState({
    open: false,
    type: "success",
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    onConfirm: null,
  });

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
      onConfirm: onConfirm
        ? async () => {
            setNotification((prev) => ({ ...prev, open: false }));
            await onConfirm();
          }
        : null,
    });
  };

  const closeNotification = () => {
    setNotification((prev) => ({ ...prev, open: false }));
  };



  const triggerRefresh = () => {
    setRefresh((prev) => !prev);
  };

  const handleLogin = (user) => {
    localStorage.setItem("isAuthenticated", "true");
    setIsAuthenticated(true);
    setCurrentUser(user || getAuthUser());
    triggerRefresh();
  };

  const handleLogout = () => {
    showNotification({
      type: "confirm",
      title: "Sign Out",
      message: "Are you sure you want to sign out of your account?",
      confirmText: "Sign Out",
      cancelText: "Cancel",
      onConfirm: () => {
        logoutUser();
        setIsAuthenticated(false);
        setCurrentUser(null);
        setTransactions([]);
        setPendingUsersCount(0);
        setReportsOpen(false);
        setAdminUsersOpen(false);
      },
    });
  };

  // Poll or check pending users count when admin is logged in
  useEffect(() => {
    if (isAuthenticated && currentUser?.role === "ADMIN") {
      adminGetUsers()
        .then((res) => {
          if (res.success && Array.isArray(res.users)) {
            const pending = res.users.filter((u) => u.status === "PENDING").length;
            setPendingUsersCount(pending);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, currentUser, refresh]);

  const theme = useTheme();



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

  if (!isAuthenticated) {
    return (
      <>
        <CssBaseline />
        <Login onLogin={handleLogin} />
      </>
    );
  }

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
          width: "100%",
          maxWidth: "100vw",
          overflowX: "clip",
        }}
      >
        <Navbar
          onOpenReports={() => setReportsOpen(true)}
          currentUser={currentUser}
          pendingUsersCount={pendingUsersCount}
          onOpenAdminUsers={() => setAdminUsersOpen(true)}
          onLogout={handleLogout}
        />

        <Container
          maxWidth="lg"
          sx={{ mt: { xs: 1.5, md: 3 }, px: { xs: 1.5, sm: 3 } }}
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

          {/* Person Balances - Primary Focus with "+ Add Transaction" Button */}
          <Box mb={{ xs: 3, md: 4.5 }}>
            <PersonBalance
              transactions={transactions}
              setTransactions={setTransactions}
              triggerRefresh={triggerRefresh}
              showNotification={showNotification}
              onOpenAdd={(defaults) => {
                const isEvent = Boolean(
                  defaults &&
                    (defaults.nativeEvent ||
                      defaults.target ||
                      typeof defaults.preventDefault === "function" ||
                      defaults.type === "click")
                );
                const safeDefaults =
                  isEvent || !defaults || typeof defaults !== "object"
                    ? { person: "", type: "Lent" }
                    : {
                        person: defaults.person || "",
                        type: ["Lent", "Borrowed", "Partial Payment"].includes(defaults.type)
                          ? defaults.type
                          : "Lent",
                      };
                setAddModalDefaults(safeDefaults);
                setAddModalOpen(true);
              }}
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

        {/* Add Transaction Modal */}
        <AddTransactionModal
          open={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          transactions={transactions}
          setTransactions={setTransactions}
          showNotification={showNotification}
          initialPerson={addModalDefaults.person}
          initialType={addModalDefaults.type}
        />

        {/* Reports & Analytics Modal */}
        <ReportsModal
          open={reportsOpen}
          onClose={() => setReportsOpen(false)}
          transactions={transactions}
        />

        {/* Admin User Management & Approvals Modal */}
        {currentUser?.role === "ADMIN" && (
          <AdminUserModal
            open={adminUsersOpen}
            onClose={() => setAdminUsersOpen(false)}
            currentUser={currentUser}
            onUsersUpdated={(users) => {
              const pending = users.filter((u) => u.status === "PENDING").length;
              setPendingUsersCount(pending);
            }}
          />
        )}
      </Box>
    </>
  );
}

export default App;
