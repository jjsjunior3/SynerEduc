import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Video, Calendar, Clock, Plus, Trash2, ExternalLink, Link as LinkIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from './ui/badge';

interface AulasAoVivoProfessorProps {
  disciplina: { id: string; nome: string };
  serie: { id: string; nome: string };
}

interface AulaAoVivo {
  id: string;
  titulo: string;
  data_hora: string;
  duracao: number;
  plataforma: 'google-meet' | 'zoom' | 'youtube' | 'outro';
  link: string;
  status: string;
}

export function AulasAoVivoProfessor({ disciplina, serie }: AulasAoVivoProfessorProps) {
  const { usuario } = useAuth();
  const [aulas, setAulas] = useState<AulaAoVivo[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalAberto, setModalAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Estado do formulário
  const [novaAula, setNovaAula] = useState({
    titulo: '',
    data: '',
    hora: '',
    duracao: '60',
    plataforma: 'google-meet',
    link: ''
  });

  // ✅ CORREÇÃO: Regex em uma única linha para evitar o erro de sintaxe
  const serieIdPuro = typeof serie.id === 'string' ? serie.id.replace(/serie_/, '') : serie.id;

  // ========================================
  // CARREGAR AULAS
  // ========================================
  const carregarAulas = useCallback(async () => {
    if (!disciplina.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('aulas_ao_vivo')
        .select('*')
        .eq('disciplina_id', disciplina.id)
        .eq('serie_id', serieIdPuro)
        .order('data_hora', { ascending: true });

      if (error) throw error;

      setAulas(data || []);
    } catch (error) {
      console.error('Erro ao carregar aulas:', error);
      toast.error('Erro ao carregar aulas.');
    } finally {
      setLoading(false);
    }
  }, [disciplina.id, serieIdPuro]);

  useEffect(() => {
    carregarAulas();
  }, [carregarAulas]);

  // ========================================
  // CRIAR AULA
  // ========================================
  const handleCriarAula = async () => {
    if (!novaAula.titulo || !novaAula.data || !novaAula.hora || !novaAula.link) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }

    setSalvando(true);
    try {
      const dataInicioISO = new Date(`${novaAula.data}T${novaAula.hora}:00`).toISOString();

      const { error } = await supabase
        .from('aulas_ao_vivo')
        .insert({
          titulo: novaAula.titulo,
          data_hora: dataInicioISO,
          duracao: parseInt(novaAula.duracao),
          plataforma: novaAula.plataforma,
          link: novaAula.link,
          disciplina_id: disciplina.id,
          serie_id: serieIdPuro,
          professor_id: usuario?.id,
          status: 'agendada'
        });

      if (error) throw error;

      toast.success('Aula agendada com sucesso!');
      setModalAberto(false);
      setNovaAula({ titulo: '', data: '', hora: '', duracao: '60', plataforma: 'google-meet', link: '' });
      carregarAulas();
    } catch (error) {
      console.error('Erro ao criar aula:', error);
      toast.error('Erro ao agendar aula.');
    } finally {
      setSalvando(false);
    }
  };

  // ========================================
  // EXCLUIR AULA
  // ========================================
  const handleExcluirAula = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta aula?')) return;

    try {
      const { error } = await supabase
        .from('aulas_ao_vivo')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Aula cancelada.');
      carregarAulas();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao cancelar aula.');
    }
  };

  // ========================================
  // HELPERS
  // ========================================
  const formatarDataHora = (isoString: string) => {
    if (!isoString) return { dia: '--', hora: '--', passou: false };
    const data = new Date(isoString);
    return {
      dia: data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }),
      hora: data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      passou: new Date() > data
    };
  };

  const getPlataformaIcon = (plataforma: string) => {
    switch (plataforma) {
      case 'google-meet': return <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-white text-xs font-bold">M</div>;
      case 'zoom': return <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white text-xs font-bold">Z</div>;
      case 'youtube': return <div className="w-6 h-6 bg-red-600 rounded flex items-center justify-center text-white text-xs font-bold">Y</div>;
      default: return <Video className="w-6 h-6 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Aulas ao Vivo</h2>
          <p className="text-sm text-gray-500">Gerencie as videoconferências para {disciplina.nome}</p>
        </div>

        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agendar Aula
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Nova Aula</DialogTitle>
              <DialogDescription>Preencha os dados da videoconferência.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Título da Aula</Label>
                <Input 
                  placeholder="Ex: Revisão para a Prova" 
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
                  <Label>Hora</Label>
                  <Input 
                    type="time" 
                    value={novaAula.hora}
                    onChange={e => setNovaAula({...novaAula, hora: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Duração (min)</Label>
                  <Input 
                    type="number" 
                    value={novaAula.duracao}
                    onChange={e => setNovaAula({...novaAula, duracao: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Plataforma</Label>
                  <Select 
                    value={novaAula.plataforma} 
                    onValueChange={val => setNovaAula({...novaAula, plataforma: val as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="google-meet">Google Meet</SelectItem>
                      <SelectItem value="zoom">Zoom</SelectItem>
                      <SelectItem value="youtube">YouTube Live</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setModalAberto(false)}>Cancelar</Button>
                <Button onClick={handleCriarAula} disabled={salvando}>
                  {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Agendar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : aulas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Video className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">Nenhuma aula agendada</h3>
            <p className="text-gray-600 mb-4">
              Agende aulas ao vivo para interagir com seus alunos em tempo real.
            </p>
            <Button onClick={() => setModalAberto(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Agendar Primeira Aula
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {aulas.map((aula) => {
            const { dia, hora, passou } = formatarDataHora(aula.data_hora);
            return (
              <Card key={aula.id} className={`border-l-4 ${passou ? 'border-l-gray-300 opacity-75' : 'border-l-green-500'}`}>
                <CardContent className="p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {getPlataformaIcon(aula.plataforma)}
                      <Badge variant={passou ? "secondary" : "default"} className={!passou ? "bg-green-100 text-green-700 hover:bg-green-200" : ""}>
                        {passou ? 'Finalizada' : 'Agendada'}
                      </Badge>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                      onClick={() => handleExcluirAula(aula.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <h3 className="font-bold text-gray-900 mb-1 line-clamp-1" title={aula.titulo}>
                    {aula.titulo}
                  </h3>

                  <div className="space-y-2 text-sm text-gray-600 mt-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>{dia}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{hora} • {aula.duracao} min</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <Button 
                      className="w-full" 
                      variant={passou ? "outline" : "default"}
                      onClick={() => window.open(aula.link, '_blank')}
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      {passou ? 'Acessar Link' : 'Iniciar Aula'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
