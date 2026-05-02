// src/components/CadastrarUsuarioNovo.tsx
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import {
  ArrowLeft, Eye, EyeOff, User, Mail, Lock, Save, Loader2,
  CheckCircle, AlertCircle, UserPlus, Plus, X, BookOpen,
  GraduationCap, UserCheck, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabase/supabaseClient";

interface CadastrarUsuarioNovoProps {
  onVoltar: () => void;
  onUsuarioCriado?: () => void;
}

type SegmentoDisciplina = "Fundamental 1" | "Fundamental 2" | "Ensino Médio";
type SegmentoAVA = "ead" | "presencial";
type Turno = "matutino" | "vespertino" | "noturno";
type Nivel = "fundamental1" | "fundamental2" | "medio";

interface NovoUsuario {
  nome: string; nomeUsuario: string; email: string;
  senha: string; confirmarSenha: string; tipo: string;
  serie?: string; segmento: SegmentoAVA; turno: Turno | ""; nivel: Nivel | "";
  vinculacoesProfessor: VinculacaoProfessor[];
}

interface VinculacaoProfessor {
  id: string; segmento: SegmentoDisciplina;
  disciplinaId: string; disciplinaNome: string; seriesSelecionadas: string[];
}

interface DisciplinaDisponivel {
  id: string; nome: string; segmento: SegmentoDisciplina | null;
}

const seriesPorSegmento: Record<SegmentoDisciplina, string[]> = {
  "Fundamental 1": ["1º ano", "2º ano", "3º ano", "4º ano", "5º ano"],
  "Fundamental 2": ["6º ano", "7º ano", "8º ano", "9º ano"],
  "Ensino Médio": ["1ª série", "2ª série", "3ª série"],
};

const tiposUsuario = [
  { value: "aluno", label: "Aluno" },
  { value: "professor", label: "Professor" },
  { value: "coordenador", label: "Coordenador" },
  { value: "administrador", label: "Administrador" },
  { value: "professor_conteudista", label: "Prof. Conteudista" },
  { value: "gestor_geral", label: "Gestor Geral" },
];

const useSeriesFromSupabase = () => {
  const [series, setSeries] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  useEffect(() => {
    supabase.from("series").select("nome, ativa").order("nome").then(({ data, error }) => {
      if (!error) setSeries((data ?? []).filter((s: any) => s.ativa !== false).map((s: any) => s.nome).filter(Boolean));
      setCarregando(false);
    });
  }, []);
  return { series, carregando };
};

const serieLimpa = (serie?: string) =>
  serie ? serie.replace(/\s*-\s*Fundamental/gi, "").replace(/\s*-\s*Ensino\s+Médio/gi, "").trim() : null;

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{titulo}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      {children}
    </div>
  );
}

