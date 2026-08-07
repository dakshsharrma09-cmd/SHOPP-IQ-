import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  type User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import type { Tenant } from '../types/firestore';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  tenantId: string | null;
  loading: boolean;
  sendOTP: (phoneNumber: string) => Promise<ConfirmationResult>;
  verifyOTP: (confirmationResult: ConfirmationResult, otp: string) => Promise<{ isNewUser: boolean }>;
  registerTenant: (data: Omit<Tenant, 'id' | 'createdAt' | 'vyapaarScore' | 'subscriptionPlan'>) => Promise<void>;
  logout: () => Promise<void>;
  setupRecaptcha: (elementId: string) => RecaptchaVerifier;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  const tenantId = user?.uid || null;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        const tenantRef = doc(db, 'tenants', firebaseUser.uid);
        const tenantSnap = await getDoc(tenantRef);
        if (tenantSnap.exists()) {
          setTenant({ id: tenantSnap.id, ...tenantSnap.data() } as Tenant);
        } else {
          setTenant(null);
        }
      } else {
        setTenant(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const setupRecaptcha = (elementId: string): RecaptchaVerifier => {
    const verifier = new RecaptchaVerifier(auth, elementId, {
      size: 'invisible',
      callback: () => { },
    });
    return verifier;
  };

  const sendOTP = async (phoneNumber: string): Promise<ConfirmationResult> => {
    // Make sure phone is in +91XXXXXXXXXX format
    const fullPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

    // Reuse existing verifier if available, only create a new one if needed
    let verifier: RecaptchaVerifier = (window as any).__recaptchaVerifier;

    if (!verifier) {
      // Clear the container first
      const container = document.getElementById('recaptcha-container');
      if (container) container.innerHTML = '';

      verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => { },
        'expired-callback': () => {
          // On expiry, clear so a new one is created on next attempt
          (window as any).__recaptchaVerifier = null;
        },
      });
      (window as any).__recaptchaVerifier = verifier;
    }

    try {
      const result = await signInWithPhoneNumber(auth, fullPhone, verifier);
      return result;
    } catch (error: unknown) {
      // Only clear verifier on specific errors, not on rate-limit
      const firebaseError = error as { code?: string };
      if (firebaseError?.code !== 'auth/too-many-requests') {
        try { verifier.clear(); } catch (_e) { /* recaptcha cleanup */ }
        (window as any).__recaptchaVerifier = null;
      }
      throw error;
    }
  };

  const verifyOTP = async (
    confirmationResult: ConfirmationResult,
    otp: string
  ): Promise<{ isNewUser: boolean }> => {
    const credential = await confirmationResult.confirm(otp);
    const uid = credential.user.uid;

    const tenantRef = doc(db, 'tenants', uid);
    const tenantSnap = await getDoc(tenantRef);

    if (tenantSnap.exists()) {
      setTenant({ id: tenantSnap.id, ...tenantSnap.data() } as Tenant);
      return { isNewUser: false };
    }
    return { isNewUser: true };
  };

  const registerTenant = async (
    data: Omit<Tenant, 'id' | 'createdAt' | 'vyapaarScore' | 'subscriptionPlan'>
  ) => {
    if (!user) throw new Error('No user logged in');

    const tenantRef = doc(db, 'tenants', user.uid);
    const tenantData: Omit<Tenant, 'id'> = {
      ...data,
      subscriptionPlan: 'free',
      vyapaarScore: 500,
      createdAt: Timestamp.now(),
    };

    await setDoc(tenantRef, tenantData);
    setTenant({ id: user.uid, ...tenantData });
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setTenant(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      tenant,
      tenantId,
      loading,
      sendOTP,
      verifyOTP,
      registerTenant,
      logout,
      setupRecaptcha,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
