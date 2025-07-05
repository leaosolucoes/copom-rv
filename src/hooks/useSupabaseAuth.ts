import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CustomUser {
  id: string;
  email: string;
  user_metadata: {
    full_name: string;
    role: string;
  };
}

interface CustomSession {
  user: CustomUser;
  access_token: string;
  refresh_token: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'atendente';
  is_active: boolean;
}

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [session, setSession] = useState<CustomSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check for existing custom session first
    const checkExistingSession = () => {
      try {
        const storedSession = localStorage.getItem('custom_session');
        const storedProfile = localStorage.getItem('custom_profile');
        
        if (storedSession && storedProfile) {
          const session = JSON.parse(storedSession);
          const profile = JSON.parse(storedProfile);
          
          setSession(session);
          setUser(session.user);
          setProfile(profile);
        }
      } catch (error) {
        console.error('Error loading stored session:', error);
        localStorage.removeItem('custom_session');
        localStorage.removeItem('custom_profile');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role, is_active')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        // If user doesn't exist in users table, sign them out
        if (error.code === 'PGRST116') {
          await signOut();
          toast({
            title: "Acesso negado",
            description: "Usuário não encontrado no sistema",
            variant: "destructive",
          });
        }
        return;
      }

      if (!data.is_active) {
        await signOut();
        toast({
          title: "Conta desativada",
          description: "Sua conta foi desativada. Contate o administrador.",
          variant: "destructive",
        });
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Use custom authentication function
      const { data, error } = await supabase
        .rpc('authenticate_user', {
          p_email: email,
          p_password: password
        });

      if (error) {
        toast({
          title: "Erro no login",
          description: "Erro interno do servidor",
          variant: "destructive",
        });
        return { error };
      }

      if (!data || data.length === 0 || !data[0].password_valid) {
        toast({
          title: "Erro no login",
          description: "Email ou senha incorretos",
          variant: "destructive",
        });
        return { error: new Error('Invalid credentials') };
      }

      const userData = data[0];
      
      // Create a mock session for our custom auth
      const mockUser = {
        id: userData.user_id,
        email: userData.email,
        user_metadata: {
          full_name: userData.full_name,
          role: userData.role
        }
      };

      const mockSession = {
        user: mockUser,
        access_token: 'custom_token',
        refresh_token: 'custom_refresh'
      };

      // Set user and profile data
      setUser(mockUser);
      setSession(mockSession);
      setProfile({
        id: userData.user_id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role as 'super_admin' | 'admin' | 'atendente',
        is_active: userData.is_active
      });

      // Store in localStorage for persistence
      localStorage.setItem('custom_session', JSON.stringify(mockSession));
      localStorage.setItem('custom_profile', JSON.stringify({
        id: userData.user_id,
        email: userData.email,
        full_name: userData.full_name,
        role: userData.role as 'super_admin' | 'admin' | 'atendente',
        is_active: userData.is_active
      }));

      return { error: null };
    } catch (error: any) {
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
    return allowedRoles.includes(profile.role);
  };

  const isSuperAdmin = () => {
    return profile?.role === 'super_admin';
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
    isAuthenticated: !!user && !!profile
  };
};