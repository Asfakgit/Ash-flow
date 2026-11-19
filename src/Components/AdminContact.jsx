import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

// The admin's WhatsApp, for anything only the admin can do: approve an account,
// enable a disabled or rejected one, approve a password reset, activate or renew Premium.
const ADMIN_WHATSAPP = '918089974243'; // country code + number, as wa.me expects
const ADMIN_WHATSAPP_LABEL = '+91 8089974243';

const adminWhatsAppUrl = (message) =>
  `https://wa.me/${ADMIN_WHATSAPP}${message ? `?text=${encodeURIComponent(message)}` : ''}`;

/*
 * A short title and a WhatsApp-green button showing the admin's number.
 * `message` pre-fills the chat, so the admin knows who is asking and why.
 */
export default function AdminContact({ title = 'Contact admin on WhatsApp', message, sx }) {
  return (
    <Box sx={sx}>
      {title && (
        <Typography variant="body2" sx={{ fontSize: '0.84rem', fontWeight: 700, mb: 0.8 }}>
          {title}
        </Typography>
      )}
      <Button
        component="a"
        href={adminWhatsAppUrl(message)}
        target="_blank"
        rel="noopener noreferrer"
        size="small"
        variant="contained"
        startIcon={<WhatsAppIcon />}
        sx={{
          // `background` (not bgcolor) so the theme's primary gradient doesn't paint over it
          background: '#25D366',
          color: '#ffffff',
          fontWeight: 700,
          textTransform: 'none',
          borderRadius: 2,
          boxShadow: 'none',
          '&:hover': { background: '#1DA851', boxShadow: 'none' },
        }}
      >
        {ADMIN_WHATSAPP_LABEL}
      </Button>
    </Box>
  );
}
