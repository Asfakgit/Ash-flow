import { AppBar, Toolbar, Typography, Box, Chip, Container, Button, IconButton, Tooltip } from "@mui/material";
import ashFavIcon from "../assets/AshFavICon.png";
import AssessmentIcon from "@mui/icons-material/Assessment";

function Navbar({ onOpenReports }) {
  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        background: "rgba(19, 27, 46, 0.85)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 3 } }}>
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, md: 72 }, justifyContent: "space-between" }}>
          <Box display="flex" alignItems="center" gap={{ xs: 1, sm: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: { xs: 34, sm: 42 },
                height: { xs: 34, sm: 42 },
                borderRadius: "10px",
                overflow: "hidden",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src={ashFavIcon}
                alt="Ash-Flow Logo"
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </Box>
            <Box>
              <Typography
                variant="h6"
                fontWeight="800"
                sx={{
                  letterSpacing: "-0.02em",
                  color: "#F8FAFC",
                  lineHeight: 1.1,
                  fontSize: { xs: "1.05rem", sm: "1.25rem" },
                }}
              >
                ASH-FLOW
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "#10B981",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  display: { xs: "none", sm: "block" },
                  fontSize: "0.7rem",
                }}
              >
                FINANCE PORTAL
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1.2}>
            {/* Desktop Reports Button */}
            <Tooltip title="View Graphical Reports & Analytics">
              <Button
                variant="outlined"
                onClick={onOpenReports}
                startIcon={<AssessmentIcon />}
                sx={{
                  display: { xs: "none", sm: "flex" },
                  borderColor: "rgba(16, 185, 129, 0.4)",
                  color: "#10B981",
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  borderRadius: "10px",
                  px: 2,
                  py: 0.5,
                  background: "rgba(16, 185, 129, 0.08)",
                  "&:hover": {
                    background: "rgba(16, 185, 129, 0.18)",
                    borderColor: "#10B981",
                    boxShadow: "0 0 15px rgba(16, 185, 129, 0.3)",
                  },
                }}
              >
                Reports
              </Button>
            </Tooltip>

            {/* Mobile Reports Icon Button */}
            <Tooltip title="Reports & Analytics">
              <IconButton
                onClick={onOpenReports}
                size="small"
                sx={{
                  display: { xs: "flex", sm: "none" },
                  background: "rgba(16, 185, 129, 0.15)",
                  color: "#10B981",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: "10px",
                  width: 36,
                  height: 36,
                  "&:hover": {
                    background: "rgba(16, 185, 129, 0.25)",
                    boxShadow: "0 0 12px rgba(16, 185, 129, 0.4)",
                  },
                }}
              >
                <AssessmentIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>

            {/* <Chip
              label="ASHFAK AHAMMED O"
              size="small"
              sx={{
                fontWeight: 600,
                backgroundColor: "rgba(99, 102, 241, 0.15)",
                color: "#818CF8",
                border: "1px solid rgba(99, 102, 241, 0.3)",
                px: { xs: 0.5, sm: 1 },
                height: { xs: 24, sm: 28 },
                fontSize: { xs: "0.7rem", sm: "0.8rem" },
              }}
            /> */}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

export default Navbar;