import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Slide,
  IconButton,
  Paper,
  Tooltip,
  Zoom,
  Switch,
  CircularProgress,
} from "@mui/material";
import { forwardRef, useState, useEffect, useRef } from "react";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SecurityIcon from "@mui/icons-material/Security";
import LockIcon from "@mui/icons-material/Lock";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { useTheme } from "@mui/material/styles";
import { updateAdminViewPermission, getAuthUser, getUserAvatar, updateUserProfileAvatar } from "../Services/SheetService";

const Transition = forwardRef(function Transition(props, ref) {
  return (
    <Zoom
      ref={ref}
      {...props}
      timeout={{ enter: 380, exit: 240 }}
      style={{
        transformOrigin: "center center",
        transitionTimingFunction: props.in
          ? "cubic-bezier(0.34, 1.56, 0.64, 1)"
          : "cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    />
  );
});

// Utility to resize and compress uploaded images to prevent QuotaExceededError
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

          // Square center crop calculation
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

          ctx.drawImage(
            img,
            startX,
            startY,
            minDim,
            minDim,
            0,
            0,
            targetSize,
            targetSize
          );

          // Convert to lightweight, crisp JPEG data URL (~15-30 KB)
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

function AppInfoModal({ open, onClose, currentUser }) {
  const theme = useTheme();
  const fileInputRef = useRef(null);
  const [uploadError, setUploadError] = useState("");

  const userObj = currentUser || getAuthUser();
  const isAdmin = userObj?.role === "ADMIN";

  const [allowAdminView, setAllowAdminView] = useState(() => {
    return Boolean(userObj?.allowAdminView);
  });
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [privacyMessage, setPrivacyMessage] = useState("");

  useEffect(() => {
    if (open) {
      const active = currentUser || getAuthUser();
      setAllowAdminView(Boolean(active?.allowAdminView));
      setPrivacyMessage("");
    }
  }, [open, currentUser]);

  const handleTogglePrivacy = async (e) => {
    const newVal = e.target.checked;
    setAllowAdminView(newVal);
    setPrivacyLoading(true);
    setPrivacyMessage("");
    try {
      const res = await updateAdminViewPermission(newVal);
      setPrivacyMessage(res.message || (newVal ? "Sheet shared with Admin." : "Sheet set to private."));
    } catch (err) {
      setAllowAdminView(!newVal);
      setPrivacyMessage(err.message || "Failed to update permission.");
    } finally {
      setPrivacyLoading(false);
    }
  };

  const [avatarImage, setAvatarImage] = useState(() => getUserAvatar(userObj));

  useEffect(() => {
    if (open) {
      setAvatarImage(getUserAvatar(userObj));
    }
  }, [open, userObj]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError("Image size exceeds 2MB limit. Please choose a smaller image.");
      return;
    }

    setUploadError("");
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const dataUrl = event.target?.result;
        setAvatarImage(dataUrl);
        await updateUserProfileAvatar(dataUrl);
      } catch (err) {
        console.warn("Avatar save error:", err);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async (e) => {
    e.stopPropagation();
    try {
      setAvatarImage(null);
      await updateUserProfileAvatar(null);
    } catch (err) {
      console.warn("Avatar remove error:", err);
    }
  };

  // Lock background body scroll when modal is open
  useEffect(() => {
    if (open) {
      const origBodyOverflow = document.body.style.overflow;
      const origHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = origBodyOverflow;
        document.documentElement.style.overflow = origHtmlOverflow;
      };
    }
  }, [open]);

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        elevation: 0,
        sx: {
          borderRadius: { xs: 1.5, sm: 2 },
          background:
            theme.palette.mode === "dark"
              ? "rgba(18, 18, 20, 0.92)"
              : "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(35px) saturate(190%)",
          WebkitBackdropFilter: "blur(35px) saturate(190%)",
          border: `1px solid ${theme.palette.divider}`,
          overflow: "hidden",
          boxShadow: theme.palette.custom.dialogShadow,
          position: "relative",
        },
      }}
    >
      {/* Absolute Close Icon Top Right */}
      <IconButton
        onClick={onClose}
        size="small"
        sx={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 20,
          color: theme.palette.text.secondary,
        }}
      >
        <CloseIcon fontSize="small" />
      </IconButton>

      <DialogContent
        sx={{
          px: { xs: 2.5, sm: 4 },
          pb: { xs: 3, sm: 4 },
          pt: { xs: 3.5, sm: 4 },
          textAlign: "center",
          overflow: "hidden",
        }}
      >
        {/* Hidden File Input for Avatar */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          style={{ display: "none" }}
        />

        {/* Editable Round Profile Avatar Area - Fully Visible */}
        <Box
          sx={{
            position: "relative",
            width: 88,
            height: 88,
            mx: "auto",
            mb: 2,
            mt: 0,
          }}
        >
          <Tooltip
            title="Click to change profile picture"
            arrow
            placement="top"
          >
            <Box
              onClick={() => fileInputRef.current?.click()}
              sx={{
                position: "relative",
                width: 88,
                height: 88,
                cursor: "pointer",
                borderRadius: "50%",
                background: theme.palette.custom.cardGradient,
                border: `2px solid ${theme.palette.primary.main}`,
                boxShadow: `0 0 25px ${theme.palette.primary.main}44`,
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
                "&:hover": {
                  transform: "scale(1.04)",
                  "& .overlay-edit": {
                    opacity: 1,
                  },
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
                <Typography
                  variant="h3"
                  fontWeight="900"
                  sx={{
                    color: theme.palette.text.primary,
                    letterSpacing: "-0.05em",
                    background:
                      theme.palette.custom.titleGradient ||
                      theme.palette.custom.primaryGradient,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  AF
                </Typography>
              )}

              {/* Hover Edit Overlay */}
              <Box
                className="overlay-edit"
                sx={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0, 0, 0, 0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: 0,
                  transition: "opacity 0.2s ease",
                }}
              >
                <EditIcon sx={{ color: "#ffffff", fontSize: 24 }} />
              </Box>
            </Box>
          </Tooltip>

          {/* Remove Image Icon (if image exists) */}
          {avatarImage && (
            <Tooltip title="Remove photo">
              <IconButton
                onClick={handleRemoveImage}
                size="small"
                sx={{
                  position: "absolute",
                  bottom: -2,
                  right: -2,
                  backgroundColor: theme.palette.error.main,
                  color: "#fff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  "&:hover": { backgroundColor: theme.palette.error.dark },
                }}
              >
                <DeleteOutlineIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {uploadError && (
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.error.main,
              mt: -1,
              mb: 1.5,
              fontWeight: 500,
            }}
          >
            {uploadError}
          </Typography>
        )}

        {/* Title */}
        <Typography
          variant="h5"
          fontWeight="800"
          sx={{
            color: theme.palette.text.primary,
            mb: 0.2,
            letterSpacing: "-0.03em",
          }}
        >
          ASH FLOW
        </Typography>

        <Typography
          variant="caption"
          sx={{
            color: theme.palette.text.secondary,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            display: "block",
            mb: 2,
          }}
        >
          Created August 5, 2026
        </Typography>

        {/* Enhanced Personal Effort & Story Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 1.5,
            background: theme.palette.custom.cardGradient,
            border: `1px solid ${theme.palette.divider}`,
            textAlign: "left",
            position: "relative",
            overflow: "hidden",
            boxShadow: theme.palette.custom.paperShadow,
          }}
        >
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <AutoAwesomeIcon
              sx={{ color: theme.palette.primary.main, fontSize: 18 }}
            />
            <Typography
              variant="subtitle2"
              fontWeight="800"
              sx={{
                color: theme.palette.primary.main,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              My Story & Dedication
            </Typography>
          </Box>

          <Typography
            variant="body2"
            sx={{
              color: theme.palette.text.primary,
              lineHeight: 1.65,
              fontWeight: 500,
              fontSize: "0.88rem",
            }}
          >
            Ash Flow is my first flagship application to track financial flow,
            created on August 5, 2026. Built through tireless dedication,
            continuous design iterations, and relentless effort, every single
            screen, theme, and animation was engineered to deliver instant
            performance, crisp iOS aesthetics, and an effortless money tracking
            experience.
          </Typography>
        </Paper>

        {/* Privacy & Admin Sheet Access Settings (For Regular Users) */}
        {!isAdmin && (
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              mt: 2,
              borderRadius: 1.5,
              background: theme.palette.custom.cardGradient,
              border: `1px solid ${theme.palette.divider}`,
              textAlign: "left",
              boxShadow: theme.palette.custom.paperShadow,
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Box display="flex" alignItems="center" gap={1}>
                {allowAdminView ? (
                  <VisibilityIcon sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                ) : (
                  <LockIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                )}
                <Typography
                  variant="subtitle2"
                  fontWeight="800"
                  sx={{
                    color: theme.palette.text.primary,
                    letterSpacing: "0.02em",
                  }}
                >
                  Admin Sheet Access
                </Typography>
              </Box>

              <Box display="flex" alignItems="center" gap={0.5}>
                {privacyLoading && <CircularProgress size={18} />}
                <Switch
                  checked={allowAdminView}
                  onChange={handleTogglePrivacy}
                  disabled={privacyLoading}
                  color="primary"
                  size="small"
                />
              </Box>
            </Box>

            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", lineHeight: 1.5, fontSize: "0.78rem" }}
            >
              {allowAdminView
                ? "Your Google Sheet records can be inspected by the administrator."
                : "Your Google Sheet records are strictly private. The administrator cannot view your transactions."}
            </Typography>

            {privacyMessage && (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 1,
                  fontWeight: 600,
                  color: allowAdminView
                    ? theme.palette.primary.main
                    : theme.palette.warning.main,
                  fontSize: "0.74rem",
                }}
              >
                {privacyMessage}
              </Typography>
            )}
          </Paper>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default AppInfoModal;
