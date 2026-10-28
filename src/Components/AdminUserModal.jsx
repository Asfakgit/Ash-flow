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
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
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
import LockIcon from '@mui/icons-material/Lock';
import VisibilityIcon from '@mui/icons-material/Visibility';
import LockResetIcon from '@mui/icons-material/LockReset';
import KeyIcon from '@mui/icons-material/Key';
import {
  adminGetUsers,
  adminUpdateUserStatus,
  adminDeleteUser,
  adminApprovePasswordReset,
  adminSetUserPassword,
  adminGetUserTransactions,
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

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'INACTIVE'
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null,
  });

  // Sheet Inspection Modal State (Admin viewing a user's transactions with permission)
  const [inspectUser, setInspectUser] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectData, setInspectData] = useState([]);
  const [inspectError, setInspectError] = useState('');

  // Manual Password Override Modal State
  const [passwordDialog, setPasswordDialog] = useState({
    open: false,
    username: '',
    newPassword: '',
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

  const counts = useMemo(() => {
    const total = users.length;
    const pending = users.filter((u) => u.status === 'PENDING').length;
    const approved = users.filter((u) => u.status === 'APPROVED').length;
    const inactive = users.filter(
      (u) => u.status === 'DISABLED' || u.status === 'REJECTED'
    ).length;
    return { total, pending, approved, inactive };
  }, [users]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Filter by tab
      if (tabFilter === 'PENDING' && u.status !== 'PENDING') return false;
      if (tabFilter === 'APPROVED' && u.status !== 'APPROVED') return false;
      if (
        tabFilter === 'INACTIVE' &&
        u.status !== 'DISABLED' &&
        u.status !== 'REJECTED'
      )
        return false;

      // Filter by search query
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

  const handleViewUserSheet = async (user) => {
    if (!user.allowAdminView) {
      setFeedback({
        type: 'error',
        message: `User @${user.username} has kept their sheet private. The admin can only view this sheet with explicit permission from the user.`,
      });
      return;
    }
    setInspectUser(user);
    setInspectLoading(true);
    setInspectError('');
    setInspectData([]);
    try {
      const res = await adminGetUserTransactions(user.username);
      setInspectData(res.transactions || []);
    } catch (err) {
      setInspectError(err.message || 'Failed to load user sheet records.');
    } finally {
      setInspectLoading(false);
    }
  };

  const handleAdminSetPasswordSubmit = async () => {
    if (!passwordDialog.newPassword || passwordDialog.newPassword.length < 6) {
      setFeedback({
        type: 'error',
        message: 'New password must be at least 6 characters.',
      });
      return;
    }
    setActionLoading(true);
    setFeedback({ type: '', message: '' });
    try {
      const res = await adminSetUserPassword(passwordDialog.username, passwordDialog.newPassword);
      setFeedback({
        type: 'success',
        message: res.message || `Password updated for @${passwordDialog.username}.`,
      });
      setPasswordDialog({ open: false, username: '', newPassword: '' });
      await loadUsers();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.message || `Failed to update password.`,
      });
    } finally {
      setActionLoading(false);
    }
  };

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
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <DialogTitle
          sx={{
            px: { xs: 2.5, sm: 3.5 },
            py: 2.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '10px',
                background: theme.palette.custom?.primaryGradient || 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                boxShadow: `0 4px 12px ${theme.palette.primary.main}44`,
              }}
            >
              <AdminPanelSettingsIcon sx={{ fontSize: 24 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="800" sx={{ lineHeight: 1.2 }}>
                User Management & Approvals
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Control multi-user registration, sheet tab provisioning, and access
              </Typography>
            </Box>
          </Box>

          <Box display="flex" alignItems="center" gap={1}>
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

          {/* Top Statistics Cards */}
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

                          <Box display="flex" alignItems="center" gap={1.5} mt={0.5} flexWrap="wrap">
                            {getStatusChip(u.status)}

                            {!isCurrentAdmin && (
                              u.allowAdminView ? (
                                <Chip
                                  size="small"
                                  icon={<VisibilityIcon sx={{ fontSize: '13px !important' }} />}
                                  label="Sheet Shared"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                    color: theme.palette.primary.main,
                                    border: '1px solid rgba(16, 185, 129, 0.3)',
                                  }}
                                />
                              ) : (
                                <Chip
                                  size="small"
                                  icon={<LockIcon sx={{ fontSize: '12px !important' }} />}
                                  label="Private"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.68rem',
                                    fontWeight: 700,
                                    backgroundColor: 'rgba(148, 163, 184, 0.1)',
                                    color: theme.palette.text.secondary,
                                    border: '1px solid rgba(148, 163, 184, 0.2)',
                                  }}
                                />
                              )
                            )}

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
                              <>
                                {u.allowAdminView ? (
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    color="primary"
                                    disabled={actionLoading}
                                    onClick={() => handleViewUserSheet(u)}
                                    startIcon={<TableChartIcon />}
                                    sx={{
                                      fontWeight: 700,
                                      textTransform: 'none',
                                      borderRadius: 1.5,
                                      fontSize: '0.82rem',
                                    }}
                                  >
                                    View Sheet
                                  </Button>
                                ) : (
                                  <Tooltip
                                    title="User has kept their sheet private. The admin can only view this sheet with explicit permission from the user."
                                    arrow
                                  >
                                    <span>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        disabled
                                        startIcon={<LockIcon />}
                                        sx={{
                                          fontWeight: 700,
                                          textTransform: 'none',
                                          borderRadius: 1.5,
                                          fontSize: '0.82rem',
                                          opacity: 0.6,
                                        }}
                                      >
                                        Sheet Private
                                      </Button>
                                    </span>
                                  </Tooltip>
                                )}

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
                              </>
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
                          <>
                            <Tooltip title="Set password for this user">
                              <IconButton
                                size="small"
                                disabled={actionLoading}
                                onClick={() =>
                                  setPasswordDialog({
                                    open: true,
                                    username: u.username,
                                    newPassword: '',
                                  })
                                }
                                sx={{
                                  borderRadius: 1.5,
                                  border: `1px solid ${theme.palette.divider}`,
                                  color: 'text.secondary',
                                  '&:hover': {
                                    color: theme.palette.primary.main,
                                    borderColor: theme.palette.primary.main,
                                  },
                                }}
                              >
                                <KeyIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

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
                          </>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                );
              })}
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmation Sub-Dialog */}
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

      {/* Admin Inspection Modal: View Permitted User's Sheet */}
      <Dialog
        open={Boolean(inspectUser)}
        onClose={() => setInspectUser(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            p: 2,
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(20, 20, 25, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <TableChartIcon color="primary" />
            <Typography variant="h6" fontWeight="bold">
              User Sheet: {inspectUser?.fullName || inspectUser?.username} (@{inspectUser?.username})
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setInspectUser(null)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
            Viewing Google Sheet tab: <code>{inspectUser?.sheetName || 'Default'}</code> (Permission granted by user)
          </Typography>

          {inspectLoading ? (
            <Box textAlign="center" py={4}>
              <CircularProgress size={32} />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Loading records from Google Sheets...
              </Typography>
            </Box>
          ) : inspectError ? (
            <Alert severity="error" sx={{ my: 2 }}>
              {inspectError}
            </Alert>
          ) : inspectData.length <= 1 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body2" color="text.secondary">
                This user has no transaction records in their sheet yet.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 380, overflowY: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Person</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Amount</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Method</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {inspectData.slice(1).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ fontWeight: 600 }}>{row[1] || '-'}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                        ₹{Number(row[2] || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={row[3] || '-'}
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell>{row[6] || row[4] || 'Cash'}</TableCell>
                      <TableCell>{row[4] || '-'}</TableCell>
                      <TableCell>{row[5] || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin Manual Set Password Dialog */}
      <Dialog
        open={passwordDialog.open}
        onClose={() => setPasswordDialog({ open: false, username: '', newPassword: '' })}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2.5,
            p: 2,
            background:
              theme.palette.mode === 'dark'
                ? 'rgba(20, 20, 25, 0.98)'
                : 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.1rem', pb: 1 }}>
          Set Password for @{passwordDialog.username}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Assign a new password for this user. Their existing session will be invalidated.
          </Typography>
          <TextField
            fullWidth
            size="small"
            type="password"
            label="New Password"
            value={passwordDialog.newPassword}
            onChange={(e) =>
              setPasswordDialog((prev) => ({ ...prev, newPassword: e.target.value }))
            }
            placeholder="Min 6 characters"
            autoFocus
          />

          <Box display="flex" justifyContent="flex-end" gap={1.5} mt={3}>
            <Button
              variant="outlined"
              onClick={() =>
                setPasswordDialog({ open: false, username: '', newPassword: '' })
              }
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleAdminSetPasswordSubmit}
              disabled={actionLoading}
            >
              {actionLoading ? <CircularProgress size={20} color="inherit" /> : 'Set Password'}
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
}
