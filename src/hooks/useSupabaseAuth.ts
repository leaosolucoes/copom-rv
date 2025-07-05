import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { User, Session } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'atendente';
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
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          full_name,
          role,
          is_active,
          user_roles!inner (
            role,
            is_active,
            expires_at
          )
        `)
        .eq('id', userId)
        .eq('is_active', true)
        .single();

      if (userError) {
        console.error('Error fetching user profile:', userError);
        return null;
      }

      return userData as UserProfile;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch user profile with roles
          setTimeout(async () => {
            const userProfile = await fetchUserProfile(session.user.id);
            setProfile(userProfile);
            setIsLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(async () => {
          const userProfile = await fetchUserProfile(session.user.id);
          setProfile(userProfile);
          setIsLoading(false);
        }, 0);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password
      });

      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive",
        });
        return { error };
      }

      if (data.user) {
        // Update last login
        await supabase
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', data.user.id);

        toast({
          title: "Login realizado",
          description: "Bem-vindo ao sistema!",
        });
      }

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
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error signing out:', error);
        return { error };
      }

      setUser(null);
      setSession(null);
      setProfile(null);
      
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