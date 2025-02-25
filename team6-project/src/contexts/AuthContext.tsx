import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User,
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase/config';

interface AuthContextType {
  currentUser: User | null;
  userRole: string | null;
  register: (email: string, password: string, displayName: string, role: string) => Promise<void>;
  login: (email: string, password: string, role: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  return useContext(AuthContext) as AuthContextType;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function register(email: string, password: string, displayName: string, role: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName });
    
    // In a real app, you would store the role in your database
    // For this example, we'll just use localStorage
    localStorage.setItem(`user_${userCredential.user.uid}_role`, role);
    setUserRole(role);
  }

  async function login(email: string, password: string, role: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Verify if the user has the correct role
    const storedRole = localStorage.getItem(`user_${userCredential.user.uid}_role`);
    if (storedRole !== role) {
      await signOut(auth);
      throw new Error(`You are not registered as a ${role}`);
    }
    
    setUserRole(role);
  }

  function logout() {
    setUserRole(null);
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const role = localStorage.getItem(`user_${user.uid}_role`);
        setUserRole(role);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    register,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
} 