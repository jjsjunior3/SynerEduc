// EmissaoDocumentos.tsx — SynerEduc Fase 10
// v3 — Dados da fichas_matricula, logo real via URL pública, rodapé fixo no final

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabase/supabaseClient'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Usuario {
  id: string
  nome: string
  tipo: string
  segmento: 'ead' | 'presencial'
}

// Dados vindos exclusivamente da fichas_matricula
interface DadosFicha {
  // Identificação
  nome_aluno: string
  data_nascimento: string   // date ISO
  cpf_aluno: string
  filiacao: string          // "Mae e Pai" — campo único da tabela
  // Escolaridade (campos da ficha)
  serie: string             // nome textual ex: "9º ano"
  turno: string
  segmento: string          // 'ead' | 'presencial'
  ano_letivo: number
  // Financeiro (buscado separado)
  mensalidades?: { vencimento: string; pago_em: string; valor: number }[]
  // Notas (buscado separado para histórico)
  notas?: { disciplina: string; serie: string; ano: number; media: number; carga_horaria: number; faltas: number }[]
  // ID do aluno vinculado (pode ser null se ficha sem aluno)
  aluno_id?: string | null
}

interface Props { usuario: Usuario }

// ─── Tipos de documento ───────────────────────────────────────────────────────

type TipoDoc = 'declaracao' | 'transferencia' | 'quitacao' | 'atestado_vaga' | 'certificado' | 'historico'

const DOCS: { tipo: TipoDoc; label: string; icone: string; descricao: string }[] = [
  { tipo: 'declaracao',    label: 'Declaração',                  icone: '📄', descricao: 'Aluno está matriculado e cursando.' },
  { tipo: 'transferencia', label: 'Declaração de Transferência', icone: '🔄', descricao: 'Frequentou e tem direito à matrícula na série seguinte.' },
  { tipo: 'quitacao',      label: 'Declaração de Quitação',      icone: '💰', descricao: 'Quitação anual de débitos financeiros.' },
  { tipo: 'atestado_vaga', label: 'Atestado de Vaga',            icone: '🏫', descricao: 'Confirma vaga disponível. Aluno pode não estar cadastrado.' },
  { tipo: 'certificado',   label: 'Certificado de Conclusão',    icone: '🏅', descricao: 'Certificado formal de conclusão de nível.' },
  { tipo: 'historico',     label: 'Histórico Escolar',           icone: '📚', descricao: 'Histórico com notas de todos os anos na Conexão.' },
]

// ─── Constantes da escola ─────────────────────────────────────────────────────

