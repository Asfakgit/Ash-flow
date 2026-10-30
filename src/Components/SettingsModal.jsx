import React, { useState, useEffect, useRef, useContext, forwardRef } from "react";
import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Slide,
  IconButton,
  Button,
  CircularProgress,
  Avatar,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CloudSyncIcon from "@mui/icons-material/CloudSync";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import NightsStayOutlinedIcon from "@mui/icons-material/NightsStayOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import FavoriteIcon from "@mui/icons-material/Favorite";
import { ThemeContext } from "../ThemeContext";
import {
  getAuthUser,
  syncOfflineQueue,
  getCachedTransactions,
  getUserAvatar,
  updateUserProfileAvatar,
} from "../Services/SheetService";

const Transition = forwardRef(function Transition(props, ref) {
  return (
    <Slide
      direction="up"
      ref={ref}
      {...props}
      timeout={{ enter: 340, exit: 220 }}
      style={{
        transitionTimingFunction: props.in
          ? "cubic-bezier(0.16, 1, 0.3, 1)"
          : "cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    />
  );
});

// Lightweight image compressor
const compressImage = (file, maxSize = 256, quality = 0.82) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please upload a valid image file."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image."));
      img.onload = () => {
        try {
          const width = img.width;
          const height = img.height;
          const minDim = Math.min(width, height);
          const startX = (width - minDim) / 2;
          const startY = (height - minDim) / 2;
          const targetSize = Math.min(maxSize, minDim);

          const canvas = document.createElement("canvas");
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve(readerEvent.target.result);
            return;
          }

          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);
          const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(compressedDataUrl);
        } catch (err) {
          reject(err);
        }
      };
      img.src = readerEvent.target.result;
    };
    reader.readAsDataURL(file);
  });
};

