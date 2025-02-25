import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout/Layout';
import AuthPage from './pages/Auth/AuthPage';
import Dashboard from './pages/Dashboard/Dashboard';
import AppSection from './pages/Dashboard/AppSection';
import CodeSection from './pages/Dashboard/CodeSection';
import SimulationSection from './pages/Dashboard/SimulationSection';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e',
    },
    secondary: {
      main: '#ff9800',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<AuthPage />} />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/dashboard/app" 
              element={
                <PrivateRoute>
                  <Layout>
                    <AppSection />
                  </Layout>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/dashboard/code" 
              element={
                <PrivateRoute>
                  <Layout>
                    <CodeSection />
                  </Layout>
                </PrivateRoute>
              } 
            />
            <Route 
              path="/dashboard/simulation" 
              element={
                <PrivateRoute>
                  <Layout>
                    <SimulationSection />
                  </Layout>
                </PrivateRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 