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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Avatar,
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
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
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
import PaymentsIcon from '@mui/icons-material/Payments';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import {
  adminGetUsers,
  adminUpdateUserStatus,
  adminDeleteUser,
  adminApprovePasswordReset,
  adminManagePremium,
  adminGetPremiumAudits,
  adminSetupSheets,
} from '../Services/SheetService';

const SUBSCRIPTION_PLANS = [
  { id: '1M', label: 'Monthly', period: '1 Month', days: 30 },
  { id: '6M', label: 'Half-Yearly', period: '6 Months', days: 180 },
  { id: '1Y', label: 'Yearly', period: '1 Year', days: 365 },
];

const PAYMENT_METHODS = [
  'UPI (GPay)',
  'Bank Transfer (NEFT / IMPS)',
  'Cash',
  'Credit / Debit Card',
  'Net Banking',
  'Complimentary / Waiver',
  'Other',
];

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

export default function AdminUserModal({
  inline = false,
  open = true,
  onClose,
  currentUser,
  onUsersUpdated,
}) {
  const theme = useTheme();

  // General users state
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Users filter & search
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'PREMIUM' | 'STANDARD' | 'INACTIVE'

  // Confirmation dialog state for basic user actions
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null,
  });

  // Premium Subscription & Payment Dialog
  const [subscriptionModal, setSubscriptionModal] = useState({
    open: false,
    user: null,
    selectedUsername: '',
    action: 'ACTIVATE', // 'ACTIVATE' | 'EXTEND'
    selectedPlanId: '1Y',
    planName: 'Yearly',
    amountPaid: '',
    paymentMethod: 'UPI (GPay)',
    paymentReference: '',
    paymentStatus: 'PAID',
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
    if (inline || open) {
      loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, inline]);

  // Lock background body scroll when open as a popup Dialog (not when inline)
  useEffect(() => {
    if (!inline && open) {
      const origBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origBodyOverflow;
      };
    }
  }, [open, inline]);

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

  // Premium counts and revenue
  const premiumStats = useMemo(() => {
    const total = users.length;
    const now = Date.now();
    let active = 0;
    let standard = 0;
    let expired = 0;
    let revoked = 0;
    let expiringSoon = 0;
    let totalRevenue = 0;

    users.forEach((u) => {
      const status = String(u.membershipStatus || 'STANDARD').toUpperCase();
      const exp = u.premiumExpiresAt ? new Date(u.premiumExpiresAt).getTime() : null;
      const isAct = status === 'PREMIUM' && (!exp || exp > now);

      if (u.premiumAmountPaid) {
        totalRevenue += Number(u.premiumAmountPaid) || 0;
      }

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

    return { total, active, standard, expired, revoked, expiringSoon, totalRevenue };
  }, [users]);

  // Filtered members list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (tabFilter === 'PENDING' && u.status !== 'PENDING') return false;
      if (tabFilter === 'APPROVED' && u.status !== 'APPROVED') return false;
      if (tabFilter === 'PREMIUM' && !u.isPremiumActive) return false;
      if (tabFilter === 'STANDARD' && (u.isPremiumActive || u.status !== 'APPROVED')) return false;
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
        const sheetMatch = String(u.sheetName || u.sheetTab || '').toLowerCase().includes(query);
        const planMatch = String(u.premiumPlan || '').toLowerCase().includes(query);
        const methodMatch = String(u.premiumPaymentMethod || '').toLowerCase().includes(query);
        const refMatch = String(u.premiumPaymentRef || '').toLowerCase().includes(query);
        return usernameMatch || nameMatch || sheetMatch || planMatch || methodMatch || refMatch;
      }
      return true;
    });
  }, [users, tabFilter, searchQuery]);

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
  const openSubscriptionModal = (user = null, action = 'ACTIVATE') => {
    const today = new Date().toISOString().split('T')[0];
    let defaultActivation = today;
    let defaultExpiry = '';

    if (action === 'EXTEND' && user?.premiumExpiresAt) {
      const curExp = new Date(user.premiumExpiresAt).getTime();
      const base = curExp > Date.now() ? curExp : Date.now();
      defaultActivation = new Date(base).toISOString().split('T')[0];
      defaultExpiry = new Date(base + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else {
      defaultExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    }

    setSubscriptionModal({
      open: true,
      user,
      selectedUsername: user ? user.username : '',
      action,
      selectedPlanId: '1Y',
      planName: 'Yearly',
      amountPaid: '',
      paymentMethod: 'UPI (GPay)',
      paymentReference: '',
      paymentStatus: 'PAID',
      activationDate: defaultActivation,
      expiryDate: defaultExpiry,
      notes: action === 'EXTEND' ? 'Subscription renewed & payment recorded' : 'Subscription payment recorded',
    });
  };

  const handleSelectPlan = (plan) => {
    let baseTime = Date.now();
    const targetUser =
      subscriptionModal.user ||
      users.find(
        (u) =>
          String(u.username || '').toLowerCase() ===
          String(subscriptionModal.selectedUsername || '').toLowerCase()
      );

    if (subscriptionModal.action === 'EXTEND' && targetUser?.premiumExpiresAt) {
      const curExp = new Date(targetUser.premiumExpiresAt).getTime();
      if (!isNaN(curExp) && curExp > Date.now()) {
        baseTime = curExp;
      }
    }

    if (plan.days > 0) {
      const targetExpiry = new Date(baseTime + plan.days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      setSubscriptionModal((prev) => ({
        ...prev,
        selectedPlanId: plan.id,
        planName: plan.label,
        expiryDate: targetExpiry,
      }));
    } else {
      setSubscriptionModal((prev) => ({
        ...prev,
        selectedPlanId: plan.id,
        planName: plan.label,
      }));
    }
  };

  const handleSaveSubscription = async () => {
    const targetUser =
      subscriptionModal.user ||
      users.find(
        (u) =>
          String(u.username || '').toLowerCase() ===
          String(subscriptionModal.selectedUsername || '').toLowerCase()
      );

    if (!targetUser) {
      setFeedback({ type: 'error', message: 'Please select a member for this subscription.' });
      return;
    }

    if (!subscriptionModal.expiryDate) {
      setFeedback({ type: 'error', message: 'Please select an expiry date for this subscription.' });
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
        targetUsername: targetUser.username,
        action: subscriptionModal.action,
        activationDate: new Date(subscriptionModal.activationDate).toISOString(),
        expiryDate: new Date(subscriptionModal.expiryDate + 'T23:59:59.999Z').toISOString(),
        notes: subscriptionModal.notes,
        planName: subscriptionModal.planName,
        amountPaid: Number(subscriptionModal.amountPaid) || 0,
        paymentMethod: subscriptionModal.paymentMethod,
        paymentReference: subscriptionModal.paymentReference,
        paymentStatus: subscriptionModal.paymentStatus,
      });

      if (res.success) {
        setFeedback({
          type: 'success',
          message:
            res.message ||
            `Subscription payment of ₹${Number(subscriptionModal.amountPaid || 0).toLocaleString()} recorded for @${targetUser.username}!`,
        });

        // Optimistically update local users state immediately
        const targetU = String(targetUser.username || '').toLowerCase();
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
                premiumPlan: subscriptionModal.planName,
                premiumAmountPaid: Number(subscriptionModal.amountPaid || 0),
                premiumPaymentMethod: subscriptionModal.paymentMethod,
                premiumPaymentRef: subscriptionModal.paymentReference,
              };
            }
            return item;
          })
        );

        setSubscriptionModal({
          open: false,
          user: null,
          selectedUsername: '',
          action: 'ACTIVATE',
          selectedPlanId: '1Y',
          planName: 'Yearly',
          amountPaid: '',
          paymentMethod: 'UPI (GPay)',
          paymentReference: '',
          paymentStatus: 'PAID',
          activationDate: '',
          expiryDate: '',
          notes: '',
        });
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

  const containerSx = inline
    ? {
        borderRadius: { xs: 2.5, sm: 3.5 },
        background:
          theme.palette.mode === 'dark'
            ? 'rgba(18, 18, 22, 0.94)'
            : 'rgba(255, 255, 255, 0.96)',
        backdropFilter: 'blur(35px) saturate(190%)',
        WebkitBackdropFilter: 'blur(35px) saturate(190%)',
        border: `1px solid ${theme.palette.divider}`,
        boxShadow: theme.palette.custom?.dialogShadow || theme.shadows[16],
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%',
        mb: { xs: 3, md: 5 },
      }
    : {
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
      };

  const innerContent = (
    <>
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 3.5 },
          py: 2.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background:
            theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.02)'
              : 'rgba(0, 0, 0, 0.01)',
        }}
      >
        <Box
          display="flex"
          flexDirection={{ xs: 'column', md: 'row' }}
          alignItems={{ xs: 'flex-start', md: 'center' }}
          justifyContent="space-between"
          gap={2}
        >
          {/* Title & Branding */}
          <Box display="flex" alignItems="center" gap={1.8}>
            <Box
              sx={{
                width: 44,
                height: 44,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
              }}
            >
              <AdminPanelSettingsIcon sx={{ fontSize: 26 }} />
            </Box>
            <Box>
              <Box display="flex" alignItems="center" gap={1}>
                <Typography
                  variant="h6"
                  fontWeight="800"
                  sx={{ lineHeight: 1.2, letterSpacing: '-0.02em' }}
                >
                  User Administration & Subscription Center
                </Typography>
                <Chip
                  size="small"
                  label="Admin Console"
                  sx={{
                    height: 20,
                    fontSize: '0.65rem',
                    fontWeight: 800,
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                  }}
                />
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: 'block', mt: 0.2 }}
              >
                Manage member access, approval workflows, Google Sheet tabs, and subscription billing
              </Typography>
            </Box>
          </Box>

          {/* Header Action Toolbar */}
          <Box display="flex" alignItems="center" gap={1.2} flexWrap="wrap">
            <Button
              size="small"
              variant="contained"
              disabled={actionLoading}
              onClick={() => openSubscriptionModal(null, 'ACTIVATE')}
              startIcon={<PaymentsIcon sx={{ color: '#1a1500' }} />}
              sx={{
                background: 'linear-gradient(135deg, #F5D77F 0%, #E5C158 50%, #C8961D 100%)',
                color: '#1a1500',
                fontWeight: 800,
                fontSize: '0.8rem',
                textTransform: 'none',
                borderRadius: 2,
                px: 2,
                py: 0.7,
                boxShadow: '0 3px 12px rgba(229, 193, 88, 0.28)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #FFF0B3 0%, #F5D77F 50%, #D4AF37 100%)',
                  boxShadow: '0 4px 16px rgba(229, 193, 88, 0.45)',
                },
              }}
            >
              + Enter Subscription Payment
            </Button>

            <Button
              size="small"
              variant="outlined"
              onClick={() => openAuditModal(null)}
              startIcon={<ReceiptLongIcon sx={{ color: '#E5C158' }} />}
              sx={{
                borderColor: 'rgba(229, 193, 88, 0.45)',
                color: '#F5D77F',
                fontWeight: 700,
                fontSize: '0.8rem',
                textTransform: 'none',
                borderRadius: 2,
                px: 1.6,
                py: 0.65,
                background: 'rgba(229, 193, 88, 0.06)',
                '&:hover': {
                  borderColor: '#E5C158',
                  background: 'rgba(229, 193, 88, 0.15)',
                },
              }}
            >
              Receipts Ledger
            </Button>

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
                    <TableChartIcon sx={{ fontSize: 16 }} />
                  )
                }
                sx={{
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2,
                  borderColor: theme.palette.divider,
                  color: theme.palette.text.secondary,
                  py: 0.65,
                  px: 1.5,
                  '&:hover': {
                    borderColor: theme.palette.primary.main,
                    color: theme.palette.primary.main,
                  },
                }}
              >
                Verify Sheets
              </Button>
            </Tooltip>

            <Tooltip title="Refresh Member Records">
              <IconButton
                size="small"
                onClick={loadUsers}
                disabled={loading || actionLoading}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  p: 0.75,
                }}
              >
                <RefreshIcon
                  fontSize="small"
                  sx={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
                />
              </IconButton>
            </Tooltip>

            {!inline && onClose && (
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  border: `1px solid ${theme.palette.divider}`,
                  borderRadius: 2,
                  p: 0.75,
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ p: { xs: 2.5, sm: 3.5 }, overflowY: inline ? 'visible' : 'auto' }}>
        {/* Feedback Alert */}
        {feedback.message && (
          <Alert
            severity={feedback.type === 'error' ? 'error' : 'success'}
            onClose={() => setFeedback({ type: '', message: '' })}
            sx={{ mb: 3, borderRadius: 2 }}
          >
            {feedback.message}
          </Alert>
        )}

        {/* 1. Rush-Free Executive KPI Metric Cards */}
        <Box
          display="grid"
          gridTemplateColumns={{ xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' }}
          gap={2}
          mb={3}
        >
          {/* Card 1: Total Users */}
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 2.5,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(16, 185, 129, 0.12) 0%, rgba(20, 20, 24, 0.95) 100%)'
                  : 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 800 }}>
                TOTAL MEMBERS
              </Typography>
              <PeopleAltIcon sx={{ fontSize: 20, color: '#10b981' }} />
            </Box>
            <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
              {counts.total}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {counts.approved} Approved • {counts.inactive} Inactive
            </Typography>
          </Paper>

          {/* Card 2: Pending Approval */}
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 2.5,
              background:
                counts.pending > 0
                  ? 'linear-gradient(145deg, rgba(245, 158, 11, 0.14) 0%, rgba(20, 20, 24, 0.95) 100%)'
                  : theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.03)'
                  : 'rgba(0, 0, 0, 0.02)',
              border:
                counts.pending > 0
                  ? '1px solid rgba(245, 158, 11, 0.45)'
                  : `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography
                variant="caption"
                sx={{
                  color: counts.pending > 0 ? '#f59e0b' : 'text.secondary',
                  fontWeight: 800,
                }}
              >
                PENDING APPROVAL
              </Typography>
              <HowToRegIcon
                sx={{ fontSize: 20, color: counts.pending > 0 ? '#f59e0b' : 'text.secondary' }}
              />
            </Box>
            <Typography
              variant="h4"
              fontWeight="800"
              sx={{
                color: counts.pending > 0 ? '#f59e0b' : 'text.primary',
                letterSpacing: '-0.02em',
                mb: 0.5,
              }}
            >
              {counts.pending}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {counts.pending > 0 ? 'Action Required' : 'All accounts verified ✓'}
            </Typography>
          </Paper>

          {/* Card 3: Active Premium */}
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 2.5,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(229, 193, 88, 0.14) 0%, rgba(20, 20, 24, 0.95) 100%)'
                  : 'linear-gradient(145deg, rgba(229, 193, 88, 0.1) 0%, rgba(255, 255, 255, 0.95) 100%)',
              border: '1px solid rgba(229, 193, 88, 0.45)',
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="caption" sx={{ color: '#F5D77F', fontWeight: 800 }}>
                ACTIVE PREMIUM
              </Typography>
              <WorkspacePremiumIcon sx={{ fontSize: 20, color: '#E5C158' }} />
            </Box>
            <Typography
              variant="h4"
              fontWeight="800"
              sx={{ color: '#F5D77F', letterSpacing: '-0.02em', mb: 0.5 }}
            >
              {premiumStats.active}{' '}
              <span style={{ fontSize: '0.85rem', color: theme.palette.text.secondary }}>
                ({counts.total > 0 ? Math.round((premiumStats.active / counts.total) * 100) : 0}%)
              </span>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {premiumStats.expiringSoon > 0
                ? `${premiumStats.expiringSoon} Expiring Soon (<7d)`
                : 'All in good standing'}
            </Typography>
          </Paper>

          {/* Card 4: Subscription Revenue */}
          <Paper
            elevation={0}
            sx={{
              p: 2.2,
              borderRadius: 2.5,
              background:
                theme.palette.mode === 'dark'
                  ? 'linear-gradient(145deg, rgba(56, 189, 248, 0.12) 0%, rgba(20, 20, 24, 0.95) 100%)'
                  : 'linear-gradient(145deg, rgba(56, 189, 248, 0.08) 0%, rgba(255, 255, 255, 0.95) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
            }}
          >
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="caption" sx={{ color: '#38bdf8', fontWeight: 800 }}>
                SUBSCRIPTION REVENUE
              </Typography>
              <CurrencyRupeeIcon sx={{ fontSize: 20, color: '#38bdf8' }} />
            </Box>
            <Typography variant="h4" fontWeight="800" sx={{ letterSpacing: '-0.02em', mb: 0.5 }}>
              ₹{premiumStats.totalRevenue.toLocaleString()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Recorded in Ledger
            </Typography>
          </Paper>
        </Box>

        {/* 2. Unified Filter Tabs & Search Bar */}
        <Box
          display="flex"
          flexDirection={{ xs: 'column', md: 'row' }}
          gap={2}
          mb={3}
          alignItems={{ xs: 'stretch', md: 'center' }}
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
                minHeight: 32,
                py: 0.5,
                px: 1.8,
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 1.5,
                color: theme.palette.text.secondary,
                transition: 'all 0.2s ease',
              },
              '& .Mui-selected': {
                color: '#ffffff !important',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              },
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab value="ALL" label={`All Members (${counts.total})`} />
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
                        fontSize: '0.7rem',
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
                <Box display="flex" alignItems="center" gap={0.8}>
                  <span>Premium (${premiumStats.active})</span>
                </Box>
              }
            />
            <Tab value="STANDARD" label={`Standard (${premiumStats.standard})`} />
            <Tab value="INACTIVE" label={`Inactive (${counts.inactive})`} />
          </Tabs>

          <TextField
            size="small"
            placeholder="Search member, tab, plan, ref..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ width: { xs: '100%', md: 260 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* 3. Member Directory Cards (Standard, Rush-Free, Spacious) */}
        {loading ? (
          <Box textAlign="center" py={7}>
            <CircularProgress size={38} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Loading member records from Google Sheets...
            </Typography>
          </Box>
        ) : filteredUsers.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 3,
              background:
                theme.palette.mode === 'dark'
                  ? 'rgba(255, 255, 255, 0.02)'
                  : 'rgba(0, 0, 0, 0.02)',
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <PersonIcon sx={{ fontSize: 52, color: 'text.secondary', mb: 1, opacity: 0.4 }} />
            <Typography variant="subtitle1" fontWeight="700">
              No members found
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {searchQuery
                ? 'No member matched your search query.'
                : tabFilter === 'PENDING'
                ? 'Great! There are no pending member approvals.'
                : 'No members in this category.'}
            </Typography>
          </Paper>
        ) : (
          <Box display="flex" flexDirection="column" gap={2}>
            {filteredUsers.map((u) => {
              const isCurrentAdmin =
                u.username === currentUser?.username || u.role === 'ADMIN';

              return (
                <Paper
                  key={u.id || u.username}
                  elevation={0}
                  sx={{
                    p: { xs: 2.2, sm: 2.8 },
                    borderRadius: 3,
                    background:
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.025)'
                        : 'rgba(255, 255, 255, 0.95)',
                    border: `1px solid ${
                      u.status === 'PENDING'
                        ? 'rgba(245, 158, 11, 0.45)'
                        : u.isPremiumActive
                        ? 'rgba(229, 193, 88, 0.35)'
                        : theme.palette.divider
                    }`,
                    boxShadow: u.isPremiumActive
                      ? '0 2px 14px rgba(229, 193, 88, 0.06)'
                      : 'none',
                    transition: 'all 0.25s ease',
                    '&:hover': {
                      borderColor: u.isPremiumActive ? '#E5C158' : theme.palette.primary.main,
                      boxShadow: u.isPremiumActive
                        ? '0 6px 22px rgba(229, 193, 88, 0.16)'
                        : `0 6px 20px ${theme.palette.primary.main}1A`,
                    },
                  }}
                >
                  <Box
                    display="flex"
                    flexDirection={{ xs: 'column', md: 'row' }}
                    alignItems={{ xs: 'flex-start', md: 'center' }}
                    justifyContent="space-between"
                    gap={2.5}
                  >
                    {/* Left: Avatar & Identity */}
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar
                        src={u.avatar || u.photoURL || undefined}
                        sx={{
                          width: 48,
                          height: 48,
                          bgcolor: u.isPremiumActive
                            ? 'rgba(229, 193, 88, 0.18)'
                            : u.role === 'ADMIN'
                            ? 'rgba(16, 185, 129, 0.18)'
                            : 'rgba(255, 255, 255, 0.08)',
                          color: u.isPremiumActive
                            ? '#F5D77F'
                            : u.role === 'ADMIN'
                            ? '#10b981'
                            : 'text.primary',
                          fontWeight: 800,
                          fontSize: '1.05rem',
                          border: u.isPremiumActive
                            ? '1.8px solid rgba(229, 193, 88, 0.6)'
                            : u.role === 'ADMIN'
                            ? '1.8px solid rgba(16, 185, 129, 0.5)'
                            : `1.5px solid ${theme.palette.divider}`,
                          flexShrink: 0,
                        }}
                      >
                        {String(u.fullName || u.username || 'U')
                          .substring(0, 2)
                          .toUpperCase()}
                      </Avatar>

                      <Box minWidth={0}>
                        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                          <Typography
                            variant="subtitle1"
                            fontWeight="800"
                            sx={{
                              color: u.isPremiumActive ? '#F5D77F' : 'text.primary',
                              lineHeight: 1.2,
                            }}
                          >
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
                                bgcolor: 'rgba(16, 185, 129, 0.15)',
                                color: '#10b981',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                              }}
                            />
                          )}
                        </Box>

                        <Box display="flex" alignItems="center" gap={1.2} mt={0.8} flexWrap="wrap">
                          {getStatusChip(u.status)}
                          {getPremiumChip(u)}

                          {u.sheetName || u.sheetTab ? (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <TableChartIcon sx={{ fontSize: 14, color: '#10b981' }} />
                              <Typography
                                variant="caption"
                                sx={{
                                  fontFamily: 'monospace',
                                  color: '#10b981',
                                  fontWeight: 700,
                                }}
                              >
                                {u.sheetName || u.sheetTab}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Tab: <em>Pending</em>
                            </Typography>
                          )}

                          {u.createdAt && (
                            <Typography variant="caption" color="text.secondary">
                              Joined {new Date(u.createdAt).toLocaleDateString()}
                            </Typography>
                          )}
                        </Box>

                        {/* Subscription & Payment summary row if active */}
                        {(u.isPremiumActive || u.premiumPlan || Number(u.premiumAmountPaid) > 0) && (
                          <Box display="flex" alignItems="center" gap={1.5} mt={0.6} flexWrap="wrap">
                            <Typography variant="caption" sx={{ color: '#F5D77F', fontWeight: 700 }}>
                              Plan: {u.premiumPlan || 'Active'}
                            </Typography>
                            {u.premiumAmountPaid && (
                              <Typography variant="caption" sx={{ color: '#10b981', fontWeight: 700 }}>
                                Paid: ₹{Number(u.premiumAmountPaid).toLocaleString()} ({u.premiumPaymentMethod || 'UPI'})
                              </Typography>
                            )}
                            {u.premiumPaymentRef && (
                              <Typography variant="caption" color="text.secondary">
                                Ref: {u.premiumPaymentRef}
                              </Typography>
                            )}
                            {u.premiumExpiresAt && (
                              <Typography variant="caption" color="text.secondary">
                                Valid until: {new Date(u.premiumExpiresAt).toLocaleDateString()}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    </Box>

                    {/* Right: Actions */}
                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      width={{ xs: '100%', md: 'auto' }}
                      justifyContent={{ xs: 'flex-start', md: 'flex-end' }}
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
                            fontSize: '0.8rem',
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
                              fontSize: '0.8rem',
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
                              fontSize: '0.8rem',
                            }}
                          >
                            Reject
                          </Button>
                        </>
                      )}

                      {u.status === 'APPROVED' && (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={actionLoading}
                            onClick={() => openSubscriptionModal(u, u.isPremiumActive ? 'EXTEND' : 'ACTIVATE')}
                            startIcon={<WorkspacePremiumIcon sx={{ color: '#E5C158', fontSize: 16 }} />}
                            sx={{
                              borderColor: 'rgba(229, 193, 88, 0.5)',
                              color: '#F5D77F',
                              fontWeight: 700,
                              textTransform: 'none',
                              borderRadius: 1.5,
                              fontSize: '0.78rem',
                              px: 1.4,
                              background: 'rgba(229, 193, 88, 0.08)',
                              '&:hover': {
                                borderColor: '#E5C158',
                                background: 'rgba(229, 193, 88, 0.18)',
                              },
                            }}
                          >
                            {u.isPremiumActive ? 'Manage Premium' : 'Record Payment'}
                          </Button>

                          <Tooltip title="View Subscription Receipts">
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => openAuditModal(u)}
                              startIcon={<ReceiptLongIcon sx={{ color: '#E5C158', fontSize: 15 }} />}
                              sx={{
                                borderColor: 'rgba(229, 193, 88, 0.35)',
                                color: '#F5D77F',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 1.5,
                                fontSize: '0.78rem',
                                px: 1.2,
                                background: 'rgba(229, 193, 88, 0.04)',
                                '&:hover': {
                                  borderColor: '#E5C158',
                                  background: 'rgba(229, 193, 88, 0.14)',
                                },
                              }}
                            >
                              Receipts
                            </Button>
                          </Tooltip>

                          {u.isPremiumActive && (
                            <Tooltip title="Revoke Premium Membership">
                              <Button
                                size="small"
                                variant="outlined"
                                color="error"
                                disabled={actionLoading}
                                onClick={() => openRevokeDialog(u)}
                                sx={{
                                  borderColor: 'rgba(239, 68, 68, 0.4)',
                                  color: '#ef4444',
                                  fontWeight: 700,
                                  textTransform: 'none',
                                  borderRadius: 1.5,
                                  fontSize: '0.78rem',
                                  px: 1.2,
                                  background: 'rgba(239, 68, 68, 0.05)',
                                  '&:hover': {
                                    borderColor: '#ef4444',
                                    background: 'rgba(239, 68, 68, 0.15)',
                                  },
                                }}
                              >
                                Revoke
                              </Button>
                            </Tooltip>
                          )}

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
                                fontSize: '0.8rem',
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
                            fontSize: '0.8rem',
                            px: 1.8,
                          }}
                        >
                          Re-enable Access
                        </Button>
                      )}

                      {!isCurrentAdmin && (
                        <Tooltip title="Delete user permanently">
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
      </Box>
    </>
  );


  return (
    <>
      {inline ? (
        <Paper elevation={0} sx={containerSx}>
          {innerContent}
        </Paper>
      ) : (
        <Dialog
          open={open}
          TransitionComponent={Transition}
          keepMounted
          onClose={onClose}
          maxWidth="md"
          fullWidth
          PaperProps={{
            elevation: 0,
            sx: containerSx,
          }}
        >
          {innerContent}
        </Dialog>
      )}

      {/* ========================================== */}
      {/* 3. SUBSCRIPTION PAYMENT ENTRY MODAL        */}
      {/* ========================================== */}
      <Dialog
        open={subscriptionModal.open}
        onClose={() =>
          !actionLoading &&
          setSubscriptionModal({
            open: false,
            user: null,
            selectedUsername: '',
            action: 'ACTIVATE',
            selectedPlanId: '1Y',
            planName: 'Yearly',
            amountPaid: '',
            paymentMethod: 'UPI (GPay)',
            paymentReference: '',
            paymentStatus: 'PAID',
            activationDate: '',
            expiryDate: '',
            notes: '',
          })
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
            border: '1px solid rgba(229, 193, 88, 0.4)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.2rem', pb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
          <PaymentsIcon sx={{ color: '#E5C158' }} />
          <span>
            {subscriptionModal.action === 'EXTEND'
              ? 'Renew Subscription & Record Payment'
              : 'Record Subscription Payment & Activate'}
          </span>
        </DialogTitle>

        <DialogContent>
          <Box mb={2.5}>
            {subscriptionModal.user ? (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  background: 'rgba(229, 193, 88, 0.08)',
                  border: '1px solid rgba(229, 193, 88, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Member Receiving Subscription:
                  </Typography>
                  <Typography variant="subtitle2" fontWeight="800" sx={{ color: '#F5D77F' }}>
                    {subscriptionModal.user?.fullName || subscriptionModal.user?.username} (@{subscriptionModal.user?.username})
                  </Typography>
                </Box>
                <Chip
                  size="small"
                  label={subscriptionModal.user.membershipStatus || 'STANDARD'}
                  sx={{
                    fontWeight: 700,
                    height: 22,
                    fontSize: '0.7rem',
                    backgroundColor: 'rgba(229, 193, 88, 0.15)',
                    color: '#F5D77F',
                  }}
                />
              </Box>
            ) : (
              <FormControl fullWidth size="small">
                <InputLabel id="select-subscriber-label">Select Subscriber Member</InputLabel>
                <Select
                  labelId="select-subscriber-label"
                  label="Select Subscriber Member"
                  value={subscriptionModal.selectedUsername}
                  onChange={(e) => {
                    const found = users.find((usr) => usr.username === e.target.value);
                    setSubscriptionModal((prev) => ({
                      ...prev,
                      selectedUsername: e.target.value,
                      user: found || null,
                    }));
                  }}
                >
                  {users
                    .filter((u) => u.status === 'APPROVED')
                    .map((usr) => (
                      <MenuItem key={usr.username} value={usr.username}>
                        {usr.fullName || usr.username} (@{usr.username}) — {usr.membershipStatus || 'STANDARD'}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            )}
          </Box>

          <Stack spacing={2.5}>
            {/* Quick Plan Selector */}
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 1 }}>
                SELECT SUBSCRIPTION DURATION
              </Typography>
              <Box display="grid" gridTemplateColumns={{ xs: 'repeat(3, 1fr)' }} gap={1}>
                {SUBSCRIPTION_PLANS.map((plan) => {
                  const isSel = subscriptionModal.selectedPlanId === plan.id;
                  return (
                    <Paper
                      key={plan.id}
                      elevation={0}
                      onClick={() => handleSelectPlan(plan)}
                      sx={{
                        p: 1.4,
                        borderRadius: 2,
                        cursor: 'pointer',
                        textAlign: 'center',
                        border: isSel
                          ? '2px solid #E5C158'
                          : `1px solid ${theme.palette.divider}`,
                        background: isSel
                          ? 'rgba(229, 193, 88, 0.14)'
                          : theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.03)'
                          : 'rgba(0, 0, 0, 0.02)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          borderColor: '#E5C158',
                          background: 'rgba(229, 193, 88, 0.08)',
                        },
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        fontWeight={isSel ? 800 : 700}
                        sx={{ color: isSel ? '#F5D77F' : 'text.primary', fontSize: '0.85rem' }}
                      >
                        {plan.label}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                        sx={{ display: 'block', mt: 0.3, fontSize: '0.72rem' }}
                      >
                        {plan.period} ({plan.days}d)
                      </Typography>
                    </Paper>
                  );
                })}
              </Box>
            </Box>

            {/* Financial Details Row: Amount Paid & Payment Method */}
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
              <TextField
                type="number"
                label="Amount (₹)"
                placeholder="Enter amount decided by admin"
                value={subscriptionModal.amountPaid}
                onChange={(e) => setSubscriptionModal((prev) => ({ ...prev, amountPaid: e.target.value }))}
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <CurrencyRupeeIcon fontSize="small" sx={{ color: '#10b981' }} />
                    </InputAdornment>
                  ),
                }}
                helperText="Subscription amount decided by Admin"
              />

              <FormControl fullWidth size="small">
                <InputLabel id="payment-method-label">Payment Method</InputLabel>
                <Select
                  labelId="payment-method-label"
                  label="Payment Method"
                  value={subscriptionModal.paymentMethod}
                  onChange={(e) => setSubscriptionModal((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <MenuItem key={pm} value={pm}>
                      {pm}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>

            {/* Reference ID & Payment Status Row */}
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
              <TextField
                label="Payment Reference / UTR / Txn ID"
                placeholder="e.g. UPI Ref 402819830211, Cheque #, Receipt #"
                value={subscriptionModal.paymentReference}
                onChange={(e) => setSubscriptionModal((prev) => ({ ...prev, paymentReference: e.target.value }))}
                fullWidth
                size="small"
                helperText="Transaction verification identifier"
              />

              <FormControl fullWidth size="small">
                <InputLabel id="payment-status-label">Payment Status</InputLabel>
                <Select
                  labelId="payment-status-label"
                  label="Payment Status"
                  value={subscriptionModal.paymentStatus}
                  onChange={(e) => setSubscriptionModal((prev) => ({ ...prev, paymentStatus: e.target.value }))}
                >
                  <MenuItem value="PAID">PAID (Confirmed)</MenuItem>
                  <MenuItem value="PENDING">PENDING (Verification)</MenuItem>
                  <MenuItem value="COMPLIMENTARY">COMPLIMENTARY (Waiver / Promo)</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Activation & Expiry Dates Row */}
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: '1fr 1fr' }} gap={2}>
              <TextField
                type="date"
                label="Activation Date"
                value={subscriptionModal.activationDate}
                onChange={(e) => setSubscriptionModal((prev) => ({ ...prev, activationDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
                helperText="Membership start date"
              />

              <TextField
                type="date"
                label="Expiry Date"
                value={subscriptionModal.expiryDate}
                onChange={(e) => setSubscriptionModal((prev) => ({ ...prev, expiryDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
                helperText="Automatic expiration date"
              />
            </Box>

            {/* Admin Billing Remarks / Notes */}
            <TextField
              label="Billing Remarks / Receipt Notes"
              placeholder="e.g. Paid via GPay. Verified with bank statement. Annual VIP plan."
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
                setSubscriptionModal({
                  open: false,
                  user: null,
                  selectedUsername: '',
                  action: 'ACTIVATE',
                  selectedPlanId: '1Y',
                  planName: 'Yearly',
                  amountPaid: '',
                  paymentMethod: 'UPI (GPay)',
                  paymentReference: '',
                  paymentStatus: 'PAID',
                  activationDate: '',
                  expiryDate: '',
                  notes: '',
                })
              }
              sx={{ borderRadius: 1.5, textTransform: 'none' }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              disabled={actionLoading}
              onClick={handleSaveSubscription}
              startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <PaymentsIcon sx={{ color: '#1a1500' }} />}
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
                ? 'Recording...'
                : subscriptionModal.action === 'EXTEND'
                ? 'Record Renewal & Extend'
                : 'Confirm & Record Payment'}
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
      {/* 5. SUBSCRIPTION PAYMENT RECEIPTS & LEDGER  */}
      {/* ========================================== */}
      <Dialog
        open={auditModal.open}
        onClose={() => setAuditModal({ open: false, user: null, audits: [], loading: false, search: '' })}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1,
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(20, 20, 24, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',
            border: '1px solid rgba(229, 193, 88, 0.3)',
            maxHeight: '88vh',
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
            <ReceiptLongIcon sx={{ color: '#E5C158' }} />
            <Box>
              <Typography variant="h6" fontWeight="800">
                {auditModal.user
                  ? `Subscription Payment Receipts: @${auditModal.user.username}`
                  : 'Subscription Payments & Audit Ledger'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Official chronological financial receipts and audit ledger for member subscriptions
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
                Loading subscription ledger records...
              </Typography>
            </Box>
          ) : auditModal.audits.length === 0 ? (
            <Box textAlign="center" py={6}>
              <ReceiptLongIcon sx={{ fontSize: 48, color: 'text.secondary', opacity: 0.4, mb: 1 }} />
              <Typography variant="subtitle1" fontWeight="700">
                No subscription payment receipts recorded yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Receipts will automatically be recorded here whenever a subscription payment is entered or modified.
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Summary KPIs */}
              <Box display="flex" gap={2} mb={2.5} flexWrap="wrap">
                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1.2,
                    borderRadius: 2,
                    background: 'rgba(229, 193, 88, 0.1)',
                    border: '1px solid rgba(229, 193, 88, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <CurrencyRupeeIcon sx={{ color: '#F5D77F' }} />
                  <Box>
                    <Typography variant="caption" sx={{ color: '#F5D77F', fontWeight: 700 }}>
                      TOTAL REVENUE RECORDED
                    </Typography>
                    <Typography variant="h6" fontWeight="900" sx={{ color: '#F5D77F' }}>
                      ₹
                      {auditModal.audits
                        .reduce((acc, a) => acc + (Number(a.amountPaid) || 0), 0)
                        .toLocaleString()}
                    </Typography>
                  </Box>
                </Paper>

                <Paper
                  elevation={0}
                  sx={{
                    px: 2,
                    py: 1.2,
                    borderRadius: 2,
                    background: theme.palette.custom?.cardGradient,
                    border: `1px solid ${theme.palette.divider}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                  }}
                >
                  <ReceiptLongIcon sx={{ color: theme.palette.primary.main }} />
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      TOTAL RECEIPTS LOGGED
                    </Typography>
                    <Typography variant="h6" fontWeight="800">
                      {auditModal.audits.length}
                    </Typography>
                  </Box>
                </Paper>
              </Box>

              {/* Transactions Table */}
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}>Date & Time</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Member</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Plan Duration</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Amount Paid</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Payment Mode & Ref</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Validity Window</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Admin</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>Billing Notes</TableCell>
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

                      const amt = Number(a.amountPaid || 0);

                      return (
                        <TableRow key={a.auditId || idx} hover>
                          <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            {a.timestamp ? new Date(a.timestamp).toLocaleString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={a.action || 'PAYMENT'}
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
                          <TableCell sx={{ fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                            @{a.username}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            {a.planName ? (
                              <Chip
                                size="small"
                                label={a.planName}
                                sx={{
                                  height: 20,
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  backgroundColor: 'rgba(229, 193, 88, 0.12)',
                                  color: '#F5D77F',
                                }}
                              />
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 800, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
                            {amt > 0 ? (
                              <span style={{ color: '#10b981' }}>+₹{amt.toLocaleString()}</span>
                            ) : (
                              <span style={{ color: theme.palette.text.secondary }}>₹0</span>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {a.paymentMethod || a.paymentReference ? (
                              <Box>
                                <Typography variant="caption" fontWeight={700}>
                                  {a.paymentMethod || 'Manual'}
                                </Typography>
                                {a.paymentReference && (
                                  <Typography
                                    variant="caption"
                                    sx={{ display: 'block', fontFamily: 'monospace', opacity: 0.8 }}
                                  >
                                    {a.paymentReference}
                                  </Typography>
                                )}
                              </Box>
                            ) : (
                              '—'
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                            {a.expiryDate ? new Date(a.expiryDate).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                            <span style={{ color: theme.palette.text.secondary }}>
                              @{a.adminUsername || a.adminId || 'admin'}
                            </span>
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary', minWidth: 140 }}>
                            {a.notes || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
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
