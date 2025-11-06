import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { PublicComplaintForm } from "@/components/complaints/PublicComplaintForm";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const [logoUrl, setLogoUrl] = useState<string>('');

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 2000)
        );
        
        const fetchPromise = supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'public_logo_url')
          .maybeSingle();

        const { data } = await Promise.race([fetchPromise, timeoutPromise]) as any;
        
        if (data?.value) {
          setLogoUrl(data.value as string);
        }
      } catch (error) {
        // Silenciosamente ignora erro de logo
      }
    };

    fetchLogo();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header showLoginButton={false} logoUrl={logoUrl} />
      <main className="py-8">
        <div className="container mx-auto">
          <PublicComplaintForm />
        </div>
      </main>
    </div>
  );
};

export default Index;
