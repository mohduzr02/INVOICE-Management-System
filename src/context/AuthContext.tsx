import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

// In-memory access token caching per skill guidelines
let cachedAccessToken: string | null = null;

export const getCachedAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  isWorkspaceConnected: boolean;
  getAccessToken: () => Promise<string | null>;
  signInWithGoogle: () => Promise<{ user: User; accessToken: string | null } | null>;
  connectWorkspace: () => Promise<string | null>;
  logOut: () => Promise<void>;
  authError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(cachedAccessToken);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        if (!currentUser) {
          cachedAccessToken = null;
          setAccessToken(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setAuthError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleSignInWithGoogle = async (): Promise<{ user: User; accessToken: string | null } | null> => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      if (token) {
        cachedAccessToken = token;
        setAccessToken(token);
      }
      return { user: result.user, accessToken: token };
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setAuthError(err.message || 'Failed to sign in with Google');
      throw err;
    }
  };

  const handleConnectWorkspace = async (): Promise<string | null> => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      if (token) {
        cachedAccessToken = token;
        setAccessToken(token);
      }
      return token;
    } catch (err: any) {
      console.error('Workspace connection error:', err);
      setAuthError(err.message || 'Failed to connect Google Workspace');
      return null;
    }
  };

  const handleSignOut = async () => {
    try {
      cachedAccessToken = null;
      setAccessToken(null);
      await signOut(auth);
    } catch (err: any) {
      console.error('Sign-out error:', err);
      setAuthError(err.message);
    }
  };

  const getAccessTokenAsync = async (): Promise<string | null> => {
    return cachedAccessToken;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessToken,
        isWorkspaceConnected: !!accessToken,
        getAccessToken: getAccessTokenAsync,
        signInWithGoogle: handleSignInWithGoogle,
        connectWorkspace: handleConnectWorkspace,
        logOut: handleSignOut,
        authError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
