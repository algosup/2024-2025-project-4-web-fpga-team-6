import React from 'react';
import { Typography, Paper, Box, Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../../contexts/AuthContext';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  marginBottom: theme.spacing(4),
}));

const Dashboard: React.FC = () => {
  const { currentUser, userRole } = useAuth();

  return (
    <>
      <StyledPaper elevation={6}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Avatar 
            sx={{ 
              width: 80, 
              height: 80, 
              bgcolor: userRole === 'student' ? '#2196F3' : '#FF9800',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              mr: 3
            }}
          >
            {currentUser?.displayName?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
              Welcome, {currentUser?.displayName}!
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {/* You are logged in as a {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)} */}
            </Typography>
          </Box>
        </Box>
      </StyledPaper>

      <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
        Dashboard Overview
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
        <StyledPaper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            App Section
          </Typography>
          <Typography variant="body1">
            Access the main application features and tools.
          </Typography>
        </StyledPaper>

        <StyledPaper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Code Section
          </Typography>
          <Typography variant="body1">
            View and edit code examples and projects.
          </Typography>
        </StyledPaper>

        <StyledPaper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
            Simulation Section
          </Typography>
          <Typography variant="body1">
            Run simulations and view the results.
          </Typography>
        </StyledPaper>
      </Box>
    </>
  );
};

export default Dashboard; 