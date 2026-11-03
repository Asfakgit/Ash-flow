import React, { useState, useEffect, useMemo, forwardRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
  Box,
  IconButton,
  Button,
  Chip,
  Paper,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Tooltip,
  Zoom,
  Divider,
  Stack,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import BlockIcon from '@mui/icons-material/Block';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import TableChartIcon from '@mui/icons-material/TableChart';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import LockResetIcon from '@mui/icons-material/LockReset';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import HistoryIcon from '@mui/icons-material/History';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ShieldIcon from '@mui/icons-material/Shield';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import UpdateIcon from '@mui/icons-material/Update';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import {
  adminGetUsers,
  adminUpdateUserStatus,
  adminDeleteUser,
  adminApprovePasswordReset,
  adminManagePremium,
  adminGetPremiumAudits,
  adminSetupSheets,
} from '../Services/SheetService';

const Transition = forwardRef(function Transition(props, ref) {
  return (
    <Zoom
      ref={ref}
      {...props}
      timeout={{ enter: 380, exit: 240 }}
      style={{
        transformOrigin: 'center center',
        transitionTimingFunction: props.in
          ? 'cubic-bezier(0.34, 1.56, 0.64, 1)'
          : 'cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  );
});

export default function AdminUserModal({ open, onClose, currentUser, onUsersUpdated }) {
  const theme = useTheme();

  // Top Section Navigation: 'USERS' | 'PREMIUM'
  const [mainSection, setMainSection] = useState('USERS');

  // General users state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Users section filter
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'INACTIVE'

  // Premium section filter
  const [premiumSearchQuery, setPremiumSearchQuery] = useState('');
  const [premiumTabFilter, setPremiumTabFilter] = useState('ALL'); // 'ALL' | 'ACTIVE' | 'STANDARD' | 'EXPIRED_REVOKED'

  // Confirmation dialog state for basic user actions
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null,
  });

  // Premium Activation / Extension Dialog
  const [subscriptionModal, setSubscriptionModal] = useState({
    open: false,
    user: null,
    action: 'ACTIVATE', // 'ACTIVATE' | 'EXTEND'
    activationDate: '',
    expiryDate: '',
    notes: '',
  });

  // Premium Revoke Dialog
  const [revokeDialog, setRevokeDialog] = useState({
    open: false,
    user: null,
    notes: '',
  });

  // Premium Audit Viewer
  const [auditModal, setAuditModal] = useState({
    open: false,
    user: null,
    audits: [],
    loading: false,
    search: '',
  });

  const loadUsers = async () => {
    setLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await adminGetUsers();
      if (res.success) {
        setUsers(res.users || []);
        if (onUsersUpdated) {
          onUsersUpdated(res.users || []);
        }
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to load user list from Google Sheets.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Lock background body scroll when open
  useEffect(() => {
    if (open) {
      const origBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origBodyOverflow;
      };
    }
  }, [open]);

  // Basic User counts
  const counts = useMemo(() => {
    const total = users.length;
    const pending = users.filter((u) => u.status === 'PENDING').length;
    const approved = users.filter((u) => u.status === 'APPROVED').length;
    const inactive = users.filter(
      (u) => u.status === 'DISABLED' || u.status === 'REJECTED'
    ).length;
    return { total, pending, approved, inactive };
  }, [users]);

  // Premium counts
  const premiumStats = useMemo(() => {
    const total = users.length;
    const now = Date.now();
    let active = 0;
    let standard = 0;
    let expired = 0;
    let revoked = 0;
    let expiringSoon = 0;

    users.forEach((u) => {
      const status = String(u.membershipStatus || 'STANDARD').toUpperCase();
      const exp = u.premiumExpiresAt ? new Date(u.premiumExpiresAt).getTime() : null;
      const isAct = status === 'PREMIUM' && (!exp || exp > now);

      if (isAct) {
        active++;
        if (exp && exp - now > 0 && exp - now <= 7 * 24 * 60 * 60 * 1000) {
          expiringSoon++;
        }
      } else if (status === 'REVOKED') {
        revoked++;
      } else if (status === 'EXPIRED' || (status === 'PREMIUM' && exp && exp <= now)) {
        expired++;
      } else {
        standard++;
      }
    });

    return { total, active, standard, expired, revoked, expiringSoon };
  }, [users]);

  // Filtered basic users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (tabFilter === 'PENDING' && u.status !== 'PENDING') return false;
      if (tabFilter === 'APPROVED' && u.status !== 'APPROVED') return false;
      if (
        tabFilter === 'INACTIVE' &&
        u.status !== 'DISABLED' &&
        u.status !== 'REJECTED'
      )
        return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const usernameMatch = String(u.username || '').toLowerCase().includes(query);
        const nameMatch = String(u.fullName || '').toLowerCase().includes(query);
        const sheetMatch = String(u.sheetName || '').toLowerCase().includes(query);
        return usernameMatch || nameMatch || sheetMatch;
      }
      return true;
    });
  }, [users, tabFilter, searchQuery]);

  // Filtered premium users
  const filteredPremiumUsers = useMemo(() => {
    const now = Date.now();
    return users.filter((u) => {
      const status = String(u.membershipStatus || 'STANDARD').toUpperCase();
      const exp = u.premiumExpiresAt ? new Date(u.premiumExpiresAt).getTime() : null;
      const isAct = status === 'PREMIUM' && (!exp || exp > now);
      const isExpOrRev = status === 'REVOKED' || status === 'EXPIRED' || (status === 'PREMIUM' && exp && exp <= now);

      if (premiumTabFilter === 'ACTIVE' && !isAct) return false;
      if (premiumTabFilter === 'STANDARD' && (isAct || isExpOrRev)) return false;
      if (premiumTabFilter === 'EXPIRED_REVOKED' && !isExpOrRev) return false;

      if (premiumSearchQuery.trim()) {
        const q = premiumSearchQuery.toLowerCase().trim();
        const usernameMatch = String(u.username || '').toLowerCase().includes(q);
        const nameMatch = String(u.fullName || '').toLowerCase().includes(q);
        const statusMatch = status.toLowerCase().includes(q);
        return usernameMatch || nameMatch || statusMatch;
      }
      return true;
    });
  }, [users, premiumTabFilter, premiumSearchQuery]);

  // ==========================================
  // BASIC USER ACTIONS
  // ==========================================
  const handleStatusChange = async (targetUsername, newStatus) => {
    setActionLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await adminUpdateUserStatus(targetUsername, newStatus);
      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            res.message ||
            `User @${targetUsername} marked as ${newStatus} successfully!`,
        });
        await loadUsers();
      }
    } catch (err) {
      console.error('Status change error:', err);
      setFeedback({
        type: 'error',
        message: err.message || `Failed to update status for @${targetUsername}`,
      });
    } finally {
      setActionLoading(false);
      setConfirmDialog({ open: false, title: '', message: '', action: null });
    }
  };

  const promptStatusChange = (targetUsername, newStatus) => {
    let title = '';
    let message = '';

    if (newStatus === 'APPROVED') {
      title = `Approve @${targetUsername}?`;
      message = `This will grant the user access to the app and automatically create their personal Google Sheet tab ('User_${targetUsername}') within your spreadsheet.`;
    } else if (newStatus === 'REJECTED') {
      title = `Reject @${targetUsername}?`;
      message = `This will reject the user's registration. They will not be able to log in.`;
    } else if (newStatus === 'DISABLED') {
      title = `Disable @${targetUsername}?`;
      message = `This will immediately revoke access and prevent the user from logging in until re-enabled.`;
    }

    setConfirmDialog({
      open: true,
      title,
      message,
      action: () => handleStatusChange(targetUsername, newStatus),
    });
  };

  const handleDeleteUser = async (targetUsername) => {
    setActionLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await adminDeleteUser(targetUsername);
      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            res.message || `User @${targetUsername} deleted successfully.`,
        });
        await loadUsers();
      }
    } catch (err) {
      console.error('Delete user error:', err);
      setFeedback({
        type: 'error',
        message: err.message || `Failed to delete @${targetUsername}`,
      });
    } finally {
      setActionLoading(false);
      setConfirmDialog({ open: false, title: '', message: '', action: null });
    }
  };

  const promptDeleteUser = (targetUsername) => {
    setConfirmDialog({
      open: true,
      title: `Delete @${targetUsername}?`,
      message: `Are you sure you want to permanently delete user @${targetUsername} and their personal Google Sheet tab? All their records will be removed.`,
      action: () => handleDeleteUser(targetUsername),
    });
  };

  const handleApproveReset = async (targetUsername) => {
    setActionLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await adminApprovePasswordReset(targetUsername);
      setFeedback({
        type: 'success',
        message: res.message || `Password reset approved for @${targetUsername}.`,
      });
      await loadUsers();
    } catch (err) {
      console.error('Approve reset error:', err);
      setFeedback({
        type: 'error',
        message: err.message || `Failed to approve password reset.`,
      });
    } finally {
      setActionLoading(false);
    }
  };

  // ==========================================
  // PREMIUM SUBSCRIPTION ACTIONS
  // ==========================================
  const toInputDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const openSubscriptionModal = (user, action = 'ACTIVATE') => {
    const today = new Date().toISOString().split('T')[0];
    let defaultExpiry = '';

    if (action === 'EXTEND' && user?.premiumExpiresAt) {
      const curExp = new Date(user.premiumExpiresAt).getTime();
      const base = curExp > Date.now() ? curExp : Date.now();
      defaultExpiry = new Date(base + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else {
      defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    setSubscriptionModal({
      open: true,
      user,
      action,
      activationDate: toInputDate(user?.premiumActivatedAt) || today,
      expiryDate: defaultExpiry,
      notes: action === 'EXTEND' ? 'Subscription extended by Admin' : 'Premium membership activated by Admin',
    });
  };

  const applyPresetDays = (days) => {
    let baseTime = Date.now();
    if (subscriptionModal.action === 'EXTEND' && subscriptionModal.user?.premiumExpiresAt) {
      const curExp = new Date(subscriptionModal.user.premiumExpiresAt).getTime();
      if (!isNaN(curExp) && curExp > Date.now()) {
        baseTime = curExp;
      }
    }
    const targetDate = new Date(baseTime + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setSubscriptionModal((prev) => ({ ...prev, expiryDate: targetDate }));
  };

  const handleSaveSubscription = async () => {
    if (!subscriptionModal.expiryDate) {
      setFeedback({ type: 'error', message: 'Please select an expiry date.' });
      return;
    }
    if (
      subscriptionModal.activationDate &&
      new Date(subscriptionModal.expiryDate).getTime() <= new Date(subscriptionModal.activationDate).getTime()
    ) {
      setFeedback({ type: 'error', message: 'Expiry date must be after the activation date.' });
      return;
    }

    setActionLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await adminManagePremium({
        targetUsername: subscriptionModal.user.username,
        action: subscriptionModal.action,
        activationDate: new Date(subscriptionModal.activationDate).toISOString(),
        expiryDate: new Date(subscriptionModal.expiryDate + 'T23:59:59.999Z').toISOString(),
        notes: subscriptionModal.notes,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            res.message ||
            `Premium subscription successfully updated for @${subscriptionModal.user.username}!`,
        });

        // Optimistically update local users state immediately
        const targetU = String(subscriptionModal.user.username || '').toLowerCase();
        const newAct = res.subscription?.activatedAt || new Date(subscriptionModal.activationDate).toISOString();
        const newExp = res.subscription?.expiresAt || new Date(subscriptionModal.expiryDate + 'T23:59:59.999Z').toISOString();
        const newGrant = res.subscription?.grantedBy || currentUser?.username;

        setUsers((prev) =>
          prev.map((item) => {
            if (String(item.username || '').toLowerCase() === targetU) {
              return {
                ...item,
                membershipStatus: 'PREMIUM',
                isPremiumActive: true,
                premiumActivatedAt: newAct,
                premiumExpiresAt: newExp,
                premiumGrantedBy: newGrant,
                premiumUpdatedAt: new Date().toISOString(),
              };
            }
            return item;
          })
        );

        setSubscriptionModal({ open: false, user: null, action: 'ACTIVATE', activationDate: '', expiryDate: '', notes: '' });
        await loadUsers();
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update premium subscription.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openRevokeDialog = (user) => {
    setRevokeDialog({
      open: true,
      user,
      notes: 'Revoked by Admin',
    });
  };

  const handleConfirmRevoke = async () => {
    if (!revokeDialog.user) return;
    setActionLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await adminManagePremium({
        targetUsername: revokeDialog.user.username,
        action: 'REVOKE',
        notes: revokeDialog.notes || 'Premium revoked by Admin',
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message: res.message || `Premium membership revoked for @${revokeDialog.user.username}.`,
        });

        // Optimistically update local users state immediately
        const targetU = String(revokeDialog.user.username || '').toLowerCase();
        setUsers((prev) =>
          prev.map((item) => {
            if (String(item.username || '').toLowerCase() === targetU) {
              return {
                ...item,
                membershipStatus: 'REVOKED',
                isPremiumActive: false,
                premiumUpdatedAt: new Date().toISOString(),
              };
            }
            return item;
          })
        );

        setRevokeDialog({ open: false, user: null, notes: '' });
        await loadUsers();
      }
    } catch (err) {
      console.error('Revoke error:', err);
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to revoke premium subscription.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetupSheets = async () => {
    setActionLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await adminSetupSheets();
      if (res && res.success) {
        setFeedback({
          type: 'success',
          message: 'Google Sheets columns & Premium Audits tab verified and expanded successfully!',
        });
        await loadUsers();
      } else {
        setFeedback({
          type: 'warning',
          message: res?.message || 'Verification signal sent to Google Sheets.',
        });
      }
    } catch (err) {
      console.warn('handleSetupSheets error:', err);
      setFeedback({
        type: 'info',
        message: 'Sheet setup signal sent. Please ensure the latest .code.gs is deployed in Apps Script.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const openAuditModal = async (user = null) => {
    setAuditModal({
      open: true,
      user,
      audits: [],
      loading: true,
      search: '',
    });
    try {
      const res = await adminGetPremiumAudits(user ? user.username : null);
      if (res.success) {
        setAuditModal((prev) => ({
          ...prev,
          audits: res.audits || [],
          loading: false,
        }));
      }
    } catch (err) {
      console.error('Audit fetch error:', err);
      setAuditModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Status chip renderer for user list
  const getStatusChip = (status) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Chip
            size="small"
            label="APPROVED"
            icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
            sx={{
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#10b981',
              fontWeight: 700,
              fontSize: '0.72rem',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          />
        );
      case 'RESET_PENDING':
        return (
          <Chip
            size="small"
            label="RESET REQUESTED"
            icon={<LockResetIcon sx={{ fontSize: '14px !important' }} />}
            sx={{
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              color: '#f59e0b',
              fontWeight: 800,
              fontSize: '0.72rem',
              border: '1px solid rgba(245, 158, 11, 0.4)',
            }}
          />
        );
      case 'PENDING':
        return (
          <Chip
            size="small"
            label="PENDING REVIEW"
            icon={<HowToRegIcon sx={{ fontSize: '14px !important' }} />}
            sx={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              fontWeight: 700,
              fontSize: '0.72rem',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          />
        );
      case 'DISABLED':
        return (
          <Chip
            size="small"
            label="DISABLED"
            icon={<BlockIcon sx={{ fontSize: '14px !important' }} />}
            sx={{
              backgroundColor: 'rgba(107, 114, 128, 0.15)',
              color: '#9ca3af',
              fontWeight: 700,
              fontSize: '0.72rem',
              border: '1px solid rgba(107, 114, 128, 0.3)',
            }}
          />
        );
      case 'REJECTED':
        return (
          <Chip
            size="small"
            label="REJECTED"
            icon={<CancelIcon sx={{ fontSize: '14px !important' }} />}
            sx={{
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              fontWeight: 700,
              fontSize: '0.72rem',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          />
        );
      default:
        return (
          <Chip
            size="small"
            label={status || 'UNKNOWN'}
            sx={{ fontSize: '0.72rem', fontWeight: 700 }}
          />
        );
    }
  };

  // Premium status chip renderer
  const getPremiumChip = (user) => {
    const status = String(user.membershipStatus || 'STANDARD').toUpperCase();
    const exp = user.premiumExpiresAt ? new Date(user.premiumExpiresAt).getTime() : null;
    const isAct = status === 'PREMIUM' && (!exp || exp > Date.now());

    if (isAct) {
      let daysRemainingText = '';
      if (exp) {
        const days = Math.ceil((exp - Date.now()) / (1000 * 60 * 60 * 24));
        daysRemainingText = days > 0 ? ` · ${days}d left` : ' · Expiring';
      }
      return (
        <Chip
          size="small"
          icon={<WorkspacePremiumIcon sx={{ fontSize: '15px !important', color: '#F5D77F !important' }} />}
          label={`PREMIUM${daysRemainingText}`}
          sx={{
            backgroundColor: 'rgba(229, 193, 88, 0.18)',
            color: '#F5D77F',
            fontWeight: 800,
            fontSize: '0.72rem',
            border: '1px solid rgba(229, 193, 88, 0.45)',
            boxShadow: '0 0 10px rgba(229, 193, 88, 0.2)',
          }}
        />
      );
    }

    if (status === 'REVOKED') {
      return (
        <Chip
          size="small"
          label="REVOKED"
          sx={{
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#ef4444',
            fontWeight: 800,
            fontSize: '0.72rem',
            border: '1px solid rgba(239, 68, 68, 0.35)',
          }}
        />
      );
    }

    if (status === 'EXPIRED' || (status === 'PREMIUM' && exp && exp <= Date.now())) {
      return (
        <Chip
          size="small"
          label="EXPIRED"
          sx={{
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            color: '#f59e0b',
            fontWeight: 800,
            fontSize: '0.72rem',
            border: '1px solid rgba(245, 158, 11, 0.35)',
          }}
        />
      );
    }

    return (
      <Chip
        size="small"
        label="STANDARD"
        sx={{
          backgroundColor: 'rgba(107, 114, 128, 0.12)',
          color: '#9ca3af',
          fontWeight: 700,
          fontSize: '0.72rem',
          border: '1px solid rgba(107, 114, 128, 0.25)',
        }}
      />
    );
  };

  return (
    <>
      <Dialog
        open={open}
        TransitionComponent={Transition}
        keepMounted
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          elevation: 0,
          sx: {
            borderRadius: { xs: 2, sm: 3 },
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(18, 18, 22, 0.94)'
                : 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(35px) saturate(190%)',
            WebkitBackdropFilter: 'blur(35px) saturate(190%)',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.palette.custom?.dialogShadow || theme.shadows[16],
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            px: { xs: 2.5, sm: 3.5 },
            py: 2.2,
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Box
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: '10px',
                  background:
                    mainSection === 'PREMIUM'
                      ? 'linear-gradient(135deg, #E5C158, #B8860B)'
                      : theme.palette.custom?.primaryGradient || 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  boxShadow:
                    mainSection === 'PREMIUM'
                      ? '0 4px 14px rgba(229, 193, 88, 0.4)'
                      : `0 4px 12px ${theme.palette.primary.main}44`,
                  transition: 'all 0.3s ease',
                }}
              >
                {mainSection === 'PREMIUM' ? (
                  <WorkspacePremiumIcon sx={{ fontSize: 26, color: '#1a1500' }} />
                ) : (
                  <AdminPanelSettingsIcon sx={{ fontSize: 24 }} />
                )}
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="800" sx={{ lineHeight: 1.2 }}>
                  {mainSection === 'PREMIUM' ? 'Premium Membership Management' : 'User Management & Approvals'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {mainSection === 'PREMIUM'
                    ? 'Admin-controlled subscriptions, validity windows, extensions, and audit trail'
                    : 'Control multi-user registration, sheet tab provisioning, and access permissions'}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <Tooltip title="Verify and auto-expand Google Sheets columns (19 cols) & Premium_Audits tab">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={handleSetupSheets}
                  disabled={loading || actionLoading}
                  startIcon={
                    actionLoading ? (
                      <CircularProgress size={13} color="inherit" />
                    ) : (
                      <TableChartIcon sx={{ fontSize: 15 }} />
                    )
                  }
                  sx={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: '8px',
                    borderColor: 'rgba(255, 255, 255, 0.16)',
                    color: theme.palette.mode === 'dark' ? '#cbd5e1' : '#475569',
                    display: { xs: 'none', sm: 'inline-flex' },
                    py: 0.4,
                    px: 1.2,
                    '&:hover': {
                      borderColor: theme.palette.primary.main,
                      color: theme.palette.primary.main,
                    },
                  }}
                >
                  Verify Sheets
                </Button>
              </Tooltip>
              <Tooltip title="Refresh list">
                <IconButton
                  size="small"
                  onClick={loadUsers}
                  disabled={loading || actionLoading}
                  sx={{
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: '8px',
                  }}
                >
                  <RefreshIcon fontSize="small" sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
                </IconButton>
              </Tooltip>
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: '8px',
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          {/* Section Switcher Tabs */}
          <Tabs
            value={mainSection}
            onChange={(e, val) => setMainSection(val)}
            sx={{
              minHeight: 40,
              background:
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'rgba(0, 0, 0, 0.04)',
              borderRadius: 2,
              p: 0.5,
              '& .MuiTab-root': {
                minHeight: 34,
                py: 0.6,
                px: 2,
                fontSize: '0.85rem',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 1.5,
                transition: 'all 0.2s ease',
              },
              '& .Mui-selected': {
                backgroundColor:
                  mainSection === 'PREMIUM'
                    ? 'rgba(229, 193, 88, 0.15)'
                    : `${theme.palette.primary.main}1A`,
                color:
                  mainSection === 'PREMIUM'
                    ? '#F5D77F !important'
                    : `${theme.palette.primary.main} !important`,
                border:
                  mainSection === 'PREMIUM'
                    ? '1px solid rgba(229, 193, 88, 0.4)'
                    : `1px solid ${theme.palette.primary.main}44`,
              },
            }}
          >
            <Tab
              value="USERS"
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <PersonIcon sx={{ fontSize: 18 }} />
                  <span>Users & Approvals</span>
                  {counts.pending > 0 && (
                    <span
                      style={{
                        backgroundColor: '#f59e0b',
                        color: '#000',
                        borderRadius: '10px',
                        padding: '1px 6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                    >
                      {counts.pending}
                    </span>
                  )}
                </Box>
              }
            />
            <Tab
              value="PREMIUM"
              label={
                <Box display="flex" alignItems="center" gap={1}>
                  <WorkspacePremiumIcon sx={{ fontSize: 18, color: '#E5C158' }} />
                  <span>Premium Memberships</span>
                  {premiumStats.active > 0 && (
                    <span
                      style={{
                        backgroundColor: '#E5C158',
                        color: '#1a1500',
                        borderRadius: '10px',
                        padding: '1px 6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                      }}
                    >
                      {premiumStats.active}
                    </span>
                  )}
                </Box>
              }
            />
          </Tabs>
        </DialogTitle>

        <DialogContent sx={{ p: { xs: 2, sm: 3 }, overflowY: 'auto' }}>
          {/* Feedback Alert */}
          {feedback.message && (
            <Alert
              severity={feedback.type === 'error' ? 'error' : 'success'}
              onClose={() => setFeedback({ type: '', message: '' })}
              sx={{ mb: 2.5, borderRadius: 2 }}
            >
              {feedback.message}
            </Alert>
          )}

          {/* ========================================== */}
          {/* 1. USERS & APPROVALS SECTION               */}
          {/* ========================================== */}
          {mainSection === 'USERS' && (
            <>
              {/* Statistics Cards */}
              <Box
                display="grid"
                gridTemplateColumns={{ xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }}
                gap={1.5}
                mb={3}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: theme.palette.custom?.cardGradient,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    TOTAL USERS
                  </Typography>
                  <Typography variant="h5" fontWeight="800" color="text.primary">
                    {counts.total}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background:
                      counts.pending > 0
                        ? 'rgba(245, 158, 11, 0.08)'
                        : theme.palette.custom?.cardGradient,
                    border:
                      counts.pending > 0
                        ? '1px solid rgba(245, 158, 11, 0.4)'
                        : `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: counts.pending > 0 ? '#f59e0b' : 'text.secondary',
                      fontWeight: 700,
                    }}
                  >
                    PENDING APPROVAL
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="800"
                    sx={{ color: counts.pending > 0 ? '#f59e0b' : 'text.primary' }}
                  >
                    {counts.pending}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: theme.palette.custom?.cardGradient,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    APPROVED
                  </Typography>
                  <Typography variant="h5" fontWeight="800" sx={{ color: '#10b981' }}>
                    {counts.approved}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: theme.palette.custom?.cardGradient,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    INACTIVE
                  </Typography>
                  <Typography variant="h5" fontWeight="800" color="text.secondary">
                    {counts.inactive}
                  </Typography>
                </Paper>
              </Box>

              {/* Search & Filter Bar */}
              <Box
                display="flex"
                flexDirection={{ xs: 'column', sm: 'row' }}
                gap={1.5}
                mb={2.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
              >
                <Tabs
                  value={tabFilter}
                  onChange={(e, val) => setTabFilter(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    minHeight: 38,
                    background:
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.04)'
                        : 'rgba(0, 0, 0, 0.04)',
                    borderRadius: 2,
                    p: 0.5,
                    '& .MuiTab-root': {
                      minHeight: 34,
                      py: 0.5,
                      px: 1.5,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 1.5,
                    },
                    '& .Mui-selected': {
                      fontWeight: 800,
                      color: `${theme.palette.primary.main} !important`,
                    },
                  }}
                >
                  <Tab value="ALL" label={`All (${counts.total})`} />
                  <Tab
                    value="PENDING"
                    label={
                      <Box display="flex" alignItems="center" gap={0.8}>
                        <span>Pending</span>
                        {counts.pending > 0 && (
                          <span
                            style={{
                              backgroundColor: '#f59e0b',
                              color: '#000',
                              borderRadius: '10px',
                              padding: '1px 6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                            }}
                          >
                            {counts.pending}
                          </span>
                        )}
                      </Box>
                    }
                  />
                  <Tab value="APPROVED" label={`Approved (${counts.approved})`} />
                  <Tab value="INACTIVE" label={`Inactive (${counts.inactive})`} />
                </Tabs>

                <TextField
                  size="small"
                  placeholder="Search user or tab..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  sx={{ width: { xs: '100%', sm: 220 } }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {/* User List */}
              {loading ? (
                <Box textAlign="center" py={6}>
                  <CircularProgress size={36} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading users from Google Sheet...
                  </Typography>
                </Box>
              ) : filteredUsers.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 5,
                    textAlign: 'center',
                    borderRadius: 2,
                    background: theme.palette.custom?.cardGradient,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <PersonIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                  <Typography variant="subtitle1" fontWeight="700">
                    No users found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {searchQuery
                      ? 'No user matched your search term.'
                      : tabFilter === 'PENDING'
                      ? 'Great! There are no pending user approvals.'
                      : 'No users in this category.'}
                  </Typography>
                </Paper>
              ) : (
                <Box display="flex" flexDirection="column" gap={1.5}>
                  {filteredUsers.map((u) => {
                    const isCurrentAdmin =
                      u.username === currentUser?.username || u.role === 'ADMIN';

                    return (
                      <Paper
                        key={u.id || u.username}
                        elevation={0}
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          borderRadius: 2,
                          background: theme.palette.custom?.cardGradient,
                          border: `1px solid ${
                            u.status === 'PENDING'
                              ? 'rgba(245, 158, 11, 0.4)'
                              : theme.palette.divider
                          }`,
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            borderColor: theme.palette.primary.main,
                            boxShadow: `0 4px 16px ${theme.palette.primary.main}1A`,
                          },
                        }}
                      >
                        <Box
                          display="flex"
                          flexDirection={{ xs: 'column', md: 'row' }}
                          alignItems={{ xs: 'flex-start', md: 'center' }}
                          justifyContent="space-between"
                          gap={2}
                        >
                          {/* Left: Avatar & User Info */}
                          <Box display="flex" alignItems="center" gap={1.8}>
                            <Box
                              sx={{
                                width: 44,
                                height: 44,
                                borderRadius: '50%',
                                background:
                                  u.role === 'ADMIN'
                                    ? theme.palette.custom?.primaryGradient || '#10b981'
                                    : 'rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '1.1rem',
                                color: '#fff',
                                border: `2px solid ${
                                  u.role === 'ADMIN'
                                    ? theme.palette.primary.main
                                    : theme.palette.divider
                                }`,
                                flexShrink: 0,
                              }}
                            >
                              {(u.fullName || u.username || 'U')
                                .substring(0, 2)
                                .toUpperCase()}
                            </Box>

                            <Box>
                              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                <Typography variant="subtitle1" fontWeight="800">
                                  {u.fullName || u.username}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'text.secondary',
                                    fontWeight: 600,
                                    background:
                                      theme.palette.mode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.06)'
                                        : 'rgba(0, 0, 0, 0.06)',
                                    px: 0.8,
                                    py: 0.2,
                                    borderRadius: 1,
                                  }}
                                >
                                  @{u.username}
                                </Typography>
                                {u.role === 'ADMIN' && (
                                  <Chip
                                    size="small"
                                    label="ADMIN"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      backgroundColor: `${theme.palette.primary.main}22`,
                                      color: theme.palette.primary.main,
                                    }}
                                  />
                                )}
                              </Box>

                              <Box display="flex" alignItems="center" gap={1.2} mt={0.5} flexWrap="wrap">
                                {getStatusChip(u.status)}

                                {u.sheetName ? (
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <TableChartIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        fontFamily: 'monospace',
                                        color: theme.palette.primary.main,
                                        fontWeight: 700,
                                      }}
                                    >
                                      {u.sheetName}
                                    </Typography>
                                  </Box>
                                ) : (
                                  <Typography variant="caption" color="text.secondary">
                                    Tab: <em>Pending Provisioning</em>
                                  </Typography>
                                )}

                                {u.createdAt && (
                                  <Typography variant="caption" color="text.secondary">
                                    Joined {new Date(u.createdAt).toLocaleDateString()}
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Box>

                          {/* Right: Actions */}
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            width={{ xs: '100%', md: 'auto' }}
                            justifyContent={{ xs: 'flex-end', md: 'flex-start' }}
                            flexWrap="wrap"
                          >
                            {u.hasResetPending && (
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                disabled={actionLoading}
                                onClick={() => handleApproveReset(u.username)}
                                startIcon={<LockResetIcon />}
                                sx={{
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  fontSize: '0.82rem',
                                  px: 1.5,
                                }}
                              >
                                Approve Reset
                              </Button>
                            )}

                            {u.status === 'PENDING' && (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  color="success"
                                  disabled={actionLoading}
                                  onClick={() => promptStatusChange(u.username, 'APPROVED')}
                                  startIcon={<CheckCircleIcon />}
                                  sx={{
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    borderRadius: 1.5,
                                    fontSize: '0.82rem',
                                    px: 1.8,
                                  }}
                                >
                                  Approve & Create Tab
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  disabled={actionLoading}
                                  onClick={() => promptStatusChange(u.username, 'REJECTED')}
                                  startIcon={<CancelIcon />}
                                  sx={{
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    borderRadius: 1.5,
                                    fontSize: '0.82rem',
                                  }}
                                >
                                  Reject
                                </Button>
                              </>
                            )}

                            {u.status === 'APPROVED' && (
                              <>
                                {isCurrentAdmin ? (
                                  <Chip
                                    size="small"
                                    label="Admin Active"
                                    sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                                  />
                                ) : (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    disabled={actionLoading}
                                    onClick={() => promptStatusChange(u.username, 'DISABLED')}
                                    startIcon={<BlockIcon />}
                                    sx={{
                                      fontWeight: 700,
                                      textTransform: 'none',
                                      borderRadius: 1.5,
                                      fontSize: '0.82rem',
                                    }}
                                  >
                                    Disable
                                  </Button>
                                )}
                              </>
                            )}

                            {(u.status === 'DISABLED' || u.status === 'REJECTED') && (
                              <Button
                                size="small"
                                variant="contained"
                                color="primary"
                                disabled={actionLoading}
                                onClick={() => promptStatusChange(u.username, 'APPROVED')}
                                startIcon={<CheckCircleIcon />}
                                sx={{
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  fontSize: '0.82rem',
                                  px: 1.8,
                                }}
                              >
                                Re-enable Access
                              </Button>
                            )}

                            {!isCurrentAdmin && (
                              <Tooltip title="Delete user and tab permanently">
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={actionLoading}
                                  onClick={() => promptDeleteUser(u.username)}
                                  sx={{
                                    borderRadius: 1.5,
                                    border: `1px solid ${theme.palette.error.main}33`,
                                    '&:hover': {
                                      background: theme.palette.error.main + '22',
                                    },
                                  }}
                                >
                                  <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </>
          )}

          {/* ========================================== */}
          {/* 2. PREMIUM MEMBERSHIPS SECTION             */}
          {/* ========================================== */}
          {mainSection === 'PREMIUM' && (
            <>
              {/* Premium Top Metrics */}
              <Box
                display="grid"
                gridTemplateColumns={{ xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }}
                gap={1.5}
                mb={3}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background:
                      premiumStats.active > 0
                        ? 'linear-gradient(145deg, rgba(229, 193, 88, 0.12) 0%, rgba(20, 20, 24, 0.8) 100%)'
                        : theme.palette.custom?.cardGradient,
                    border:
                      premiumStats.active > 0
                        ? '1px solid rgba(229, 193, 88, 0.35)'
                        : `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#F5D77F', fontWeight: 700 }}>
                    ACTIVE PREMIUM
                  </Typography>
                  <Typography variant="h5" fontWeight="800" sx={{ color: '#F5D77F' }}>
                    {premiumStats.active}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: theme.palette.custom?.cardGradient,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    STANDARD MEMBERS
                  </Typography>
                  <Typography variant="h5" fontWeight="800" color="text.primary">
                    {premiumStats.standard}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background:
                      premiumStats.expiringSoon > 0
                        ? 'rgba(245, 158, 11, 0.08)'
                        : theme.palette.custom?.cardGradient,
                    border:
                      premiumStats.expiringSoon > 0
                        ? '1px solid rgba(245, 158, 11, 0.4)'
                        : `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      color: premiumStats.expiringSoon > 0 ? '#f59e0b' : 'text.secondary',
                      fontWeight: 700,
                    }}
                  >
                    EXPIRING IN 7 DAYS
                  </Typography>
                  <Typography
                    variant="h5"
                    fontWeight="800"
                    sx={{ color: premiumStats.expiringSoon > 0 ? '#f59e0b' : 'text.primary' }}
                  >
                    {premiumStats.expiringSoon}
                  </Typography>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: theme.palette.custom?.cardGradient,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    EXPIRED / REVOKED
                  </Typography>
                  <Typography variant="h5" fontWeight="800" color="text.secondary">
                    {premiumStats.expired + premiumStats.revoked}
                  </Typography>
                </Paper>
              </Box>

              {/* Search, Filter & Global Audit Button */}
              <Box
                display="flex"
                flexDirection={{ xs: 'column', sm: 'row' }}
                gap={1.5}
                mb={2.5}
                alignItems={{ xs: 'stretch', sm: 'center' }}
                justifyContent="space-between"
              >
                <Tabs
                  value={premiumTabFilter}
                  onChange={(e, val) => setPremiumTabFilter(val)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{
                    minHeight: 38,
                    background:
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.04)'
                        : 'rgba(0, 0, 0, 0.04)',
                    borderRadius: 2,
                    p: 0.5,
                    '& .MuiTab-root': {
                      minHeight: 34,
                      py: 0.5,
                      px: 1.5,
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      borderRadius: 1.5,
                    },
                    '& .Mui-selected': {
                      fontWeight: 800,
                      color: '#F5D77F !important',
                      backgroundColor: 'rgba(229, 193, 88, 0.1)',
                    },
                  }}
                >
                  <Tab value="ALL" label={`All Users (${premiumStats.total})`} />
                  <Tab value="ACTIVE" label={`Active Premium (${premiumStats.active})`} />
                  <Tab value="STANDARD" label={`Standard (${premiumStats.standard})`} />
                  <Tab
                    value="EXPIRED_REVOKED"
                    label={`Expired/Revoked (${premiumStats.expired + premiumStats.revoked})`}
                  />
                </Tabs>

                <Box display="flex" alignItems="center" gap={1}>
                  <TextField
                    size="small"
                    placeholder="Search membership..."
                    value={premiumSearchQuery}
                    onChange={(e) => setPremiumSearchQuery(e.target.value)}
                    sx={{ width: { xs: '100%', sm: 190 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <Tooltip title="View Complete Subscription Audit Log">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => openAuditModal(null)}
                      startIcon={<HistoryIcon sx={{ color: '#E5C158' }} />}
                      sx={{
                        borderColor: 'rgba(229, 193, 88, 0.4)',
                        color: '#F5D77F',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: 1.5,
                        px: 1.5,
                        whiteSpace: 'nowrap',
                        '&:hover': {
                          borderColor: '#E5C158',
                          background: 'rgba(229, 193, 88, 0.1)',
                        },
                      }}
                    >
                      Audit Trail
                    </Button>
                  </Tooltip>
                </Box>
              </Box>

              {/* Premium Users List */}
              {loading ? (
                <Box textAlign="center" py={6}>
                  <CircularProgress size={36} sx={{ color: '#E5C158' }} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Loading subscriptions from Google Sheet...
                  </Typography>
                </Box>
              ) : filteredPremiumUsers.length === 0 ? (
                <Paper
                  elevation={0}
                  sx={{
                    p: 5,
                    textAlign: 'center',
                    borderRadius: 2,
                    background: theme.palette.custom?.cardGradient,
                    border: `1px solid ${theme.palette.divider}`,
                  }}
                >
                  <WorkspacePremiumIcon sx={{ fontSize: 48, color: '#E5C158', mb: 1, opacity: 0.5 }} />
                  <Typography variant="subtitle1" fontWeight="700">
                    No membership records found
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {premiumSearchQuery
                      ? 'No user matched your subscription search.'
                      : 'No users match this filter.'}
                  </Typography>
                </Paper>
              ) : (
                <Box display="flex" flexDirection="column" gap={1.5}>
                  {filteredPremiumUsers.map((u) => {
                    const status = String(u.membershipStatus || 'STANDARD').toUpperCase();
                    const exp = u.premiumExpiresAt ? new Date(u.premiumExpiresAt).getTime() : null;
                    const isAct = status === 'PREMIUM' && (!exp || exp > Date.now());

                    return (
                      <Paper
                        key={u.id || u.username}
                        elevation={0}
                        sx={{
                          p: { xs: 2, sm: 2.5 },
                          borderRadius: 2,
                          background: isAct
                            ? 'linear-gradient(145deg, rgba(229, 193, 88, 0.06) 0%, rgba(20, 20, 24, 0.95) 100%)'
                            : theme.palette.custom?.cardGradient,
                          border: isAct
                            ? '1px solid rgba(229, 193, 88, 0.35)'
                            : `1px solid ${theme.palette.divider}`,
                          transition: 'all 0.25s ease',
                          '&:hover': {
                            borderColor: isAct ? '#E5C158' : theme.palette.primary.main,
                            boxShadow: isAct
                              ? '0 4px 20px rgba(229, 193, 88, 0.15)'
                              : `0 4px 16px ${theme.palette.primary.main}1A`,
                          },
                        }}
                      >
                        <Box
                          display="flex"
                          flexDirection={{ xs: 'column', md: 'row' }}
                          alignItems={{ xs: 'flex-start', md: 'center' }}
                          justifyContent="space-between"
                          gap={2}
                        >
                          {/* Left: Avatar & Membership Details */}
                          <Box display="flex" alignItems="center" gap={1.8}>
                            <Box
                              sx={{
                                width: 46,
                                height: 46,
                                borderRadius: '50%',
                                background: isAct
                                  ? 'linear-gradient(135deg, #E5C158, #B8860B)'
                                  : 'rgba(255, 255, 255, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: '1.1rem',
                                color: isAct ? '#1a1500' : '#fff',
                                border: isAct
                                  ? '2px solid #F5D77F'
                                  : `2px solid ${theme.palette.divider}`,
                                boxShadow: isAct
                                  ? '0 0 12px rgba(229, 193, 88, 0.4)'
                                  : 'none',
                                flexShrink: 0,
                              }}
                            >
                              {(u.fullName || u.username || 'U')
                                .substring(0, 2)
                                .toUpperCase()}
                            </Box>

                            <Box>
                              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                <Typography variant="subtitle1" fontWeight="800">
                                  {u.fullName || u.username}
                                </Typography>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    color: 'text.secondary',
                                    fontWeight: 600,
                                    background:
                                      theme.palette.mode === 'dark'
                                        ? 'rgba(255, 255, 255, 0.06)'
                                        : 'rgba(0, 0, 0, 0.06)',
                                    px: 0.8,
                                    py: 0.2,
                                    borderRadius: 1,
                                  }}
                                >
                                  @{u.username}
                                </Typography>
                                {u.role === 'ADMIN' && (
                                  <Chip
                                    size="small"
                                    label="ADMIN"
                                    sx={{
                                      height: 20,
                                      fontSize: '0.65rem',
                                      fontWeight: 800,
                                      backgroundColor: `${theme.palette.primary.main}22`,
                                      color: theme.palette.primary.main,
                                    }}
                                  />
                                )}
                              </Box>

                              <Box display="flex" alignItems="center" gap={1.2} mt={0.6} flexWrap="wrap">
                                {getPremiumChip(u)}

                                {u.premiumActivatedAt && (
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <CalendarMonthIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
                                    <Typography variant="caption" color="text.secondary">
                                      Activated: {new Date(u.premiumActivatedAt).toLocaleDateString()}
                                    </Typography>
                                  </Box>
                                )}

                                {u.premiumExpiresAt && (
                                  <Box display="flex" alignItems="center" gap={0.5}>
                                    <AccessTimeIcon sx={{ fontSize: 13, color: isAct ? '#E5C158' : 'text.secondary' }} />
                                    <Typography
                                      variant="caption"
                                      sx={{
                                        color: isAct ? '#F5D77F' : 'text.secondary',
                                        fontWeight: isAct ? 700 : 500,
                                      }}
                                    >
                                      Expires: {new Date(u.premiumExpiresAt).toLocaleDateString()}
                                    </Typography>
                                  </Box>
                                )}

                                {u.premiumGrantedBy && (
                                  <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.8 }}>
                                    (by @{u.premiumGrantedBy})
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </Box>

                          {/* Right: Premium Management Action Buttons */}
                          <Box
                            display="flex"
                            alignItems="center"
                            gap={1}
                            width={{ xs: '100%', md: 'auto' }}
                            justifyContent={{ xs: 'flex-end', md: 'flex-start' }}
                            flexWrap="wrap"
                          >
                            {!isAct ? (
                              <Button
                                size="small"
                                variant="contained"
                                disabled={actionLoading}
                                onClick={() => openSubscriptionModal(u, 'ACTIVATE')}
                                startIcon={<WorkspacePremiumIcon sx={{ color: '#1a1500' }} />}
                                sx={{
                                  background: 'linear-gradient(135deg, #F5D77F 0%, #E5C158 50%, #C8961D 100%)',
                                  color: '#1a1500',
                                  fontWeight: 800,
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  fontSize: '0.82rem',
                                  px: 1.8,
                                  boxShadow: '0 2px 10px rgba(229, 193, 88, 0.3)',
                                  '&:hover': {
                                    background: 'linear-gradient(135deg, #FFF0B3 0%, #F5D77F 50%, #D4AF37 100%)',
                                    boxShadow: '0 4px 14px rgba(229, 193, 88, 0.5)',
                                  },
                                }}
                              >
                                Activate Premium
                              </Button>
                            ) : (
                              <>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  disabled={actionLoading}
                                  onClick={() => openSubscriptionModal(u, 'EXTEND')}
                                  startIcon={<UpdateIcon sx={{ color: '#E5C158' }} />}
                                  sx={{
                                    borderColor: 'rgba(229, 193, 88, 0.45)',
                                    color: '#F5D77F',
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    borderRadius: 1.5,
                                    fontSize: '0.82rem',
                                    px: 1.6,
                                    '&:hover': {
                                      borderColor: '#E5C158',
                                      background: 'rgba(229, 193, 88, 0.12)',
                                    },
                                  }}
                                >
                                  Extend
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  disabled={actionLoading}
                                  onClick={() => openRevokeDialog(u)}
                                  startIcon={<RemoveCircleOutlineIcon />}
                                  sx={{
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    borderRadius: 1.5,
                                    fontSize: '0.82rem',
                                    px: 1.4,
                                  }}
                                >
                                  Revoke
                                </Button>
                              </>
                            )}

                            <Tooltip title="View Subscription Audit History">
                              <IconButton
                                size="small"
                                disabled={actionLoading}
                                onClick={() => openAuditModal(u)}
                                sx={{
                                  borderRadius: 1.5,
                                  border: `1px solid ${theme.palette.divider}`,
                                  color: 'text.secondary',
                                  '&:hover': {
                                    color: '#E5C158',
                                    borderColor: 'rgba(229, 193, 88, 0.4)',
                                    background: 'rgba(229, 193, 88, 0.08)',
                                  },
                                }}
                              >
                                <HistoryIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })}
                </Box>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* 3. PREMIUM ACTIVATION / EXTENSION MODAL    */}
      {/* ========================================== */}
      <Dialog
        open={subscriptionModal.open}
        onClose={() =>
          !actionLoading &&
          setSubscriptionModal({ open: false, user: null, action: 'ACTIVATE', activationDate: '', expiryDate: '', notes: '' })
        }
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(24, 24, 28, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',
            border: '1px solid rgba(229, 193, 88, 0.35)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WorkspacePremiumIcon sx={{ color: '#E5C158' }} />
          <span>
            {subscriptionModal.action === 'EXTEND' ? 'Extend Premium Subscription' : 'Activate Premium Membership'}
          </span>
        </DialogTitle>

        <DialogContent>
          <Box mb={2.5}>
            <Typography variant="body2" color="text.secondary">
              Managing subscription for{' '}
              <strong style={{ color: theme.palette.text.primary }}>
                {subscriptionModal.user?.fullName || subscriptionModal.user?.username} (@{subscriptionModal.user?.username})
              </strong>
            </Typography>
          </Box>

          <Stack spacing={2.5}>
            {/* Activation Date */}
            <TextField
              type="date"
              label="Activation Date"
              value={subscriptionModal.activationDate}
              onChange={(e) => setSubscriptionModal((prev) => ({ ...prev, activationDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              helperText="Date from which Premium membership benefits commence."
            />

            {/* Expiry Date */}
            <TextField
              type="date"
              label="Expiry Date"
              value={subscriptionModal.expiryDate}
              onChange={(e) => setSubscriptionModal((prev) => ({ ...prev, expiryDate: e.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
              size="small"
              helperText="Date and time when Premium membership automatically expires."
            />

            {/* Quick Presets */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ display: 'block', mb: 1 }}>
                QUICK VALIDITY PRESETS
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => applyPresetDays(30)}
                  sx={{ borderRadius: 1.5, fontSize: '0.75rem', textTransform: 'none' }}
                >
                  +1 Month (30d)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => applyPresetDays(90)}
                  sx={{ borderRadius: 1.5, fontSize: '0.75rem', textTransform: 'none' }}
                >
                  +3 Months (90d)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => applyPresetDays(180)}
                  sx={{ borderRadius: 1.5, fontSize: '0.75rem', textTransform: 'none' }}
                >
                  +6 Months (180d)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => applyPresetDays(365)}
                  sx={{
                    borderRadius: 1.5,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    borderColor: 'rgba(229, 193, 88, 0.5)',
                    color: '#F5D77F',
                  }}
                >
                  +1 Year (365d)
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => applyPresetDays(730)}
                  sx={{ borderRadius: 1.5, fontSize: '0.75rem', textTransform: 'none' }}
                >
                  +2 Years
                </Button>
              </Box>
            </Box>

            {/* Notes / Reason */}
            <TextField
              label="Admin Notes / Reason"
              placeholder="e.g. Annual VIP Pass, Promotion, Customer Support Extension..."
              value={subscriptionModal.notes}
              onChange={(e) => setSubscriptionModal((prev) => ({ ...prev, notes: e.target.value }))}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Stack>

          <Box display="flex" justifyContent="flex-end" gap={1.5} mt={3.5}>
            <Button
              variant="outlined"
              disabled={actionLoading}
              onClick={() =>
                setSubscriptionModal({ open: false, user: null, action: 'ACTIVATE', activationDate: '', expiryDate: '', notes: '' })
              }
              sx={{ borderRadius: 1.5, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={actionLoading}
              onClick={handleSaveSubscription}
              startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <WorkspacePremiumIcon sx={{ color: '#1a1500' }} />}
              sx={{
                background: 'linear-gradient(135deg, #F5D77F 0%, #E5C158 50%, #C8961D 100%)',
                color: '#1a1500',
                fontWeight: 800,
                borderRadius: 1.5,
                textTransform: 'none',
                px: 2.5,
                '&:hover': {
                  background: 'linear-gradient(135deg, #FFF0B3 0%, #F5D77F 50%, #D4AF37 100%)',
                },
              }}
            >
              {actionLoading
                ? 'Saving...'
                : subscriptionModal.action === 'EXTEND'
                ? 'Confirm Extension'
                : 'Confirm & Activate'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* 4. PREMIUM REVOKE DIALOG                   */}
      {/* ========================================== */}
      <Dialog
        open={revokeDialog.open}
        onClose={() => !actionLoading && setRevokeDialog({ open: false, user: null, notes: '' })}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            p: 1.5,
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(25, 25, 30, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${theme.palette.error.main}44`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.15rem', pb: 1, color: theme.palette.error.main }}>
          Revoke Premium Membership?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Are you sure you want to immediately revoke Premium privileges for{' '}
            <strong style={{ color: theme.palette.text.primary }}>@{revokeDialog.user?.username}</strong>?
            The user will lose all fintech analytics, gold highlights, and the Crown header icon immediately.
          </Typography>

          <TextField
            label="Revocation Reason / Notes"
            placeholder="Reason for revoking subscription..."
            value={revokeDialog.notes}
            onChange={(e) => setRevokeDialog((prev) => ({ ...prev, notes: e.target.value }))}
            fullWidth
            size="small"
            multiline
            rows={2}
            sx={{ mb: 2.5 }}
          />

          <Box display="flex" justifyContent="flex-end" gap={1.5}>
            <Button
              variant="outlined"
              disabled={actionLoading}
              onClick={() => setRevokeDialog({ open: false, user: null, notes: '' })}
              sx={{ borderRadius: 1.5, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={actionLoading}
              onClick={handleConfirmRevoke}
              sx={{ borderRadius: 1.5, fontWeight: 800, textTransform: 'none' }}
            >
              {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm Revoke'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>

      {/* ========================================== */}
      {/* 5. SUBSCRIPTION AUDIT TRAIL MODAL          */}
      {/* ========================================== */}
      <Dialog
        open={auditModal.open}
        onClose={() => setAuditModal({ open: false, user: null, audits: [], loading: false, search: '' })}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(20, 20, 24, 0.96)'
                : 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${theme.palette.divider}`,
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.palette.divider}`,
            pb: 1.5,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.2}>
            <HistoryIcon sx={{ color: '#E5C158' }} />
            <Box>
              <Typography variant="h6" fontWeight="800">
                {auditModal.user
                  ? `Premium Audit Trail: @${auditModal.user.username}`
                  : 'Global Premium Membership Audit Trail'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Immutable chronological ledger of all subscription activations, extensions, and revocations
              </Typography>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => setAuditModal({ open: false, user: null, audits: [], loading: false, search: '' })}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 2.5, overflowY: 'auto' }}>
          {auditModal.loading ? (
            <Box textAlign="center" py={6}>
              <CircularProgress size={36} sx={{ color: '#E5C158' }} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Loading audit trail records...
              </Typography>
            </Box>
          ) : auditModal.audits.length === 0 ? (
            <Box textAlign="center" py={6}>
              <HistoryIcon sx={{ fontSize: 44, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
              <Typography variant="subtitle1" fontWeight="700">
                No subscription audits recorded yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Audits will automatically be recorded whenever an admin activates, extends, or revokes a membership.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>Date & Time</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>User</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Admin Responsible</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Expiry Window</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {auditModal.audits.map((a, idx) => {
                    const actColor =
                      a.action === 'ACTIVATE'
                        ? '#10b981'
                        : a.action === 'EXTEND'
                        ? '#3b82f6'
                        : a.action === 'EXPIRE'
                        ? '#f59e0b'
                        : '#ef4444';

                    return (
                      <TableRow key={a.auditId || idx} hover>
                        <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                          {a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={a.action || 'UPDATE'}
                            sx={{
                              height: 20,
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              backgroundColor: `${actColor}22`,
                              color: actColor,
                              border: `1px solid ${actColor}44`,
                            }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
                          @{a.username}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.78rem' }}>
                          <span style={{ color: theme.palette.text.secondary }}>@{a.adminUsername || a.adminId || 'system'}</span>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          {a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                          {a.notes || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Sub-Dialog for Basic User Status Changes */}
      <Dialog
        open={confirmDialog.open}
        onClose={() =>
          !actionLoading &&
          setConfirmDialog({ open: false, title: '', message: '', action: null })
        }
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            p: 1.5,
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(25, 25, 30, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.15rem', pb: 1 }}>
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {confirmDialog.message}
          </Typography>

          <Box display="flex" justifyContent="flex-end" gap={1.5}>
            <Button
              variant="outlined"
              disabled={actionLoading}
              onClick={() =>
                setConfirmDialog({
                  open: false,
                  title: '',
                  message: '',
                  action: null,
                })
              }
              sx={{ borderRadius: 1.5, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={actionLoading}
              onClick={confirmDialog.action}
              sx={{ borderRadius: 1.5, fontWeight: 700, textTransform: 'none' }}
            >
              {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Confirm'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
