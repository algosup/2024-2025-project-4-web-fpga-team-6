import React from 'react';
import { Typography, Paper, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
}));

const SimulationSection: React.FC = () => {
  return (
    <StyledPaper elevation={6}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Simulation Section
      </Typography>
      <Typography variant="body1" paragraph>
        This section allows users to run simulations and view the results.
      </Typography>
      <Box sx={{ mt: 4, p: 3, bgcolor: '#f0f8ff', borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Simulation Viewer
        </Typography>
        <Box 
          sx={{ 
            height: 200, 
            bgcolor: '#e1f5fe', 
            borderRadius: 1, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <Typography>Simulation visualization would appear here</Typography>
        </Box>
      </Box>
    </StyledPaper>
  );
};

export default SimulationSection; 