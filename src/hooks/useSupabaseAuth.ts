import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/secureLogger';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'atendente' | 'fiscal';
  is_active: boolean;
  user_roles?: Array<{
    role: string;
    is_active: boolean;
    expires_at: string | null;
  }>;
}

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch user profile and roles
  const fetchUserProfile = async (userId: string) => {
    try {
      // Use .maybeSingle() to avoid errors when no data is found
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          role,
          is_active
        `)
        .eq('id', userId)
        .eq('is_active', true)
        .maybeSingle();

      if (userError) {
        logger.error('Error fetching user profile:', userError);
        return null;
      }

      if (!userData) {
        logger.debug('No user profile found for:', userId);
        return null;
      }

      return userData as UserProfile;
    } catch (error) {
      logger.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;

    logger.debug('🔄 Starting custom auth initialization...');

    // Check for existing custom session
    try {
      const customSession = localStorage.getItem('custom_session');
      const customProfile = localStorage.getItem('custom_profile');
      
      if (customSession && customProfile) {
        const session = JSON.parse(customSession);
        const profile = JSON.parse(customProfile);
        
        logger.debug('📱 MOBILE: Found custom session for', profile.full_name);
        
        setSession(session);
        setUser(session.user);
        setProfile(profile);
        
        if (isMounted) setIsLoading(false);
      } else {
        logger.debug('📱 MOBILE: No custom session found');
        if (isMounted) setIsLoading(false);
      }
    } catch (error) {
      logger.error('Error loading custom session:', error);
      if (isMounted) setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      logger.debug('🔑 Authenticating with custom system...');
      
      const { data: customData, error: customError } = await supabase
        .rpc('authenticate_user', {
          p_email: email.toLowerCase().trim(),
          p_password: password
        });

      if (customError) {
        logger.error('Custom auth error:', customError);
        toast({
          title: "Erro no login",
          description: "Erro interno do servidor",
          variant: "destructive",
        });
        return { error: customError };
      }

      if (!customData || customData.length === 0 || !customData[0].password_valid) {
        toast({
          title: "Erro no login",
          description: "Email ou senha incorretos",
          variant: "destructive",
        });
        return { error: new Error('Invalid credentials') };
      }

      const userData = customData[0];
      
      // Para o sistema customizado, criar uma sessão local
      const mockUser = {
        id: userData.user_id,
        email: userData.email,
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role
        },
        aud: 'authenticated',
        role: 'authenticated'
      } as any;

      const mockSession = {
        user: mockUser,
        access_token: 'custom_token_' + userData.user_id,
        refresh_token: 'custom_refresh_' + userData.user_id,
        expires_in: 86400, // 24 hours in seconds
        expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
        token_type: 'bearer'
      } as any;

      // Set user and profile data immediately for mobile
      logger.debug('📱 MOBILE: Setting immediate auth data for', userData.full_name, 'role:', userData.role);
      
      const profileData = {
        id: userData.user_id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role as 'super_admin' | 'admin' | 'atendente' | 'fiscal',
        is_active: userData.is_active
      };
      
      // Store FIRST for mobile reliability - use multiple storage methods
      localStorage.setItem('custom_session', JSON.stringify(mockSession));
      localStorage.setItem('custom_profile', JSON.stringify(profileData));
      
      // Additional mobile-specific storage
      sessionStorage.setItem('mobile_auth_backup', JSON.stringify({
        session: mockSession,
        profile: profileData,
        timestamp: Date.now()
      }));
      
      // Set auth state immediately for mobile
      setUser(mockUser);
      setSession(mockSession);
      setProfile(profileData);
      
      // Force state update for mobile
      if (typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)) {
        logger.debug('📱 MOBILE: Forcing state synchronization...');
        
        // Dispatch custom event for mobile sync
        window.dispatchEvent(new CustomEvent('mobileAuthSuccess', {
          detail: { profile: profileData, session: mockSession }
        }));
        
        // Additional mobile delay for state sync
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      logger.debug('✅ Auth state set successfully for', userData.full_name, 'role:', userData.role);

      // Update last login
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userData.user_id);

      toast({
        title: "Login realizado",
        description: "Bem-vindo ao sistema!",
      });

      return { error: null };

    } catch (error: any) {
      logger.error('Error in signIn:', error);
      toast({
        title: "Erro no login",
        description: "Erro interno do servidor",
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Sign out from both systems
      const { error } = await supabase.auth.signOut();
      
      setUser(null);
      setSession(null);
      setProfile(null);
      
      // Clear custom session data
      localStorage.removeItem('custom_session');
      localStorage.removeItem('custom_profile');
      localStorage.removeItem('user');
      
      return { error: null };
    } catch (error: any) {
      logger.error('Error in signOut:', error);
      return { error };
    }
  };

  const hasRole = (allowedRoles: string[]) => {
    if (!profile) return false;
    
    // Check both legacy role and new user_roles
    const legacyRoleMatch = allowedRoles.includes(profile.role);
    const userRolesMatch = profile.user_roles?.some(
      userRole => allowedRoles.includes(userRole.role) && 
                  userRole.is_active && 
                  (!userRole.expires_at || new Date(userRole.expires_at) > new Date())
    );
    
    return legacyRoleMatch || userRolesMatch || false;
  };

  const isSuperAdmin = () => {
    if (!profile) return false;
    
    // Check both legacy role and new user_roles
    const legacyCheck = profile.role === 'super_admin';
    const userRolesCheck = profile.user_roles?.some(
      userRole => userRole.role === 'super_admin' && 
                  userRole.is_active && 
                  (!userRole.expires_at || new Date(userRole.expires_at) > new Date())
    );
    
    return legacyCheck || userRolesCheck || false;
  };

  const getUserRole = () => {
    if (!profile) return null;
    
    // Check user_roles first for most current role
    const activeRole = profile.user_roles?.find(
      userRole => userRole.is_active && 
                  (!userRole.expires_at || new Date(userRole.expires_at) > new Date())
    );
    
    return activeRole?.role || profile.role;
  };

  return {
    user,
    session,
    profile,
    isLoading,
    signIn,
    signOut,
    hasRole,
    isSuperAdmin,
    getUserRole,
    isAuthenticated: !!user && !!session && !!profile && profile.is_active
  };
};