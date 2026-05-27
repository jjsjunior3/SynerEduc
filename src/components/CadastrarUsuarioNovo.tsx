// src/components/CadastrarUsuarioNovo.tsx
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import {
  ArrowLeft, Eye, EyeOff, User, Mail, Lock, Save, Loader2,
  CheckCircle, AlertCircle, UserPlus, Copy, Check, KeyRound,
  GraduationCap, Users, BookOpen, Baby,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../supabase/supabaseClient";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface CadastrarUsuarioNovoProps {
  onVoltar: () => void;
  onUsuarioCriado?: () => void;
  segmentoForcado?: "ead" | "presencial";
}

type SegmentoAVA = "ead" | "presencial";
type Turno       = "matutino" | "vespertino" | "noturno";
type Nivel       = "fundamental1" | "fundamental2" | "medio";

interface FormDados {
  nome: string;
  nomeUsuario: string;
  loginEditadoManualmente: boolean; // se true, não sobrescreve ao digitar o nome
  emailRecuperacao: string;
  senha: string;
  confirmarSenha: string;
  tipo: string;
  serie: string;
  segmento: SegmentoAVA;
  turno: Turno | "";
  nivel: Nivel | "";
}

// ─── Apenas os 4 tipos permitidos para o admin presencial ─────────────────────
const TIPOS_USUARIO = [
  {
    value: "aluno",
    label: "Aluno",
    descricao: "Acesso ao portal do estudante",
    icon: GraduationCap,
    cor: "text-blue-600 bg-blue-100 dark:bg-blue-900/40 dark:text-blue-300",
  },
  {
    value: "professor",
    label: "Professor",
    descricao: "Notas, frequência e agenda",
    icon: BookOpen,
    cor: "text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300",
  },
  {
    value: "coordenador",
    label: "Coordenador",
    descricao: "Gestão pedagógica da turma",
    icon: Users,
    cor: "text-violet-600 bg-violet-100 dark:bg-violet-900/40 dark:text-violet-300",
  },
  {
    value: "responsavel",
    label: "Responsável",
    descricao: "Acompanhamento do aluno",
    icon: Baby,
    cor: "text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300",
    emDesenvolvimento: true,
  },
];

const DOMINIO_PRESENCIAL = "colegioconexao";
const DOMINIO_EAD        = "conexaoead";

function getDominio(seg: SegmentoAVA) {
  return seg === "presencial" ? DOMINIO_PRESENCIAL : DOMINIO_EAD;
}

// ─── Gera login a partir do nome (nome.sobrenome, sem acentos) ────────────────
function gerarLoginDoNome(nome: string): string {
  const partes = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (partes.length === 0) return "";
  if (partes.length === 1) return partes[0];
  return `${partes[0]}.${partes[partes.length - 1]}`;
}

// ─── Hook: séries do banco filtradas por segmento ─────────────────────────────
function useSeriesDisponiveis(segmento: SegmentoAVA) {
  const [series, setSeries]     = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    setCarregando(true);
    supabase
      .from("series")
      .select("nome, ativa, segmento")
      .eq("segmento", segmento)
      .order("nome")
      .then(({ data, error }) => {
        if (!error)
          setSeries(
            (data ?? [])
              .filter((s: any) => s.ativa !== false)
              .map((s: any) => s.nome)
              .filter(Boolean)
          );
        setCarregando(false);
      });
  }, [segmento]);

  return { series, carregando };
}

