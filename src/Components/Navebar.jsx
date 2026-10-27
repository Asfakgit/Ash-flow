import { useState, useContext } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  Badge,
  Chip,
} from "@mui/material";
import AssessmentIcon from "@mui/icons-material/Assessment";
import PaletteIcon from "@mui/icons-material/Palette";
import CheckIcon from "@mui/icons-material/Check";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import LogoutIcon from "@mui/icons-material/Logout";
import PersonIcon from "@mui/icons-material/Person";
import { useTheme } from "@mui/material/styles";
import logo from "../assets/logo.png";
import { ThemeContext } from "../ThemeContext";
import AppInfoModal from "./AppInfoModal";

function Navbar({
  onOpenReports,
  currentUser,
  pendingUsersCount = 0,
  onOpenAdminUsers,
  onLogout,
}) {
  const theme = useTheme();
  const { activeTheme, setTheme } = useContext(ThemeContext);
  const [anchorEl, setAnchorEl] = useState(null);
  const [infoOpen, setInfoOpen] = useState(false);

  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleThemeChange = (themeName) => {
    setTheme(themeName);
    handleMenuClose();
  };

  const themes = [
    { key: "midnightEmerald", label: "Dark (Midnight)" },
    { key: "oledNeon", label: "OLED (True Black)" },
    { key: "cleanCorporate", label: "Light (Clean)" },
  ];

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
          {/* Logo & App Name */}
          <Box
            display="flex"
            alignItems="center"
            gap={{ xs: 1, sm: 1.5 }}
            onClick={() => setInfoOpen(true)}
            sx={{
              cursor: "pointer",
              transition: "transform 0.2s, opacity 0.2s",
              "&:hover": {
                transform: "scale(1.02)",
                opacity: 0.9,
              },
              "&:active": {
                transform: "scale(0.98)",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: { xs: 34, sm: 40 },
                height: { xs: 34, sm: 40 },
                borderRadius: "8px",
                overflow: "hidden",
                boxShadow: `0 4px 12px ${theme.palette.primary.main}4D`,
                flexShrink: 0,
              }}
            >
              <Box
                component="img"
                src={logo}
                alt="Ash Flow Logo"
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
                  color: theme.palette.text.primary,
                  lineHeight: 1.1,
                  fontSize: { xs: "1rem", sm: "1.2rem" },
                }}
              >
                ASH FLOW
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.primary.main,
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

          {/* Right Nav Actions */}
          <Box display="flex" alignItems="center" gap={{ xs: 0.8, sm: 1.2 }}>
            {/* User Chip Display */}
            {currentUser && (
              <Chip
                size="small"
                icon={<PersonIcon sx={{ fontSize: "15px !important" }} />}
                label={currentUser.fullName || currentUser.username}
                sx={{
                  display: { xs: "none", md: "inline-flex" },
                  height: 32,
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  borderRadius: "8px",
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

            {/* Theme Switcher Button */}
            <Tooltip title="Change Theme">
              <IconButton
                onClick={handleMenuOpen}
                size="small"
                sx={{
                  color: theme.palette.text.secondary,
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: "8px",
                  width: 36,
                  height: 36,
                  "&:hover": {
                    background: theme.palette.divider,
                  },
                }}
              >
                <PaletteIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>

            {/* Theme Selection Menu */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              PaperProps={{
                sx: {
                  mt: 1,
                  borderRadius: 1.5,
                  boxShadow: theme.palette.custom.paperShadow,
                  background: theme.palette.background.paper,
                  border: `1px solid ${theme.palette.divider}`,
                },
              }}
            >
              {themes.map((t) => (
                <MenuItem
                  key={t.key}
                  onClick={() => handleThemeChange(t.key)}
                  sx={{ py: 1.5, px: 2 }}
                >
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    {activeTheme === t.key ? (
                      <CheckIcon
                        fontSize="small"
                        sx={{ color: theme.palette.primary.main }}
                      />
                    ) : null}
                  </ListItemIcon>
                  <Typography
                    variant="body2"
                    fontWeight={activeTheme === t.key ? 700 : 500}
                    color={theme.palette.text.primary}
                  >
                    {t.label}
                  </Typography>
                </MenuItem>
              ))}
            </Menu>

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
                  "&:hover": {
                    background: theme.palette.custom.successBoxBorder,
                    borderColor: theme.palette.primary.main,
                    boxShadow: `0 0 15px ${theme.palette.primary.main}4D`,
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
                  "&:hover": {
                    background: theme.palette.custom.successBoxBorder,
                    boxShadow: `0 0 12px ${theme.palette.primary.main}66`,
                  },
                }}
              >
                <AssessmentIcon sx={{ fontSize: 19 }} />
              </IconButton>
            </Tooltip>

            {/* Logout Button */}
            {onLogout && (
              <Tooltip title="Log Out">
                <IconButton
                  onClick={onLogout}
                  size="small"
                  sx={{
                    color: theme.palette.text.secondary,
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: "8px",
                    width: 36,
                    height: 36,
                    "&:hover": {
                      background: theme.palette.error.main + "22",
                      color: theme.palette.error.main,
                      borderColor: theme.palette.error.main + "66",
                    },
                  }}
                >
                  <LogoutIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Toolbar>
      </Container>

      <AppInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
    </AppBar>
  );
}

export default Navbar;
