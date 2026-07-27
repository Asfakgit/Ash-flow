import { useState } from "react";
import {
  Container,
  Box,
  Typography,
  ThemeProvider,
  CssBaseline,
  Fade,
} from "@mui/material";

import theme from "./theme";
import Navbar from "./Components/Navebar";
// import Dashboard from "./Pages/Dashboard";
import AddTransaction from "./Pages/AddTransaction";
import Transactions from "./Components/TrasactionTable";
import PersonBalance from "./Components/PersonBalance";
import CustomDialog from "./Components/CustomDialog";
import ReportsModal from "./Components/ReportsModal";

import useTransactions from "./Hooks/useTransactions";

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

  const { transactions } = useTransactions(refresh);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          pb: { xs: 4, md: 8 },
        }}
      >
        <Navbar onOpenReports={() => setReportsOpen(true)} />

        <Container
          maxWidth="lg"
          sx={{ mt: { xs: 2, md: 4 }, px: { xs: 1.5, sm: 3 } }}
        >
          <Fade in timeout={600}>
            <Box mb={{ xs: 3, md: 5 }} textAlign="center">
              <Typography
                variant="h3"
                fontWeight="800"
                sx={{
                  fontSize: { xs: "1.6rem", sm: "2.25rem", md: "2.75rem" },
                  background:
                    "linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)",
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
                  color: "#94A3B8",
                  maxWidth: 580,
                  mx: "auto",
                  fontSize: { xs: "0.85rem", sm: "1rem" },
                  px: 1,
                }}
              >
                "Whoever eases the hardship of another, Allah will ease their hardship."
          – Prophet Muhammad (ﷺ){" "}
              </Typography>
            </Box>
          </Fade>

          {/* Dashboard Cards */}
          {/* <Box mb={{ xs: 3, md: 5 }}>
            <Dashboard transactions={transactions} />
          </Box> */}

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
              triggerRefresh={triggerRefresh}
              showNotification={showNotification}
            />
              <PersonBalance
              transactions={transactions}
              triggerRefresh={triggerRefresh}
              showNotification={showNotification}
            />
          </Box>

          {/* Transactions Table / Mobile Card List */}
          <Box>
            <Transactions
              transactions={transactions}
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
    </ThemeProvider>
  );
}

export default App;