const ESCOLA = {
  nome:        'Colégio Conexão Maranhense',
  cnpj:        '08.660.860/0001-63',
  cee:         '67/2019',
  endereco:    'Avenida João Pessoa, 262 - Outeiro Da Cruz',
  cidade:      'São Luís – Maranhão',
  inep:        '21612668',
  diretora:    'Ariane M.S.S Alencar',
  cargo_dir:   'Diretora Geral',
  coordenador: 'José João Santos Júnior',
  cargo_coord: 'Coordenador Ensino Médio',
  ie:          'Nº 252/2018',
  polo_cnpj:   '24.095.205/0001-66',
  polo_nome:   'POLO SÃO LUÍS',
  // URL pública da logo no Supabase Storage — ajuste conforme seu bucket
  logo_url:    '/logo-colegio-conexao.png',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtData(iso?: string | null) {
  if (!iso) return '___/___/______'
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('pt-BR')
}
function fmtMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function dataExtenso() {
  const now = new Date()
  const meses = ['janeiro','fevereiro','março','abril','maio','junho',
                 'julho','agosto','setembro','outubro','novembro','dezembro']
  return `São Luís, ${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`
}
function cap(s = '') { return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '' }

// Detecta nível pelo nome da série
function detectarNivel(serie: string): 'Fundamental' | 'Médio' {
  const s = (serie ?? '').toLowerCase()
  if (s.includes('médio') || s.includes('medio') || s.includes('eja médio') || s.includes('eja medio')) return 'Médio'
  return 'Fundamental'
}

// ─── CSS e blocos HTML do documento ──────────────────────────────────────────

const CSS = `
<style>
  @page { size: A4; margin: 18mm 22mm 12mm 22mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 12pt; color: #000; background: #fff; }

  /* Estrutura geral — flex coluna para empurrar rodapé ao final */
  .pagina { width: 100%; min-height: 100vh; display: flex; flex-direction: column; }
  .conteudo { flex: 1; display: flex; flex-direction: column; }

  /* ── Cabeçalho centralizado ── */
  .topo {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 18px;
    border-bottom: 2px solid #000;
    padding-bottom: 10px;
    margin-bottom: 8px;
    text-align: center;
  }
  .topo img { width: 72px; height: 72px; object-fit: contain; flex-shrink: 0; }
  .topo-info { text-align: center; }
  .topo-info h1 { font-size: 20pt; font-weight: bold; }
  .topo-info p { font-size: 9.5pt; line-height: 1.65; }

  /* ── Área central — ocupa espaço disponível e centraliza verticalmente ── */
  .area-central {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0 10px;
  }

  /* ── Título DECLARAÇÃO ── */
  .titulo-doc {
    text-align: center;
    font-size: 14pt;
    font-weight: bold;
    text-decoration: underline;
    text-transform: uppercase;
    letter-spacing: 0;
    margin: 0 0 36px 0;
  }

  /* ── Corpo ── */
  .corpo { line-height: 2; font-size: 12pt; text-align: justify; }
  .corpo p { margin-bottom: 12px; text-indent: 50px; }
  .corpo p.sem-indent { text-indent: 0; }
  .negrito { font-weight: bold; }

  /* ── Assinatura próxima ao rodapé legal ── */
  .rodape-doc { margin-top: 40px; }
  .data { text-align: right; font-size: 12pt; margin-bottom: 50px; }
  .assinaturas { display: flex; justify-content: space-around; }
  .ass-bloco { text-align: center; min-width: 220px; }
  .ass-linha { border-top: 1px solid #000; padding-top: 5px; font-size: 11pt; font-weight: bold; }
  .ass-sub { font-size: 10pt; font-weight: normal; }

  /* ── Tabela financeira ── */
  .tabela { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11pt; }
  .tabela th { background: #ccc; border: 1px solid #888; padding: 5px 8px; font-weight: bold; text-align: left; }
  .tabela td { border: 1px solid #888; padding: 5px 8px; }
  .tabela tr:nth-child(even) td { background: #f2f2f2; }
  .tabela .total td { font-weight: bold; background: #ddd !important; border-top: 2px solid #555; }

  /* ── Rodapé legal — sempre ao final ── */
  .rodape-legal {
    margin-top: 20px;
    padding-top: 10px;
    border-top: 1px solid #aaa;
    font-size: 8pt;
    line-height: 1.5;
    color: #444;
  }

  /* ── Certificado ── */
  .cert-nome { text-align: center; font-size: 20pt; font-weight: bold; border-bottom: 2px solid #000; padding-bottom: 8px; margin: 24px 0 8px; }
  .cert-sub { text-align: center; font-size: 11pt; color: #333; margin-bottom: 20px; }

  /* ── Info bloco histórico ── */
  .info-bloco { border: 1px solid #888; padding: 10px 14px; font-size: 11pt; margin-bottom: 16px; line-height: 1.8; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>`

function topoHtml(logoUrl: string) {
  return `<div class="topo">
  <img src="${logoUrl}" alt="Logo Colégio Conexão" onerror="this.style.display='none'" />
  <div class="topo-info">
    <h1>${ESCOLA.nome}</h1>
    <p>CNPJ ${ESCOLA.cnpj} - Reconhecido pelo CEE Nº ${ESCOLA.cee}</p>
    <p>${ESCOLA.endereco}</p>
    <p>${ESCOLA.cidade} &nbsp;&nbsp; Inep: ${ESCOLA.inep}</p>
  </div>
</div>`
}

const RODAPE_LEGAL_HTML = `<div class="rodape-legal">
  Reconhecido pelo Conselho Estadual de Educação sobre o cumprimento do nº ${ESCOLA.cee} CEE/MA.
  Centro de Ensino Conexão Eirele. Ensino Fundamental 1º ao 9º ano. Ensino Médio Regular e Modalidade Jovens e Adultos-EJA.
  Documento Isento de Autenticação pela Inspeção Escolar com base na Resolução nº 252/2018 – CEE – MA de 21 de março 2019.
</div>`

function wrap(body: string, logoUrl: string) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">${CSS}</head><body>
<div class="pagina">
  <div class="conteudo">
    ${topoHtml(logoUrl)}
    <div class="area-central">
      ${body}
    </div>
  </div>
  ${RODAPE_LEGAL_HTML}
</div>
</body></html>`
}

// ─── Geradores de documento ───────────────────────────────────────────────────

function gerarDeclaracao(f: DadosFicha, anoLetivo: number, logoUrl: string): string {
  const nivel = detectarNivel(f.serie)
  return wrap(`
  <div class="titulo-doc">DECLARAÇÃO</div>
  <div class="corpo">
    <p>Declaro para os devidos fins que, o (a) aluno (a), <span class="negrito">${f.nome_aluno},</span>
    nascido (a) em ${fmtData(f.data_nascimento)}, está matriculado (a) neste estabelecimento de Ensino
    no <span class="negrito">${f.serie}</span> do Ensino ${nivel},
    turma A, no turno ${cap(f.turno)}, no ano letivo de ${anoLetivo}.</p>
    <p>Sendo só a declara.</p>
  </div>
  <div class="rodape-doc">
    <div class="data">${dataExtenso()}.</div>
    <div class="assinaturas">
      <div class="ass-bloco">
        <div class="ass-linha">${ESCOLA.diretora}<br/>
        <span class="ass-sub">CNPJ: ${ESCOLA.cnpj}<br/>${ESCOLA.cargo_dir}</span></div>
      </div>
    </div>
  </div>`, logoUrl)
}

function gerarTransferencia(f: DadosFicha, anoLetivo: number, serieProxima: string, logoUrl: string): string {
  const nivel = detectarNivel(f.serie)
  const dtValidade = (() => {
    const dt = new Date(); dt.setDate(dt.getDate() + 15)
    return fmtData(dt.toISOString().split('T')[0])
  })()
  return wrap(`
  <div class="titulo-doc">DECLARAÇÃO</div>
  <div class="corpo">
    <p>Declaramos para os devidos fins que o (a), <span class="negrito">${f.nome_aluno},</span>
    nascido (a) no dia ${fmtData(f.data_nascimento)}, frequentou as aulas na
    <span class="negrito">${f.serie}</span> do Ensino ${nivel},
    sendo aluno (a) na turma A, turno ${cap(f.turno)}, nesta Instituição de Ensino,
    frequentando regularmente as aulas no ano de ${anoLetivo}.</p>
    <p>Foi requerido o histórico escolar que estará à disposição no prazo de 60 dias a partir desta data.
    O (a) tem direito a matrícula na <span class="negrito">${serieProxima}</span> do Ensino ${nivel}.</p>
  </div>
  <div class="rodape-doc">
    <div class="data">${dataExtenso()}. &nbsp;&nbsp;&nbsp; Validade: ${dtValidade}</div>
    <div class="assinaturas">
      <div class="ass-bloco">
        <div class="ass-linha">${ESCOLA.diretora}<br/>
        <span class="ass-sub">${ESCOLA.cargo_dir}</span></div>
      </div>
    </div>
  </div>`, logoUrl)
}

function gerarQuitacao(f: DadosFicha, anoLetivo: number, logoUrl: string): string {
  const mens = f.mensalidades ?? []
  const total = mens.reduce((a, m) => a + Number(m.valor), 0)
  const linhas = mens.length > 0
    ? mens.map((m, i) => `<tr>
        <td>${i + 1}ª Parcela</td>
        <td>${fmtData(m.vencimento)}</td>
        <td>${fmtData(m.pago_em)}</td>
        <td style="text-align:right">${fmtMoeda(Number(m.valor))}</td>
      </tr>`).join('')
    : `<tr><td colspan="4" style="text-align:center;color:#888">Nenhum pagamento registrado para ${anoLetivo}.</td></tr>`

  return wrap(`
  <div class="titulo-doc" style="letter-spacing:2px;font-size:13pt">DECLARAÇÃO ANUAL DE DÉBITOS</div>
  <div class="corpo">
    <p>Pelo presente instrumento, <span class="negrito">${ESCOLA.polo_nome}</span>,
    estabelecimento de ensino inscrito no CNPJ sob o nº ${ESCOLA.polo_cnpj},
    situado na AV JOÃO PESSOA, 262 – OUTEIRO DA CRUZ – SÃO LUÍS/MA,
    por seu Representante legal, em cumprimento ao disposto na Lei ${ESCOLA.cee},
    <span class="negrito">DECLARA A QUITAÇÃO</span> da mensalidade/anuidade escolar
    referente ao ano de <span class="negrito">${anoLetivo}</span>,
    nos termos do Contrato de Prestação de Serviços Educacionais celebrado com o (a),
    <span class="negrito">${f.nome_aluno}</span>${f.cpf_aluno ? `, inscrito no CPF/MF sob o nº ${f.cpf_aluno},` : ','}
    que teve objetivo a prestação de serviço de ensino ao (à)
    <span class="negrito">${f.nome_aluno}</span>,
    matriculado (a) no <span class="negrito">${f.serie}</span>, no referido ano.</p>
  </div>
  <table class="tabela">
    <thead><tr><th>Parcela da Anuidade</th><th>Vencimento</th><th>Data Pagamento</th><th>Valor</th></tr></thead>
    <tbody>
      ${linhas}
      ${mens.length > 0 ? `<tr class="total">
        <td colspan="3"><strong>Total pago em ${anoLetivo}</strong></td>
        <td style="text-align:right"><strong>${fmtMoeda(total)}</strong></td>
      </tr>` : ''}
    </tbody>
  </table>
  <div class="rodape-doc">
    <div class="data">${dataExtenso()}.</div>
    <div class="assinaturas">
      <div class="ass-bloco">
        <div class="ass-linha">${ESCOLA.diretora}<br/>
        <span class="ass-sub">${ESCOLA.cargo_dir}</span></div>
      </div>
    </div>
  </div>`, logoUrl)
}

function gerarAtestadoVaga(nomeAluno: string, serie: string, turno: string, anoLetivo: number, logoUrl: string): string {
  const nivel = detectarNivel(serie)
  const textoAluno = nomeAluno.trim()
    ? `<p>Declaro para os devidos fins que, o (a) aluno (a),
       <span class="negrito">${nomeAluno}</span>,
       tem uma vaga disponível no <span class="negrito">${serie}</span>
       do Ensino ${nivel}, turma A, no turno ${cap(turno)},
       no ano letivo de ${anoLetivo}.</p>`
    : `<p>Declaro para os devidos fins que, temos uma vaga disponível no
       <span class="negrito">${serie}</span> do Ensino ${nivel},
       turma A, no turno ${cap(turno)}, no ano letivo de ${anoLetivo}.</p>`

  return wrap(`
  <div class="titulo-doc">DECLARAÇÃO</div>
  <div class="corpo">
    ${textoAluno}
    <p>Sendo só a declara.</p>
  </div>
  <div class="rodape-doc">
    <div class="data">${dataExtenso()}.</div>
    <div class="assinaturas">
      <div class="ass-bloco">
        <div class="ass-linha">${ESCOLA.diretora}<br/>
        <span class="ass-sub">CNPJ: ${ESCOLA.cnpj}<br/>${ESCOLA.cargo_dir}</span></div>
      </div>
    </div>
  </div>`, logoUrl)
}

function gerarCertificado(f: DadosFicha, anoLetivo: number, logoUrl: string): string {
  const nivel = detectarNivel(f.serie)
  // Extrai filiação — "Mae e Pai" ou campos separados
  const filiacao = f.filiacao || '___________'

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<style>
  @page { size: A4 landscape; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; background: #fff; }
  body { font-family: 'Times New Roman', Times, serif; color: #000; }

  /* ── Cada face ocupa uma "página" de impressão ── */
  .face {
    width: 297mm;
    height: 210mm;
    position: relative;
    overflow: hidden;
    page-break-after: always;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  .face:last-child { page-break-after: avoid; }

  /* ── Borda ao redor ── */
  .borda-externa {
    position: absolute;
    inset: 8mm;
    border: 4px double #1a1a6e;
    pointer-events: none;
    z-index: 2;
  }
  .borda-interna {
    position: absolute;
    inset: 11mm;
    border: 1.5px solid #1a1a6e;
    pointer-events: none;
    z-index: 2;
  }

  /* ── Marca d'água ── */
  .marca-dagua {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 160mm;
    height: 160mm;
    object-fit: contain;
    opacity: 0.10;
    z-index: 0;
    pointer-events: none;
  }
  .marca-dagua-verso {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 180mm;
    height: 180mm;
    object-fit: contain;
    opacity: 0.08;
    z-index: 0;
    pointer-events: none;
  }

  /* ── Conteúdo acima da marca d'água ── */
  .face-conteudo {
    position: relative;
    z-index: 1;
    width: 100%;
    padding: 16mm 20mm 14mm 20mm;
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
    justify-content: space-between;
  }

  /* ── FRENTE: Cabeçalho ── */
  .cert-cabecalho {
    display: flex;
    align-items: center;
    gap: 16px;
    width: 100%;
    margin-bottom: 6mm;
  }
  .cert-logo { width: 60px; height: 60px; object-fit: contain; flex-shrink: 0; }
  .cert-cabecalho-texto { text-align: center; flex: 1; }
  .cert-republica {
    font-family: 'Times New Roman', Times, serif;
    font-size: 18pt;
    font-weight: bold;
    letter-spacing: 1px;
    line-height: 1.2;
  }
  .cert-escola-nome {
    font-family: 'Times New Roman', Times, serif;
    font-size: 16pt;
    font-weight: bold;
    color: #1a1a6e;
    margin-top: 3px;
  }
  .cert-escola-info {
    font-family: 'Times New Roman', Times, serif;
    font-size: 9pt;
    line-height: 1.6;
    color: #333;
  }
  .cert-divider { width: 80%; height: 2px; background: #1a1a6e; margin: 4px auto; }

  /* ── FRENTE: Título Certificado ── */
  .cert-titulo {
    font-family: 'Palatino Linotype', Palatino, 'Book Antiqua', serif;
    font-size: 34pt;
    font-style: italic;
    color: #1a1a6e;
    text-align: center;
    margin: 2mm 0;
    letter-spacing: 2px;
  }

  /* ── FRENTE: Corpo em itálico ── */
  .cert-corpo {
    font-family: 'Palatino Linotype', Palatino, 'Book Antiqua', serif;
    font-size: 13pt;
    font-style: italic;
    text-align: justify;
    line-height: 1.8;
    width: 100%;
  }
  .cert-aluno-nome {
    font-family: 'Palatino Linotype', Palatino, 'Book Antiqua', serif;
    font-size: 15pt;
    font-style: italic;
    font-weight: bold;
    text-align: center;
    margin: 4px 0;
  }

  /* ── FRENTE: Data e assinatura ── */
  .cert-rodape {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-top: 4mm;
  }
  .cert-data {
    font-family: 'Palatino Linotype', Palatino, 'Book Antiqua', serif;
    font-size: 12pt;
    font-style: italic;
    text-align: center;
  }
  .cert-ass-linha {
    width: 200px;
    border-top: 1px solid #000;
    margin: 6px auto 0;
    padding-top: 4px;
    font-size: 11pt;
    text-align: center;
    font-style: normal;
  }

  /* ── VERSO ── */
  .verso-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto auto;
    gap: 8mm;
    width: 100%;
    padding: 16mm 18mm 8mm 18mm;
    height: 100%;
    align-content: start;
  }
  .verso-caixa {
    border: 1px solid #555;
    padding: 8px 12px;
    font-size: 9.5pt;
    line-height: 1.8;
    font-family: Arial, sans-serif;
  }
  .verso-caixa-titulo {
    font-weight: bold;
    font-size: 10pt;
    border-bottom: 1px solid #555;
    margin-bottom: 6px;
    padding-bottom: 3px;
  }
  .verso-assinaturas {
    grid-column: 2;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding-top: 8mm;
    padding-right: 8mm;
    align-items: flex-end;
  }
  .verso-ass-bloco {
    text-align: center;
    min-width: 200px;
  }
  .verso-ass-linha {
    border-top: 1px solid #000;
    padding-top: 4px;
    font-size: 10pt;
    font-weight: bold;
    font-family: Arial, sans-serif;
  }
  .verso-ass-sub {
    font-size: 9pt;
    font-weight: normal;
  }
  .verso-isencao {
    grid-column: 1;
    grid-row: 2;
    border: 1px solid #555;
    padding: 8px 12px;
    font-size: 8.5pt;
    font-style: italic;
    font-family: Arial, sans-serif;
    line-height: 1.6;
  }
  .verso-reconhecimento {
    grid-column: 2;
    grid-row: 2;
    border: 1px solid #555;
    padding: 8px 12px;
    font-size: 8.5pt;
    font-family: Arial, sans-serif;
    line-height: 1.7;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head><body>

<!-- ════════════════════ FRENTE ════════════════════ -->
<div class="face">
  <div class="borda-externa"></div>
  <div class="borda-interna"></div>
  <img class="marca-dagua" src="${logoUrl}" alt="" />

  <div class="face-conteudo">
    <!-- Cabeçalho -->
    <div class="cert-cabecalho">
      <img class="cert-logo" src="${logoUrl}" alt="Logo" onerror="this.style.display='none'" />
      <div class="cert-cabecalho-texto">
        <div class="cert-republica">REPÚBLICA FEDERATIVA DO BRASIL</div>
        <div class="cert-escola-nome">${ESCOLA.nome}</div>
        <div class="cert-divider"></div>
        <div class="cert-escola-info">
          CNPJ ${ESCOLA.cnpj} - Reconhecido pelo CEE/MA Nº ${ESCOLA.cee}<br/>
          ${ESCOLA.endereco}<br/>
          ${ESCOLA.cidade}<br/>
          ${ESCOLA.inep}
        </div>
      </div>
    </div>
    <!-- Título -->
    <div class="cert-titulo">Certificado</div>
    <!-- Corpo — parágrafo único contínuo, nome inline em negrito itálico -->
    <div class="cert-corpo">
      <p style="text-indent:40px">
        A Diretora do ${ESCOLA.nome}, no uso de suas atribuições legais,
        confere o presente <em>Certificado</em> ao (à) aluno (a),
        <strong><em>${f.nome_aluno}</em></strong>,
        filho (a) de ${filiacao},
        nascido (a) em ${fmtData(f.data_nascimento)},
        pela <strong><em>Conclusão de Curso do Ensino ${nivel}</em></strong>,
        no ano letivo de <strong>${anoLetivo}</strong>,
        de acordo com os Art. 37 e 38 da Lei nº. 9.394 de 20 de dezembro de 1996
        e da Resolução de Reconhecimento Nº. ${ESCOLA.cee} – CEE
        (Conselho Estadual de Educação).
      </p>
    </div>

    <!-- Data e assinatura -->
    <div class="cert-rodape">
      <div class="cert-data">${dataExtenso()}</div>
      <div class="cert-ass-linha">
        ${ESCOLA.diretora}<br/>
        <span style="font-size:10pt">Administradora Escolar</span>
      </div>
    </div>
  </div>
</div>

<!-- ════════════════════ VERSO ════════════════════ -->
<div class="face">
  <div class="borda-externa"></div>
  <div class="borda-interna"></div>
  <img class="marca-dagua-verso" src="${logoUrl}" alt="" />

  <div class="face-conteudo" style="justify-content:flex-start">
    <div class="verso-grid">

      <!-- Caixa 1: Dados oficiais da escola -->
      <div class="verso-caixa">
        <div class="verso-caixa-titulo">ESTADO DO MARANHÃO</div>
        <p>COLÉGIO CONEXÃO MARANHENSE</p>
        <p>INEP: ${ESCOLA.inep}__</p>
        <p>CEE/MA: ${ESCOLA.cee}</p>
        <br/>
        <p>Nº do ato de Reconhecimento Certificado</p>
        <p>Registro dos nº __________ – CEE/MA</p>
        <br/>
        <p>Livro_________ Fls. _________</p>
      </div>

      <!-- Assinaturas (coluna 2, linhas 1 e 2) -->
      <div class="verso-assinaturas">
        <div class="verso-ass-bloco">
          <div class="verso-ass-linha">
            ${ESCOLA.diretora}<br/>
            <span class="verso-ass-sub">CNPJ: ${ESCOLA.cnpj}<br/>Diretora</span>
          </div>
        </div>
        <div class="verso-ass-bloco">
          <div class="verso-ass-linha">
            ${ESCOLA.coordenador}<br/>
            <span class="verso-ass-sub">IE Nº 252/2018<br/>${ESCOLA.cargo_coord}</span>
          </div>
        </div>
      </div>

      <!-- Caixa isenção -->
      <div class="verso-isencao">
        <em>Documento Isento de Autenticação pela Inspeção Escolar com base
        na Resolução nº 252/2018 – CEE – MA de 21 de março 2019</em>
      </div>

      <!-- Caixa reconhecimento -->
      <div class="verso-reconhecimento">
        Reconhecido pelo Conselho Estadual de Educação sobre o cumprimento
        do nº ${ESCOLA.cee} CEE/MA. Centro de Ensino Conexão Eirele.<br/>
        <strong>Ensino Fundamental 1º ao 9º ano.</strong><br/>
        <strong>Ensino Médio Regular e Modalidade Jovens E Adultos-EJA.</strong>
      </div>

    </div>
  </div>
</div>

</body></html>`
}

