// src/components/ImportacaoFichas.tsx
// Importação de fichas de matrícula com IA — extrai dados de PDF/imagem
// Disponível para: secretaria e gestor geral
// Fluxo: Upload → IA extrai → Revisão → Vincular aluno → Salvar

import { useState, useCallback, useRef } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { toast } from 'sonner'
import {
  Upload, FileText, User,
  CheckCircle, AlertCircle, Loader2, Search, X, ChevronRight,
  FileUp, RotateCcw, Save, ClipboardCheck, Paperclip,
} from 'lucide-react'
import { Button }   from './ui/button'
import { Input }    from './ui/input'
import { Label }    from './ui/label'
import { Badge }    from './ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface FichaExtraida {
  aluno: {
    nome_completo:   string | null
    data_nascimento: string | null
    serie:           string | null
    filiacao:        string | null
  }
  responsavel: {
    nome:     string | null
    rg:       string | null
    cpf:      string | null
    endereco: string | null
    telefone: string | null
    email:    string | null
  }
  tem_foto:  boolean
  confianca: 'alta' | 'media' | 'baixa'
}

interface AlunoPortal {
  id:    string
  nome:  string
  email: string
  serie?: string
}

interface DocumentoAnexo {
  tipo:      string
  arquivo:   File
  url?:      string
  uploading: boolean
  feito:     boolean
}

type Aba = 'ficha' | 'documentos' | 'checklist'
type Fase = 'upload' | 'extraindo' | 'revisao' | 'salvando' | 'concluido'

// ─── Documentos obrigatórios ──────────────────────────────────────────────────

const DOCS_OBRIGATORIOS = [
  { id: 'rg',           label: 'RG ou Certidão de Nascimento' },
  { id: 'cpf',          label: 'CPF do aluno' },
  { id: 'cpf_resp',     label: 'CPF do responsável' },
  { id: 'comprovante',  label: 'Comprovante de residência' },
  { id: 'foto',         label: 'Foto 3x4' },
  { id: 'hist_escolar', label: 'Histórico escolar anterior' },
  { id: 'declaracao',   label: 'Declaração de transferência' },
  { id: 'contrato',     label: 'Contrato assinado' },
]

const TIPOS_DOCUMENTO = [
  'RG / Certidão de Nascimento',
  'CPF do aluno',
  'CPF do responsável',
  'Comprovante de residência',
  'Foto 3x4',
  'Histórico escolar',
  'Declaração de transferência',
  'Contrato assinado',
  'Laudo médico / neuropsicológico',
  'Outro',
]

// ─── Helper: converte File para base64 ───────────────────────────────────────

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// ─── Campo editável ───────────────────────────────────────────────────────────

function Campo({
  label, value, onChange, placeholder, tipo = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  tipo?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={tipo}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? '—'}
        className="h-8 text-sm"
      />
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  onVoltar?: () => void
}

