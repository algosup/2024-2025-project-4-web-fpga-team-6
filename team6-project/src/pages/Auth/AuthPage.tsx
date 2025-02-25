import React, { useState } from 'react';
import { Box, Typography, Button, Container, Paper, Tabs, Tab } from '@mui/material';
import { styled } from '@mui/material/styles';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useNavigate } from 'react-router-dom';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: 16,
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
}));

const RoleButton = styled(Button)(({ theme }) => ({
  padding: theme.spacing(2),
  margin: theme.spacing(1),
  borderRadius: 12,
  width: '45%',
  fontSize: '1.1rem',
  fontWeight: 'bold',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-5px)',
    boxShadow: '0 10px 20px rgba(0, 0, 0, 0.1)',
  },
}));

const StudentButton = styled(RoleButton)(({ theme }) => ({
  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
  color: 'white',
}));

const TeacherButton = styled(RoleButton)(({ theme }) => ({
  background: 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)',
  color: 'white',
}));

const AuthPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  const handleRoleSelect = (role: string) => {
    setSelectedRole(role);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBackToRoles = () => {
    setSelectedRole(null);
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <StyledPaper elevation={6}>
        <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold', color: '#333' }}>
          Welcome to Team 6 Project
        </Typography>

        {!selectedRole ? (
          <>
            <Typography variant="h6" align="center" gutterBottom sx={{ mb: 4, color: '#555' }}>
              Please select your role to continue
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap' }}>
              <StudentButton onClick={() => handleRoleSelect('student')}>
                Student
              </StudentButton>
              <TeacherButton onClick={() => handleRoleSelect('teacher')}>
                Teacher
              </TeacherButton>
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={tabValue} onChange={handleTabChange} centered>
                <Tab label="Login" />
                <Tab label="Register" />
              </Tabs>
            </Box>
            
            {tabValue === 0 && <LoginForm role={selectedRole} />}
            {tabValue === 1 && <RegisterForm role={selectedRole} />}
            
            <Button 
              variant="text" 
              onClick={handleBackToRoles}
              sx={{ mt: 2, display: 'block', mx: 'auto' }}
            >
              Back to role selection
            </Button>
          </>
        )}
      </StyledPaper>
    </Container>
  );
};

export default AuthPage; 