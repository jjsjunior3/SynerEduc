// ArquivoHistorico.tsx — F2.2
// Digitalização de fichas e boletins históricos com IA
// Fluxo: Aluno → Boletins Conexão → Escola Anterior

import { useState } from 'react'
import { supabase } from '../supabase/supabaseClient'
import { toast } from 'sonner'
import { UserCheck, BookOpen, History, ChevronRight, Search, Upload, Loader2, CheckCircle, Edit2, Trash2 } from 'lucide-react'
import HistoricoIA from './HistoricoIA'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Usuario {
  id: string
  nome: string
  tipo: string
  segmento: 'ead' | 'presencial'
}

interface AlunoHistorico {
  id: string
  nome: string
  data_nascimento?: string
  cpf?: string
  filiacao?: string
  serie_saida?: string
  ano_saida?: number
  motivo_saida?: string
  segmento: string
}

// Apenas média final anual — não bimestral
interface BoletimsExtraido {
  disciplina:   string
  serie:        string
  ano_letivo:   number
  media_final:  number
  situacao:     'aprovado' | 'reprovado' | 'recuperacao' | 'cursando'
}

interface Props {
  usuario: Usuario
}

const TIPOS_ARQUIVO = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const MAX_MB = 10

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ArquivoHistorico({ usuario }: Props) {
  // Etapa atual do wizard
  const [etapa, setEtapa] = useState<'aluno' | 'boletins' | 'externo' | 'concluido'>('aluno')

  // ── Estado — Aluno histórico ────────────────────────────────────────────────
  const [buscaTermo, setBuscaTermo]         = useState('')
  const [resultadosBusca, setResultadosBusca] = useState<AlunoHistorico[]>([])
  const [buscando, setBuscando]             = useState(false)
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoHistorico | null>(null)
  const [modoNovoAluno, setModoNovoAluno]   = useState(false)
  const [dadosFicha, setDadosFicha]         = useState<Partial<AlunoHistorico>>({ segmento: usuario.segmento })
  const [processandoFicha, setProcessandoFicha] = useState(false)
  const [arquivoFicha, setArquivoFicha]     = useState<File | null>(null)

  // ── Estado — Boletins ───────────────────────────────────────────────────────
  const [modoEntrada, setModoEntrada]       = useState<'ia' | 'manual'>('ia')
  const [arquivoBoletim, setArquivoBoletim] = useState<File | null>(null)
  const [boletinsExtraidos, setBoletinsExtraidos] = useState<BoletimsExtraido[]>([])
  const [processandoBoletim, setProcessandoBoletim] = useState(false)
  const [boletinsSalvos, setBoletinsSalvos] = useState(false)

  // ─── Buscar aluno histórico existente ────────────────────────────────────────
  async function buscarAluno(termo: string) {
    setBuscaTermo(termo)
    if (termo.length < 2) { setResultadosBusca([]); return }
    setBuscando(true)
    try {
      const { data } = await supabase
        .from('alunos_historicos')
        .select('id, nome, data_nascimento, serie_saida, ano_saida, segmento')
        .eq('segmento', usuario.segmento)
        .ilike('nome', `%${termo}%`)
        .limit(8)
      setResultadosBusca(data ?? [])
    } finally {
      setBuscando(false)
    }
  }

  // ─── Digitalizar ficha de matrícula com IA ───────────────────────────────────
  async function digitalizarFicha() {
    if (!arquivoFicha) return
    setProcessandoFicha(true)
    try {
      const base64 = await fileToBase64(arquivoFicha)
      const isPdf = arquivoFicha.type === 'application/pdf'

      const prompt = `Analise esta ficha de matrícula escolar brasileira e extraia as informações do aluno.

Retorne APENAS um JSON válido com esta estrutura:
{
  "nome": "Nome completo do aluno",
  "data_nascimento": "YYYY-MM-DD ou vazio",
  "cpf": "CPF do aluno ou vazio",
  "filiacao": "Nome do pai e da mãe separados por vírgula, ou vazio",
  "serie_saida": "Última série cursada nesta escola, ex: 3ª série - Ensino Médio",
  "ano_saida": 2025,
  "motivo_saida": "conclusao ou transferencia ou desistencia ou outro"
}

Se um campo não estiver visível, use string vazia ou 0.`

      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: { conteudo_base64: base64, media_type: arquivoFicha.type, is_pdf: isPdf, prompt },
      })
      if (error || data?.erro) throw new Error(error?.message ?? data?.erro)

      const json = normalizarFicha(JSON.parse(limparJson(data.texto)))
      setDadosFicha(prev => ({ ...prev, ...json }))
      toast.success('Ficha digitalizada! Revise os dados antes de salvar.')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao digitalizar ficha.')
    } finally {
      setProcessandoFicha(false)
    }
  }

  // ─── Salvar aluno histórico ───────────────────────────────────────────────────
  async function salvarAlunoHistorico() {
    if (!dadosFicha.nome) { toast.error('Nome do aluno é obrigatório.'); return }
    try {
      // Bucket privado — guarda o caminho (path), não a URL pública
      let arquivo_ficha_url = ''
      if (arquivoFicha) {
        const ext = arquivoFicha.name.split('.').pop()
        const storagePath = `${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('fichas-historicas')
          .upload(storagePath, arquivoFicha, { upsert: true })
        if (!upErr) {
          arquivo_ficha_url = storagePath
        }
      }

      const { data, error } = await supabase.from('alunos_historicos').insert({
        ...dadosFicha,
        arquivo_ficha_url,
        criado_por: usuario.id,
        segmento: usuario.segmento,
      }).select().single()

      if (error) throw error
      setAlunoSelecionado(data)
      setModoNovoAluno(false)
      toast.success(`Perfil de ${data.nome} criado!`)
      setEtapa('boletins')
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar aluno.')
    }
  }

  // ─── Digitalizar boletim com IA ───────────────────────────────────────────────
  async function digitalizarBoletim() {
    if (!arquivoBoletim) return
    setProcessandoBoletim(true)
    setBoletinsExtraidos([])
    try {
      const base64 = await fileToBase64(arquivoBoletim)
      const isPdf = arquivoBoletim.type === 'application/pdf'

      const prompt = `Analise este boletim escolar e extraia a MÉDIA FINAL ANUAL de cada disciplina.

Retorne APENAS um array JSON — um objeto por disciplina:
[
  {
    "disciplina": "Nome da disciplina",
    "serie": "Ex: 2ª série - Ensino Médio",
    "ano_letivo": 2024,
    "media_final": 8.5,
    "situacao": "aprovado"
  }
]

Regras:
- Use a coluna M.FINAL, MÉDIA FINAL ou RESULTADO do documento (não as médias bimestrais)
- situacao deve ser exatamente: aprovado, reprovado, recuperacao ou cursando
- Inclua TODAS as disciplinas visíveis, incluindo extracurriculares
- Use ponto decimal (8.5 não 8,5)
- SOMENTE o array JSON — sem texto antes, sem texto depois, sem explicações`

      const { data, error } = await supabase.functions.invoke('claude-proxy', {
        body: {
          conteudo_base64: base64,
          media_type:      arquivoBoletim.type,
          is_pdf:          isPdf,
          prompt,
          max_tokens:      8000,   // boletins completos podem ter muitos registros
        },
      })
      if (error || data?.erro) throw new Error(error?.message ?? data?.erro)

      // Extrai o array — o Claude às vezes envolve em {"notas": [...]} ou adiciona texto
      const textoLimpo = limparJson(data.texto ?? '')
      let parsed: unknown
      try {
        parsed = JSON.parse(textoLimpo)
      } catch {
        throw new Error(`Não foi possível interpretar a resposta da IA. Resposta recebida: "${(data.texto ?? '').slice(0, 120)}..."`)
      }

      // Aceita tanto array direto quanto objeto { notas: [...] } ou { disciplinas: [...] }
      let rawRegistros: unknown[]
      if (Array.isArray(parsed)) {
        rawRegistros = parsed
      } else if (typeof parsed === 'object' && parsed !== null) {
        const arr = Object.values(parsed as Record<string, unknown>).find(v => Array.isArray(v)) as unknown[] | undefined
        if (arr) rawRegistros = arr
        else throw new Error('Formato inesperado: objeto JSON sem array interno.')
      } else {
        throw new Error('Formato inesperado. Tente um arquivo mais legível ou com melhor qualidade.')
      }
      const registros: BoletimsExtraido[] = rawRegistros.map(normalizarBoletim)

      if (registros.length === 0) throw new Error('Nenhuma nota encontrada no documento. Verifique se o arquivo está legível.')

      const json = registros // alias para manter código abaixo
      setBoletinsExtraidos(json)
      toast.success(`${json.length} registros extraídos! Revise antes de salvar.`)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao digitalizar boletim.')
    } finally {
      setProcessandoBoletim(false)
    }
  }

  // ─── Salvar boletins históricos ───────────────────────────────────────────────
  async function salvarBoletins() {
    if (!alunoSelecionado || boletinsExtraidos.length === 0) return
    try {
      // Bucket privado — guarda o caminho (path), não a URL pública
      let arquivo_url = ''
      if (arquivoBoletim) {
        const ext = arquivoBoletim.name.split('.').pop()
        const storagePath = `${alunoSelecionado.id}/${Date.now()}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('boletins-historicos')
          .upload(storagePath, arquivoBoletim, { upsert: true })
        if (!upErr) {
          // Guarda o path — URL assinada gerada na exibição se necessário
          arquivo_url = storagePath
        }
      }

      const registros = boletinsExtraidos.map(b => ({
        aluno_id:            alunoSelecionado.id,
        disciplina:          b.disciplina,
        serie:               b.serie,
        ano_letivo:          b.ano_letivo,
        bimestre:            0,      // 0 = média final anual
        media_final:         b.media_final,
        situacao:            b.situacao,
        segmento:            usuario.segmento,
        arquivo_boletim_url: arquivo_url,
        criado_por:          usuario.id,
      }))

      const { error } = await supabase.from('boletins_historicos').insert(registros)
      if (error) throw error

      setBoletinsSalvos(true)
      toast.success(`${registros.length} registros salvos com sucesso!`)
    } catch (err: any) {
      toast.error(err.message ?? 'Erro ao salvar boletins.')
    }
  }

  function adicionarLinhaManual() {
    setBoletinsExtraidos(prev => [
      ...prev,
      {
        disciplina:  '',
        serie:       alunoSelecionado?.serie_saida ?? '',
        ano_letivo:  alunoSelecionado?.ano_saida ?? new Date().getFullYear() - 1,
        media_final: 0,
        situacao:    'aprovado',
      },
    ])
  }

  function atualizarBoletim(index: number, campo: keyof BoletimsExtraido, valor: string | number) {
    setBoletinsExtraidos(prev => {
      const copia = [...prev]
      copia[index] = { ...copia[index], [campo]: valor }
      return copia
    })
  }

  function removerBoletim(index: number) {
    setBoletinsExtraidos(prev => prev.filter((_, i) => i !== index))
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Arquivo Histórico Escolar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Digitalize fichas e boletins de anos anteriores com IA — construa o histórico retroativo do aluno.
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { id: 'aluno',    label: 'Aluno',             icon: <UserCheck className="w-4 h-4" /> },
          { id: 'boletins', label: 'Boletins Conexão',  icon: <BookOpen  className="w-4 h-4" /> },
          { id: 'externo',  label: 'Escola Anterior',   icon: <History   className="w-4 h-4" /> },
        ].map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            <button
              onClick={() => alunoSelecionado && setEtapa(step.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors
                ${etapa === step.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
            >
              {step.icon} {step.label}
            </button>
            {i < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* ─────────────── ETAPA 1: ALUNO ─────────────────────────── */}
      {etapa === 'aluno' && (
        <div className="space-y-4">

          {/* Buscar aluno já cadastrado */}
          {!modoNovoAluno && !alunoSelecionado && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <h3 className="font-semibold text-foreground">Buscar aluno histórico existente</h3>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                <input
                  type="text" value={buscaTermo}
                  onChange={e => buscarAluno(e.target.value)}
                  placeholder="Digite o nome do aluno..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {buscando && <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />}
              </div>
              {resultadosBusca.length > 0 && (
                <div className="border border-border rounded-lg overflow-hidden">
                  {resultadosBusca.map(a => (
                    <button key={a.id} onClick={() => { setAlunoSelecionado(a); setBuscaTermo(a.nome); setResultadosBusca([]) }}
                            className="w-full px-4 py-3 text-left text-sm hover:bg-muted transition-colors border-b border-border last:border-0">
                      <span className="font-medium text-foreground">{a.nome}</span>
                      <span className="text-muted-foreground ml-2">· {a.serie_saida ?? '—'} · {a.ano_saida ?? '—'}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex-1 border-t border-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="flex-1 border-t border-border" />
              </div>
              <button onClick={() => setModoNovoAluno(true)}
                      className="w-full py-2.5 rounded-lg border border-dashed border-blue-400 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                + Cadastrar novo aluno histórico
              </button>
            </div>
          )}

          {/* Aluno selecionado */}
          {alunoSelecionado && !modoNovoAluno && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-green-800 dark:text-green-200">{alunoSelecionado.nome}</p>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {alunoSelecionado.serie_saida ?? '—'} · {alunoSelecionado.ano_saida ?? '—'} · {alunoSelecionado.segmento}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEtapa('boletins')}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors">
                  Continuar →
                </button>
                <button onClick={() => { setAlunoSelecionado(null); setBuscaTermo('') }}
                        className="px-3 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
                  Trocar
                </button>
              </div>
            </div>
          )}

          {/* Formulário novo aluno */}
          {modoNovoAluno && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Novo aluno histórico</h3>
                <button onClick={() => setModoNovoAluno(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancelar</button>
              </div>

              {/* Upload ficha */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-2">
                  Digitalizar ficha de matrícula com IA (opcional)
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:bg-muted transition-colors">
                    <Upload className="w-4 h-4" />
                    {arquivoFicha ? arquivoFicha.name : 'Upload PDF ou foto'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                           onChange={e => { const f = e.target.files?.[0]; if (f && TIPOS_ARQUIVO.includes(f.type) && f.size <= MAX_MB * 1024 * 1024) setArquivoFicha(f) }} />
                  </label>
                  {arquivoFicha && (
                    <button onClick={digitalizarFicha} disabled={processandoFicha}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2">
                      {processandoFicha ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</> : 'Extrair com IA'}
                    </button>
                  )}
                </div>
              </div>

              {/* Campos do aluno */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Campo label="Nome *" value={dadosFicha.nome ?? ''} onChange={v => setDadosFicha(p => ({...p, nome: v}))} />
                <Campo label="Data de Nascimento" value={dadosFicha.data_nascimento ?? ''} onChange={v => setDadosFicha(p => ({...p, data_nascimento: v}))} placeholder="AAAA-MM-DD" />
                <Campo label="CPF" value={dadosFicha.cpf ?? ''} onChange={v => setDadosFicha(p => ({...p, cpf: v}))} />
                <Campo label="Última Série na Conexão" value={dadosFicha.serie_saida ?? ''} onChange={v => setDadosFicha(p => ({...p, serie_saida: v}))} placeholder="Ex: 3ª série - Ensino Médio" />
                <Campo label="Ano de Saída" value={String(dadosFicha.ano_saida ?? '')} onChange={v => setDadosFicha(p => ({...p, ano_saida: Number(v)}))} placeholder="2025" />
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Motivo da Saída</label>
                  <select value={dadosFicha.motivo_saida ?? ''} onChange={e => setDadosFicha(p => ({...p, motivo_saida: e.target.value}))}
                          className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Selecione...</option>
                    <option value="conclusao">Conclusão de curso</option>
                    <option value="transferencia">Transferência</option>
                    <option value="desistencia">Desistência</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <Campo label="Filiação (pai e mãe)" value={dadosFicha.filiacao ?? ''} onChange={v => setDadosFicha(p => ({...p, filiacao: v}))} placeholder="Nome do pai, Nome da mãe" />
                </div>
              </div>

              <button onClick={salvarAlunoHistorico}
                      disabled={!dadosFicha.nome}
                      className="w-full py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors">
                Salvar e continuar para Boletins →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─────────────── ETAPA 2: BOLETINS CONEXÃO ──────────────── */}
      {etapa === 'boletins' && alunoSelecionado && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Aluno: <strong>{alunoSelecionado.nome}</strong> — adicione os boletins da Conexão de anos anteriores.
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">

            {/* ── Toggle IA / Manual ── */}
            <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
              <button
                onClick={() => { setModoEntrada('ia'); setBoletinsExtraidos([]); setBoletinsSalvos(false) }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${modoEntrada === 'ia'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Loader2 className={`w-4 h-4 ${modoEntrada === 'ia' && processandoBoletim ? 'animate-spin' : ''}`} />
                Extrair com IA
              </button>
              <button
                onClick={() => { setModoEntrada('manual'); setBoletinsExtraidos([]); setBoletinsSalvos(false); setArquivoBoletim(null) }}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all
                  ${modoEntrada === 'manual'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Edit2 className="w-4 h-4" />
                Entrada Manual
              </button>
            </div>

            {/* ── Modo IA ── */}
            {modoEntrada === 'ia' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Upload do PDF ou foto do boletim — a IA extrai as médias finais automaticamente. Pode repetir para cada ano letivo.
                </p>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:bg-muted transition-colors">
                    <Upload className="w-4 h-4" />
                    {arquivoBoletim ? arquivoBoletim.name : 'Upload PDF ou foto do boletim'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden"
                           onChange={e => {
                             const f = e.target.files?.[0]
                             if (f && TIPOS_ARQUIVO.includes(f.type) && f.size <= MAX_MB * 1024 * 1024) {
                               setArquivoBoletim(f)
                               setBoletinsExtraidos([])
                               setBoletinsSalvos(false)
                             }
                           }} />
                  </label>
                  {arquivoBoletim && !processandoBoletim && (
                    <button onClick={digitalizarBoletim}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
                      <Loader2 className="w-4 h-4" /> Extrair notas com IA
                    </button>
                  )}
                  {processandoBoletim && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" /> Analisando o documento...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Modo Manual ── */}
            {modoEntrada === 'manual' && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Preencha as disciplinas manualmente. Use este modo quando não tiver o PDF disponível ou preferir digitar direto.
                </p>
                <button
                  onClick={adicionarLinhaManual}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-blue-400 text-blue-600 dark:text-blue-400 text-sm font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  + Adicionar disciplina
                </button>
              </div>
            )}

            {/* ── Tabela compartilhada (IA e Manual) ── */}
            {(boletinsExtraidos.length > 0 || modoEntrada === 'manual') && (
              <div className="space-y-3">
                {boletinsExtraidos.length > 0 && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {modoEntrada === 'ia'
                        ? `${boletinsExtraidos.length} registros extraídos — revise antes de salvar:`
                        : `${boletinsExtraidos.length} ${boletinsExtraidos.length === 1 ? 'disciplina' : 'disciplinas'} — revise e salve:`}
                    </p>
                    {boletinsSalvos && (
                      <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                        <CheckCircle className="w-4 h-4" /> Salvo
                      </div>
                    )}
                  </div>
                )}

                {boletinsExtraidos.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {['Disciplina', 'Série', 'Ano', 'Média Final', 'Situação', ''].map(h => (
                            <th key={h} className="text-left pb-2 px-2 font-semibold text-muted-foreground text-xs">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {boletinsExtraidos.map((b, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition-colors">
                            <td className="py-1.5 px-2">
                              <input value={b.disciplina} onChange={e => atualizarBoletim(i, 'disciplina', e.target.value)}
                                     placeholder="Ex: Matemática"
                                     className="w-full px-2 py-1 rounded border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="py-1.5 px-2">
                              <input value={b.serie} onChange={e => atualizarBoletim(i, 'serie', e.target.value)}
                                     placeholder="2ª série - Ensino Médio"
                                     className="w-36 px-2 py-1 rounded border border-border bg-background text-foreground text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="py-1.5 px-2">
                              <input type="number" value={b.ano_letivo} onChange={e => atualizarBoletim(i, 'ano_letivo', Number(e.target.value))}
                                     className="w-16 px-2 py-1 rounded border border-border bg-background text-foreground text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                            </td>
                            <td className="py-1.5 px-2">
                              <input type="number" step="0.1" min="0" max="10" value={b.media_final}
                                     onChange={e => atualizarBoletim(i, 'media_final', parseFloat(e.target.value))}
                                     className={`w-20 px-2 py-1 rounded border border-border bg-background text-xs text-center font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500
                                       ${Number(b.media_final) >= 7 ? 'text-green-600 dark:text-green-400' : Number(b.media_final) >= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`} />
                            </td>
                            <td className="py-1.5 px-2">
                              <select value={b.situacao} onChange={e => atualizarBoletim(i, 'situacao', e.target.value as any)}
                                      className="px-2 py-1 rounded border border-border bg-background text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value="aprovado">Aprovado</option>
                                <option value="reprovado">Reprovado</option>
                                <option value="recuperacao">Recuperação</option>
                                <option value="cursando">Cursando</option>
                              </select>
                            </td>
                            <td className="py-1.5 px-2">
                              <button onClick={() => removerBoletim(i)} className="text-muted-foreground hover:text-red-500 transition-colors p-1 rounded">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Botão "+ Adicionar" disponível em ambos os modos */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={adicionarLinhaManual}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    + Adicionar disciplina
                  </button>
                  {boletinsExtraidos.length > 0 && !boletinsSalvos && (
                    <button onClick={salvarBoletins}
                            className="px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors">
                      Confirmar e salvar {boletinsExtraidos.length} {boletinsExtraidos.length === 1 ? 'registro' : 'registros'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Ações rodapé */}
          <div className="flex items-center justify-between pt-2">
            <button onClick={() => { setArquivoBoletim(null); setBoletinsExtraidos([]); setBoletinsSalvos(false) }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Edit2 className="w-4 h-4" /> Adicionar outro boletim / ano
            </button>
            <button onClick={() => setEtapa('externo')}
                    className="px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors">
              Próximo: Escola Anterior →
            </button>
          </div>
        </div>
      )}

      {/* ─────────────── ETAPA 3: ESCOLA ANTERIOR ───────────────── */}
      {etapa === 'externo' && alunoSelecionado && (
        <div className="space-y-4">
          {/* HistoricoIA embutido — sem troca de tela, sem copiar ID */}
          <HistoricoIA
            usuario={usuario}
            alunoHistoricoId={alunoSelecionado.id}
            alunoHistoricoNome={alunoSelecionado.nome}
            modoEmbutido
          />

          <div className="flex justify-center pt-2">
            <button onClick={() => setEtapa('concluido')}
                    className="px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Concluir digitalização
            </button>
          </div>
        </div>
      )}

      {/* ─────────────── CONCLUÍDO ──────────────────────────────── */}
      {etapa === 'concluido' && alunoSelecionado && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500" />
          <h3 className="text-xl font-bold text-foreground">Digitalização concluída!</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            O arquivo histórico de <strong>{alunoSelecionado.nome}</strong> foi criado. Os boletins e histórico escolar estão salvos e prontos para gerar o histórico retroativo completo.
          </p>
          <button onClick={() => { setEtapa('aluno'); setAlunoSelecionado(null); setBuscaTermo(''); setBoletinsExtraidos([]); setBoletinsSalvos(false); setArquivoFicha(null); setArquivoBoletim(null); setDadosFicha({ segmento: usuario.segmento }) }}
                  className="mt-2 px-5 py-2.5 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors">
            Digitalizar outro aluno
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Campo({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
             className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Extrai o primeiro bloco JSON válido (array ou objeto) de qualquer resposta
 * do Claude — mesmo quando ele coloca texto explicativo antes ou depois.
 */
function limparJson(texto: string): string {
  // 1. Remove blocos markdown ```json ... ```
  let s = texto.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  // 2. Tenta extrair array JSON ( [...] )
  const startArr = s.indexOf('[')
  const endArr   = s.lastIndexOf(']')
  if (startArr !== -1 && endArr > startArr) {
    return s.slice(startArr, endArr + 1)
  }

  // 3. Fallback: tenta extrair objeto JSON ( {...} )
  const startObj = s.indexOf('{')
  const endObj   = s.lastIndexOf('}')
  if (startObj !== -1 && endObj > startObj) {
    return s.slice(startObj, endObj + 1)
  }

  return s
}

function normalizarFicha(raw: unknown): Partial<AlunoHistorico> {
  if (typeof raw !== 'object' || raw === null) throw new Error('Resposta inválida da IA ao digitalizar ficha.')
  const obj = raw as Record<string, unknown>
  const motivoRaw = String(obj.motivo_saida ?? '').toLowerCase().trim()
  const motivo_saida = (['conclusao', 'transferencia', 'desistencia', 'outro'] as const)
    .includes(motivoRaw as 'conclusao') ? motivoRaw as AlunoHistorico['motivo_saida'] : 'outro'
  return {
    nome:            obj.nome ? String(obj.nome).trim() : undefined,
    data_nascimento: obj.data_nascimento ? String(obj.data_nascimento) : undefined,
    cpf:             obj.cpf ? String(obj.cpf) : undefined,
    filiacao:        obj.filiacao ? String(obj.filiacao) : undefined,
    serie_saida:     obj.serie_saida ? String(obj.serie_saida) : undefined,
    ano_saida:       Number(obj.ano_saida) || undefined,
    motivo_saida,
  }
}

function normalizarBoletim(d: unknown): BoletimsExtraido {
  const obj = (typeof d === 'object' && d !== null ? d : {}) as Record<string, unknown>
  const situacaoRaw = String(obj.situacao ?? '').toLowerCase()
  const situacao: BoletimsExtraido['situacao'] =
    situacaoRaw.includes('reprov') ? 'reprovado'
    : situacaoRaw.includes('recup') ? 'recuperacao'
    : situacaoRaw.includes('curs') ? 'cursando'
    : 'aprovado'
  return {
    disciplina:  String(obj.disciplina ?? ''),
    serie:       String(obj.serie ?? ''),
    ano_letivo:  Number(obj.ano_letivo) || new Date().getFullYear() - 1,
    media_final: parseFloat(String(obj.media_final).replace(',', '.')) || 0,
    situacao,
  }
}
