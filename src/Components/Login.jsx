import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Fade,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';

const Login = ({ onLogin }) => {
  const theme = useTheme();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Check against env variables or defaults (trimming to avoid invisible space issues)
    const validUsername = String(import.meta.env.VITE_APP_USERNAME || 'ashflow').trim();
    const validPassword = String(import.meta.env.VITE_APP_PASSWORD || 'Ashflow@123').trim();

    if (username.trim() === validUsername && password === validPassword) {
      onLogin();
    } else {
      setError('Invalid username or password');
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
      }}
    >
      <Fade in timeout={800}>
        <Container maxWidth="sm">
          <Paper
            elevation={24}
            sx={{
              p: { xs: 4, md: 6 },
              borderRadius: 4,
              background: theme.palette.background.paper,
              boxShadow: theme.shadows[10],
            }}
          >
            <Box textAlign="center" mb={4}>
              <Typography
                variant="h4"
                fontWeight="800"
                sx={{
                  background: theme.palette.custom?.titleGradient || 'linear-gradient(90deg, #1976d2, #9c27b0)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1,
                }}
              >
                Welcome Back
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Please enter your credentials to access the application
              </Typography>
            </Box>

            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Username"
                variant="outlined"
                margin="normal"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                margin="normal"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                sx={{ mb: 3 }}
              />

              {error && (
                <Typography color="error" variant="body2" sx={{ mb: 2, textAlign: 'center' }}>
                  {error}
                </Typography>
              )}

              <Button
                fullWidth
                size="large"
                type="submit"
                variant="contained"
                sx={{
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 'bold',
                  textTransform: 'none',
                  fontSize: '1.1rem',
                }}
              >
                Login
              </Button>
            </form>
          </Paper>
        </Container>
      </Fade>
    </Box>
  );
};

export default Login;
