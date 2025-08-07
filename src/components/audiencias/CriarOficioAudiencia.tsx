import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAudiencias } from '@/hooks/useAudiencias';
import { useUploadOficio } from '@/hooks/useUploadOficio';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { 
  Calendar as CalendarIcon, 
  Upload, 
  FileText, 
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { obterDataBrasil } from '@/utils/dataBrasil';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  numero_processo: z.string().min(1, 'Número do processo é obrigatório'),
  vara: z.string().min(1, 'Vara é obrigatória'),
  data_audiencia: z.date({
    required_error: 'Data da audiência é obrigatória',
  }),
  horario_audiencia: z.string().min(1, 'Horário da audiência é obrigatório'),
  user_id: z.string().min(1, 'Selecione um usuário'),
  eh_presencial: z.boolean().default(false),
  link_videoconferencia: z.string().optional(),
});

interface CriarOficioAudienciaProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const CriarOficioAudiencia = ({ 
  isOpen, 
  onClose, 
  currentUserId 
}: CriarOficioAudienciaProps) => {
  const { criarAudiencia } = useAudiencias();
  const { uploadOficio, isUploading } = useUploadOficio();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numero_processo: '',
      vara: '',
      horario_audiencia: '',
      user_id: '',
      eh_presencial: false,
      link_videoconferencia: '',
    },
  });

  const { data: users } = useQuery({
    queryKey: ['users-fiscais-admins'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('is_active', true)
        .in('role', ['fiscal', 'admin', 'super_admin'])
        .order('full_name');

      if (error) throw error;
      return data;
    },
    enabled: isOpen
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!selectedFile) {
      form.setError('root', { message: 'Selecione um arquivo PDF' });
      return;
    }

    try {
      // Upload do arquivo
      const uploadResult = await uploadOficio(selectedFile, currentUserId);

      // Formatar data para o Brasil
      const formatarDataBrasil = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      // Criar audiência
      await criarAudiencia.mutateAsync({
        numero_processo: values.numero_processo,
        vara: values.vara,
        data_audiencia: formatarDataBrasil(values.data_audiencia),
        horario_audiencia: values.horario_audiencia,
        user_id: values.user_id,
        criado_por: currentUserId,
        arquivo_oficio_url: uploadResult.path,
        eh_presencial: values.eh_presencial,
        link_videoconferencia: values.eh_presencial ? null : (values.link_videoconferencia || null),
        status: 'pendente',
        dados_assinatura: null,
        dados_validacao: null,
        data_assinatura: null,
        hash_assinatura: null,
        salt_assinatura: null,
        oficio_concluido: false,
        data_conclusao_oficio: null,
        concluido_por: null,
        assinador_nome: null
      });

      form.reset();
      setSelectedFile(null);
      onClose();
    } catch (error) {
      console.error('Erro ao criar ofício:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Criar Ofício de Audiência
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Informações do Processo */}
            <Card>
              <CardHeader>
                <CardTitle>Informações do Processo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="numero_processo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número do Processo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="0000000-00.0000.0.00.0000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vara"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vara</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="1ª Vara Criminal" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Data e Horário */}
            <Card>
              <CardHeader>
                <CardTitle>Data e Horário da Audiência</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="data_audiencia"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data da Audiência</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, 'PPP', { locale: ptBR })
                              ) : (
                                <span>Selecione a data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < obterDataBrasil()}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horario_audiencia"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário da Audiência</FormLabel>
                      <FormControl>
                        <Input {...field} type="time" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Seleção de Usuário */}
            <Card>
              <CardHeader>
                <CardTitle>Seleção de Usuário</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="user_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Usuário</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um usuário" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.full_name} ({user.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Campo para marcar se é presencial */}
                <FormField
                  control={form.control}
                  name="eh_presencial"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 mt-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Audiência Presencial
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Marque esta opção se a audiência será presencial (não por videoconferência)
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {/* Campo de videoconferência - só aparece se não for presencial */}
                {!form.watch('eh_presencial') && (
                  <FormField
                    control={form.control}
                    name="link_videoconferencia"
                    render={({ field }) => (
                      <FormItem className="mt-4">
                        <FormLabel>Link para Videoconferência (Opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="https://meet.google.com/..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>

            {/* Upload do Arquivo */}
            <Card>
              <CardHeader>
                <CardTitle>Anexar Ofício (PDF)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                  >
                    <Upload className="h-4 w-4" />
                    Clique para enviar o arquivo PDF
                  </label>
                  <p className="text-sm text-muted-foreground mt-2">
                    PDF (MAX. 10MB)
                  </p>
                  
                  {selectedFile && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-success">
                      <CheckCircle className="h-4 w-4" />
                      Arquivo selecionado: {selectedFile.name}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Botões */}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={criarAudiencia.isPending || isUploading || !selectedFile}
              >
                {criarAudiencia.isPending || isUploading ? (
                  'Criando...'
                ) : (
                  'Criar Ofício'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};