// ─── Sub-componentes visuais ──────────────────────────────────────────────────
function Secao({ titulo }: { titulo: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground px-1">
        {titulo}
      </span>
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function Campo({
  label, obrigatorio, dica, erro, children,
}: {
  label: string; obrigatorio?: boolean; dica?: string; erro?: string; children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">
        {label}
        {obrigatorio && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {erro && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {erro}
        </p>
      )}
      {!erro && dica && (
        <p className="text-xs text-muted-foreground">{dica}</p>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export function CadastrarUsuarioNovo({
  onVoltar, onUsuarioCriado, segmentoForcado,
}: CadastrarUsuarioNovoProps) {

  const [dados, setDados] = useState<FormDados>({
    nome: "", nomeUsuario: "", loginEditadoManualmente: false,
    emailRecuperacao: "", senha: "", confirmarSenha: "",
    tipo: "", serie: "", segmento: segmentoForcado ?? "ead",
    turno: "", nivel: "",
  });

  const [mostrarSenha, setMostrarSenha]         = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const [copiado, setCopiado]                   = useState(false);
  const [salvando, setSalvando]                 = useState(false);
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [usuarioCriado, setUsuarioCriado]       = useState<any>(null);

  const { series: seriesDisponiveis, carregando: carregandoSeries } =
    useSeriesDisponiveis(dados.segmento);

  // ─── Login automático ──────────────────────────────────────────────────────
  const handleNomeChange = useCallback((nome: string) => {
    setDados(prev => ({
      ...prev,
      nome,
      // Só atualiza login automático se o usuário não editou manualmente
      nomeUsuario: prev.loginEditadoManualmente
        ? prev.nomeUsuario
        : gerarLoginDoNome(nome),
    }));
  }, []);

  const handleLoginChange = useCallback((valor: string) => {
    const limpo = valor.toLowerCase().replace(/[^a-z0-9.]/g, "");
    setDados(prev => ({ ...prev, nomeUsuario: limpo, loginEditadoManualmente: limpo !== gerarLoginDoNome(prev.nome) }));
  }, []);

  // ─── Valores derivados ─────────────────────────────────────────────────────
  const loginCompleto  = dados.nomeUsuario.trim()
    ? `${dados.nomeUsuario.trim()}@${getDominio(dados.segmento)}`
    : "";

  const tipoSelecionado = TIPOS_USUARIO.find(t => t.value === dados.tipo);

  // Campos condicionais por tipo
  const ehAluno       = dados.tipo === "aluno";
  const ehProfessor   = dados.tipo === "professor";
  const ehCoordenador = dados.tipo === "coordenador";
  const ehResponsavel = dados.tipo === "responsavel";
  const ehPresencial  = dados.segmento === "presencial";

  const mostrarTurno  = ehPresencial && (ehAluno || ehProfessor || ehCoordenador);
  const mostrarNivel  = ehPresencial && ehCoordenador;
  const mostrarSerie  = ehAluno;

  // ─── Validação ─────────────────────────────────────────────────────────────
  const erros: Record<string, string> = {};
  if (dados.nome.trim().length > 0 && dados.nome.trim().split(" ").length < 2)
    erros.nome = "Informe nome e sobrenome";
  if (!dados.nomeUsuario.trim())
    erros.nomeUsuario = "Login é obrigatório";
  else if (dados.nomeUsuario.length < 3)
    erros.nomeUsuario = "Mínimo 3 caracteres";
  if (!dados.senha)
    erros.senha = "Senha é obrigatória";
  else if (dados.senha.length < 6)
    erros.senha = "Mínimo 6 caracteres";
  if (dados.senha && dados.confirmarSenha && dados.senha !== dados.confirmarSenha)
    erros.confirmarSenha = "Senhas não coincidem";
  if (!dados.tipo)
    erros.tipo = "Selecione o tipo de usuário";
  if (mostrarSerie && !dados.serie)
    erros.serie = "Série obrigatória para alunos";
  if (mostrarTurno && !dados.turno)
    erros.turno = "Turno obrigatório";

  const errosLista    = Object.values(erros);
  const formularioOk  = errosLista.length === 0 && !!dados.nome.trim() && !!dados.tipo;

  // ─── Ações ─────────────────────────────────────────────────────────────────
  const copiarLogin = async () => {
    if (!loginCompleto) return;
    await navigator.clipboard.writeText(loginCompleto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const criarUsuario = async () => {
    if (!formularioOk) { toast.error("Corrija os erros antes de continuar"); return; }
    setSalvando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão inválida.");

      const nomeUsuario = dados.nomeUsuario.trim().toLowerCase();
      const emailFinal  = `${nomeUsuario}@${getDominio(dados.segmento)}`;
      const emailRecup  = dados.emailRecuperacao.trim() || null;

      const payload = {
        action:           "create",
        nome:             dados.nome.trim(),
        email:            emailFinal,
        emailRecuperacao: emailRecup,
        senha:            dados.senha,
        tipo:             dados.tipo,
        serie:            ehAluno ? (dados.serie || null) : null,
        segmento:         dados.segmento,
        turno:            mostrarTurno  ? dados.turno || null : null,
        nivel:            mostrarNivel  ? dados.nivel || null : null,
        senha_provisoria: true,
        // Vínculo de disciplinas gerenciado exclusivamente em Gestão de Vínculos
        vinculacoesProfessor: [],
      };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-manage-users`,
        {
          method:  "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization:  `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || result.message || JSON.stringify(result));

      // Salva email de recuperação se informado
      if (emailRecup && result.userId) {
        await supabase
          .from("users")
          .update({ email: emailRecup, senha_provisoria: true })
          .eq("id", result.userId);
      }

      setUsuarioCriado({
        nome:             dados.nome.trim(),
        loginAcesso:      emailFinal,
        emailRecuperacao: emailRecup || "Não informado",
        senhaProvisoria:  dados.senha,
        tipo:             tipoSelecionado?.label ?? dados.tipo,
      });
      setModalConfirmacao(true);
      toast.success("Usuário criado com sucesso!");
      onUsuarioCriado?.();

    } catch (error: any) {
      console.error("[CadastrarUsuarioNovo] Erro:", error);
      toast.error(error.message || "Erro ao criar usuário");
    } finally {
      setSalvando(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 pb-16">

      {/* Header com Voltar */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onVoltar} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <div>
          <h1 className="text-xl font-bold text-foreground">Cadastrar Novo Usuário</h1>
          <p className="text-xs text-muted-foreground">
            Segmento {segmentoForcado ? `fixo: ${segmentoForcado}` : "selecionável"} · Vínculo de disciplinas em Gestão de Vínculos
          </p>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardContent className="p-6 space-y-7">

          {/* ══ SEÇÃO 1: Identificação ══ */}
          <Secao titulo="Identificação" />

          <Campo
            label="Nome Completo"
            obrigatorio
            dica="Informe nome e sobrenome"
            erro={dados.nome.trim().length > 0 ? erros.nome : undefined}
          >
            <Input
              value={dados.nome}
              placeholder="Ex: Maria Silva Santos"
              onChange={e => handleNomeChange(e.target.value)}
              className="bg-background"
            />
          </Campo>

          {/* Login gerado automaticamente */}
          <Campo
            label="Login de acesso"
            obrigatorio
            dica="Gerado automaticamente a partir do nome. Pode editar se necessário."
            erro={dados.nomeUsuario.length > 0 ? erros.nomeUsuario : undefined}
          >
            <div className="flex gap-2">
              <Input
                value={dados.nomeUsuario}
                placeholder="nome.sobrenome"
                onChange={e => handleLoginChange(e.target.value)}
                className="bg-background font-mono"
              />
            </div>

            {/* Preview do login completo */}
            {loginCompleto && (
              <div className="flex items-center gap-2 mt-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                <User className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-xs text-blue-700 dark:text-blue-300 font-mono flex-1 truncate">
                  {loginCompleto}
                </span>
                <button
                  onClick={copiarLogin}
                  className="shrink-0 p-1 rounded text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                  title="Copiar login"
                >
                  {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </Campo>

          {/* Email de recuperação (opcional) */}
          <Campo
            label="Email pessoal para recuperação de senha"
            dica="Gmail, Hotmail, etc. Será usado quando o sistema de recuperação por email estiver ativo. Pode ser adicionado depois."
          >
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={dados.emailRecuperacao}
                placeholder="email.pessoal@gmail.com (opcional)"
                onChange={e => setDados(p => ({ ...p, emailRecuperacao: e.target.value }))}
                className="pl-10 bg-background"
              />
            </div>
          </Campo>

          {/* ══ SEÇÃO 2: Perfil ══ */}
          <Secao titulo="Perfil do Usuário" />

          {/* Seleção de tipo — cards visuais */}
          <Campo label="Tipo de Usuário" obrigatorio>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TIPOS_USUARIO.map(tipo => {
                const Icon = tipo.icon;
                const ativo = dados.tipo === tipo.value;
                return (
                  <button
                    key={tipo.value}
                    onClick={() => setDados(p => ({
                      ...p, tipo: tipo.value, serie: "", nivel: "", turno: "",
                    }))}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-150 text-center ${
                      ativo
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-background hover:border-primary/40 hover:bg-muted/40"
                    }`}
                  >
                    {tipo.emDesenvolvimento && (
                      <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-700 leading-none">
                        EM BREVE
                      </span>
                    )}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tipo.cor}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold leading-tight ${ativo ? "text-foreground" : "text-muted-foreground"}`}>
                        {tipo.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-tight mt-0.5 hidden sm:block">
                        {tipo.descricao}
                      </p>
                    </div>
                    {ativo && (
                      <span className="absolute bottom-1.5 right-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-primary" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </Campo>

          {/* Campos condicionais — aparecem após escolher tipo */}
          {dados.tipo && (
            <div className="space-y-4 pt-1">

              {/* Segmento — travado ou visível como badge */}
              <Campo label="Segmento">
                {segmentoForcado ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border bg-muted text-sm">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700">
                      Presencial
                    </span>
                    <span className="text-xs text-muted-foreground">fixo — não editável</span>
                  </div>
                ) : (
                  <Select
                    value={dados.segmento}
                    onValueChange={(v: SegmentoAVA) => setDados(p => ({ ...p, segmento: v, turno: "", nivel: "", serie: "" }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ead">EAD</SelectItem>
                      <SelectItem value="presencial">Presencial</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </Campo>

              {/* Turno — apenas presencial e não é responsavel */}
              {mostrarTurno && (
                <Campo label="Turno" obrigatorio erro={erros.turno}>
                  <div className="grid grid-cols-3 gap-2">
                    {(["matutino", "vespertino", "noturno"] as Turno[]).map(t => (
                      <button
                        key={t}
                        onClick={() => setDados(p => ({ ...p, turno: t }))}
                        className={`py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all capitalize ${
                          dados.turno === t
                            ? "border-primary bg-primary/5 text-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </Campo>
              )}

              {/* Nível — coordenador presencial */}
              {mostrarNivel && (
                <Campo label="Nível de Ensino">
                  <Select
                    value={dados.nivel}
                    onValueChange={(v: Nivel) => setDados(p => ({ ...p, nivel: v }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fundamental1">Ensino Fundamental I</SelectItem>
                      <SelectItem value="fundamental2">Ensino Fundamental II</SelectItem>
                      <SelectItem value="medio">Ensino Médio</SelectItem>
                    </SelectContent>
                  </Select>
                </Campo>
              )}

              {/* Série — apenas aluno */}
              {mostrarSerie && (
                <Campo label="Série" obrigatorio erro={erros.serie}
                  dica="Séries disponíveis para o segmento presencial cadastradas em Gestão Escolar">
                  <Select
                    value={dados.serie}
                    disabled={carregandoSeries}
                    onValueChange={v => setDados(p => ({ ...p, serie: v }))}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder={carregandoSeries ? "Carregando séries..." : "Selecione a série"} />
                    </SelectTrigger>
                    <SelectContent>
                      {seriesDisponiveis.length === 0 && !carregandoSeries ? (
                        <SelectItem value="_" disabled>
                          Nenhuma série presencial cadastrada
                        </SelectItem>
                      ) : (
                        seriesDisponiveis.map(s => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {dados.serie && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                      <CheckCircle className="w-3 h-3" /> {dados.serie}
                    </p>
                  )}
                </Campo>
              )}

              {/* Aviso para professor: vínculo via módulo dedicado */}
              {ehProfessor && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-sm">
                  <BookOpen className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-300 text-xs">Vínculo de disciplinas</p>
                    <p className="text-blue-700 dark:text-blue-400 text-xs mt-0.5">
                      Após criar o professor, acesse <strong>Gestão de Vínculos</strong> para vinculá-lo às disciplinas e séries que leciona.
                    </p>
                  </div>
                </div>
              )}

              {/* Aviso para responsável: em desenvolvimento */}
              {ehResponsavel && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-sm">
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300 text-xs">Portal do Responsável em desenvolvimento</p>
                    <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                      O cadastro pode ser feito agora. O acesso ao portal será liberado quando o módulo estiver disponível.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ SEÇÃO 3: Senha ══ */}
          <Secao titulo="Senha Provisória de Acesso" />

          <div className="flex items-start gap-3 p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
            <KeyRound className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 dark:text-amber-300">
              No primeiro acesso, o usuário será obrigado a criar uma senha pessoal.
              Defina uma senha provisória simples para repassar a ele.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Campo label="Senha provisória" obrigatorio erro={erros.senha}>
              <div className="relative">
                <Input
                  type={mostrarSenha ? "text" : "password"}
                  value={dados.senha}
                  placeholder="Mínimo 6 caracteres"
                  onChange={e => setDados(p => ({ ...p, senha: e.target.value }))}
                  className="bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </Campo>

            <Campo
              label="Confirmar senha"
              obrigatorio
              erro={dados.confirmarSenha && dados.senha !== dados.confirmarSenha ? erros.confirmarSenha : undefined}
            >
              <div className="relative">
                <Input
                  type={mostrarConfirmacao ? "text" : "password"}
                  value={dados.confirmarSenha}
                  placeholder="Repita a senha"
                  onChange={e => setDados(p => ({ ...p, confirmarSenha: e.target.value }))}
                  className="bg-background pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacao(!mostrarConfirmacao)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {mostrarConfirmacao ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {dados.confirmarSenha && dados.senha === dados.confirmarSenha && dados.senha.length >= 6 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                  <CheckCircle className="w-3 h-3" /> Senhas coincidem
                </p>
              )}
            </Campo>
          </div>

          {/* Resumo de erros — só quando o tipo foi selecionado */}
          {dados.tipo && errosLista.length > 0 && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-2">
              <p className="text-sm font-semibold text-destructive flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Corrija antes de continuar:
              </p>
              <ul className="space-y-1">
                {errosLista.map((erro, i) => (
                  <li key={i} className="text-xs text-destructive/80 flex items-center gap-2">
                    <span className="w-1 h-1 rounded-full bg-destructive/60 shrink-0" />
                    {erro}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Botões */}
          <div className="flex justify-between pt-2 border-t border-border">
            <Button variant="outline" onClick={onVoltar}>Cancelar</Button>
            <Button
              onClick={criarUsuario}
              disabled={!formularioOk || salvando}
              className="min-w-36 gap-2"
            >
              {salvando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
                : <><UserPlus className="w-4 h-4" /> Criar Usuário</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ══ Modal de confirmação ══ */}
      <Dialog open={modalConfirmacao} onOpenChange={setModalConfirmacao}>
        <DialogContent className="max-w-md bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-5 h-5" /> Usuário criado com sucesso!
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Anote ou repasse os dados abaixo ao usuário.
            </DialogDescription>
          </DialogHeader>

          {usuarioCriado && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
                {[
                  { icon: User, label: "Nome",              value: usuarioCriado.nome },
                  { icon: User, label: "Tipo",              value: usuarioCriado.tipo },
                  { icon: User, label: "Login de acesso",   value: usuarioCriado.loginAcesso },
                  { icon: Mail, label: "Email recuperação", value: usuarioCriado.emailRecuperacao },
                  { icon: Lock, label: "Senha provisória",  value: usuarioCriado.senhaProvisoria },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-3">
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground w-28 shrink-0">{label}:</span>
                    <span className="text-sm font-mono font-medium text-foreground bg-background px-2 py-0.5 rounded border border-border truncate">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {usuarioCriado.tipo === "Professor" && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-300">
                  <BookOpen className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  Lembre de vincular o professor às disciplinas em <strong>Gestão de Vínculos</strong>.
                </div>
              )}

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  🔐 No primeiro acesso, o usuário criará uma senha pessoal.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              onClick={() => { setModalConfirmacao(false); onVoltar(); }}
              className="w-full"
            >
              Entendi, fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}