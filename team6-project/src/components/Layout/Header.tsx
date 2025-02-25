import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, useTheme } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const theme = useTheme();

  return (
    <AppBar 
      position="static" 
      sx={{ 
        background: 'linear-gradient(90deg, #1a237e 0%, #283593 100%)',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)'
      }}
    >
      <Toolbar>
        <Typography 
          variant="h5" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 'bold',
            letterSpacing: '1px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
          }}
        >
          TEAM 6 PROJECT
        </Typography>
        
        {currentUser && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/dashboard/app"
              sx={{ 
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.2s'
              }}
            >
              App
            </Button>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/dashboard/code"
              sx={{ 
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.2s'
              }}
            >
              Code
            </Button>
            <Button 
              color="inherit" 
              component={RouterLink} 
              to="/dashboard/simulation"
              sx={{ 
                fontWeight: 'bold',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-2px)'
                },
                transition: 'all 0.2s'
              }}
            >
              Simulation
            </Button>
            <Button 
              color="inherit" 
              onClick={logout}
              sx={{ 
                fontWeight: 'bold',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                }
              }}
            >
              Logout
            </Button>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header; 