function gerarHistorico(f: DadosFicha, anoLetivo: number, logoUrl: string): string {
  const notas = f.notas ?? []
  const nivel = detectarNivel(f.serie)
  const anos = [...new Set(notas.map(n => n.ano))].sort()

  const linhasNotas = anos.length > 0 ? anos.map(ano => {
    const disc = notas.filter(n => n.ano === ano)
    const serieAno = disc[0]?.serie ?? '—'
    return `<tr style="background:#ddd"><td colspan="5" style="font-weight:bold;padding:5px 8px">
        Ano Letivo: ${ano} — ${serieAno}
      </td></tr>
      ${disc.map(n => `<tr>
        <td>${n.disciplina}</td>
        <td style="text-align:center">${n.carga_horaria ?? '—'}h</td>
        <td style="text-align:center">${n.media !== null ? Number(n.media).toFixed(1) : '—'}</td>
        <td style="text-align:center">${n.faltas ?? '—'}</td>
        <td style="text-align:center;font-weight:bold;color:${Number(n.media) >= 5 ? '#155724' : '#721c24'}">
          ${Number(n.media) >= 5 ? 'Aprovado' : 'Reprovado'}
        </td>
      </tr>`).join('')}`
  }).join('')
    : `<tr><td colspan="5" style="text-align:center;color:#888;padding:12px">Nenhuma nota registrada.</td></tr>`

  return wrap(`
  <div class="titulo-doc" style="letter-spacing:2px;margin-bottom:20px">Histórico Escolar — Ensino ${nivel}</div>
  <div class="info-bloco">
    <p><strong>Aluno (a):</strong> ${f.nome_aluno}</p>
    <p><strong>Data de Nascimento:</strong> ${fmtData(f.data_nascimento)}
       &nbsp;&nbsp; <strong>CPF:</strong> ${f.cpf_aluno || '—'}</p>
    <p><strong>Filiação:</strong> ${f.filiacao || '—'}</p>
    <p><strong>Série atual:</strong> ${f.serie} &nbsp;&nbsp; <strong>Turno:</strong> ${cap(f.turno)}</p>
  </div>
  <table class="tabela">
    <thead>
      <tr>
        <th>Conteúdos Curriculares</th>
        <th style="text-align:center">C.H.</th>
        <th style="text-align:center">Média</th>
        <th style="text-align:center">Faltas</th>
        <th style="text-align:center">Resultado</th>
      </tr>
    </thead>
    <tbody>${linhasNotas}</tbody>
  </table>
  <div class="corpo" style="font-size:11pt;margin-top:12px">
    <p>Observação: Nada consta em nossos arquivos que desabone a conduta do (a) aluno (a).
    Fica convalidado os estudos das séries cursadas, no CENTRO DE ENSINO CONEXÃO EIRELE
    em cumprimento ao parecer nº ${ESCOLA.cee} do Conselho Estadual de Educação,
    ao dispositivo no Artigo CEE/MA, 1ª da resolução da inspeção escolar nº 252/2018.</p>
  </div>
  <div class="rodape-doc">
    <div class="data">${dataExtenso()}.</div>
    <div class="assinaturas">
      <div class="ass-bloco">
        <div class="ass-linha">${ESCOLA.diretora}<br/>
        <span class="ass-sub">CNPJ: ${ESCOLA.cnpj}<br/>${ESCOLA.cargo_dir}</span></div>
      </div>
      <div class="ass-bloco">
        <div class="ass-linha">${ESCOLA.coordenador}<br/>
        <span class="ass-sub">IE ${ESCOLA.ie}<br/>${ESCOLA.cargo_coord}</span></div>
      </div>
    </div>
  </div>`, logoUrl)
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function EmissaoDocumentos({ usuario }: Props) {
  const [etapa, setEtapa]           = useState<'selecionar' | 'configurar' | 'preview'>('selecionar')
  const [tipoDoc, setTipoDoc]       = useState<TipoDoc | null>(null)

  // Busca por ficha_matricula
  const [termoBusca, setTermoBusca]         = useState('')
  const [resultados, setResultados]         = useState<{ id: string; nome_aluno: string; serie: string; turno: string }[]>([])
  const [buscando, setBuscando]             = useState(false)
  const [fichaId, setFichaId]               = useState<string | null>(null)
  const [dadosFicha, setDadosFicha]         = useState<DadosFicha | null>(null)
  const [dropdownAberto, setDropdownAberto] = useState(false)
  const [carregando, setCarregando]         = useState(false)

  // Configs
  const [anoLetivo, setAnoLetivo]           = useState(new Date().getFullYear())
  const [serieProxima, setSerieProxima]     = useState('')

  // Atestado de vaga — campos livres
  const [vagaNome, setVagaNome]             = useState('')
  const [vagaSerie, setVagaSerie]           = useState('')
  const [vagaTurno, setVagaTurno]           = useState('matutino')

  // Logo em /public — caminho direto, sem fetch ao storage
  const [logoUrl] = useState('/logo-colegio-conexao.png')

  // Preview
  const [htmlDoc, setHtmlDoc]               = useState('')

  const inputRef = useRef<HTMLInputElement>(null)



  // ── Debounce busca na fichas_matricula ───────────────────

  useEffect(() => {
    if (termoBusca.length < 2) { setResultados([]); setDropdownAberto(false); return }

    // Captura o valor atual no escopo do effect — evita stale closure
    const termo = termoBusca

    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        let q = supabase
          .from('fichas_matricula')
          .select('id, nome_aluno, serie, turno, segmento')
          .ilike('nome_aluno', `%${termo}%`)
          .order('nome_aluno')
          .limit(10)

        if (usuario.tipo !== 'administrador') {
          // Filtra pelo segmento do gestor — usa eq com valor em lowercase para garantir
          const seg = usuario.segmento.toLowerCase()
          q = q.eq('segmento', seg)
        }

        const { data } = await q
        setResultados(data ?? [])
        setDropdownAberto(true)
      } finally {
        setBuscando(false)
      }
    }, 350)

    return () => clearTimeout(t)
  }, [termoBusca])

  async function selecionarFicha(item: { id: string; nome_aluno: string; serie: string; turno: string }) {
    setDropdownAberto(false)
    setTermoBusca(item.nome_aluno)
    setFichaId(item.id)
    setCarregando(true)
    try {
      // Busca ficha completa
      const { data: ficha } = await supabase
        .from('fichas_matricula')
        .select('id, aluno_id, nome_aluno, data_nascimento, cpf_aluno, filiacao, serie, turno, segmento, ano_letivo')
        .eq('id', item.id)
        .single()

      if (!ficha) return

      // Mensalidades pagas do aluno (se aluno_id existir)
      let mensalidades: DadosFicha['mensalidades'] = []
      if (ficha.aluno_id) {
        const anoInicio = `${anoLetivo}-01-01`; const anoFim = `${anoLetivo}-12-31`
        const { data: mens } = await supabase
          .from('financeiro_mensalidades')
          .select('vencimento, valor, updated_at')
          .eq('aluno_id', ficha.aluno_id)
          .eq('status', 'pago')
          .gte('vencimento', anoInicio).lte('vencimento', anoFim)
          .order('vencimento')
        mensalidades = (mens ?? []).map((m: any) => ({
          vencimento: m.vencimento,
          pago_em: m.updated_at?.split('T')[0] ?? m.vencimento,
          valor: m.valor,
        }))
      }

      // Notas (para histórico) — só se tiver aluno_id
      let notas: DadosFicha['notas'] = []
      if (ficha.aluno_id) {
        const { data: notasRaw } = await supabase
          .from('notas').select('disciplina_id, media, ano_letivo, serie_id, carga_horaria, faltas')
          .eq('user_id', ficha.aluno_id).order('ano_letivo')

        const discIds = [...new Set((notasRaw ?? []).map((n: any) => n.disciplina_id).filter(Boolean))]
        const { data: discs } = discIds.length > 0
          ? await supabase.from('disciplinas').select('id, nome').in('id', discIds)
          : { data: [] }
        const mapDisc: Record<string, string> = {}
        ;(discs ?? []).forEach((d: any) => { mapDisc[d.id] = d.nome })

        const serieIds = [...new Set((notasRaw ?? []).map((n: any) => n.serie_id).filter(Boolean))]
        const { data: series } = serieIds.length > 0
          ? await supabase.from('series').select('id, nome').in('id', serieIds)
          : { data: [] }
        const mapSerie: Record<string, string> = {}
        ;(series ?? []).forEach((s: any) => { mapSerie[s.id] = s.nome })

        notas = (notasRaw ?? []).map((n: any) => ({
          disciplina: mapDisc[n.disciplina_id] ?? '—',
          serie: mapSerie[n.serie_id] ?? '—',
          ano: n.ano_letivo ?? anoLetivo,
          media: n.media,
          carga_horaria: n.carga_horaria ?? 0,
          faltas: n.faltas ?? 0,
        }))
      }

      setDadosFicha({
        nome_aluno:      ficha.nome_aluno,
        data_nascimento: ficha.data_nascimento,
        cpf_aluno:       ficha.cpf_aluno ?? '',
        filiacao:        ficha.filiacao ?? '',
        serie:           ficha.serie ?? '',
        turno:           ficha.turno ?? '',
        segmento:        ficha.segmento ?? usuario.segmento,
        ano_letivo:      ficha.ano_letivo ?? anoLetivo,
        aluno_id:        ficha.aluno_id,
        mensalidades,
        notas,
      })
    } finally { setCarregando(false) }
  }

  // ── Gerar preview ─────────────────────────────────────────

  async function gerarPreview() {
    if (!tipoDoc) return
    let html = ''

    if (tipoDoc === 'atestado_vaga') {
      html = gerarAtestadoVaga(vagaNome, vagaSerie || '___', vagaTurno, anoLetivo, logoUrl)
    } else {
      if (!dadosFicha) return
      switch (tipoDoc) {
        case 'declaracao':    html = gerarDeclaracao(dadosFicha, anoLetivo, logoUrl); break
        case 'transferencia': html = gerarTransferencia(dadosFicha, anoLetivo, serieProxima || '___', logoUrl); break
        case 'quitacao':      html = gerarQuitacao(dadosFicha, anoLetivo, logoUrl); break
        case 'certificado':   html = gerarCertificado(dadosFicha, anoLetivo, logoUrl); break
        case 'historico':     html = gerarHistorico(dadosFicha, anoLetivo, logoUrl); break
      }
    }
    setHtmlDoc(html)
    setEtapa('preview')
  }

  function imprimir() {
    const w = window.open('', '_blank', 'width=900,height=750')
    if (!w) return
    w.document.write(htmlDoc)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 500)
  }

  function resetar() {
    setEtapa('selecionar'); setTipoDoc(null)
    setDadosFicha(null); setFichaId(null)
    setTermoBusca(''); setHtmlDoc('')
    setSerieProxima(''); setVagaNome(''); setVagaSerie('')
  }

  const precisaFicha = tipoDoc !== 'atestado_vaga'
  const podeGerar    = tipoDoc === 'atestado_vaga' || !!dadosFicha

  // ─── Render ───────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Emissão de Documentos</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Selecione o documento, busque o aluno pela ficha de matrícula e imprima.
          </p>
        </div>
        {etapa !== 'selecionar' && (
          <button onClick={resetar}
            className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition-colors">
            ← Voltar
          </button>
        )}
      </div>

      {/* ── ETAPA 1: Selecionar ── */}
      {etapa === 'selecionar' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOCS.map(doc => (
            <button key={doc.tipo}
              onClick={() => { setTipoDoc(doc.tipo); setEtapa('configurar') }}
              className="group flex flex-col gap-3 p-5 rounded-xl border border-border bg-card
                         hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20
                         transition-all duration-200 text-left shadow-sm hover:shadow-md">
              <div className="text-3xl">{doc.icone}</div>
              <div>
                <div className="font-semibold text-foreground group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                  {doc.label}
                </div>
                <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{doc.descricao}</div>
              </div>
              <div className="mt-auto text-xs font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                Gerar →
              </div>
            </button>
          ))}
        </div>
      )}

      {/* ── ETAPA 2: Configurar ── */}
      {etapa === 'configurar' && tipoDoc && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">

          {/* Cabeçalho do tipo */}
          <div className="flex items-center gap-3 pb-4 border-b border-border">
            <span className="text-2xl">{DOCS.find(d => d.tipo === tipoDoc)?.icone}</span>
            <div>
              <h3 className="text-lg font-semibold text-foreground">{DOCS.find(d => d.tipo === tipoDoc)?.label}</h3>
              <p className="text-xs text-muted-foreground">
                {tipoDoc === 'atestado_vaga'
                  ? 'Preencha os dados manualmente — o aluno pode não estar cadastrado.'
                  : 'Busque o aluno pela ficha de matrícula.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ── Busca por ficha — todos exceto atestado_vaga ── */}
            {precisaFicha && (
              <div className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-foreground mb-1">
                  Buscar aluno na ficha de matrícula <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input ref={inputRef} type="text" value={termoBusca}
                    onChange={e => { setTermoBusca(e.target.value); if (dadosFicha) { setDadosFicha(null); setFichaId(null) } }}
                    placeholder="Digite o nome do aluno..."
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background
                               text-foreground placeholder:text-muted-foreground
                               focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {buscando && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Dropdown */}
                {dropdownAberto && resultados.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl overflow-hidden">
                    {resultados.map(r => (
                      <button key={r.id} onClick={() => selecionarFicha(r)}
                        className="w-full px-4 py-2.5 text-left hover:bg-muted transition-colors flex items-center justify-between">
                        <span className="text-sm text-foreground font-medium">{r.nome_aluno}</span>
                        <span className="text-xs text-muted-foreground">{r.serie} · {cap(r.turno)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {dropdownAberto && resultados.length === 0 && !buscando && termoBusca.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-xl px-4 py-3 text-sm text-muted-foreground">
                    Nenhuma ficha encontrada com esse nome.
                  </div>
                )}

                {/* Carregando */}
                {carregando && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    Carregando dados da ficha...
                  </div>
                )}

                {/* Card da ficha selecionada */}
                {dadosFicha && (
                  <div className="mt-3 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-200 dark:bg-blue-700 flex items-center justify-center text-sm font-bold text-blue-800 dark:text-blue-200 flex-shrink-0">
                        {dadosFicha.nome_aluno.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground">{dadosFicha.nome_aluno}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {dadosFicha.serie} · Turno {cap(dadosFicha.turno)} · {cap(dadosFicha.segmento)}
                          {dadosFicha.data_nascimento && ` · Nasc. ${fmtData(dadosFicha.data_nascimento)}`}
                        </div>
                        {dadosFicha.filiacao && (
                          <div className="text-xs text-muted-foreground">Filiação: {dadosFicha.filiacao}</div>
                        )}
                        {!dadosFicha.aluno_id && (
                          <div className="mt-1 text-xs text-amber-700 dark:text-amber-400">
                            ⚠️ Ficha sem aluno vinculado — dados financeiros e notas não disponíveis.
                          </div>
                        )}
                      </div>
                      <span className="text-green-600 dark:text-green-400 text-lg">✓</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ano letivo */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Ano Letivo</label>
              <select value={anoLetivo} onChange={e => setAnoLetivo(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground
                           focus:outline-none focus:ring-2 focus:ring-blue-500">
                {[2022,2023,2024,2025,2026,2027].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Transferência: série seguinte */}
            {tipoDoc === 'transferencia' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Série para a qual tem direito à matrícula
                </label>
                <input type="text" value={serieProxima} onChange={e => setSerieProxima(e.target.value)}
                  placeholder="Ex: 2ª série do Ensino Médio"
                  className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground
                             placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            {/* Atestado de vaga: campos livres */}
            {tipoDoc === 'atestado_vaga' && (
              <>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Nome do aluno <span className="text-xs text-muted-foreground">(opcional — deixe em branco para declaração genérica)</span>
                  </label>
                  <input type="text" value={vagaNome} onChange={e => setVagaNome(e.target.value)}
                    placeholder="Nome completo do aluno interessado..."
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground
                               placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Série desejada <span className="text-red-500">*</span>
                  </label>
                  <input type="text" value={vagaSerie} onChange={e => setVagaSerie(e.target.value)}
                    placeholder="Ex: 9º ano do Ensino Fundamental"
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground
                               placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Turno</label>
                  <select value={vagaTurno} onChange={e => setVagaTurno(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-border bg-background text-foreground
                               focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="matutino">Matutino</option>
                    <option value="vespertino">Vespertino</option>
                    <option value="noturno">Noturno</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* Alertas contextuais */}
          {tipoDoc === 'quitacao' && dadosFicha && (dadosFicha.mensalidades ?? []).length === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20
                            border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Nenhum pagamento com status <strong>pago</strong> encontrado para {anoLetivo}.
              A tabela no documento ficará vazia.
            </div>
          )}
          {tipoDoc === 'historico' && dadosFicha && (dadosFicha.notas ?? []).length === 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20
                            border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
              ⚠️ Nenhuma nota encontrada para este aluno. O histórico ficará com tabela vazia.
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={gerarPreview}
              disabled={!podeGerar || carregando || (tipoDoc === 'atestado_vaga' && !vagaSerie.trim())}
              className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-sm
                         bg-blue-600 hover:bg-blue-700 text-white transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed">
              {carregando
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Carregando...</>
                : <>👁 Visualizar documento</>
              }
            </button>
          </div>
        </div>
      )}

      {/* ── ETAPA 3: Preview ── */}
      {etapa === 'preview' && htmlDoc && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-card border border-border rounded-xl px-5 py-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">{DOCS.find(d => d.tipo === tipoDoc)?.icone}</span>
              <div>
                <div className="text-sm font-semibold text-foreground">{DOCS.find(d => d.tipo === tipoDoc)?.label}</div>
                <div className="text-xs text-muted-foreground">
                  {tipoDoc === 'atestado_vaga'
                    ? (vagaNome || 'Sem aluno') + ` · ${vagaSerie} · ${anoLetivo}`
                    : `${dadosFicha?.nome_aluno ?? '—'} · ${anoLetivo}`}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setEtapa('configurar')}
                className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
                ✏️ Editar
              </button>
              <button onClick={imprimir}
                className="flex items-center gap-2 px-5 py-2 text-sm rounded-lg font-medium
                           bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                🖨️ Imprimir / Salvar PDF
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-900/20
                          border border-amber-200 dark:border-amber-800 text-sm text-amber-800 dark:text-amber-200">
            <span>ℹ️</span>
            <p>Revise antes de imprimir. Para salvar como PDF, selecione <strong>"Salvar como PDF"</strong> na janela de impressão.</p>
          </div>

          <div className="border border-border rounded-xl overflow-hidden shadow-lg bg-white">
            <iframe srcDoc={htmlDoc} title="Preview do documento" className="w-full"
                    style={{ height: '960px', border: 'none' }} />
          </div>
        </div>
      )}
    </div>
  )
}