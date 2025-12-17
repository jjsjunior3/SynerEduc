// src/components/AgendaAluno.tsx
/**
 * Agenda do Aluno
 * Exibe eventos e compromissos criados pelos professores da turma do aluno,
 * filtrados por disciplina e data.
 *
 * O contexto de disciplina, série e turma é recebido via props do DisciplinaPage.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { ArrowLeft, Loader2, AlertCircle, Calendar as CalendarIcon, Clock, BookOpen, Users } from 'lucide-react';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner';

interface DisciplinaProps {
  id: string; // UUID da disciplina
  nome: string;
  cor?: string;
}

interface SerieProps {
  id: string; // ID real da série (UUID)
  nome: string; // Nome da série (ex: "7º ano")
}

interface TurmaProps {
  id: string; // ID da turma (UUID)
  nome: string; // Nome da turma (string)
}

interface EventoAgenda {
  id: string;
  titulo: string;
  descricao: string | null;
  data_entrega: string; // Coluna no DB é 'data_entrega'
  tipo: string; // Ex: 'atividade', 'reuniao', 'prova'
  disciplina_id: string;
  professor_id: string;
  serie: string; // Nome da série
  turma: string; // Nome da turma
  criado_em: string;
  professor?: { nome: string }; // Para exibir o nome do professor
  disciplina?: { nome: string }; // Para exibir o nome da disciplina
}

interface AgendaAlunoProps {
  onVoltar: () => void;
  disciplina: DisciplinaProps | null;
  serie: SerieProps | null;
  turma: TurmaProps | null;
}

export function AgendaAluno({ onVoltar, disciplina, serie, turma }: AgendaAlunoProps) {
  const { usuario } = useAuth();
  // const { theme } = useTheme(); // REMOVA ESTA LINHA
  // ... (restante do código)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900"> {/* REMOVIDO dark: classes */}
      {/* HEADER PADRÃO COM BOTÃO VOLTAR E INFORMAÇÕES DA DISCIPLINA/TURMA */}
      <div className="bg-white border-b px-6 py-4"> {/* REMOVIDO dark: classes */}
        {/* ... (restante do header) */}
        <Input
          id="select-data"
          type="date"
          value={dataFiltro}
          onChange={(e) => setDataFiltro(e.target.value)}
          className="w-full bg-white text-gray-900 border" // REMOVIDO dark: classes
        />
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" /> {/* REMOVIDO dark: classes */}
              <span className="ml-2 text-gray-600">Carregando eventos da agenda...</span> {/* REMOVIDO dark: classes */}
            </div>
          ) : erro ? (
            <Card className="border-red-200 bg-red-50"> {/* REMOVIDO dark: classes */}
              <CardContent className="p-6 flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 mt-1" /> {/* REMOVIDO dark: classes */}
                <div>
                  <h3 className="font-semibold text-red-900 mb-1">Erro ao carregar agenda</h3> {/* REMOVIDO dark: classes */}
                  <p className="text-sm text-red-700 mb-3">{erro}</p> {/* REMOVIDO dark: classes */}
                  <Button variant="outline" size="sm" onClick={carregarEventos} className="mt-3">
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : eventos.length === 0 ? (
            <Card className="p-12 text-center bg-white shadow-sm"> {/* REMOVIDO dark: classes */}
              <CardContent>
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" /> {/* REMOVIDO dark: classes */}
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum evento agendado para esta data</h3> {/* REMOVIDO dark: classes */}
                <p className="text-gray-600"> {/* REMOVIDO dark: classes */}
                  Não há eventos registrados pelos professores para este dia.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {eventos.map((evento) => (
                <Card key={evento.id} className="group hover:shadow-md transition-all bg-white border"> {/* REMOVIDO dark: classes */}
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium text-lg text-gray-900">{evento.titulo}</h3> {/* REMOVIDO dark: classes */}
                        <p className="text-sm text-gray-600"> {/* REMOVIDO dark: classes */}
                          {evento.professor?.nome || 'Professor'} • {evento.disciplina?.nome || 'Disciplina'}
                        </p>
                      </div>
                      <Badge className={`${getTipoColor(evento.tipo)} text-gray-900`}> {/* REMOVIDO dark: classes */}
                        {new Date(evento.data_entrega).toLocaleDateString('pt-BR')}
                      </Badge>
                    </div>
                    {evento.descricao && <p className="text-sm text-gray-700 mt-2">{evento.descricao}</p>} {/* REMOVIDO dark: classes */}
                    {evento.data_entrega && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-gray-500"> {/* REMOVIDO dark: classes */}
                        <Clock className="w-3 h-3" />
                        <span>Prazo: {new Date(evento.data_entrega).toLocaleDateString('pt-BR')}</span>
                      </div>
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

  function getTipoColor(tipo: string) {
    switch (tipo) {
      case 'tarefa_casa': return 'bg-green-100 text-green-700'; // REMOVIDO dark: classes
      case 'estudo':      return 'bg-blue-100 text-blue-700'; // REMOVIDO dark: classes
      case 'trabalho':    return 'bg-purple-100 text-purple-700'; // REMOVIDO dark: classes
      case 'prova':       return 'bg-red-100 text-red-700'; // REMOVIDO dark: classes
      case 'projeto':     return 'bg-orange-100 text-orange-700'; // REMOVIDO dark: classes
      default:            return 'bg-gray-100 text-gray-700'; // REMOVIDO dark: classes
    }
  }
}