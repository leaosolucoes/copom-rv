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

    console.log('🔄 Starting mobile auth initialization...');

    // CRITICAL: Check for stored session FIRST (mobile optimization)
    const storedSession = localStorage.getItem('custom_session');
    const storedProfile = localStorage.getItem('custom_profile');
    
    if (storedSession && storedProfile) {
      try {
        const session = JSON.parse(storedSession);
        const profile = JSON.parse(storedProfile);
        
        console.log('📱 MOBILE: Restored session for', profile.full_name, 'role:', profile.role);
        
        // Validate session is not expired (basic check)
        const now = Math.floor(Date.now() / 1000);
        if (session.expires_at && session.expires_at > now) {
          setSession(session);
          setUser(session.user);
          setProfile(profile);
          setIsLoading(false);
          
          console.log('📱 MOBILE: Session valid, auth complete');
          
          // For mobile with valid session, skip Supabase check entirely
          return () => {
            isMounted = false;
          };
        } else {
          console.log('📱 MOBILE: Session expired, clearing storage');
          localStorage.removeItem('custom_session');
          localStorage.removeItem('custom_profile');
        }
      } catch (error) {
        console.error('❌ Error parsing stored session:', error);
        localStorage.removeItem('custom_session');
        localStorage.removeItem('custom_profile');
      }
    }

    // Mobile safety timeout - much shorter
    loadingTimeout = setTimeout(() => {
      console.warn('⚠️ MOBILE: Auth timeout reached, forcing complete');
      if (isMounted) {
        setIsLoading(false);
      }
    }, 3000); // Reduced to 3 seconds for mobile

    // Simplified auth state listener for mobile
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 MOBILE: Auth state change -', event, !!session);
        
        if (!isMounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          try {
            const userProfile = await fetchUserProfile(session.user.id);
            if (isMounted && userProfile) {
              setProfile(userProfile);
              console.log('📱 MOBILE: Profile loaded for', userProfile.full_name);
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
          }
        } else {
          setProfile(null);
        }
        
        if (isMounted) {
          setIsLoading(false);
        }
      }
    );

    // Quick session check for mobile
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted && session) {
        console.log('📱 MOBILE: Found Supabase session');
        setSession(session);
        setUser(session.user);
        
        if (session.user) {
          fetchUserProfile(session.user.id).then(profile => {
            if (isMounted && profile) {
              setProfile(profile);
              console.log('📱 MOBILE: Initial profile set for', profile.full_name);
            }
            if (isMounted) setIsLoading(false);
          });
        } else {
          if (isMounted) setIsLoading(false);
        }
      } else {
        if (isMounted) setIsLoading(false);
      }
    }).catch(error => {
      console.error('Error getting session:', error);
      if (isMounted) setIsLoading(false);
    });

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
        expires_in: 86400, // 24 hours in seconds
        expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours from now
        token_type: 'bearer'
      } as any;

      // Set user and profile data immediately for mobile
      console.log('📱 MOBILE: Setting immediate auth data for', userData.full_name, 'role:', userData.role);
      
      const profileData = {
        id: userData.user_id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role as 'super_admin' | 'admin' | 'atendente' | 'fiscal',
        is_active: userData.is_active
      };
      
      // Store FIRST for mobile reliability
      localStorage.setItem('custom_session', JSON.stringify(mockSession));
      localStorage.setItem('custom_profile', JSON.stringify(profileData));
      
      // Then set state
      setUser(mockUser);
      setSession(mockSession);
      setProfile(profileData);
      
      console.log('📱 MOBILE: Auth state set successfully - ready for redirect');

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