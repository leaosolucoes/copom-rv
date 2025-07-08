import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, AlertCircle, Download } from "lucide-react";
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

  console.log('MediaModal props:', { isOpen, media, initialIndex, type });

  // Atualizar currentIndex quando initialIndex mudar
  useEffect(() => {
    setCurrentIndex(initialIndex);
    setVideoError(false); // Reset error state when changing videos
  }, [initialIndex]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
    setVideoError(false);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
    setVideoError(false);
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
              <div className="relative w-full h-full flex flex-col items-center justify-center">
                {!videoError ? (
                  <>
                    <video
                      key={media[currentIndex]} // Force re-render when video changes
                      className="max-w-full max-h-full mb-4"
                      style={{ maxHeight: 'calc(90vh - 8rem)' }}
                      controls
                      preload="metadata"
                      playsInline
                      onError={(e) => {
                        console.error('Erro ao carregar vídeo no modal:', media[currentIndex]);
                        console.error('Video error event:', e);
                        setVideoError(true);
                      }}
                      onLoadStart={() => {
                        console.log('Carregando vídeo no modal:', media[currentIndex]);
                        setVideoError(false);
                      }}
                      onCanPlay={() => {
                        console.log('Vídeo pronto para reproduzir no modal:', media[currentIndex]);
                      }}
                      onLoadedData={() => {
                        console.log('Dados do vídeo carregados:', media[currentIndex]);
                      }}
                    >
                      {/* Múltiplas sources para diferentes formatos */}
                      <source src={media[currentIndex]} type="video/mp4" />
                      <source src={media[currentIndex]} type="video/webm" />
                      <source src={media[currentIndex]} type="video/quicktime" />
                      <source src={media[currentIndex]} type="video/x-msvideo" />
                      <source src={media[currentIndex]} type="video/ogg" />
                      <source src={media[currentIndex]} type="video/3gpp" />
                      <source src={media[currentIndex]} type="video/x-ms-wmv" />
                      {/* Fallback genérico */}
                      <source src={media[currentIndex]} />
                      Seu navegador não suporta o elemento de vídeo.
                    </video>
                    
                    {/* Botão de download sempre visível para vídeos que carregam */}
                    <div className="flex gap-2 mt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = media[currentIndex];
                          link.download = media[currentIndex].split('/').pop() || 'video';
                          link.target = '_blank';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar Vídeo
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="bg-black/50 hover:bg-black/70 text-white border-white/20"
                        onClick={() => {
                          window.open(media[currentIndex], '_blank');
                        }}
                      >
                        Abrir em nova aba
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-white max-w-md mx-auto">
                    <AlertCircle className="h-16 w-16 mb-4 text-yellow-400" />
                    <h3 className="text-lg font-semibold mb-2">Formato não suportado</h3>
                    <p className="text-sm text-gray-300 mb-4 text-center">
                      O vídeo {media[currentIndex].split('.').pop()?.toUpperCase()} não pode ser reproduzido neste navegador.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-white border-white hover:bg-white hover:text-black"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = media[currentIndex];
                          link.download = media[currentIndex].split('/').pop() || 'video';
                          link.target = '_blank';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-white border-white hover:bg-white hover:text-black"
                        onClick={() => {
                          window.open(media[currentIndex], '_blank');
                        }}
                      >
                        Abrir em nova aba
                      </Button>
                    </div>
                    <p className="text-xs text-gray-400 mt-4 text-center">
                      Baixe o arquivo para reproduzir em um player externo
                    </p>
                  </div>
                )}
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