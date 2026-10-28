import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Fade,
  Tab,
  Tabs,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Dialog,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import LoginIcon from '@mui/icons-material/Login';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import LockResetIcon from '@mui/icons-material/LockReset';
import CloseIcon from '@mui/icons-material/Close';
import logo from '../assets/logo.png';
import { loginUser, registerUser, requestPasswordReset } from '../Services/SheetService';

const Login = ({ onLogin }) => {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0); // 0 = Login, 1 = Register

  // Form Fields
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI States
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Forgot Password Dialog States
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');

  const inputSx = {
    mb: 2,
    "& .MuiOutlinedInput-root": {
      "& input:-webkit-autofill, & input:-webkit-autofill:hover, & input:-webkit-autofill:focus, & input:-webkit-autofill:active, & input:-internal-autofill-selected": {
        WebkitBoxShadow: `0 0 0 1000px #18181c inset !important`,
        boxShadow: `0 0 0 1000px #18181c inset !important`,
        WebkitTextFillColor: `#ffffff !important`,
        caretColor: "#ffffff !important",
        borderRadius: "inherit",
        transition: "background-color 50000s ease-in-out 0s",
      },
    },
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotError('');
    setForgotSuccess('');

    if (!forgotUsername.trim()) {
      setForgotError('Please enter your username or registered email.');
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setForgotError('New password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    try {
      const res = await requestPasswordReset(forgotUsername.trim(), forgotNewPassword);
      setForgotSuccess(res.message || 'Password reset request submitted. Admin approval required.');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
    } catch (err) {
      setForgotError(err.message || 'Failed to submit reset request.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
    setError('');
    setInfoMessage('');
    setRegistrationSuccess(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await loginUser(username.trim(), password);

      if (res.success) {
        onLogin(res.user, res.token);
      } else {
        if (
          res.status === 'PENDING' ||
          (res.message && res.message.toLowerCase().includes('pending'))
        ) {
          setInfoMessage(
            res.message ||
              'Your account is pending admin approval. You will be able to log in once the administrator approves it.'
          );
        } else if (res.status === 'REJECTED') {
          setError(
            res.message || 'Your account registration was rejected by the administrator.'
          );
        } else if (res.status === 'DISABLED') {
          setError(
            res.message || 'Your account has been disabled. Please contact the administrator.'
          );
        } else {
          setError(res.message || 'Invalid username or password.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfoMessage('');

    const cleanUsername = username.trim().toLowerCase();
    const cleanFullName = fullName.trim();

    if (!cleanFullName) {
      setError('Please provide your full name.');
      return;
    }
    if (!cleanUsername || cleanUsername.length < 3) {
      setError('Username must be at least 3 characters long.');
      return;
    }
    if (!/^[a-zA-Z0-9_@.-]+$/.test(cleanUsername)) {
      setError('Username can only contain letters, numbers, underscores, dots, hyphens, or @ for email.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await registerUser({
        username: cleanUsername,
        password,
        fullName: cleanFullName,
      });

      if (res.success) {
        setRegistrationSuccess(true);
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(res.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      console.error('Register error:', err);
      setError(err.message || 'Network error during registration.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: theme.palette.custom?.pageBackground || theme.palette.background.default,
        py: { xs: 4, sm: 6 },
        px: 2,
      }}
    >
      <Fade in timeout={600}>
        <Container maxWidth="xs">
          <Paper
            elevation={24}
            sx={{
              p: { xs: 3.5, sm: 4.5 },
              borderRadius: { xs: 2.5, sm: 3.5 },
              background: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: theme.palette.custom?.paperShadow || theme.shadows[10],
              backdropFilter: 'blur(30px) saturate(180%)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Header / Title */}
            <Box textAlign="center" mb={3}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: { xs: 54, sm: 60 },
                  height: { xs: 54, sm: 60 },
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: `0 6px 18px ${theme.palette.primary.main}4D`,
                  mb: 1.5,
                  mx: "auto",
                }}
              >
                <Box
                  component="img"
                  src={logo}
                  alt="Ash Flow Logo"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                  }}
                />
              </Box>
              <Typography
                variant="h4"
                fontWeight="800"
                sx={{
                  background:
                    theme.palette.custom?.titleGradient ||
                    'linear-gradient(90deg, #1976d2, #9c27b0)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.5,
                  fontSize: { xs: '1.75rem', sm: '2rem' },
                }}
              >
                ASH FLOW
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {tabIndex === 0
                  ? 'Sign in to access your personal finance dashboard'
                  : 'Create an account to track your money'}
              </Typography>
            </Box>

            {/* Navigation Tabs (Login / Register) */}
            <Tabs
              value={tabIndex}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{
                mb: 3,
                minHeight: 42,
                borderRadius: 2,
                background:
                  theme.palette.mode === 'dark'
                    ? 'rgba(255, 255, 255, 0.04)'
                    : 'rgba(0, 0, 0, 0.04)',
                p: 0.5,
                '& .MuiTabs-indicator': {
                  height: '100%',
                  borderRadius: 1.5,
                  backgroundColor: theme.palette.primary.main,
                  zIndex: 0,
                  opacity: 0.15,
                },
              }}
            >
              <Tab
                icon={<LoginIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Sign In"
                sx={{
                  minHeight: 38,
                  fontWeight: tabIndex === 0 ? 800 : 600,
                  fontSize: '0.88rem',
                  textTransform: 'none',
                  zIndex: 1,
                  color:
                    tabIndex === 0
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                }}
              />
              <Tab
                icon={<PersonAddIcon sx={{ fontSize: 18 }} />}
                iconPosition="start"
                label="Register"
                sx={{
                  minHeight: 38,
                  fontWeight: tabIndex === 1 ? 800 : 600,
                  fontSize: '0.88rem',
                  textTransform: 'none',
                  zIndex: 1,
                  color:
                    tabIndex === 1
                      ? theme.palette.primary.main
                      : theme.palette.text.secondary,
                }}
              />
            </Tabs>

            {/* Registration Success Confirmation Card */}
            {registrationSuccess ? (
              <Box textAlign="center" py={2}>
                <CheckCircleOutlineIcon
                  sx={{ fontSize: 56, color: theme.palette.success.main, mb: 1.5 }}
                />
                <Typography variant="h6" fontWeight="800" sx={{ mb: 1 }}>
                  Registration Submitted!
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Your account for <strong>@{username}</strong> is currently{' '}
                  <span
                    style={{
                      color: '#f59e0b',
                      fontWeight: 700,
                      backgroundColor: 'rgba(245, 158, 11, 0.15)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    PENDING
                  </span>{' '}
                  admin approval. Once approved, you can log in to access your separate personal sheet.
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => {
                    setRegistrationSuccess(false);
                    setTabIndex(0);
                    setError('');
                  }}
                  sx={{
                    py: 1.2,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: 'none',
                  }}
                >
                  Return to Sign In
                </Button>
              </Box>
            ) : (
              <>
                {/* Alert Messages */}
                {error && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}
                {infoMessage && (
                  <Alert
                    severity="warning"
                    icon={<HowToRegIcon fontSize="inherit" sx={{ mt: 0.2 }} />}
                    sx={{
                      mb: 2.5,
                      borderRadius: 2,
                      fontWeight: 600,
                      border: '1px solid rgba(245, 158, 11, 0.4)',
                      background: 'rgba(245, 158, 11, 0.08)',
                    }}
                  >
                    <Typography
                      variant="subtitle2"
                      fontWeight="800"
                      sx={{ mb: 0.3, color: '#f59e0b', fontSize: '0.9rem' }}
                    >
                      Account Pending Approval
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: '0.84rem', lineHeight: 1.4 }}>
                      {infoMessage}
                    </Typography>
                  </Alert>
                )}

                {/* Form: LOGIN */}
                {tabIndex === 0 ? (
                  <form onSubmit={handleLoginSubmit}>
                    <TextField
                      fullWidth
                      label="Username or Google Email"
                      variant="outlined"
                      size="small"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        setError('');
                        setInfoMessage('');
                      }}
                      disabled={loading}
                      sx={inputSx}
                      autoComplete="username"
                    />

                    <TextField
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      variant="outlined"
                      size="small"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                        setInfoMessage('');
                      }}
                      disabled={loading}
                      sx={{ ...inputSx, mb: 1 }}
                      autoComplete="current-password"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <Box display="flex" justifyContent="flex-end" mb={2.5}>
                      <Typography
                        variant="caption"
                        onClick={() => {
                          setForgotOpen(true);
                          setForgotError('');
                          setForgotSuccess('');
                          setForgotUsername(username || '');
                        }}
                        sx={{
                          color: theme.palette.primary.main,
                          fontWeight: 600,
                          cursor: 'pointer',
                          userSelect: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                            opacity: 0.85,
                          },
                        }}
                      >
                        Forgot Password?
                      </Typography>
                    </Box>

                    <Button
                      fullWidth
                      size="large"
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      sx={{
                        py: 1.3,
                        borderRadius: 2,
                        fontWeight: 'bold',
                        textTransform: 'none',
                        fontSize: '1rem',
                        position: 'relative',
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        'Sign In'
                      )}
                    </Button>

                    <Box mt={2.5} textAlign="center">
                      <Typography variant="body2" color="text.secondary">
                        Don't have an account?{' '}
                        <span
                          onClick={() => {
                            setTabIndex(1);
                            setError('');
                            setInfoMessage('');
                          }}
                          style={{
                            color: theme.palette.primary.main,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Register now
                        </span>
                      </Typography>
                    </Box>
                  </form>
                ) : (
                  /* Form: REGISTER */
                  <form onSubmit={handleRegisterSubmit}>
                    <TextField
                      fullWidth
                      label="Full Name"
                      variant="outlined"
                      size="small"
                      value={fullName}
                      onChange={(e) => {
                        setFullName(e.target.value);
                        setError('');
                      }}
                      disabled={loading}
                      sx={inputSx}
                      placeholder="e.g. John Doe"
                    />

                    <TextField
                      fullWidth
                      label="Username or Google Email"
                      variant="outlined"
                      size="small"
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.toLowerCase().trim());
                        setError('');
                      }}
                      disabled={loading}
                      sx={inputSx}
                      placeholder="e.g. johndoe or user@gmail.com"
                      helperText="Username or Google account email"
                    />

                    <TextField
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      variant="outlined"
                      size="small"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError('');
                      }}
                      disabled={loading}
                      sx={inputSx}
                      helperText="Minimum 6 characters"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? (
                                <VisibilityOff fontSize="small" />
                              ) : (
                                <Visibility fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Confirm Password"
                      type={showPassword ? 'text' : 'password'}
                      variant="outlined"
                      size="small"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError('');
                      }}
                      disabled={loading}
                      sx={{ ...inputSx, mb: 3 }}
                    />

                    <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: '0.8rem' }}>
                      New accounts require admin review & approval before first login.
                    </Alert>

                    <Button
                      fullWidth
                      size="large"
                      type="submit"
                      variant="contained"
                      disabled={loading}
                      sx={{
                        py: 1.3,
                        borderRadius: 2,
                        fontWeight: 'bold',
                        textTransform: 'none',
                        fontSize: '1rem',
                      }}
                    >
                      {loading ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        'Request Account'
                      )}
                    </Button>

                    <Box mt={2.5} textAlign="center">
                      <Typography variant="body2" color="text.secondary">
                        Already have an account?{' '}
                        <span
                          onClick={() => {
                            setTabIndex(0);
                            setError('');
                            setInfoMessage('');
                          }}
                          style={{
                            color: theme.palette.primary.main,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Sign In
                        </span>
                      </Typography>
                    </Box>
                  </form>
                )}
              </>
            )}
          </Paper>
        </Container>
      </Fade>

      {/* Forgot Password Dialog */}
      <Dialog
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            p: { xs: 2.5, sm: 3 },
            borderRadius: 2.5,
            background: theme.palette.custom?.dialogGradient || '#18181c',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)',
          },
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
          <Box display="flex" alignItems="center" gap={1}>
            <LockResetIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight="bold">
              Reset Password
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setForgotOpen(false)}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Enter your registered username or Google email and specify a new password. The administrator will review and approve your request.
        </Typography>

        {forgotError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {forgotError}
          </Alert>
        )}

        {forgotSuccess ? (
          <Box py={2} textAlign="center">
            <CheckCircleOutlineIcon sx={{ fontSize: 54, color: 'success.main', mb: 1.5 }} />
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Request Submitted!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {forgotSuccess}
            </Typography>
            <Button
              variant="contained"
              fullWidth
              onClick={() => {
                setForgotOpen(false);
                setForgotSuccess('');
              }}
            >
              Back to Sign In
            </Button>
          </Box>
        ) : (
          <form onSubmit={handleForgotPasswordSubmit}>
            <DialogContent sx={{ px: 0, py: 0 }}>
              <TextField
                fullWidth
                label="Username or Google Email"
                size="small"
                value={forgotUsername}
                onChange={(e) => setForgotUsername(e.target.value)}
                disabled={forgotLoading}
                sx={inputSx}
                placeholder="e.g. johndoe or user@gmail.com"
                autoComplete="username"
              />

              <TextField
                fullWidth
                label="New Password"
                type="password"
                size="small"
                value={forgotNewPassword}
                onChange={(e) => setForgotNewPassword(e.target.value)}
                disabled={forgotLoading}
                sx={inputSx}
                placeholder="Min 6 characters"
                autoComplete="new-password"
              />

              <TextField
                fullWidth
                label="Confirm New Password"
                type="password"
                size="small"
                value={forgotConfirmPassword}
                onChange={(e) => setForgotConfirmPassword(e.target.value)}
                disabled={forgotLoading}
                sx={{ ...inputSx, mb: 1 }}
                autoComplete="new-password"
              />
            </DialogContent>

            <DialogActions sx={{ px: 0, pt: 2, pb: 0, gap: 1 }}>
              <Button
                variant="outlined"
                onClick={() => setForgotOpen(false)}
                disabled={forgotLoading}
                sx={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={forgotLoading}
                sx={{ flex: 1.5 }}
              >
                {forgotLoading ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  'Submit Request'
                )}
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </Box>
  );
};

export default Login;
