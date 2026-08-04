import { useTheme } from "@mui/material/styles";
import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Slide,
  CircularProgress,
} from "@mui/material";
import { forwardRef, useState, useEffect } from "react";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const Transition = forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

function CustomDialog({
  open,
  onClose,
  onConfirm,
  type = "success", // "success" | "confirm" | "error" | "info"
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
}) {
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setIsSubmitting(false);
    }
  }, [open]);

  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleOutlineIcon sx={{ fontSize: 72, color: theme.palette.success.main, mb: 1.5, filter: "drop-shadow(0 0 12px rgba(16,185,129,0.4))" }} />;
      case "confirm":
        return <WarningAmberIcon sx={{ fontSize: 72, color: theme.palette.warning.main, mb: 1.5, filter: "drop-shadow(0 0 12px rgba(245,158,11,0.4))" }} />;
      case "error":
        return <ErrorOutlineIcon sx={{ fontSize: 72, color: theme.palette.error.main, mb: 1.5, filter: "drop-shadow(0 0 12px rgba(244,63,94,0.4))" }} />;
      default:
        return <InfoOutlinedIcon sx={{ fontSize: 72, color: theme.palette.info.main, mb: 1.5, filter: "drop-shadow(0 0 12px rgba(59,130,246,0.4))" }} />;
    }
  };

  const getDefaultTitle = () => {
    if (title) return title;
    switch (type) {
      case "success":
        return "Success!";
      case "confirm":
        return "Confirmation Required";
      case "error":
        return "Notice";
      default:
        return "Information";
    }
  };

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
          p: 3,
          textAlign: "center",
          borderRadius: 4,
          background: theme.palette.custom.dialogGradient,
          border: "1px solid rgba(148, 163, 184, 0.15)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.85)",
          overflow: "hidden",
          position: "relative",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "4px",
            background:
              type === "success"
                ? `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.success.light})`
                : type === "confirm"
                ? `linear-gradient(90deg, ${theme.palette.warning.main}, ${theme.palette.warning.light})`
                : type === "error"
                ? `linear-gradient(90deg, ${theme.palette.error.main}, ${theme.palette.error.light})`
                : `linear-gradient(90deg, ${theme.palette.info.main}, ${theme.palette.info.light})`,
          },
        },
      }}
    >
      <DialogContent sx={{ px: 2, pt: 3, pb: 1 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          {getIcon()}
          <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: theme.palette.text.primary }}>
            {getDefaultTitle()}
          </Typography>
          <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mt: 1, lineHeight: 1.6 }}>
            {message}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "center", pt: 3, pb: 2, gap: 1.5 }}>
        {type === "confirm" ? (
          <>
            <Button
              variant="outlined"
              onClick={onClose}
              sx={{
                flex: 1,
                borderColor: "rgba(148, 163, 184, 0.2)",
                color: theme.palette.text.secondary,
                "&:hover": {
                  borderColor: "rgba(148, 163, 184, 0.4)",
                  backgroundColor: "rgba(148, 163, 184, 0.05)",
                  color: theme.palette.text.primary,
                },
              }}
            >
              {cancelText}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                if (isSubmitting) return;
                if (onConfirm) {
                  setIsSubmitting(true);
                  try {
                    await onConfirm();
                  } finally {
                    // Dialog usually closes in onConfirm, but just in case:
                    setIsSubmitting(false);
                  }
                }
              }}
              disabled={isSubmitting}
              sx={{
                flex: 1,
                background: theme.palette.custom.errorGradient,
                "&:hover": {
                  background: theme.palette.custom.errorHoverGradient,
                },
              }}
            >
              {isSubmitting ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                confirmText
              )}
            </Button>
          </>
        ) : (
          <Button
            variant="contained"
            onClick={onClose}
            fullWidth
            sx={{
              py: 1.2,
              background:
                type === "error"
                  ? theme.palette.custom.errorGradient
                  : theme.palette.custom.primaryGradient,
            }}
          >
            OK
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default CustomDialog;
