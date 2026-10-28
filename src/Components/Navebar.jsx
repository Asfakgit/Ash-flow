import { useState, useEffect } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Button,
  IconButton,
  Tooltip,
  Badge,
  Chip,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SettingsIcon from "@mui/icons-material/Settings";
import { useTheme } from "@mui/material/styles";
import logo from "../assets/logo.png";
import SettingsModal from "./SettingsModal";
import { getUserAvatar } from "../Services/SheetService";

function Navbar({
  onOpenReports,
  currentUser,
  pendingUsersCount = 0,
  onOpenAdminUsers,
  onLogout,
}) {
  const theme = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Sync profile avatar strictly isolated to current user profile
  const [profileAvatar, setProfileAvatar] = useState(() => getUserAvatar(currentUser));

  useEffect(() => {
    setProfileAvatar(getUserAvatar(currentUser));
  }, [currentUser]);

  useEffect(() => {
    const handleAvatarUpdate = () => {
      setProfileAvatar(getUserAvatar(currentUser));
    };
    window.addEventListener("avatar_updated", handleAvatarUpdate);
    window.addEventListener("storage", handleAvatarUpdate);
    return () => {
      window.removeEventListener("avatar_updated", handleAvatarUpdate);
      window.removeEventListener("storage", handleAvatarUpdate);
    };
  }, [currentUser]);

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        top: 0,
        zIndex: 1100,
        background:
          theme.palette.mode === "dark"
            ? "rgba(18, 18, 20, 0.88)"
            : "rgba(255, 255, 255, 0.88)",
        backdropFilter: "blur(25px) saturate(180%)",
        WebkitBackdropFilter: "blur(25px) saturate(180%)",
        borderBottom: `1px solid ${theme.palette.divider}`,
        transition: "background 0.3s ease",
        pt: {
          xs: "max(env(safe-area-inset-top, 0px), 12px)",
          sm: "max(env(safe-area-inset-top, 0px), 8px)",
        },
      }}
    >
      <Container maxWidth="lg" sx={{ px: { xs: 1.5, sm: 3 } }}>
        <Toolbar
          disableGutters
          sx={{
            minHeight: { xs: 54, md: 68 },
            justifyContent: "space-between",
          }}
        >
          {/* Logo & App Name - Static Brand Header (Non-interactive) */}
          <Box
            display="flex"
            alignItems="center"
            gap={{ xs: 1, sm: 1.5 }}
            sx={{
              userSelect: "none",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: { xs: 38, sm: 42 },
                height: { xs: 38, sm: 42 },
                borderRadius: profileAvatar ? "50%" : "10px",
                border: profileAvatar
                  ? `2px solid ${theme.palette.primary.main}`
                  : `1px solid ${theme.palette.divider}`,
                background: profileAvatar
                  ? "transparent"
                  : theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.04)"
                  : "rgba(0, 0, 0, 0.04)",
                overflow: "hidden",
                boxShadow: profileAvatar
                  ? `0 0 16px ${theme.palette.primary.main}55`
                  : `0 4px 14px ${theme.palette.primary.main}33`,
                flexShrink: 0,
                transition: "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
              }}
            >
              <Box
                component="img"
                src={profileAvatar || logo}
                alt="Ash Flow Logo"
                sx={{
                  width: "100%",
                  height: "100%",
                  objectFit: profileAvatar ? "cover" : "contain",
                  p: profileAvatar ? 0 : 0.4,
                  transition: "all 0.3s ease",
                }}
              />
            </Box>
            <Box>
              <Typography
                variant="h6"
                fontWeight="800"
                sx={{
                  letterSpacing: "-0.02em",
                  color: theme.palette.text.primary,
                  lineHeight: 1.1,
                  fontSize: { xs: "0.95rem", sm: "1.2rem" },
                }}
              >
                ASH FLOW
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.primary.main,
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  display: "block",
                  lineHeight: 1.2,
                  fontSize: { xs: "0.68rem", sm: "0.72rem" },
                  maxWidth: { xs: 120, sm: 200 },
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentUser?.fullName || (currentUser?.username ? `@${currentUser.username}` : "FINANCE PORTAL")}
              </Typography>
            </Box>
          </Box>

          {/* Right Nav Actions */}
          <Box display="flex" alignItems="center" gap={{ xs: 0.8, sm: 1.2 }}>
            {/* User Chip Display - Static Badge (Non-clickable) */}
            {currentUser && (
              <Chip
                size="small"
                label={currentUser.fullName || currentUser.username}
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  height: 32,
                  px: 0.6,
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  borderRadius: "8px",
                  cursor: "default",
                  userSelect: "none",
                  background:
                    theme.palette.mode === "dark"
                      ? "rgba(255, 255, 255, 0.05)"
                      : "rgba(0, 0, 0, 0.05)",
                  border: `1px solid ${theme.palette.divider}`,
                  color: theme.palette.text.primary,
                }}
              />
            )}

            {/* Admin Management (Desktop Button) */}
            {isAdmin && (
              <Tooltip title="User Management & Approvals">
                <Badge
                  badgeContent={pendingUsersCount}
                  color="warning"
                  overlap="circular"
                  sx={{
                    display: { xs: "none", sm: "inline-flex" },
                    "& .MuiBadge-badge": {
                      fontWeight: 800,
                      fontSize: "0.72rem",
                    },
                  }}
                >
                  <Button
                    variant="outlined"
                    onClick={onOpenAdminUsers}
                    startIcon={<AdminPanelSettingsIcon />}
                    sx={{
                      borderColor: `${theme.palette.primary.main}66`,
                      color: theme.palette.primary.main,
                      fontWeight: 700,
                      fontSize: "0.8rem",
                      borderRadius: "8px",
                      px: 1.8,
                      py: 0.5,
                      background: theme.palette.custom.successBoxBg,
                      "&:hover": {
                        background: theme.palette.custom.successBoxBorder,
                        borderColor: theme.palette.primary.main,
                        boxShadow: `0 0 15px ${theme.palette.primary.main}4D`,
                      },
                    }}
                  >
                    Users
                  </Button>
                </Badge>
              </Tooltip>
            )}

            {/* Admin Management (Mobile Icon Button) */}
            {isAdmin && (
              <Tooltip title="User Management">
                <Badge
                  badgeContent={pendingUsersCount}
                  color="warning"
                  overlap="circular"
                  sx={{
                    display: { xs: "inline-flex", sm: "none" },
                    "& .MuiBadge-badge": {
                      fontWeight: 800,
                      fontSize: "0.68rem",
                    },
                  }}
                >
                  <IconButton
                    onClick={onOpenAdminUsers}
                    size="small"
                    sx={{
                      background: theme.palette.custom.successBoxBg,
                      color: theme.palette.primary.main,
                      border: `1px solid ${theme.palette.custom.successBoxBorder}`,
                      borderRadius: "8px",
                      width: 36,
                      height: 36,
                      "&:hover": {
                        background: theme.palette.custom.successBoxBorder,
                        boxShadow: `0 0 12px ${theme.palette.primary.main}66`,
                      },
                    }}
                  >
                    <AdminPanelSettingsIcon sx={{ fontSize: 19 }} />
                  </IconButton>
                </Badge>
              </Tooltip>
            )}

            {/* Desktop Reports Button */}
            <Tooltip title="View Graphical Reports & Analytics">
              <Button
                variant="outlined"
                onClick={onOpenReports}
                startIcon={<AssessmentIcon />}
                sx={{
                  display: { xs: "none", sm: "flex" },
                  borderColor: `${theme.palette.primary.main}66`,
                  color: theme.palette.primary.main,
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  borderRadius: "8px",
                  px: 2,
                  py: 0.5,
                  background: theme.palette.custom.successBoxBg,
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    background: theme.palette.custom.successBoxBorder,
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 0 16px ${theme.palette.primary.main}66`,
                    transform: "translateY(-1px)",
                  },
                  "&:active": {
                    transform: "scale(0.96)",
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
                  background: theme.palette.custom.successBoxBg,
                  color: theme.palette.primary.main,
                  border: `1px solid ${theme.palette.custom.successBoxBorder}`,
                  borderRadius: "8px",
                  width: 36,
                  height: 36,
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    background: theme.palette.custom.successBoxBorder,
                    boxShadow: `0 0 14px ${theme.palette.primary.main}88`,
                    transform: "scale(1.08)",
                  },
                  "&:active": {
                    transform: "scale(0.92)",
                  },
                }}
              >
                <AssessmentIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>

            {/* iOS Settings & Profile Button */}
            <Tooltip title="Settings & Profile">
              <IconButton
                onClick={() => setSettingsOpen(true)}
                size="small"
                sx={{
                  color: theme.palette.text.secondary,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: "8px",
                  width: 36,
                  height: 36,
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    color: theme.palette.primary.main,
                    borderColor: theme.palette.primary.main,
                    background: `${theme.palette.primary.main}14`,
                    transform: "rotate(45deg)",
                  },
                  "&:active": {
                    transform: "scale(0.92)",
                  },
                }}
              >
                <SettingsIcon sx={{ fontSize: 20 }} />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </Container>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentUser={currentUser}
        onLogout={onLogout}
      />
    </AppBar>
  );
}

export default Navbar;
