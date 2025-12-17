import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge'; // ✅ ADICIONADO AQUI
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { 
  Video, 
  Calendar, 
  Clock, 
  Link as LinkIcon, 
  Trash2, 
  Plus, 
  Loader2, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AulasAoVivoProfessorProps {
  disciplina: {
    id: string;
    nome: string;
    cor?: string;
  };
  serie: any; // Pode ser string ("6º ano") ou objeto
}

interface AulaAoVivo {
  id: string;
  titulo: string;
  data_hora: string;
  plataforma: string;
  link: string;
  status: string;
  serie_id: string;
}

export function AulasAoVivoProfessor({ disciplina, serie }: AulasAoVivoProfessorProps) {
  const { usuario } = useAuth();

  // Estados
  const [aulas, setAulas] = useState<AulaAoVivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Estado para o ID resolvido (UUID)
  const [serieIdResolvido, setSerieIdResolvido] = useState<string | null>(null);

  // Form State
  const [novaAula, setNovaAula] = useState({
    titulo: '',
    data: '',
    hora: '',
    plataforma: 'Google Meet',
    link: ''
  });

  // Helpers
  const serieNome = typeof serie === 'string' ? serie : serie?.nome;
  const serieIdProp = typeof serie === 'object' ? serie?.id : null;

  // =========================================================
  // 1. RESOLVER O ID DA SÉRIE/TURMA
  // =========================================================
  useEffect(() => {
    const resolverSerieId = async () => {
      if (serieIdProp) {
        setSerieIdResolvido(serieIdProp);
        return;
      }

      if (serieNome) {
        try {
          const { data } = await supabase
            .from('turmas')
            .select('id')
            .ilike('nome', `%${serieNome}%`)
            .limit(1)
            .maybeSingle();

          if (data) {
            console.log("ID da série resolvido:", data.id);
            setSerieIdResolvido(data.id);
          } else {
            console.error("Não foi possível encontrar o ID para a série:", serieNome);
            toast.error(`Não foi possível identificar o ID da turma "${serieNome}".`);
            setLoading(false);
          }
        } catch (error) {
          console.error("Erro ao buscar ID da turma:", error);
        }
      }
    };

    resolverSerieId();
  }, [serieIdProp, serieNome]);

  // =========================================================
  // 2. CARREGAR AULAS
  // =========================================================
  const carregarAulas = useCallback(async () => {
    if (!usuario?.id || !disciplina?.id || !serieIdResolvido) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aulas_ao_vivo')
        .select('*')
        .eq('disciplina_id', disciplina.id)
        .eq('serie_id', serieIdResolvido)
        .order('data_hora', { ascending: true });

      if (error) throw error;

      setAulas(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar aulas:', error);
      toast.error('Erro ao carregar aulas.');
    } finally {
      setLoading(false);
    }
  }, [usuario?.id, disciplina?.id, serieIdResolvido]);

  useEffect(() => {
    if (serieIdResolvido) {
      carregarAulas();
    }
  }, [serieIdResolvido, carregarAulas]);

  // =========================================================
  // 3. SALVAR NOVA AULA
  // =========================================================
  const handleSalvar = async () => {
    if (!novaAula.titulo || !novaAula.data || !novaAula.hora || !novaAula.link) {
      toast.warning("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!serieIdResolvido) {
      toast.error("Erro: ID da série não identificado.");
      return;
    }

    setSalvando(true);
    try {
      const dataHoraISO = `${novaAula.data}T${novaAula.hora}:00`;

      const { error } = await supabase
        .from('aulas_ao_vivo')
        .insert({
          titulo: novaAula.titulo,
          data_hora: dataHoraISO,
          plataforma: novaAula.plataforma,
          link: novaAula.link,
          disciplina_id: disciplina.id,
          professor_id: usuario?.id,
          serie_id: serieIdResolvido,
          status: 'agendada',
          criado_em: new Date().toISOString()
        });

      if (error) throw error;

      toast.success("Aula agendada com sucesso!");
      setModalAberto(false);
      setNovaAula({ titulo: '', data: '', hora: '', plataforma: 'Google Meet', link: '' });
      carregarAulas();

    } catch (error: any) {
      console.error(error);
      toast.error("Erro ao agendar aula: " + error.message);
    } finally {
      setSalvando(false);
    }
  };

  // =========================================================
  // 4. EXCLUIR AULA
  // =========================================================
  const handleExcluir = async (id: string) => {
    if (!confirm("Tem certeza que deseja cancelar esta aula?")) return;

    try {
      const { error } = await supabase
        .from('aulas_ao_vivo')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success("Aula cancelada.");
      setAulas(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      toast.error("Erro ao excluir aula.");
    }
  };

  const formatarDataExibicao = (isoString: string) => {
    try {
      return format(new Date(isoString), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6 p-1">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-600" />
            Aulas ao Vivo
          </h2>
          <p className="text-sm text-gray-500">
            Gerencie as videoconferências para {serieNome}
          </p>
        </div>

        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Agendar Aula
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Nova Aula</DialogTitle>
              <DialogDescription>
                Preencha os dados abaixo para criar uma nova sala de aula virtual.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Título da Aula</Label>
                <Input 
                  placeholder="Ex: Revisão de Matemática" 
                  value={novaAula.titulo}
                  onChange={e => setNovaAula({...novaAula, titulo: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input 
                    type="date" 
                    value={novaAula.data}
                    onChange={e => setNovaAula({...novaAula, data: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input 
                    type="time" 
                    value={novaAula.hora}
                    onChange={e => setNovaAula({...novaAula, hora: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <Select 
                  value={novaAula.plataforma} 
                  onValueChange={val => setNovaAula({...novaAula, plataforma: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Google Meet">Google Meet</SelectItem>
                    <SelectItem value="Zoom">Zoom</SelectItem>
                    <SelectItem value="Microsoft Teams">Microsoft Teams</SelectItem>
                    <SelectItem value="YouTube">YouTube</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Link da Reunião</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <Input 
                    className="pl-9" 
                    placeholder="https://meet.google.com/..." 
                    value={novaAula.link}
                    onChange={e => setNovaAula({...novaAula, link: e.target.value})}
                  />
                </div>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 mt-4" 
                onClick={handleSalvar}
                disabled={salvando}
              >
                {salvando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Confirmar Agendamento"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : !serieIdResolvido ? (
        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-100">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-600 font-medium">Não foi possível identificar a turma no sistema.</p>
        </div>
      ) : aulas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <Video className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Nenhuma aula agendada.</p>
          <p className="text-sm text-gray-400">Agende aulas ao vivo para interagir com seus alunos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aulas.map((aula) => (
            <Card key={aula.id} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{aula.titulo}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <Calendar className="w-4 h-4" />
                      {formatarDataExibicao(aula.data_hora)}
                    </div>
                  </div>
                  {/* ✅ O Badge agora funcionará corretamente */}
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    {aula.plataforma}
                  </Badge>
                </div>

                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  <a 
                    href={aula.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="outline" className="w-full text-blue-600 hover:bg-blue-50 border-blue-200">
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Acessar Aula
                    </Button>
                  </a>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-red-500 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleExcluir(aula.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
