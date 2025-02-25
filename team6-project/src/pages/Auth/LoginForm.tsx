import React, { useState } from 'react';
import { TextField, Button, Box, Typography, Alert } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface LoginFormProps {
  role: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ role }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError('');
      setLoading(true);
      await login(email, password, role);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Log in as {role.charAt(0).toUpperCase() + role.slice(1)}
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      <TextField
        label="Email"
        type="email"
        fullWidth
        margin="normal"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        variant="outlined"
      />
      
      <TextField
        label="Password"
        type="password"
        fullWidth
        margin="normal"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        variant="outlined"
      />
      
      <Button
        type="submit"
        fullWidth
        variant="contained"
        sx={{ 
          mt: 3, 
          mb: 2,
          background: role === 'student' 
            ? 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)' 
            : 'linear-gradient(45deg, #FF9800 30%, #FFC107 90%)',
          color: 'white',
          py: 1.5,
          borderRadius: 2
        }}
        disabled={loading}
      >
        {loading ? 'Logging in...' : 'Login'}
      </Button>
    </Box>
  );
};

export default LoginForm; 