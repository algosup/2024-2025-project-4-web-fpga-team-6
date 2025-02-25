import React from 'react';
import { Typography, Paper, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
}));

const CodeSection: React.FC = () => {
  return (
    <StyledPaper elevation={6}>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
        Code Section
      </Typography>
      <Typography variant="body1" paragraph>
        This section allows users to view and edit code examples and projects.
      </Typography>
      <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
        <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
          {`// Example code
function helloWorld() {
  console.log("Hello, Team 6 Project!");
}

helloWorld();`}
        </Typography>
      </Box>
    </StyledPaper>
  );
};

export default CodeSection; 