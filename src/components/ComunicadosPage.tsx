// src/components/ComunicadosPage.tsx
/**
 * ComunicadosPage - Para Alunos e Professores
 * Exibe comunicados gerais da escola, filtrados por destinatário.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { ArrowLeft, MessageSquare, Calendar, User, Loader2, Eye, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext'; // Importar useAuth

interface Comunicado {
  id: string;
  titulo: string;
  conteudo: string;
  autorNome: string;
  dataPublicacao: string;
  tipo: 'geral' | 'urgente' | 'aviso' | 'evento'; // Mapeado de 'importante'
  destinatariosDisplay: string[]; // Nomes legíveis dos destinatários
  publico_alvo_raw: string; // A string original do Supabase (ex: "todos-alunos,serie-1serie")
}

interface ComunicadosPageProps {
  onVoltar: () => void;
}

// ✅ CORRIGIDO: export default function
export default function ComunicadosPage({ onVoltar }: ComunicadosPageProps) {
  const [comunicados, setComunicados] = useState<Comunicado[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [gruposDestinoMap, setGruposDestinoMap] = useState<Map<string, string>>(new Map());
  const { usuario } = useAuth();

  // ========================================
  // 1️⃣ CARREGAR FILTROS INICIAIS (SÉRIES E TIPOS DE USUÁRIO)
  // ========================================
  useEffect(() => {
    const carregarGruposDestino = async () => {
      const map = new Map<string, string>();
      map.set('todos-alunos', 'Todos os Alunos');
      map.set('todos-professores', 'Todos os Professores');
      map.set('todos-responsaveis', 'Todos os Responsáveis');

      // Buscar séries únicas
      const { data: seriesData, error: seriesError } = await supabase
        .from('users')
        .select('serie')
        .eq('tipo', 'aluno')
        .not('serie', 'is', null)
        .order('serie', { ascending: true });

      if (seriesError) {
        console.error('Erro ao carregar séries para destinatários:', seriesError);
      } else if (seriesData) {
        const seriesUnicas = Array.from(new Set(seriesData.map(s => s.serie)));
        seriesUnicas.forEach(serie => {
          if (serie) {
            map.set(`serie-${serie.toLowerCase().replace(/\s/g, '')}`, `${serie}`);
          }
        });
      }
      setGruposDestinoMap(map);
    };

    carregarGruposDestino();
  }, []);

  // ========================================
  // 2️⃣ CARREGAR COMUNICADOS
  // ========================================
  useEffect(() => {
    if (gruposDestinoMap.size > 0) { // Só carrega comunicados depois que o mapa de grupos está pronto
      carregarComunicados();
    }
  }, [usuario?.id, gruposDestinoMap]); // Depende do usuário e do mapa de grupos

  const carregarComunicados = async () => {
    if (!usuario?.id || gruposDestinoMap.size === 0) return;

    try {
      setLoading(true);
      setErro(null);

      const { data, error } = await supabase
        .from('comunicados')
        .select(`
          id,
          titulo,
          conteudo,
          autor_id,
          publico_alvo,
          importante,
          criado_em,
          autor:users!comunicados_autor_id_fkey(nome)
        `)
        .order('criado_em', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const comunicadosFiltrados: Comunicado[] = [];

      data.forEach((c: any) => {
        const publicoAlvoArray = c.publico_alvo.split(',');
        let isDestinatario = false;

        // Lógica de filtragem
        if (usuario.tipo === 'administrador' || usuario.tipo === 'coordenador') {
          isDestinatario = true; // Admins e Coordenadores veem todos
        } else if (usuario.tipo === 'aluno') {
          if (publicoAlvoArray.includes('todos-alunos')) {
            isDestinatario = true;
          }
          if (usuario.serie && publicoAlvoArray.includes(`serie-${usuario.serie.toLowerCase().replace(/\s/g, '')}`)) {
            isDestinatario = true;
          }
        } else if (usuario.tipo === 'professor') {
          if (publicoAlvoArray.includes('todos-professores')) {
            isDestinatario = true;
          }
        } else if (usuario.tipo === 'responsavel') {
          if (publicoAlvoArray.includes('todos-responsaveis')) {
            isDestinatario = true;
          }
        }

        if (isDestinatario) {
          const destinatariosDisplay = publicoAlvoArray
            .map((alvo: string) => gruposDestinoMap.get(alvo))
            .filter(Boolean) as string[]; // Filtra undefined e garante que é string[]

          comunicadosFiltrados.push({
            id: c.id,
            titulo: c.titulo,
            conteudo: c.conteudo,
            autorNome: c.autor?.nome || 'Desconhecido',
            dataPublicacao: c.criado_em,
            tipo: c.importante ? 'urgente' : 'geral', // Mapeia 'importante' para 'tipo'
            destinatariosDisplay: destinatariosDisplay,
            publico_alvo_raw: c.publico_alvo,
          });
        }
      });
      setComunicados(comunicadosFiltrados);
    } catch (error: any) {
      console.error('Erro ao carregar comunicados:', error);
      setErro(error.message || 'Erro ao carregar comunicados.');
    } finally {
      setLoading(false);
    }
  };

  // ========================================
  // 3️⃣ FUNÇÕES AUXILIARES (CORES/LABELS)
  // ========================================
  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'urgente': return 'bg-red-100 text-red-800';
      case 'evento': return 'bg-purple-100 text-purple-800';
      case 'aviso': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800'; // 'geral'
    }
  };
  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case 'urgente': return 'Urgente';
      case 'evento': return 'Evento';
      case 'aviso': return 'Aviso';
      default: return 'Geral';
    }
  };
  const formatarData = (data: string) => {
    return new Date(data).toLocaleString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  // ========================================
  // 4️⃣ RENDERIZAÇÃO
  // ========================================
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onVoltar}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Comunicados
            </h1>
            <p className="text-sm text-gray-600">
              Comunicados e avisos importantes da escola
            </p>
          </div>
        </div>
      </div>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Carregando comunicados...</span>
            </div>
          ) : erro ? (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-1" />
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Erro ao carregar comunicados</h3>
                  <p className="text-sm text-red-700 mb-3">{erro}</p>
                  <Button variant="outline" size="sm" onClick={carregarComunicados}>
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : comunicados.length === 0 ? (
            <Card className="p-12 text-center">
              <CardContent>
                <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum comunicado disponível
                </h3>
                <p className="text-gray-600">
                  Quando houver novos comunicados, eles aparecerão aqui.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {comunicados.map((comunicado) => (
                <Card key={comunicado.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-lg">{comunicado.titulo}</CardTitle>
                          <Badge className={getTipoColor(comunicado.tipo)}>
                            {getTipoLabel(comunicado.tipo)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span>{comunicado.autorNome}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatarData(comunicado.dataPublicacao)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {comunicado.conteudo}
                      </p>
                    </div>
                    {comunicado.destinatariosDisplay && comunicado.destinatariosDisplay.length > 0 && (
                      <>
                        <Separator className="my-4" />
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Destinatários:</span>
                          <div className="flex gap-1">
                            {comunicado.destinatariosDisplay.map((dest, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {dest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
