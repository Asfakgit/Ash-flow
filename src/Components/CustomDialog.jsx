import {
  Dialog,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  Slide,
} from "@mui/material";
import { forwardRef } from "react";
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
  const getIcon = () => {
    switch (type) {
      case "success":
        return <CheckCircleOutlineIcon sx={{ fontSize: 72, color: "#10B981", mb: 1.5, filter: "drop-shadow(0 0 12px rgba(16,185,129,0.4))" }} />;
      case "confirm":
        return <WarningAmberIcon sx={{ fontSize: 72, color: "#F59E0B", mb: 1.5, filter: "drop-shadow(0 0 12px rgba(245,158,11,0.4))" }} />;
      case "error":
        return <ErrorOutlineIcon sx={{ fontSize: 72, color: "#F43F5E", mb: 1.5, filter: "drop-shadow(0 0 12px rgba(244,63,94,0.4))" }} />;
      default:
        return <InfoOutlinedIcon sx={{ fontSize: 72, color: "#3B82F6", mb: 1.5, filter: "drop-shadow(0 0 12px rgba(59,130,246,0.4))" }} />;
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
          background: "linear-gradient(145deg, #172036 0%, #0F172A 100%)",
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
                ? "linear-gradient(90deg, #10B981, #34D399)"
                : type === "confirm"
                ? "linear-gradient(90deg, #F59E0B, #FBBF24)"
                : type === "error"
                ? "linear-gradient(90deg, #F43F5E, #FB7185)"
                : "linear-gradient(90deg, #3B82F6, #60A5FA)",
          },
        },
      }}
    >
      <DialogContent sx={{ px: 2, pt: 3, pb: 1 }}>
        <Box display="flex" flexDirection="column" alignItems="center">
          {getIcon()}
          <Typography variant="h5" fontWeight="bold" gutterBottom sx={{ color: "#F8FAFC" }}>
            {getDefaultTitle()}
          </Typography>
          <Typography variant="body1" sx={{ color: "#94A3B8", mt: 1, lineHeight: 1.6 }}>
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
                color: "#94A3B8",
                "&:hover": {
                  borderColor: "rgba(148, 163, 184, 0.4)",
                  backgroundColor: "rgba(148, 163, 184, 0.05)",
                  color: "#F8FAFC",
                },
              }}
            >
              {cancelText}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => {
                if (onConfirm) onConfirm();
              }}
              sx={{
                flex: 1,
                background: "linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)",
                "&:hover": {
                  background: "linear-gradient(135deg, #FB7185 0%, #F43F5E 100%)",
                },
              }}
            >
              {confirmText}
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
                  ? "linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)"
                  : "linear-gradient(135deg, #10B981 0%, #059669 100%)",
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
