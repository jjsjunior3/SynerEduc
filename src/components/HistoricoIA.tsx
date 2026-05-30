import { useState, useRef } from 'react'
import { supabase } from '../supabase/supabaseClient'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Usuario {
  id: string
  nome: string
  tipo: string
  segmento: 'ead' | 'presencial'
}

interface DisciplinaExtrada {
  disciplina: string
  ano_letivo: string | number
  serie: string
  carga_horaria: string | number
  media_final: string | number
  faltas?: string | number
  situacao: string
}

interface HistoricoExterno {
  nome_aluno: string
  data_nascimento: string
  nome_escola_anterior: string
  municipio_escola: string
  uf_escola: string
  cnpj_escola?: string
  nivel_ensino: string
  disciplinas: DisciplinaExtrada[]
  observacoes?: string
}

interface Props {
  usuario: Usuario
  alunoId?: string
  aluno_nome?: string
}

const TIPOS_ACEITOS = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
const TAMANHO_MAX_MB = 10

export default function HistoricoIA({ usuario, alunoId, aluno_nome }: Props) {
  const [etapa, setEtapa] = useState<'upload' | 'processando' | 'revisao' | 'salvo'>('upload')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [progresso, setProgresso] = useState<string>('')
  const [historico, setHistorico] = useState<HistoricoExterno | null>(null)
  const [alunoVinculadoId, setAlunoVinculadoId] = useState<string>(alunoId ?? '')
  const [alunoVinculadoNome, setAlunoVinculadoNome] = useState<string>(aluno_nome ?? '')
  const [buscandoAluno, setBuscandoAluno] = useState(false)
  const [resultadosAluno, setResultadosAluno] = useState<{ id: string; nome: string }[]>([])
  const [termoBuscaAluno, setTermoBuscaAluno] = useState(aluno_nome ?? '')

  const inputArquivo = useRef<HTMLInputElement>(null)

  function handleArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(null)
    if (!TIPOS_ACEITOS.includes(file.type)) {
      setErro('Formato não suportado. Use PDF, JPG, PNG ou WebP.')
      return
    }
    if (file.size > TAMANHO_MAX_MB * 1024 * 1024) {
      setErro(`Arquivo muito grande. Máximo: ${TAMANHO_MAX_MB} MB.`)
      return
    }
    setArquivo(file)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  async function buscarAluno(termo: string) {
    setTermoBuscaAluno(termo)
    if (termo.length < 2) { setResultadosAluno([]); return }
    setBuscandoAluno(true)
    try {
      let q = supabase
        .from('users')
        .select('id, nome')
        .eq('tipo', 'aluno')
        .ilike('nome', `%${termo}%`)
        .limit(8)
      if (usuario.tipo !== 'administrador') q = q.eq('segmento', usuario.segmento)
      const { data } = await q
      setResultadosAluno(data ?? [])
    } finally {
      setBuscandoAluno(false)
    }
  }

  async function arquivoParaBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  async function analisarDocumento() {
    if (!arquivo) return
    setErro(null)
    setEtapa('processando')
    setProgresso('Preparando o arquivo...')

    try {
      const base64 = await arquivoParaBase64(arquivo)
      const isPdf = arquivo.type === 'application/pdf'

      setProgresso('Enviando para análise com IA...')

      const prompt = `Você é um assistente especializado em análise de documentos escolares brasileiros.

Analise o histórico escolar fornecido e extraia TODAS as informações disponíveis.

Retorne APENAS um objeto JSON válido, sem texto antes ou depois, sem blocos de código markdown.

O JSON deve seguir exatamente esta estrutura:
{
  "nome_aluno": "Nome completo do aluno",
  "data_nascimento": "DD/MM/AAAA ou vazio se não encontrado",
  "nome_escola_anterior": "Nome da escola",
  "municipio_escola": "Cidade",
  "uf_escola": "UF (2 letras)",
  "cnpj_escola": "CNPJ se disponível, senão vazio",
  "nivel_ensino": "fundamental ou medio",
  "disciplinas": [
    {
      "disciplina": "Nome da disciplina",
      "ano_letivo": 2023,
      "serie": "Ex: 1 Ano, 2 Serie",
      "carga_horaria": 80,
      "media_final": 7.5,
      "faltas": 10,
      "situacao": "Aprovado"
    }
  ],
  "observacoes": "Qualquer nota relevante do documento"
}

Regras:
- situacao deve ser exatamente: Aprovado, Reprovado ou Cursando
- Se um campo não estiver no documento, use string vazia ou 0 para números
- Extraia TODAS as disciplinas de TODOS os anos presentes
- Médias devem ser números (ex: 7.5 não virgula)
- Carga horária deve ser número inteiro
- ano_letivo deve ser número inteiro
- Não invente dados que não estejam no documento`

      // Chama a Edge Function (chave Anthropic fica segura no servidor)
      const { data, error: fnError } = await supabase.functions.invoke('claude-proxy', {
        body: {
          conteudo_base64: base64,
          media_type:      arquivo.type,
          is_pdf:          isPdf,
          prompt,
        },
      })

      if (fnError) throw new Error(fnError.message ?? 'Erro ao chamar Edge Function.')
      if (data?.erro) throw new Error(data.erro)

      setProgresso('Processando resposta...')

      const textoResposta: string = data?.texto ?? ''

      const jsonLimpo = textoResposta
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()

      let dadosExtraidos: HistoricoExterno
      try {
        dadosExtraidos = JSON.parse(jsonLimpo)
      } catch {
        throw new Error('A IA retornou um formato inesperado. Tente novamente ou use um arquivo mais legível.')
      }

      if (!Array.isArray(dadosExtraidos.disciplinas)) dadosExtraidos.disciplinas = []

      setHistorico(dadosExtraidos)

      if (!alunoId && dadosExtraidos.nome_aluno) {
        setTermoBuscaAluno(dadosExtraidos.nome_aluno)
        await buscarAluno(dadosExtraidos.nome_aluno)
      }

      setEtapa('revisao')
    } catch (err: any) {
      setErro(err.message ?? 'Erro inesperado ao analisar o documento.')
      setEtapa('upload')
    }
  }

  function atualizarCampoGeral(campo: keyof Omit<HistoricoExterno, 'disciplinas'>, valor: string) {
    setHistorico((prev) => prev ? { ...prev, [campo]: valor } : prev)
  }

  function atualizarDisciplina(index: number, campo: keyof DisciplinaExtrada, valor: string | number) {
    setHistorico((prev) => {
      if (!prev) return prev
      const novas = [...prev.disciplinas]
      novas[index] = { ...novas[index], [campo]: valor }
      return { ...prev, disciplinas: novas }
    })
  }

  function removerDisciplina(index: number) {
    setHistorico((prev) => prev ? { ...prev, disciplinas: prev.disciplinas.filter((_, i) => i !== index) } : prev)
  }

  function adicionarDisciplina() {
    setHistorico((prev) => prev ? {
      ...prev,
      disciplinas: [...prev.disciplinas, {
        disciplina: '', ano_letivo: new Date().getFullYear() - 1,
        serie: '', carga_horaria: 0, media_final: 0, faltas: 0, situacao: 'Aprovado',
      }],
    } : prev)
  }

  async function salvarHistorico() {
    if (!historico || (!alunoVinculadoId && !alunoId)) {
      setErro('Vincule um aluno antes de salvar.')
      return
    }
    setProgresso('Salvando...')

    try {
      let arquivo_url = ''
      if (arquivo) {
        const ext = arquivo.name.split('.').pop()
        const path = `${alunoVinculadoId || alunoId}/${Date.now()}.${ext}`
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('historicos-externos')
          .upload(path, arquivo, { upsert: true })
        if (!uploadErr && uploadData) {
          const { data: urlData } = supabase.storage.from('historicos-externos').getPublicUrl(path)
          arquivo_url = urlData.publicUrl
        }
      }

      const { error } = await supabase.from('historico_externo').insert({
        aluno_id: alunoVinculadoId || alunoId,
        nome_aluno: historico.nome_aluno,
        data_nascimento: historico.data_nascimento || null,
        nome_escola_anterior: historico.nome_escola_anterior,
        municipio_escola: historico.municipio_escola,
        uf_escola: historico.uf_escola,
        cnpj_escola: historico.cnpj_escola || null,
        nivel_ensino: historico.nivel_ensino,
        disciplinas: historico.disciplinas,
        observacoes: historico.observacoes || null,
        arquivo_url,
        criado_por: usuario.id,
        segmento: usuario.segmento,
      })

      if (error) throw error
      setEtapa('salvo')
    } catch (err: any) {
      setErro(err.message ?? 'Erro ao salvar. Tente novamente.')
    } finally {
      setProgresso('')
    }
  }

  function resetar() {
    setEtapa('upload')
    setArquivo(null)
    setPreviewUrl(null)
    setHistorico(null)
    setErro(null)
    setAlunoVinculadoId(alunoId ?? '')
    setAlunoVinculadoNome(aluno_nome ?? '')
    setTermoBuscaAluno(aluno_nome ?? '')
    setResultadosAluno([])
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            Histórico Escolar com IA
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Faça o upload do histórico da escola anterior — a IA extrai os dados automaticamente para revisão.
          </p>
        </div>
        {etapa !== 'upload' && etapa !== 'salvo' && (
          <button
            onClick={resetar}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors"
          >
            Recomeçar
          </button>
        )}
      </div>

      {/* Erro global */}
      {erro && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20
                        border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-200">
          <span className="text-lg">erro</span>
          <p>{erro}</p>
        </div>
      )}

      {/* ETAPA UPLOAD */}
      {etapa === 'upload' && (
        <div className="space-y-5">
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/20
                          border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
            <div>
              <p className="font-medium mb-1">Como funciona:</p>
              <ol className="list-decimal list-inside space-y-0.5 text-blue-700 dark:text-blue-300">
                <li>Faça upload do PDF ou foto do histórico escolar da escola anterior</li>
                <li>A IA (Claude) extrai automaticamente as disciplinas, notas e informações</li>
                <li>Você revisa e corrige os dados antes de salvar</li>
                <li>Os dados são salvos e integrados ao histórico completo do aluno</li>
              </ol>
            </div>
          </div>

          <div
            onClick={() => inputArquivo.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              const file = e.dataTransfer.files[0]
              if (file) handleArquivo({ target: { files: [file] } } as any)
            }}
            className="border-2 border-dashed border-border rounded-xl p-10 text-center cursor-pointer
                       hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200"
          >
            <p className="text-base font-medium text-foreground">Clique ou arraste o arquivo aqui</p>
            <p className="text-sm text-muted-foreground mt-1">
              PDF, JPG, PNG ou WebP — máximo {TAMANHO_MAX_MB} MB
            </p>
            <input ref={inputArquivo} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
                   onChange={handleArquivo} className="hidden" />
          </div>

          {arquivo && (
            <div className="flex items-center gap-4 px-4 py-3 rounded-lg bg-card border border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{arquivo.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(arquivo.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); setArquivo(null); setPreviewUrl(null) }}
                      className="text-muted-foreground hover:text-red-500 transition-colors">X</button>
            </div>
          )}

          {previewUrl && (
            <div className="rounded-xl overflow-hidden border border-border max-h-64">
              <img src={previewUrl} alt="Preview" className="w-full object-contain max-h-64" />
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={analisarDocumento}
              disabled={!arquivo}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm
                         bg-blue-600 hover:bg-blue-700 text-white transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Analisar com IA
            </button>
          </div>
        </div>
      )}

      {/* ETAPA PROCESSANDO */}
      {etapa === 'processando' && (
        <div className="flex flex-col items-center justify-center py-20 gap-6">
          <div className="w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <div className="text-center">
            <p className="text-base font-semibold text-foreground">Analisando documento...</p>
            <p className="text-sm text-muted-foreground mt-1">{progresso}</p>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs text-center">
            A IA está lendo o histórico escolar e estruturando os dados. Isso pode levar alguns segundos.
          </p>
        </div>
      )}

      {/* ETAPA REVISAO */}
      {etapa === 'revisao' && historico && (
        <div className="space-y-6">
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20
                          border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
            <p>
              Revise os dados extraídos pela IA. Corrija qualquer campo necessário antes de salvar.
              A IA nunca salva dados automaticamente — você tem controle total.
            </p>
          </div>

          {/* Dados gerais */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Dados do Aluno e Escola Anterior
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CampoInput label="Nome do Aluno" value={String(historico.nome_aluno ?? '')}
                     onChange={(v) => atualizarCampoGeral('nome_aluno', v)} />
              <CampoInput label="Data de Nascimento" value={String(historico.data_nascimento ?? '')}
                     onChange={(v) => atualizarCampoGeral('data_nascimento', v)} placeholder="DD/MM/AAAA" />
              <CampoInput label="Nome da Escola Anterior" value={String(historico.nome_escola_anterior ?? '')}
                     onChange={(v) => atualizarCampoGeral('nome_escola_anterior', v)} />
              <div className="grid grid-cols-2 gap-3">
                <CampoInput label="Município" value={String(historico.municipio_escola ?? '')}
                       onChange={(v) => atualizarCampoGeral('municipio_escola', v)} />
                <CampoInput label="UF" value={String(historico.uf_escola ?? '')}
                       onChange={(v) => atualizarCampoGeral('uf_escola', v)} placeholder="MA" />
              </div>
              <CampoInput label="CNPJ da Escola (opcional)" value={String(historico.cnpj_escola ?? '')}
                     onChange={(v) => atualizarCampoGeral('cnpj_escola', v)} placeholder="00.000.000/0001-00" />
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Nível de Ensino</label>
                <select value={historico.nivel_ensino}
                        onChange={(e) => atualizarCampoGeral('nivel_ensino', e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background
                                   text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="fundamental">Ensino Fundamental</option>
                  <option value="medio">Ensino Médio</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <CampoInput label="Observações" value={String(historico.observacoes ?? '')}
                       onChange={(v) => atualizarCampoGeral('observacoes', v)}
                       placeholder="Observações do documento..." />
              </div>
            </div>
          </div>

          {/* Vincular aluno */}
          {!alunoId && (
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Vincular ao Aluno no Sistema *
              </h3>
              <p className="text-xs text-muted-foreground">
                Busque o aluno cadastrado no SynerEduc para vincular este histórico.
              </p>
              <div className="relative">
                <input type="text" value={termoBuscaAluno}
                       onChange={(e) => buscarAluno(e.target.value)}
                       placeholder="Digite o nome do aluno..."
                       className="w-full px-3 py-2 rounded-lg border border-border bg-background
                                  text-foreground text-sm placeholder:text-muted-foreground
                                  focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {buscandoAluno && (
                  <div className="absolute right-3 top-2.5">
                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
                {resultadosAluno.length > 0 && !alunoVinculadoId && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                    {resultadosAluno.map((a) => (
                      <button key={a.id}
                              onClick={() => {
                                setAlunoVinculadoId(a.id)
                                setAlunoVinculadoNome(a.nome)
                                setTermoBuscaAluno(a.nome)
                                setResultadosAluno([])
                              }}
                              className="w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted transition-colors">
                        {a.nome}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {alunoVinculadoId && (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <span>Vinculado a: <strong>{alunoVinculadoNome}</strong></span>
                  <button onClick={() => { setAlunoVinculadoId(''); setAlunoVinculadoNome(''); setTermoBuscaAluno('') }}
                          className="ml-2 text-muted-foreground hover:text-red-500 text-xs">(alterar)</button>
                </div>
              )}
            </div>
          )}

          {/* Tabela de disciplinas */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                Disciplinas Extraídas ({historico.disciplinas.length})
              </h3>
              <button onClick={adicionarDisciplina}
                      className="text-xs px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30
                                 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800
                                 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                + Adicionar linha
              </button>
            </div>

            {historico.disciplinas.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                Nenhuma disciplina extraída. Adicione manualmente.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {['Disciplina','Ano','Série','C.H.','Média','Faltas','Situação',''].map((h) => (
                        <th key={h} className="text-left pb-2 px-2 text-xs font-semibold text-muted-foreground first:pl-0">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historico.disciplinas.map((d, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="py-1.5 pr-2">
                          <input value={String(d.disciplina)}
                                 onChange={(e) => atualizarDisciplina(i, 'disciplina', e.target.value)}
                                 className="w-full px-2 py-1 rounded border border-border bg-background
                                            text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" value={d.ano_letivo}
                                 onChange={(e) => atualizarDisciplina(i, 'ano_letivo', Number(e.target.value))}
                                 className="w-16 px-2 py-1 rounded border border-border bg-background
                                            text-foreground text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input value={String(d.serie)}
                                 onChange={(e) => atualizarDisciplina(i, 'serie', e.target.value)}
                                 className="w-20 px-2 py-1 rounded border border-border bg-background
                                            text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" value={d.carga_horaria}
                                 onChange={(e) => atualizarDisciplina(i, 'carga_horaria', Number(e.target.value))}
                                 className="w-14 px-2 py-1 rounded border border-border bg-background
                                            text-foreground text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" step="0.1" value={d.media_final}
                                 onChange={(e) => atualizarDisciplina(i, 'media_final', parseFloat(e.target.value))}
                                 className="w-14 px-2 py-1 rounded border border-border bg-background
                                            text-foreground text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="py-1.5 px-2">
                          <input type="number" value={d.faltas ?? 0}
                                 onChange={(e) => atualizarDisciplina(i, 'faltas', Number(e.target.value))}
                                 className="w-14 px-2 py-1 rounded border border-border bg-background
                                            text-foreground text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </td>
                        <td className="py-1.5 px-2">
                          <select value={d.situacao}
                                  onChange={(e) => atualizarDisciplina(i, 'situacao', e.target.value)}
                                  className="px-2 py-1 rounded border border-border bg-background
                                             text-foreground text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
                            <option value="Aprovado">Aprovado</option>
                            <option value="Reprovado">Reprovado</option>
                            <option value="Cursando">Cursando</option>
                          </select>
                        </td>
                        <td className="py-1.5 pl-2">
                          <button onClick={() => removerDisciplina(i)}
                                  className="text-muted-foreground hover:text-red-500 transition-colors text-sm">
                            X
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-muted-foreground">
              O arquivo original será armazenado junto com os dados extraídos.
            </p>
            <button
              onClick={salvarHistorico}
              disabled={!alunoVinculadoId && !alunoId}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm
                         bg-green-600 hover:bg-green-700 text-white transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Confirmar e Salvar
            </button>
          </div>
        </div>
      )}

      {/* ETAPA SALVO */}
      {etapa === 'salvo' && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <h3 className="text-xl font-bold text-foreground">Histórico salvo com sucesso!</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Os dados do histórico escolar da escola anterior foram salvos e vinculados ao aluno{' '}
            <strong>{alunoVinculadoNome || historico?.nome_aluno}</strong>.
          </p>
          <button
            onClick={resetar}
            className="mt-4 px-5 py-2.5 rounded-lg border border-border text-sm text-foreground
                       hover:bg-muted transition-colors"
          >
            Analisar outro documento
          </button>
        </div>
      )}
    </div>
  )
}

function CampoInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)}
             placeholder={placeholder}
             className="w-full px-3 py-2 rounded-lg border border-border bg-background
                        text-foreground text-sm placeholder:text-muted-foreground
                        focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  )
}