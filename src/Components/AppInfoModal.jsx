import {
  Dialog,
  DialogContent,
  Typography,
  Box,
  Slide,
  IconButton,
  Paper,
  Tooltip,
} from "@mui/material";
import { forwardRef, useState, useEffect, useRef } from "react";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useTheme } from "@mui/material/styles";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function AppInfoModal({ open, onClose }) {
  const theme = useTheme();
  const fileInputRef = useRef(null);

  const [avatarImage, setAvatarImage] = useState(() => {
    return localStorage.getItem("app_avatar_img") || null;
  });

  useEffect(() => {
    if (avatarImage) {
      localStorage.setItem("app_avatar_img", avatarImage);
    } else {
      localStorage.removeItem("app_avatar_img");
    }
  }, [avatarImage]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    setAvatarImage(null);
  };

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
          borderRadius: 3,
          background: theme.palette.mode === "dark" 
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

      <DialogContent sx={{ px: { xs: 2.5, sm: 4 }, pb: { xs: 3, sm: 4 }, pt: { xs: 3.5, sm: 4 }, textAlign: "center", overflow: "hidden" }}>
        {/* Hidden File Input for Avatar */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          onChange={handleImageUpload}
          style={{ display: "none" }}
        />

        {/* Editable Round Profile Avatar Area - Fully Visible */}
        <Box sx={{ position: "relative", width: 88, height: 88, mx: "auto", mb: 2, mt: 0 }}>
          <Tooltip title="Click to change profile picture" arrow placement="top">
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
                    background: theme.palette.custom.titleGradient || theme.palette.custom.primaryGradient,
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

        {/* Title */}
        <Typography variant="h5" fontWeight="800" sx={{ color: theme.palette.text.primary, mb: 0.2, letterSpacing: "-0.03em" }}>
          ASH FLOW
        </Typography>

        <Typography variant="caption" sx={{ color: theme.palette.text.secondary, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", mb: 2 }}>
          Created August 5, 2026
        </Typography>

        {/* Enhanced Personal Effort & Story Card */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 2.5,
            background: theme.palette.custom.cardGradient,
            border: `1px solid ${theme.palette.divider}`,
            textAlign: "left",
            position: "relative",
            overflow: "hidden",
            boxShadow: theme.palette.custom.paperShadow,
          }}
        >
          <Box display="flex" alignItems="center" gap={1} mb={1}>
            <AutoAwesomeIcon sx={{ color: theme.palette.primary.main, fontSize: 18 }} />
            <Typography variant="subtitle2" fontWeight="800" sx={{ color: theme.palette.primary.main, textTransform: "uppercase", letterSpacing: "0.05em" }}>
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
            Ash Flow is my first flagship application to track financial flow, created on August 5, 2026. Built through tireless dedication, continuous design iterations, and relentless effort, every single screen, theme, and animation was engineered to deliver instant performance, crisp iOS aesthetics, and an effortless money tracking experience.
          </Typography>
        </Paper>
      </DialogContent>
    </Dialog>
  );
}

export default AppInfoModal;