function Campo({ label, obrigatorio, children, dica }: {
  label: string; obrigatorio?: boolean; children: React.ReactNode; dica?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">
        {label}{obrigatorio && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
    </div>
  );
}

export function CadastrarUsuarioNovo({ onVoltar, onUsuarioCriado }: CadastrarUsuarioNovoProps) {
  const [dados, setDados] = useState<NovoUsuario>({
    nome: "", nomeUsuario: "", email: "", senha: "", confirmarSenha: "",
    tipo: "", serie: "", segmento: "ead", turno: "", nivel: "", vinculacoesProfessor: [],
  });

  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [usuarioCriado, setUsuarioCriado] = useState<any>(null);
  const [disciplinasDisponiveis, setDisciplinasDisponiveis] = useState<DisciplinaDisponivel[]>([]);
  const [carregandoDisciplinas, setCarregandoDisciplinas] = useState(true);
  const [modalDisciplina, setModalDisciplina] = useState(false);
  const [novaVinculacao, setNovaVinculacao] = useState<{
    segmento: SegmentoDisciplina | ""; disciplinaId: string; seriesSelecionadas: string[];
  }>({ segmento: "", disciplinaId: "", seriesSelecionadas: [] });

  const { series: seriesDisponiveis, carregando: carregandoSeries } = useSeriesFromSupabase();
  const mostrarTurno = dados.segmento === "presencial";
  const mostrarNivel = dados.segmento === "presencial" && dados.tipo === "coordenador";

  useEffect(() => {
    supabase.from("disciplinas").select("id, nome, segmento").order("nome").then(({ data, error }) => {
      if (!error) setDisciplinasDisponiveis((data || []).map((d: any) => ({
        id: d.id, nome: d.nome,
        segmento: ["Fundamental 1", "Fundamental 2", "Ensino Médio"].includes(d.segmento) ? d.segmento : null,
      })));
      setCarregandoDisciplinas(false);
    });
  }, []);

  const disciplinasFiltradas = useMemo(
    () => novaVinculacao.segmento ? disciplinasDisponiveis.filter(d => d.segmento === novaVinculacao.segmento) : [],
    [disciplinasDisponiveis, novaVinculacao.segmento]
  );

  const validarFormulario = () => {
    const erros: string[] = [];
    if (!dados.nome.trim()) erros.push("Nome completo é obrigatório");
    if (!dados.nomeUsuario.trim()) erros.push("Nome de usuário é obrigatório");
    else {
      if (!/^[a-zA-Z0-9.]+$/.test(dados.nomeUsuario)) erros.push("Nome de usuário: apenas letras, números e pontos");
      if (dados.nomeUsuario.length < 3) erros.push("Nome de usuário: mínimo 3 caracteres");
    }
    if (!dados.senha) erros.push("Senha é obrigatória");
    else if (dados.senha.length < 6) erros.push("Senha: mínimo 6 caracteres");
    if (dados.senha !== dados.confirmarSenha) erros.push("Senhas não coincidem");
    if (!dados.tipo) erros.push("Tipo de usuário é obrigatório");
    if (dados.tipo === "aluno" && !dados.serie) erros.push("Série é obrigatória para alunos");
    if (dados.tipo === "professor" && dados.vinculacoesProfessor.length === 0)
      erros.push("Vincule pelo menos uma disciplina ao professor");
    if (dados.segmento === "presencial" && !dados.turno) erros.push("Turno é obrigatório para usuários presenciais");
    return erros;
  };

  const errosValidacao = validarFormulario();
  const formularioValido = errosValidacao.length === 0;

  const gerarNomeUsuario = () => {
    if (dados.nome.trim()) {
      const s = dados.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s]/g, "").split(" ").filter(p => p.length > 0).slice(0, 2).join(".");
      setDados(prev => ({ ...prev, nomeUsuario: s }));
    }
  };

  const adicionarVinculacao = () => {
    if (!novaVinculacao.segmento || !novaVinculacao.disciplinaId) { toast.error("Segmento e disciplina são obrigatórios"); return; }
    if (!novaVinculacao.seriesSelecionadas.length) { toast.error("Selecione pelo menos uma série"); return; }
    if (dados.vinculacoesProfessor.some(v => v.disciplinaId === novaVinculacao.disciplinaId)) { toast.error("Disciplina já adicionada"); return; }
    const disc = disciplinasDisponiveis.find(d => d.id === novaVinculacao.disciplinaId);
    if (!disc) return;
    setDados(prev => ({
      ...prev,
      vinculacoesProfessor: [...prev.vinculacoesProfessor, {
        id: Date.now().toString(), segmento: novaVinculacao.segmento as SegmentoDisciplina,
        disciplinaId: novaVinculacao.disciplinaId, disciplinaNome: disc.nome,
        seriesSelecionadas: [...novaVinculacao.seriesSelecionadas],
      }],
    }));
    setModalDisciplina(false);
    toast.success("Disciplina adicionada!");
  };

  const criarUsuario = async () => {
    if (!formularioValido) { toast.error("Corrija os erros no formulário"); return; }
    setSalvando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão inválida.");
      const nome = dados.nome.trim();
      const nomeUsuario = dados.nomeUsuario.trim().toLowerCase();
      const emailFinal = dados.email.trim() || `${nomeUsuario}@escola.local`;
      const payload = {
        action: "create", nome, email: emailFinal, senha: dados.senha, tipo: dados.tipo,
        serie: dados.tipo === "aluno" ? serieLimpa(dados.serie) : null,
        segmento: dados.segmento,
        turno: mostrarTurno ? dados.turno || null : null,
        nivel: mostrarNivel ? dados.nivel || null : null,
        vinculacoesProfessor: ["professor", "professor_conteudista"].includes(dados.tipo) ? dados.vinculacoesProfessor : [],
      };
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-users`,
        { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify(payload) }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro ao criar usuário");
      setUsuarioCriado({ nome, nomeUsuario, email: emailFinal, senhaTemporaria: dados.senha });
      setModalConfirmacao(true);
      toast.success("Usuário criado com sucesso!");
      onUsuarioCriado?.();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    } finally { setSalvando(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-6 py-4">
        <div className="flex items-center gap-4 max-w-4xl mx-auto">
          <Button variant="ghost" size="sm" onClick={onVoltar} className="gap-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Cadastrar Novo Usuário</h1>
            <p className="text-xs text-muted-foreground">Sistema de cadastro unificado por tipo de usuário</p>
          </div>
        </div>
      </div>

      <div className="p-6 max-w-4xl mx-auto space-y-6 pb-16">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <UserPlus className="w-5 h-5 text-primary" /> Dados do Novo Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">

            {/* Identificação */}
            <Secao titulo="Identificação">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Campo label="Nome Completo" obrigatorio>
                  <Input value={dados.nome} placeholder="Nome completo"
                    onChange={e => setDados(p => ({ ...p, nome: e.target.value }))} onBlur={gerarNomeUsuario}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
                </Campo>
                <Campo label="Nome de Usuário" obrigatorio dica="Apenas letras, números e pontos. Usado para login.">
                  <div className="flex gap-2">
                    <Input value={dados.nomeUsuario} placeholder="usuario.login"
                      onChange={e => setDados(p => ({ ...p, nomeUsuario: e.target.value.toLowerCase() }))}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
                    <Button type="button" variant="outline" size="sm" onClick={gerarNomeUsuario} title="Gerar automaticamente">
                      <Wand2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Campo>
              </div>
              <Campo label="Usuário" dica={`Se não informado: ${dados.nomeUsuario || "usuario"}@escola.local`}>
                <Input type="email" value={dados.email} placeholder="email@exemplo.com (opcional)"
                  onChange={e => setDados(p => ({ ...p, email: e.target.value }))}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground" />
              </Campo>
            </Secao>

            {/* Credenciais */}
            <Secao titulo="Credenciais de Acesso">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Campo label="Senha" obrigatorio>
                  <div className="relative">
                    <Input type={mostrarSenha ? "text" : "password"} value={dados.senha} placeholder="Mínimo 6 caracteres"
                      onChange={e => setDados(p => ({ ...p, senha: e.target.value }))}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground pr-10" />
                    <Button type="button" variant="ghost" size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setMostrarSenha(!mostrarSenha)}>
                      {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </Campo>
                <Campo label="Confirmar Senha" obrigatorio>
                  <div className="relative">
                    <Input type={mostrarConfirmacao ? "text" : "password"} value={dados.confirmarSenha}
                      placeholder="Digite a senha novamente"
                      onChange={e => setDados(p => ({ ...p, confirmarSenha: e.target.value }))}
                      className="bg-background border-border text-foreground placeholder:text-muted-foreground pr-10" />
                    <Button type="button" variant="ghost" size="sm"
                      className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground"
                      onClick={() => setMostrarConfirmacao(!mostrarConfirmacao)}>
                      {mostrarConfirmacao ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {dados.confirmarSenha && dados.senha !== dados.confirmarSenha && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="w-3 h-3" /> Senhas não coincidem
                    </p>
                  )}
                  {dados.confirmarSenha && dados.senha === dados.confirmarSenha && dados.senha.length >= 6 && (
                    <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                      <CheckCircle className="w-3 h-3" /> Senhas coincidem
                    </p>
                  )}
                </Campo>
              </div>
            </Secao>

            {/* Perfil */}
            <Secao titulo="Perfil do Usuário">
              <Campo label="Tipo de Usuário" obrigatorio>
                <Select value={dados.tipo}
                  onValueChange={v => setDados(p => ({ ...p, tipo: v, vinculacoesProfessor: [], serie: "", nivel: "" }))}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposUsuario.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Campo>

              {dados.tipo && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Campo label="Segmento" obrigatorio>
                    <Select value={dados.segmento}
                      onValueChange={(v: SegmentoAVA) => setDados(p => ({ ...p, segmento: v, turno: "", nivel: "" }))}>
                      <SelectTrigger className="bg-background border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ead">EAD</SelectItem>
                        <SelectItem value="presencial">Presencial</SelectItem>
                      </SelectContent>
                    </Select>
                  </Campo>

                  {mostrarTurno && (
                    <Campo label="Turno" obrigatorio>
                      <Select value={dados.turno} onValueChange={(v: Turno) => setDados(p => ({ ...p, turno: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="matutino">Matutino</SelectItem>
                          <SelectItem value="vespertino">Vespertino</SelectItem>
                          <SelectItem value="noturno">Noturno</SelectItem>
                        </SelectContent>
                      </Select>
                    </Campo>
                  )}

                  {mostrarNivel && (
                    <Campo label="Nível de Ensino">
                      <Select value={dados.nivel} onValueChange={(v: Nivel) => setDados(p => ({ ...p, nivel: v }))}>
                        <SelectTrigger className="bg-background border-border text-foreground">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fundamental1">Fundamental 1</SelectItem>
                          <SelectItem value="fundamental2">Fundamental 2</SelectItem>
                          <SelectItem value="medio">Ensino Médio</SelectItem>
                        </SelectContent>
                      </Select>
                    </Campo>
                  )}
                </div>
              )}

              {/* Série — aluno */}
              {dados.tipo === "aluno" && (
                <Campo label="Série" obrigatorio>
                  <Select value={dados.serie} disabled={carregandoSeries}
                    onValueChange={v => setDados(p => ({ ...p, serie: v }))}>
                    <SelectTrigger className="bg-background border-border text-foreground">
                      <SelectValue placeholder={carregandoSeries ? "Carregando..." : "Selecione a série"} />
                    </SelectTrigger>
                    <SelectContent>
                      {seriesDisponiveis.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Campo>
              )}

              {/* Vinculação — professor */}
              {dados.tipo === "professor" && (
                <div className="rounded-xl border border-border bg-muted/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <UserCheck className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Vinculação de Disciplinas</p>
                        <p className="text-xs text-muted-foreground">
                          {dados.vinculacoesProfessor.length} disciplina(s) vinculada(s)
                        </p>
                      </div>
                    </div>
                    <Button onClick={() => { setNovaVinculacao({ segmento: "", disciplinaId: "", seriesSelecionadas: [] }); setModalDisciplina(true); }}
                      disabled={carregandoDisciplinas} size="sm" variant="outline" className="gap-2">
                      <Plus className="w-4 h-4" /> Adicionar
                    </Button>
                  </div>

                  {dados.vinculacoesProfessor.map(v => (
                    <div key={v.id} className="flex items-start justify-between bg-background rounded-lg border border-border p-4">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-foreground">{v.disciplinaNome}</span>
                          <Badge variant="secondary" className="text-xs">{v.segmento}</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <GraduationCap className="w-3.5 h-3.5" />
                          {v.seriesSelecionadas.join(", ")}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm"
                        onClick={() => setDados(p => ({ ...p, vinculacoesProfessor: p.vinculacoesProfessor.filter(x => x.id !== v.id) }))}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Secao>

            {/* Erros */}
            {errosValidacao.length > 0 && dados.tipo && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Corrija antes de continuar:
                </p>
                <ul className="space-y-1">
                  {errosValidacao.map((erro, i) => (
                    <li key={i} className="text-xs text-destructive/80 flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-destructive/60 flex-shrink-0" />
                      {erro}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Botões */}
            <div className="flex justify-between pt-2 border-t border-border">
              <Button variant="outline" onClick={onVoltar}>Cancelar</Button>
              <Button onClick={criarUsuario} disabled={!formularioValido || salvando} className="min-w-36 gap-2">
                {salvando ? <><Loader2 className="w-4 h-4 animate-spin" />Criando...</> : <><Save className="w-4 h-4" />Criar Usuário</>}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal disciplina */}
      <Dialog open={modalDisciplina} onOpenChange={setModalDisciplina}>
        <DialogContent className="max-w-lg bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Adicionar Disciplina</DialogTitle>
            <DialogDescription className="text-muted-foreground">Segmento → Disciplina → Séries</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <Campo label="1. Segmento" obrigatorio>
              <Select value={novaVinculacao.segmento}
                onValueChange={(v: SegmentoDisciplina) => setNovaVinculacao({ segmento: v, disciplinaId: "", seriesSelecionadas: [] })}>
                <SelectTrigger className="bg-background border-border text-foreground">
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fundamental 1">Ensino Fundamental 1</SelectItem>
                  <SelectItem value="Fundamental 2">Ensino Fundamental 2</SelectItem>
                  <SelectItem value="Ensino Médio">Ensino Médio</SelectItem>
                </SelectContent>
              </Select>
            </Campo>

            {novaVinculacao.segmento && (
              <Campo label="2. Disciplina" obrigatorio>
                <Select value={novaVinculacao.disciplinaId}
                  onValueChange={v => setNovaVinculacao(p => ({ ...p, disciplinaId: v, seriesSelecionadas: [] }))}>
                  <SelectTrigger className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione a disciplina" />
                  </SelectTrigger>
                  <SelectContent>
                    {disciplinasFiltradas.map(d => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Campo>
            )}

            {novaVinculacao.segmento && novaVinculacao.disciplinaId && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">
                  3. Séries <span className="text-destructive">*</span>
                </Label>
                <div className="max-h-44 overflow-y-auto border border-border rounded-lg p-3 bg-muted/20 space-y-2">
                  {(seriesPorSegmento[novaVinculacao.segmento] || []).map(serie => (
                    <label key={serie} className="flex items-center gap-3 cursor-pointer group">
                      <input type="checkbox"
                        checked={novaVinculacao.seriesSelecionadas.includes(serie)}
                        onChange={e => setNovaVinculacao(p => ({
                          ...p, seriesSelecionadas: e.target.checked
                            ? [...p.seriesSelecionadas, serie]
                            : p.seriesSelecionadas.filter(s => s !== serie)
                        }))}
                        className="rounded accent-primary" />
                      <span className="text-sm text-foreground">{serie}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalDisciplina(false)}>Cancelar</Button>
            <Button onClick={adicionarVinculacao}
              disabled={!novaVinculacao.segmento || !novaVinculacao.disciplinaId || !novaVinculacao.seriesSelecionadas.length}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal confirmação */}
      <Dialog open={modalConfirmacao} onOpenChange={setModalConfirmacao}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle className="w-5 h-5" /> Usuário Criado com Sucesso!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              O usuário foi cadastrado e já pode fazer login.
            </DialogDescription>
          </DialogHeader>
          {usuarioCriado && (
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
              {[
                { icon: User, label: "Nome", value: usuarioCriado.nome },
                { icon: Mail, label: "Email/Login", value: usuarioCriado.email },
                { icon: Lock, label: "Senha", value: usuarioCriado.senhaTemporaria },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{label}:</span>
                  <span className="text-sm font-mono font-medium text-foreground bg-background px-2 py-0.5 rounded border border-border">
                    {value}
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground">Anote e repasse essas credenciais ao usuário.</p>
          <DialogFooter>
            <Button onClick={() => { setModalConfirmacao(false); onVoltar(); }} className="w-full">
              Entendi, fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}