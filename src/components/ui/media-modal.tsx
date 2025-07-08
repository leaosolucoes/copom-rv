import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, AlertCircle, Download, Play } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface MediaModalProps {
  isOpen: boolean;
  onClose: () => void;
  media: string[];
  initialIndex: number;
  type: 'photo' | 'video';
}

export const MediaModal = ({ isOpen, onClose, media, initialIndex, type }: MediaModalProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  console.log('MediaModal props:', { isOpen, media, initialIndex, type });

  // Atualizar currentIndex quando initialIndex mudar
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setVideoError(false);
    setIsLoading(true);
  }, [initialIndex]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
    setVideoError(false);
    setIsLoading(true);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
    setVideoError(false);
    setIsLoading(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') goToPrevious();
    if (e.key === 'ArrowRight') goToNext();
    if (e.key === 'Escape') onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[90vh] p-0 bg-black/95 border-none"
        onKeyDown={handleKeyDown}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Botão de fechar */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>

          {/* Navegação anterior */}
          {media.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {/* Conteúdo principal */}
          <div className="w-full h-full flex items-center justify-center p-8">
            {type === 'photo' ? (
              <img
                src={media[currentIndex]}
                alt={`Foto ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: 'calc(90vh - 4rem)' }}
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-4">
                <div className="relative w-full max-w-4xl">
                  {/* Debug info */}
                  <div className="absolute top-2 left-2 bg-black/75 text-white text-xs p-2 rounded z-20">
                    URL: {media[currentIndex]}
                  </div>
                  
                  {/* Loading indicator */}
                  {isLoading && !videoError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded z-10">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-sm">Carregando vídeo...</p>
                      </div>
                    </div>
                  )}
                  
                  {!videoError ? (
                    <video
                      key={`video-${currentIndex}-${media[currentIndex]}`}
                      className="w-full h-auto max-h-[70vh] bg-black rounded"
                      controls
                      preload="metadata"
                      playsInline
                      crossOrigin="anonymous"
                      onLoadStart={() => {
                        console.log('🎬 Iniciando carregamento do vídeo:', media[currentIndex]);
                        setIsLoading(true);
                        setVideoError(false);
                      }}
                      onLoadedMetadata={() => {
                        console.log('📊 Metadata carregada para:', media[currentIndex]);
                        setIsLoading(false);
                      }}
                      onCanPlay={() => {
                        console.log('✅ Vídeo pode ser reproduzido:', media[currentIndex]);
                        setIsLoading(false);
                      }}
                      onError={(e) => {
                        console.error('❌ Erro no vídeo:', media[currentIndex]);
                        console.error('Event details:', e);
                        console.error('Video element:', e.currentTarget);
                        setVideoError(true);
                        setIsLoading(false);
                      }}
                      onLoadedData={() => {
                        console.log('📁 Dados do vídeo carregados:', media[currentIndex]);
                        setIsLoading(false);
                      }}
                      onProgress={() => {
                        console.log('📶 Progresso de carregamento para:', media[currentIndex]);
                      }}
                    >
                      <source src={media[currentIndex]} type="video/mp4" />
                      <source src={media[currentIndex]} type="video/webm" />
                      <source src={media[currentIndex]} type="video/quicktime" />
                      <source src={media[currentIndex]} type="video/x-msvideo" />
                      <source src={media[currentIndex]} type="video/ogg" />
                      Seu navegador não suporta este formato de vídeo.
                    </video>
                  ) : (
                    <div className="w-full h-64 bg-gray-800 rounded flex items-center justify-center">
                      <div className="text-center text-white p-8">
                        <AlertCircle className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
                        <h3 className="text-lg font-semibold mb-2">Erro no vídeo</h3>
                        <p className="text-sm text-gray-300 mb-4">
                          Não foi possível reproduzir o vídeo
                        </p>
                        <p className="text-xs text-gray-400 mb-2">
                          URL: {media[currentIndex]}
                        </p>
                        <p className="text-xs text-gray-400">
                          Arquivo: {media[currentIndex].split('/').pop()}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    onClick={() => {
                      console.log('🔗 Testando URL diretamente:', media[currentIndex]);
                      const link = document.createElement('a');
                      link.href = media[currentIndex];
                      link.download = media[currentIndex].split('/').pop() || 'video';
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    onClick={() => {
                      console.log('🌐 Abrindo URL em nova aba:', media[currentIndex]);
                      window.open(media[currentIndex], '_blank');
                    }}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Nova Aba
                  </Button>
                  {videoError && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                      onClick={() => {
                        console.log('🔄 Tentando recarregar vídeo:', media[currentIndex]);
                        setVideoError(false);
                        setIsLoading(true);
                      }}
                    >
                      Tentar Novamente
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    onClick={() => {
                      console.log('🧪 Testando URL com fetch:', media[currentIndex]);
                      fetch(media[currentIndex], { method: 'HEAD' })
                        .then(response => {
                          console.log('📡 Resposta do fetch:', response.status, response.statusText);
                          console.log('🎯 Content-Type:', response.headers.get('content-type'));
                        })
                        .catch(error => {
                          console.error('💥 Erro no fetch:', error);
                        });
                    }}
                  >
                    Testar URL
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Navegação próxima */}
          {media.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-50 bg-black/50 hover:bg-black/70 text-white"
              onClick={goToNext}
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}

          {/* Contador */}
          {media.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
              {currentIndex + 1} de {media.length}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};