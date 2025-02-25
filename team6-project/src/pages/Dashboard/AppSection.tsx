import React from 'react';
import { Typography, Paper, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
}));

const AppSection: React.FC = () => {
  return (
    <StyledPaper elevation={6}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        App Section
      </Typography>
      <Typography variant="body1" paragraph>
        This is the main application section where users can interact with the core features of the platform.
      </Typography>
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Features:
        </Typography>
        <ul>
          <li>Feature 1</li>
          <li>Feature 2</li>
          <li>Feature 3</li>
        </ul>
      </Box>
    </StyledPaper>
  );
};

export default AppSection; 