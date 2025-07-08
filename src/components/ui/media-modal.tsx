import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, AlertCircle, Download, Play } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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
  const videoRef = useRef<HTMLVideoElement>(null);

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
        {/* Elementos obrigatórios de acessibilidade */}
        <DialogTitle className="sr-only">
          {type === 'photo' ? `Visualizando foto ${currentIndex + 1} de ${media.length}` : `Reproduzindo vídeo ${currentIndex + 1} de ${media.length}`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {type === 'photo' ? 'Modal para visualização de imagem' : 'Modal para reprodução de vídeo'}
        </DialogDescription>
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
                {/* Iframe que abre o vídeo diretamente */}
                <div className="w-full max-w-4xl h-[70vh] bg-black rounded overflow-hidden">
                  <iframe
                    key={media[currentIndex]}
                    src={media[currentIndex]}
                    className="w-full h-full border-0"
                    title={`Vídeo ${currentIndex + 1}`}
                    allowFullScreen
                    onLoad={() => {
                      console.log('✅ Vídeo carregado via iframe:', media[currentIndex]);
                      setIsLoading(false);
                      setVideoError(false);
                    }}
                    onError={() => {
                      console.error('❌ Erro no iframe:', media[currentIndex]);
                      setVideoError(true);
                      setIsLoading(false);
                    }}
                  />
                  
                  {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/75">
                      <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                        <p className="text-sm">Carregando vídeo...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botões de ação */}
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    onClick={() => window.open(media[currentIndex], '_blank')}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Abrir em Nova Aba
                  </Button>
                  
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                    onClick={() => {
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