export default function SettingsModal({ open, onClose, currentUser, onLogout }) {
  const theme = useTheme();
  const { activeTheme, setTheme } = useContext(ThemeContext);
  const fileInputRef = useRef(null);

  const userObj = currentUser || getAuthUser();
  const isAdmin = userObj?.role === "ADMIN";

  // User-isolated avatar state
  const [avatarImage, setAvatarImage] = useState(() => getUserAvatar(userObj));

  const [uploadLoading, setUploadLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState("");
  const [showStory, setShowStory] = useState(false);

  useEffect(() => {
    if (open) {
      const u = getAuthUser() || currentUser;
      setAvatarImage(getUserAvatar(u));
      setSyncStatus("");
    }
  }, [open, currentUser]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadLoading(true);
    try {
      const compressedDataUrl = await compressImage(file, 256, 0.82);
      setAvatarImage(compressedDataUrl);
      await updateUserProfileAvatar(compressedDataUrl);
    } catch (err) {
      console.error("Avatar upload failed:", err);
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = async (e) => {
    e.stopPropagation();
    try {
      setAvatarImage(null);
      await updateUserProfileAvatar(null);
    } catch (err) {
      console.error("Failed to remove avatar:", err);
    }
  };

  const handleForceSync = async () => {
    setSyncLoading(true);
    setSyncStatus("");
    try {
      await syncOfflineQueue();
      setSyncStatus("Synced!");
    } catch (err) {
      setSyncStatus("Failed");
    } finally {
      setSyncLoading(false);
      setTimeout(() => setSyncStatus(""), 3000);
    }
  };

  const cachedCount = (() => {
    try {
      return getCachedTransactions().length;
    } catch {
      return 0;
    }
  })();

  return (
    <Dialog
      open={Boolean(open)}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: { xs: "24px 24px 0 0", sm: 3.5 },
          m: { xs: 0, sm: 2 },
          position: { xs: "fixed", sm: "relative" },
          bottom: { xs: 0, sm: "auto" },
          width: { xs: "100%", sm: "auto" },
          maxHeight: { xs: "92vh", sm: "88vh" },
          background:
            theme.palette.mode === "dark"
              ? "linear-gradient(175deg, #18191d 0%, #101114 100%)"
              : "#ffffff",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.7)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      {/* Mobile Top Grab Bar */}
      <Box
        sx={{
          pt: 1.2,
          pb: 0.4,
          display: { xs: "flex", sm: "none" },
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            width: 38,
            height: 4.5,
            borderRadius: 3,
            bgcolor: "rgba(148, 163, 184, 0.25)",
          }}
        />
      </Box>

      {/* Header Bar */}
      <Box
        sx={{
          px: 2.5,
          py: 1.8,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography
          variant="h6"
          fontWeight="800"
          sx={{
            fontSize: "1.15rem",
            letterSpacing: "-0.02em",
            color: theme.palette.text.primary,
          }}
        >
          Settings
        </Typography>

        <Button
          onClick={onClose}
          size="small"
          sx={{
            fontWeight: 800,
            fontSize: "0.92rem",
            textTransform: "none",
            color: theme.palette.primary.main,
            px: 1.5,
            py: 0.4,
            minWidth: 0,
            borderRadius: "20px",
            bgcolor: `${theme.palette.primary.main}14`,
            "&:hover": {
              bgcolor: `${theme.palette.primary.main}24`,
            },
          }}
        >
          Done
        </Button>
      </Box>

      {/* Content */}
      <DialogContent
        sx={{
          p: { xs: 2.2, sm: 2.8 },
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 2.4,
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(148, 163, 184, 0.2)",
            borderRadius: "4px",
          },
        }}
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />

        {/* 1. SIMPLE & FREE PROFILE HEADER */}
        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.03)"
                : "rgba(0, 0, 0, 0.02)",
            border: `1px solid ${theme.palette.divider}`,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          {/* Avatar with tap-to-change */}
          <Box sx={{ position: "relative" }}>
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                width: 62,
                height: 62,
                borderRadius: "50%",
                cursor: "pointer",
                overflow: "hidden",
                border: `2px solid ${theme.palette.primary.main}`,
                boxShadow: `0 4px 16px ${theme.palette.primary.main}38`,
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "scale(1.04)",
                  "& .overlay": { opacity: 1 },
                },
              }}
            >
              {avatarImage ? (
                <Box
                  component="img"
                  src={avatarImage}
                  alt="Profile"
                  sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <Avatar
                  sx={{
                    width: "100%",
                    height: "100%",
                    bgcolor: `${theme.palette.primary.main}22`,
                    color: theme.palette.primary.main,
                    fontWeight: 900,
                    fontSize: "1.3rem",
                  }}
                >
                  {(userObj?.fullName || userObj?.username || "A").charAt(0).toUpperCase()}
                </Avatar>
              )}

              {/* Tap hint overlay */}
              <Box
                className="overlay"
                sx={{
                  position: "absolute",
                  inset: 0,
                  bgcolor: "rgba(0,0,0,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0,
                  transition: "opacity 0.2s ease",
                }}
              >
                <CameraAltIcon sx={{ color: "#ffffff", fontSize: 20 }} />
              </Box>

              {uploadLoading && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    bgcolor: "rgba(0,0,0,0.6)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress size={20} color="inherit" sx={{ color: "#ffffff" }} />
                </Box>
              )}
            </Box>
          </Box>

          {/* User Info & Simple Photo Actions */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.2} flexWrap="wrap">
              <Typography
                variant="subtitle1"
                fontWeight="800"
                sx={{
                  color: theme.palette.text.primary,
                  fontSize: "1.05rem",
                  lineHeight: 1.2,
                }}
              >
                {userObj?.fullName || "User"}
              </Typography>

              {isAdmin ? (
                <Chip
                  size="small"
                  label="ADMIN"
                  sx={{
                    height: 19,
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    bgcolor: `${theme.palette.primary.main}22`,
                    color: theme.palette.primary.main,
                    border: `1px solid ${theme.palette.primary.main}44`,
                  }}
                />
              ) : (
                <Chip
                  size="small"
                  label="MEMBER"
                  sx={{
                    height: 19,
                    fontSize: "0.62rem",
                    fontWeight: 800,
                    bgcolor: "rgba(99, 102, 241, 0.15)",
                    color: "#818cf8",
                  }}
                />
              )}
            </Box>

            <Typography
              variant="caption"
              sx={{ color: theme.palette.text.secondary, fontWeight: 500, display: "block" }}
            >
              @{userObj?.username || "ashflow"}
            </Typography>

            {/* Simple clean photo buttons */}
            <Box display="flex" alignItems="center" gap={1.2} mt={0.8}>
              <Typography
                variant="caption"
                onClick={() => fileInputRef.current?.click()}
                sx={{
                  color: theme.palette.primary.main,
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {avatarImage ? "Change photo" : "Upload photo"}
              </Typography>

              {avatarImage && (
                <Typography
                  variant="caption"
                  onClick={handleRemoveImage}
                  sx={{
                    color: theme.palette.error.main,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    cursor: "pointer",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  Remove
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        {/* 2. FREE & SIMPLE APPEARANCE PICKER */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: theme.palette.text.secondary,
              px: 0.5,
              mb: 0.8,
              display: "block",
              fontSize: "0.72rem",
            }}
          >
            Appearance
          </Typography>

          <Box
            sx={{
              p: 0.5,
              borderRadius: 3,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.04)"
                  : "rgba(0, 0, 0, 0.04)",
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <ToggleButtonGroup
              value={activeTheme}
              exclusive
              onChange={(e, val) => val && setTheme(val)}
              fullWidth
              sx={{
                "& .MuiToggleButtonGroup-grouped": {
                  border: "none",
                  borderRadius: "10px !important",
                  py: 1,
                  px: 1,
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  textTransform: "none",
                  color: theme.palette.text.secondary,
                  transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
                  "&.Mui-selected": {
                    color: "#ffffff",
                    bgcolor:
                      activeTheme === "oledNeon"
                        ? "#1f2024"
                        : activeTheme === "cleanCorporate"
                        ? "#007AFF"
                        : theme.palette.primary.main,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
                  },
                },
              }}
            >
              <ToggleButton value="oledNeon">
                <Box display="flex" alignItems="center" gap={0.6}>
                  <NightsStayOutlinedIcon sx={{ fontSize: 16 }} />
                  <span>OLED Black</span>
                </Box>
              </ToggleButton>
              <ToggleButton value="midnightEmerald">
                <Box display="flex" alignItems="center" gap={0.6}>
                  <DarkModeOutlinedIcon sx={{ fontSize: 16 }} />
                  <span>Emerald</span>
                </Box>
              </ToggleButton>
              <ToggleButton value="cleanCorporate">
                <Box display="flex" alignItems="center" gap={0.6}>
                  <LightModeOutlinedIcon sx={{ fontSize: 16 }} />
                  <span>Light</span>
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>

        {/* 3. SIMPLE PRIVACY & CLOUD SETTINGS */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: theme.palette.text.secondary,
              px: 0.5,
              mb: 0.8,
              display: "block",
              fontSize: "0.72rem",
            }}
          >
            Data & Privacy
          </Typography>

          <Box
            sx={{
              borderRadius: 3,
              bgcolor:
                theme.palette.mode === "dark"
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(0, 0, 0, 0.02)",
              border: `1px solid ${theme.palette.divider}`,
              overflow: "hidden",
            }}
          >
            {/* Cloud Sync Row */}
            <Box
              sx={{
                px: 2,
                py: 1.4,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box display="flex" alignItems="center" gap={1.2}>
                <CloudSyncIcon sx={{ fontSize: 18, color: "#0A84FF" }} />
                <Box>
                  <Typography variant="body2" fontWeight="600" sx={{ fontSize: "0.88rem" }}>
                    Google Sheets Sync
                  </Typography>
                  <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontSize: "0.72rem" }}>
                    Tab: {userObj?.sheetName || "transactions"} • {cachedCount} cached
                  </Typography>
                </Box>
              </Box>

              <Button
                size="small"
                variant="outlined"
                onClick={handleForceSync}
                disabled={syncLoading}
                sx={{
                  fontWeight: 700,
                  fontSize: "0.75rem",
                  borderRadius: "16px",
                  textTransform: "none",
                  px: 1.4,
                  py: 0.3,
                  borderColor: theme.palette.divider,
                  color: syncStatus === "Synced!" ? theme.palette.primary.main : theme.palette.text.primary,
                }}
              >
                {syncLoading ? (
                  <CircularProgress size={14} color="inherit" />
                ) : syncStatus ? (
                  syncStatus
                ) : (
                  "Sync Now"
                )}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* 4. SIMPLE ABOUT & DEDICATION */}
        <Box
          sx={{
            p: 1.6,
            borderRadius: 3,
            bgcolor:
              theme.palette.mode === "dark"
                ? "rgba(255, 255, 255, 0.02)"
                : "rgba(0, 0, 0, 0.015)",
            border: `1px solid ${theme.palette.divider}`,
            textAlign: "center",
          }}
        >
          <Typography
            variant="caption"
            fontWeight="700"
            sx={{ color: theme.palette.text.primary, display: "block" }}
          >
            Ash Flow Finance Portal • v2.0
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              fontSize: "0.72rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.4,
              mt: 0.3,
            }}
          >
            Crafted with by Ashfak
          </Typography>

        </Box>

        {/* 5. SIMPLE SIGN OUT BUTTON */}
        {onLogout && (
          <Button
            fullWidth
            onClick={() => {
              onClose();
              onLogout();
            }}
            startIcon={<LogoutIcon sx={{ fontSize: 18 }} />}
            sx={{
              py: 1.2,
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "#FF453A",
              bgcolor: "rgba(255, 69, 58, 0.08)",
              borderRadius: "14px",
              textTransform: "none",
              transition: "all 0.15s ease",
              "&:hover": {
                bgcolor: "rgba(255, 69, 58, 0.16)",
              },
            }}
          >
            Sign Out
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
