import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
        console.error('Error fetching user profile:', userError);
        return null;
      }

      if (!userData) {
        console.log('No user profile found for:', userId);
        return null;
      }

      return userData as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let loadingTimeout: NodeJS.Timeout;

    // Mobile-optimized session check
    const checkExistingSession = () => {
      try {
        const storedSession = localStorage.getItem('custom_session');
        const storedProfile = localStorage.getItem('custom_profile');
        
        if (storedSession && storedProfile) {
          const session = JSON.parse(storedSession);
          const profile = JSON.parse(storedProfile);
          
          console.log('📱 Restoring mobile session for:', profile.full_name);
          
          if (isMounted) {
            setSession(session);
            setUser(session.user);
            setProfile(profile);
            setIsLoading(false);
          }
          return true;
        }
      } catch (error) {
        console.error('❌ Error loading stored session:', error);
        localStorage.removeItem('custom_session');
        localStorage.removeItem('custom_profile');
      }
      return false;
    };

    // Safety timeout for mobile devices
    loadingTimeout = setTimeout(() => {
      if (isMounted && isLoading) {
        console.warn('⚠️ Mobile auth timeout - forcing initialization complete');
        setIsLoading(false);
      }
    }, 8000);

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state changed:', event, !!session);
        
        if (!isMounted) return;
        
        // Skip if we already have a custom session
        if (localStorage.getItem('custom_session')) {
          console.log('📱 Custom session exists, skipping Supabase auth handler');
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 Loading user profile...');
          try {
            const userProfile = await fetchUserProfile(session.user.id);
            if (isMounted) {
              setProfile(userProfile);
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
          }
        } else {
          setProfile(null);
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
      }
    );

    // Initialize auth - prioritize stored session for mobile
    const initializeAuth = async () => {
      console.log('🚀 Initializing auth for mobile...');
      
      // First check for stored session (fastest for mobile)
      if (checkExistingSession()) {
        console.log('✅ Mobile session restored from storage');
        return;
      }
      
      // Then check Supabase session
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('📋 Supabase session check:', !!session);
        
        if (isMounted) {
          setSession(session);
          setUser(session?.user ?? null);
          
          if (session?.user) {
            console.log('👤 Loading user profile on init...');
            try {
              const userProfile = await fetchUserProfile(session.user.id);
              if (isMounted) {
                setProfile(userProfile);
              }
            } catch (error) {
              console.error('Error fetching user profile on init:', error);
            }
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        if (isMounted) {
          console.log('✅ Auth initialization complete');
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      if (loadingTimeout) clearTimeout(loadingTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // SISTEMA HÍBRIDO: Primeiro tenta Supabase Auth, depois fallback para sistema customizado
      
      // Tentativa 1: Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
      });

      if (data.user && !error) {
        // Sucesso com Supabase Auth
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);

        toast({
          title: "Login realizado",
          description: "Bem-vindo ao sistema!",
        });
        return { error: null };
      }

      // Tentativa 2: Sistema customizado como fallback
      console.log('Supabase Auth failed, trying custom auth...');
      
      const { data: customData, error: customError } = await supabase
        .rpc('authenticate_user', {
          p_email: email.toLowerCase().trim(),
          p_password: password
        });

      if (customError) {
        console.error('Custom auth error:', customError);
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
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer'
      } as any;

      // Set user and profile data
      console.log('📱 Setting user data for mobile:', userData.full_name);
      setUser(mockUser);
      setSession(mockSession);
      
      const profileData = {
        id: userData.user_id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role as 'super_admin' | 'admin' | 'atendente' | 'fiscal',
        is_active: userData.is_active
      };
      
      setProfile(profileData);

      // Store in localStorage for persistence
      localStorage.setItem('custom_session', JSON.stringify(mockSession));
      localStorage.setItem('custom_profile', JSON.stringify(profileData));

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
      console.error('Error in signIn:', error);
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
      console.error('Error in signOut:', error);
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