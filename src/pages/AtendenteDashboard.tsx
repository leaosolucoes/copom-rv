import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AtendenteDashboard() {
  const { profile, signOut, isLoading } = useSupabaseAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(true);

  // Função para carregar denúncias diretamente
  const loadComplaints = async () => {
    try {
      setLoadingComplaints(true);
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Erro ao carregar denúncias:', error);
        return;
      }

      console.log('Denúncias carregadas:', data?.length || 0);
      setComplaints(data || []);
    } catch (error) {
      console.error('Erro ao carregar denúncias:', error);
    } finally {
      setLoadingComplaints(false);
    }
  };

  useEffect(() => {
    // Carregar denúncias sempre
    loadComplaints();
  }, []);

  useEffect(() => {
    if (!isLoading && !profile) {
      console.log('📱 ATENDENTE: No profile, redirecting to /acesso');
      navigate('/acesso');
      return;
    }
  }, [profile, navigate, isLoading]);

  // SEMPRE renderizar conteúdo visível
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      padding: '0',
      margin: '0',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header fixo */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '16px',
        borderBottom: '2px solid #e9ecef',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        position: 'sticky',
        top: '0',
        zIndex: '100'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          maxWidth: '100%'
        }}>
          <div>
            <h1 style={{
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#2c3e50',
              margin: '0 0 4px 0'
            }}>
              📋 Painel do Atendente
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#6c757d',
              margin: '0'
            }}>
              {profile?.full_name ? `Olá, ${profile.full_name}` : 'Carregando...'}
            </p>
          </div>
          <button
            onClick={signOut}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🚪 Sair
          </button>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div style={{ padding: '16px' }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#2c3e50',
            margin: '0 0 16px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            📝 Lista de Denúncias
          </h2>

          {loadingComplaints ? (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: '#6c757d'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #f3f3f3',
                borderTop: '4px solid #007bff',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}></div>
              <p style={{ margin: '0', fontSize: '14px' }}>Carregando denúncias...</p>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : complaints.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {complaints.map((complaint, index) => (
                <div
                  key={complaint.id}
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    padding: '12px',
                    fontSize: '14px'
                  }}
                >
                  <div style={{
                    fontWeight: '600',
                    color: '#495057',
                    marginBottom: '6px'
                  }}>
                    #{index + 1} - {complaint.complainant_name}
                  </div>
                  <div style={{
                    color: '#6c757d',
                    fontSize: '12px',
                    marginBottom: '6px'
                  }}>
                    📍 {complaint.occurrence_address}, {complaint.occurrence_neighborhood}
                  </div>
                  <div style={{
                    color: '#495057',
                    fontSize: '13px',
                    lineHeight: '1.4'
                  }}>
                    {complaint.narrative?.substring(0, 100)}
                    {complaint.narrative?.length > 100 ? '...' : ''}
                  </div>
                  <div style={{
                    marginTop: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{
                      backgroundColor: complaint.status === 'nova' ? '#28a745' : '#6c757d',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      textTransform: 'uppercase'
                    }}>
                      {complaint.status}
                    </span>
                    <span style={{
                      color: '#6c757d',
                      fontSize: '11px'
                    }}>
                      {new Date(complaint.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '32px 16px',
              color: '#6c757d'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
              <p style={{ margin: '0', fontSize: '14px' }}>
                Nenhuma denúncia encontrada
              </p>
              <button
                onClick={loadComplaints}
                style={{
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  marginTop: '12px',
                  cursor: 'pointer'
                }}
              >
                🔄 Recarregar
              </button>
            </div>
          )}
        </div>

        {/* Informações do sistema */}
        <div style={{
          backgroundColor: '#e7f3ff',
          border: '1px solid #b3d7ff',
          borderRadius: '6px',
          padding: '12px',
          fontSize: '12px',
          color: '#0066cc'
        }}>
          📱 Sistema funcionando • Mobile Otimizado
          {profile && ` • Logado como: ${profile.role}`}
        </div>
      </div>
    </div>
  );
}