export function ImportacaoFichas({ onVoltar }: Props) {
  const [aba,        setAba]        = useState<Aba>('ficha')
  const [fase,       setFase]       = useState<Fase>('upload')
  const [arrastando, setArrastando] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [tipoPreview, setTipoPreview] = useState<'pdf' | 'imagem' | null>(null)

  // Dados extraídos pela IA (editáveis)
  const [ficha,      setFicha]      = useState<FichaExtraida | null>(null)
  const fichaRef = useRef<FichaExtraida | null>(null)

  // Aluno vinculado do portal
  const [buscaAluno,     setBuscaAluno]     = useState('')
  const [resultadosAluno, setResultadosAluno] = useState<AlunoPortal[]>([])
  const [buscandoAluno,  setBuscandoAluno]  = useState(false)
  const [alunoVinculado, setAlunoVinculado] = useState<AlunoPortal | null>(null)

  // Documentos anexos
  const [documentos,    setDocumentos]    = useState<DocumentoAnexo[]>([])
  const [tipoDoc,       setTipoDoc]       = useState(TIPOS_DOCUMENTO[0])
  const [arquivoDoc,    setArquivoDoc]    = useState<File | null>(null)

  // Checklist
  const [checklist,     setChecklist]     = useState<Record<string, boolean>>({})

  // ── Helpers de atualização de ficha ────────────────────────────────────────

  const setAluno = (fn: (prev: FichaExtraida['aluno']) => FichaExtraida['aluno']) =>
    setFicha(f => f ? { ...f, aluno: fn(f.aluno) } : f)
  const setResp  = (fn: (prev: FichaExtraida['responsavel']) => FichaExtraida['responsavel']) =>
    setFicha(f => f ? { ...f, responsavel: fn(f.responsavel) } : f)

  const v = (val: string | null) => val ?? ''

  // ── Upload e extração ───────────────────────────────────────────────────────

  const processarArquivo = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Envie um arquivo de imagem (JPG, PNG) ou PDF')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo: 10 MB')
      return
    }

    // Cria URL de preview antes de enviar para a IA
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setTipoPreview(file.type === 'application/pdf' ? 'pdf' : 'imagem')

    setFase('extraindo')
    try {
      const base64   = await fileToBase64(file)
      const tipoMime = file.type  // envia o tipo real — PDF ou imagem

      const { data, error } = await supabase.functions.invoke('extrair-ficha', {
        body: { imagem: base64, tipo_mime: tipoMime },
      })

      if (error || data?.erro) throw new Error(error?.message ?? data?.erro)

      // Garante estrutura completa mesmo se Claude omitir campos
      const extraida: FichaExtraida = {
        aluno: {
          nome_completo:   null,
          data_nascimento: null,
          serie:           null,
          filiacao:        null,
          ...data.aluno,
        },
        responsavel: {
          nome:     null,
          rg:       null,
          cpf:      null,
          endereco: null,
          telefone: null,
          email:    null,
          ...data.responsavel,
        },
        tem_foto:  data.tem_foto ?? false,
        confianca: data.confianca ?? 'media',
      }

      setFicha(extraida)
      fichaRef.current = extraida

      // Pré-preenche busca de aluno com nome extraído
      if (extraida.aluno.nome_completo) {
        setBuscaAluno(extraida.aluno.nome_completo)
        buscarAluno(extraida.aluno.nome_completo)
      }

      setFase('revisao')
      toast.success('Dados extraídos! Revise e confirme antes de salvar.')

    } catch (err: any) {
      toast.error('Erro ao extrair dados: ' + (err.message ?? 'tente novamente'))
      setFase('upload')
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setArrastando(false)
    const file = e.dataTransfer.files[0]
    if (file) processarArquivo(file)
  }, [])

  // ── Busca de aluno no portal ────────────────────────────────────────────────

  const buscarAluno = async (termo: string) => {
    if (termo.length < 2) { setResultadosAluno([]); return }
    setBuscandoAluno(true)
    try {
      const { data } = await supabase
        .from('users')
        .select('id, nome, email, serie')
        .ilike('nome', `%${termo}%`)
        .eq('tipo', 'aluno')
        .limit(8)
      setResultadosAluno(data ?? [])
    } finally {
      setBuscandoAluno(false)
    }
  }

  // ── Upload de documento anexo ───────────────────────────────────────────────

  const adicionarDocumento = () => {
    if (!arquivoDoc) { toast.error('Selecione um arquivo'); return }
    setDocumentos(prev => [...prev, { tipo: tipoDoc, arquivo: arquivoDoc, uploading: false, feito: false }])
    setArquivoDoc(null)
  }

  const uploadDocumento = async (idx: number, alunoId: string) => {
    const doc = documentos[idx]
    setDocumentos(prev => prev.map((d, i) => i === idx ? { ...d, uploading: true } : d))
    try {
      const ext      = doc.arquivo.name.split('.').pop()
      const path     = `documentos/${alunoId}/${Date.now()}_${doc.tipo.replace(/\s/g, '_')}.${ext}`
      const { error } = await supabase.storage.from('documentos-alunos').upload(path, doc.arquivo)
      if (error) throw error
      const { data: { publicUrl } } = supabase.storage.from('documentos-alunos').getPublicUrl(path)
      setDocumentos(prev => prev.map((d, i) => i === idx ? { ...d, uploading: false, feito: true, url: publicUrl } : d))
    } catch (err: any) {
      toast.error(`Erro ao enviar ${doc.tipo}`)
      setDocumentos(prev => prev.map((d, i) => i === idx ? { ...d, uploading: false } : d))
    }
  }

  // ── Salvar tudo ────────────────────────────────────────────────────────────

  const salvar = async () => {
    if (!ficha) return
    if (!alunoVinculado) { toast.error('Vincule um aluno do portal antes de salvar'); return }

    setFase('salvando')
    try {
      // 1. Salvar/atualizar ficha de matrícula
      const payload = {
        aluno_id:         alunoVinculado.id,
        nome_aluno:       ficha.aluno.nome_completo,
        data_nascimento:  ficha.aluno.data_nascimento || null,
        serie:            ficha.aluno.serie || null,
        filiacao:         ficha.aluno.filiacao || null,
        nome_responsavel: ficha.responsavel.nome || null,
        rg_responsavel:   ficha.responsavel.rg || null,
        cpf_responsavel:  ficha.responsavel.cpf || null,
        endereco:         ficha.responsavel.endereco || null,
        telefone:         ficha.responsavel.telefone || null,
        email_responsavel:ficha.responsavel.email || null,
        docs_pendentes:   Object.values(checklist).some(v => !v),
        status_matricula: 'ativo',
      }

      const { error: fichaErr } = await supabase
        .from('fichas_matricula')
        .upsert(payload, { onConflict: 'aluno_id' })

      if (fichaErr) throw fichaErr

      // 2. Upload dos documentos pendentes
      for (let i = 0; i < documentos.length; i++) {
        if (!documentos[i].feito) await uploadDocumento(i, alunoVinculado.id)
      }

      setFase('concluido')
      toast.success(`Ficha de ${ficha.aluno.nome_completo ?? 'aluno'} salva com sucesso!`)

    } catch (err: any) {
      toast.error('Erro ao salvar: ' + (err.message ?? 'tente novamente'))
      setFase('revisao')
    }
  }

  const reiniciar = () => {
    setFase('upload')
    setFicha(null)
    fichaRef.current = null
    setAlunoVinculado(null)
    setBuscaAluno('')
    setResultadosAluno([])
    setDocumentos([])
    setChecklist({})
    setAba('ficha')
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null) }
    setTipoPreview(null)
  }

  // ─── Badge de confiança ──────────────────────────────────────────────────────

  const CorConfianca = {
    alta:  'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
    media: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    baixa: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileUp className="w-6 h-6 text-indigo-600" />
            Importar Fichas com IA
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Envie o PDF ou foto da ficha — a IA preenche tudo automaticamente
          </p>
        </div>
        {onVoltar && (
          <Button variant="outline" onClick={onVoltar} size="sm">
            ← Voltar
          </Button>
        )}
      </div>

      {/* ── Fase: Upload ─────────────────────────────────────────────────────── */}
      {fase === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setArrastando(true) }}
          onDragLeave={() => setArrastando(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all ${
            arrastando
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
              : 'border-border hover:border-indigo-300 hover:bg-muted/30'
          }`}
        >
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Upload className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Arraste a ficha aqui
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            JPG, PNG ou PDF · máximo 10 MB
          </p>
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
              <FileText className="w-4 h-4" />
              Selecionar arquivo
            </span>
            <input
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={e => e.target.files?.[0] && processarArquivo(e.target.files[0])}
            />
          </label>
          <p className="text-xs text-muted-foreground mt-4">
            A IA identifica automaticamente os dados da ficha padrão do colégio
          </p>
        </div>
      )}

      {/* ── Fase: Extraindo ──────────────────────────────────────────────────── */}
      {fase === 'extraindo' && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Lendo a ficha com IA...</h3>
          <p className="text-muted-foreground text-sm">Isso leva alguns segundos</p>
        </div>
      )}

      {/* ── Fase: Concluído ──────────────────────────────────────────────────── */}
      {fase === 'concluido' && (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Ficha salva com sucesso!</h3>
          <p className="text-muted-foreground text-sm">
            {ficha?.aluno.nome_completo} foi atualizado no sistema.
          </p>
          <div className="flex gap-3 pt-2">
            <Button onClick={reiniciar} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              <RotateCcw className="w-4 h-4" />
              Importar próximo aluno
            </Button>
          </div>
        </div>
      )}

      {/* ── Fase: Revisão ────────────────────────────────────────────────────── */}
      {(fase === 'revisao' || fase === 'salvando') && ficha && (
        <div className="space-y-4 lg:grid lg:grid-cols-[1fr_340px] lg:gap-6 lg:space-y-0 lg:items-start">
        {/* Coluna esquerda — formulário */}
        <div className="space-y-4">

          {/* Barra de confiança + aluno vinculado */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge className={`${CorConfianca[ficha.confianca]} border text-xs`}>
              {ficha.confianca === 'alta'  ? '✅ Alta confiança'  :
               ficha.confianca === 'media' ? '⚠️ Confiança média — revise' :
               '❗ Baixa confiança — revise com atenção'}
            </Badge>
            <Button variant="outline" size="sm" onClick={reiniciar} className="gap-1.5">
              <RotateCcw className="w-3 h-3" /> Novo arquivo
            </Button>
          </div>

          {/* Vincular aluno do portal */}
          <Card className="border-indigo-200 dark:border-indigo-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Vincular ao aluno cadastrado no portal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alunoVinculado ? (
                <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-xl px-4 py-3">
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-200">{alunoVinculado.nome}</p>
                    <p className="text-xs text-green-600 dark:text-green-400">{alunoVinculado.email}</p>
                  </div>
                  <button onClick={() => setAlunoVinculado(null)} className="text-green-600 hover:text-green-800 dark:text-green-400 p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar aluno pelo nome..."
                      value={buscaAluno}
                      onChange={e => { setBuscaAluno(e.target.value); buscarAluno(e.target.value) }}
                      className="pl-9"
                    />
                    {buscandoAluno && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
                  </div>
                  {resultadosAluno.length > 0 && (
                    <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                      {resultadosAluno.map(a => (
                        <button
                          key={a.id}
                          onClick={() => { setAlunoVinculado(a); setResultadosAluno([]) }}
                          className="w-full text-left px-4 py-2.5 hover:bg-muted/50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-medium text-foreground">{a.nome}</p>
                            <p className="text-xs text-muted-foreground">{a.email}</p>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  )}
                  {buscaAluno.length >= 2 && !buscandoAluno && resultadosAluno.length === 0 && (
                    <p className="text-xs text-muted-foreground px-1">Nenhum aluno encontrado com esse nome.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Abas */}
          <div className="flex gap-1 bg-muted rounded-xl p-1">
            {([
              { id: 'ficha',      label: 'Dados da Ficha',  icon: <FileText      className="w-4 h-4" /> },
              { id: 'documentos', label: 'Documentos',      icon: <Paperclip     className="w-4 h-4" /> },
              { id: 'checklist',  label: 'Checklist',       icon: <ClipboardCheck className="w-4 h-4" /> },
            ] as { id: Aba; label: string; icon: React.ReactNode }[]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setAba(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  aba === tab.id
                    ? 'bg-white dark:bg-gray-900 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.icon}{tab.label}
              </button>
            ))}
          </div>

          {/* ── Aba: Dados da Ficha ──────────────────────────────────────────── */}
          {aba === 'ficha' && (
            <div className="space-y-4">

              {/* Foto detectada */}
              {ficha.tem_foto && (
                <div className="flex items-center gap-3 px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-sm text-green-700 dark:text-green-300">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Foto 3x4 detectada na ficha — anexe-a na aba Documentos para salvar no sistema.
                </div>
              )}

              {/* Dados do aluno */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" /> Dados do Aluno
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Campo label="Nome completo" value={v(ficha.aluno.nome_completo)}
                      onChange={val => setAluno(a => ({ ...a, nome_completo: val }))} />
                  </div>
                  <Campo label="Série" value={v(ficha.aluno.serie)}
                    onChange={val => setAluno(a => ({ ...a, serie: val }))} placeholder="Ex: 2ª série, 6º ano" />
                  <Campo label="Data de nascimento" value={v(ficha.aluno.data_nascimento)}
                    onChange={val => setAluno(a => ({ ...a, data_nascimento: val }))} tipo="date" />
                  <div className="sm:col-span-2">
                    <Campo label="Filiação (pai e mãe)" value={v(ficha.aluno.filiacao)}
                      onChange={val => setAluno(a => ({ ...a, filiacao: val }))}
                      placeholder="Ex: João Silva e Maria Silva" />
                  </div>
                </CardContent>
              </Card>

              {/* Responsável Financeiro */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" /> Responsável Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <Campo label="Nome" value={v(ficha.responsavel.nome)}
                      onChange={val => setResp(r => ({ ...r, nome: val }))} />
                  </div>
                  <Campo label="RG" value={v(ficha.responsavel.rg)}
                    onChange={val => setResp(r => ({ ...r, rg: val }))} />
                  <Campo label="CPF" value={v(ficha.responsavel.cpf)}
                    onChange={val => setResp(r => ({ ...r, cpf: val }))} placeholder="000.000.000-00" />
                  <Campo label="Telefone de contato" value={v(ficha.responsavel.telefone)}
                    onChange={val => setResp(r => ({ ...r, telefone: val }))} />
                  <Campo label="E-mail" value={v(ficha.responsavel.email)}
                    onChange={val => setResp(r => ({ ...r, email: val }))} tipo="email" />
                  <div className="sm:col-span-2">
                    <Campo label="Endereço completo" value={v(ficha.responsavel.endereco)}
                      onChange={val => setResp(r => ({ ...r, endereco: val }))}
                      placeholder="Ex: R. José Deodoro, n.170 - Luzia - Aracaju/SE - CEP: 49048-390" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Aba: Documentos ──────────────────────────────────────────────── */}
          {aba === 'documentos' && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-indigo-600" /> Anexar documentos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1 sm:col-span-1">
                      <Label className="text-xs text-muted-foreground">Tipo do documento</Label>
                      <select
                        value={tipoDoc}
                        onChange={e => setTipoDoc(e.target.value)}
                        className="w-full h-9 text-sm border border-input bg-background rounded-md px-3"
                      >
                        {TIPOS_DOCUMENTO.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs text-muted-foreground">Arquivo (JPG, PNG, PDF)</Label>
                      <div className="flex gap-2">
                        <label className="flex-1 cursor-pointer">
                          <div className="h-9 border border-input rounded-md px-3 flex items-center text-sm text-muted-foreground hover:bg-muted/50 transition-colors truncate">
                            {arquivoDoc ? arquivoDoc.name : 'Selecionar arquivo...'}
                          </div>
                          <input type="file" accept="image/*,application/pdf" className="hidden"
                            onChange={e => setArquivoDoc(e.target.files?.[0] ?? null)} />
                        </label>
                        <Button size="sm" onClick={adicionarDocumento} className="bg-indigo-600 hover:bg-indigo-700 shrink-0">
                          Adicionar
                        </Button>
                      </div>
                    </div>
                  </div>

                  {documentos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhum documento adicionado ainda.
                      <br />Os documentos serão enviados ao salvar a ficha.
                    </div>
                  ) : (
                    <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                      {documentos.map((doc, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-3">
                          <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{doc.tipo}</p>
                            <p className="text-xs text-muted-foreground truncate">{doc.arquivo.name}</p>
                          </div>
                          {doc.feito ? (
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                          ) : doc.uploading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-500 shrink-0" />
                          ) : (
                            <button onClick={() => setDocumentos(prev => prev.filter((_, j) => j !== i))}
                              className="text-muted-foreground hover:text-red-500 shrink-0 p-1">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Aba: Checklist ───────────────────────────────────────────────── */}
          {aba === 'checklist' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-indigo-600" />
                  Documentos entregues fisicamente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {DOCS_OBRIGATORIOS.map(doc => (
                  <label key={doc.id} className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/50 cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={checklist[doc.id] ?? false}
                      onChange={e => setChecklist(prev => ({ ...prev, [doc.id]: e.target.checked }))}
                      className="w-4 h-4 rounded accent-indigo-600"
                    />
                    <span className={`text-sm ${checklist[doc.id] ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                      {doc.label}
                    </span>
                    {checklist[doc.id] && <CheckCircle className="w-4 h-4 text-green-500 ml-auto shrink-0" />}
                  </label>
                ))}
                <p className="text-xs text-muted-foreground px-3 pt-2">
                  {Object.values(checklist).filter(Boolean).length} de {DOCS_OBRIGATORIOS.length} documentos confirmados
                </p>
              </CardContent>
            </Card>
          )}

          {/* Botão salvar */}
          <div className="flex justify-end gap-3 pt-2 pb-4">
            {!alunoVinculado && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm mr-auto">
                <AlertCircle className="w-4 h-4" />
                Vincule um aluno do portal para continuar
              </div>
            )}
            <Button variant="outline" onClick={reiniciar}>Cancelar</Button>
            <Button
              onClick={salvar}
              disabled={!alunoVinculado || fase === 'salvando'}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2"
            >
              {fase === 'salvando' ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              ) : (
                <><Save className="w-4 h-4" /> Salvar ficha</>
              )}
            </Button>
          </div>
        </div>{/* fim coluna esquerda */}

        {/* Coluna direita — preview da ficha original */}
        {previewUrl && (
          <div className="hidden lg:block sticky top-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">
              Ficha original
            </p>
            <div className="rounded-2xl border border-border overflow-hidden bg-muted/30" style={{ height: '600px' }}>
              {tipoPreview === 'pdf' ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title="Preview da ficha"
                />
              ) : (
                <img
                  src={previewUrl}
                  alt="Preview da ficha"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              {ficha.tem_foto ? '📸 Foto detectada — anexe na aba Documentos' : 'Ficha sem foto detectada'}
            </p>
          </div>
        )}

        </div>
      )}
    </div>
  )
}
