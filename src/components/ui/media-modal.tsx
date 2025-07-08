import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
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

  console.log('MediaModal props:', { isOpen, media, initialIndex, type });

  // Atualizar currentIndex quando initialIndex mudar
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : media.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < media.length - 1 ? prev + 1 : 0));
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
              <video
                key={media[currentIndex]} // Force re-render when video changes
                src={media[currentIndex]}
                controls
                preload="metadata"
                className="max-w-full max-h-full"
                style={{ maxHeight: 'calc(90vh - 4rem)' }}
                onError={(e) => {
                  console.error('Erro ao carregar vídeo:', media[currentIndex]);
                  console.error('Video error event:', e);
                }}
                onLoadStart={() => {
                  console.log('Carregando vídeo:', media[currentIndex]);
                }}
                onCanPlay={() => {
                  console.log('Vídeo pronto para reproduzir:', media[currentIndex]);
                }}
              >
                <source src={media[currentIndex]} type="video/mp4" />
                <source src={media[currentIndex]} type="video/webm" />
                <source src={media[currentIndex]} type="video/ogg" />
                Seu navegador não suporta o elemento de vídeo.
              </video>
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