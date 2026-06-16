"""
Gera o formulário de onboarding do Colégio Ariane — SynerEduc
Saída: docs/Formulario-Onboarding-SynerEduc.pdf
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import Flowable
import os

# ─── Cores SynerEduc ──────────────────────────────────────────────────────────
AZUL_ESCURO  = colors.HexColor('#0f172a')   # slate-900
AZUL_MEDIO   = colors.HexColor('#1e40af')   # blue-800
AZUL_CLARO   = colors.HexColor('#3b82f6')   # blue-500
AZUL_BG      = colors.HexColor('#eff6ff')   # blue-50
CINZA_TEXTO  = colors.HexColor('#374151')   # gray-700
CINZA_CLARO  = colors.HexColor('#f9fafb')   # gray-50
CINZA_BORDA  = colors.HexColor('#e5e7eb')   # gray-200
VERDE        = colors.HexColor('#16a34a')   # green-600
BRANCO       = colors.white

W, H = A4

# ─── Classe para caixas de input ─────────────────────────────────────────────

class InputBox(Flowable):
    """Linha de campo preenchível com label acima."""
    def __init__(self, label, height=0.7*cm, width=None):
        super().__init__()
        self.label  = label
        self._height = height
        self._width  = width or (W - 4*cm)

    def wrap(self, availWidth, availHeight):
        self.width = self._width
        return self.width, self._height + 0.45*cm

    def draw(self):
        c = self.canv
        # Label
        c.setFont('Helvetica', 7.5)
        c.setFillColor(CINZA_TEXTO)
        c.drawString(0, self._height + 0.12*cm, self.label)
        # Caixa
        c.setStrokeColor(CINZA_BORDA)
        c.setFillColor(BRANCO)
        c.roundRect(0, 0, self.width, self._height, 3, stroke=1, fill=1)


class CheckItem(Flowable):
    """Item de checklist com quadrado de marcação."""
    def __init__(self, texto, obs=None):
        super().__init__()
        self.texto = texto
        self.obs   = obs

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        self.altura = 0.65*cm if not self.obs else 0.9*cm
        return self.width, self.altura

    def draw(self):
        c = self.canv
        bsize = 0.35*cm
        y     = (self.altura - bsize) / 2
        # Checkbox
        c.setStrokeColor(AZUL_CLARO)
        c.setFillColor(BRANCO)
        c.roundRect(0, y, bsize, bsize, 2, stroke=1, fill=1)
        # Texto
        c.setFont('Helvetica', 9)
        c.setFillColor(AZUL_ESCURO)
        c.drawString(bsize + 0.25*cm, y + 0.05*cm, self.texto)
        if self.obs:
            c.setFont('Helvetica-Oblique', 7.5)
            c.setFillColor(colors.HexColor('#6b7280'))
            c.drawString(bsize + 0.25*cm, y - 0.22*cm, self.obs)


class SectionHeader(Flowable):
    """Cabeçalho colorido de seção."""
    def __init__(self, numero, titulo, cor=AZUL_MEDIO):
        super().__init__()
        self.numero = numero
        self.titulo = titulo
        self.cor    = cor

    def wrap(self, availWidth, availHeight):
        self.width = availWidth
        return self.width, 0.85*cm

    def draw(self):
        c = self.canv
        # Fundo colorido
        c.setFillColor(self.cor)
        c.roundRect(0, 0, self.width, 0.75*cm, 4, stroke=0, fill=1)
        # Número
        c.setFont('Helvetica-Bold', 10)
        c.setFillColor(BRANCO)
        c.drawString(0.3*cm, 0.22*cm, self.numero)
        # Título
        c.setFont('Helvetica-Bold', 10)
        c.drawString(1.1*cm, 0.22*cm, self.titulo)


def linha_dois_campos(label1, label2, w_total):
    w = (w_total - 0.5*cm) / 2
    return Table(
        [[InputBox(label1, width=w), InputBox(label2, width=w)]],
        colWidths=[w + 0.25*cm, w + 0.25*cm],
        style=TableStyle([('LEFTPADDING', (0,0), (-1,-1), 0),
                          ('RIGHTPADDING', (0,0), (-1,-1), 0),
                          ('TOPPADDING', (0,0), (-1,-1), 0),
                          ('BOTTOMPADDING', (0,0), (-1,-1), 0)])
    )

def linha_tres_campos(l1, l2, l3, w_total):
    w = (w_total - 0.5*cm) / 3
    return Table(
        [[InputBox(l1, width=w), InputBox(l2, width=w), InputBox(l3, width=w)]],
        colWidths=[w + 0.17*cm]*3,
        style=TableStyle([('LEFTPADDING', (0,0), (-1,-1), 0),
                          ('RIGHTPADDING', (0,0), (-1,-1), 0),
                          ('TOPPADDING', (0,0), (-1,-1), 0),
                          ('BOTTOMPADDING', (0,0), (-1,-1), 0)])
    )

# ─── Cabeçalho da página ──────────────────────────────────────────────────────

def draw_logo(canvas, x, y):
    """Desenha o logo SynerEduc: hexágono + wordmark. y = baseline do cabeçalho."""
    ROXO = colors.HexColor('#8b5cf6')
    CIANO = colors.HexColor('#06b6d4')

    # Hexágono — tamanho fixo: ~1.0cm de altura
    # Pontos originais SVG (viewBox 54x54): (27,5)(46,16)(46,38)(27,49)(8,38)(8,16)
    # Mapeamos para pontos em pontos ReportLab com scale fixo
    HEX_H = 1.05 * cm   # altura total do hexágono em pontos
    sc = HEX_H / 44.0   # 44 = (49-5) = altura dos pontos SVG

    def tp(px, py):
        return x + (px - 8) * sc, y - (py - 5) * sc

    pts = [(27,5),(46,16),(46,38),(27,49),(8,38),(8,16)]

    canvas.setStrokeColor(ROXO)
    canvas.setLineWidth(1.0)
    path = canvas.beginPath()
    path.moveTo(*tp(*pts[0]))
    for p in pts[1:]: path.lineTo(*tp(*p))
    path.close()
    canvas.drawPath(path, stroke=1, fill=0)

    for i, p in enumerate(pts):
        canvas.setFillColor(CIANO if i >= 3 else ROXO)
        cx, cy = tp(*p)
        canvas.circle(cx, cy, 1.8, stroke=0, fill=1)

    # "S" central
    canvas.setFont('Helvetica-Bold', 11)
    canvas.setFillColor(ROXO)
    sx, sy = tp(27, 35)
    canvas.drawCentredString(sx, sy - 4, 'S')

    # Wordmark
    wx = x + 38 * sc + 5
    wy = y - 22 * sc

    canvas.setFont('Helvetica', 14)
    canvas.setFillColor(colors.HexColor('#f8fafc'))
    canvas.drawString(wx, wy, 'Syner')
    sw = canvas.stringWidth('Syner', 'Helvetica', 14)
    canvas.setFont('Helvetica-Bold', 14)
    canvas.setFillColor(ROXO)
    canvas.drawString(wx + sw, wy, 'Educ')

    canvas.setFont('Helvetica', 6.5)
    canvas.setFillColor(colors.HexColor('#94a3b8'))
    canvas.drawString(wx, wy - 10, 'GESTÃO ESCOLAR COM IA')


def build_header(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(AZUL_ESCURO)
    canvas.rect(0, H - 2.8*cm, W, 2.8*cm, stroke=0, fill=1)

    draw_logo(canvas, x=1.3*cm, y=H - 0.7*cm)

    # Título do documento (direita)
    canvas.setFont('Helvetica-Bold', 11)
    canvas.setFillColor(BRANCO)
    canvas.drawRightString(W - 1.5*cm, H - 1.5*cm, 'Formulário de Onboarding')
    canvas.setFont('Helvetica', 8.5)
    canvas.setFillColor(colors.HexColor('#94a3b8'))
    canvas.drawRightString(W - 1.5*cm, H - 2.0*cm, 'Integração de Nova Escola')

    # Faixa gradiente abaixo do cabeçalho
    canvas.setFillColor(colors.HexColor('#8b5cf6'))
    canvas.rect(0, H - 3.0*cm, W * 0.5, 0.2*cm, stroke=0, fill=1)
    canvas.setFillColor(colors.HexColor('#06b6d4'))
    canvas.rect(W * 0.5, H - 3.0*cm, W * 0.5, 0.2*cm, stroke=0, fill=1)

    # Rodapé
    canvas.setFillColor(AZUL_ESCURO)
    canvas.rect(0, 0, W, 0.9*cm, stroke=0, fill=1)
    canvas.setFont('Helvetica', 7.5)
    canvas.setFillColor(colors.HexColor('#93c5fd'))
    canvas.drawString(1.5*cm, 0.3*cm, 'SynerEduc — Plataforma Educacional Inteligente')
    canvas.drawRightString(W - 1.5*cm, 0.3*cm,
                           f'Pagina {doc.page}  |  synereduc.com.br')
    canvas.restoreState()


# ─── Geração do documento ─────────────────────────────────────────────────────

def gerar():
    os.makedirs('docs', exist_ok=True)
    caminho = 'docs/Formulario-Onboarding-SynerEduc.pdf'

    doc = SimpleDocTemplate(
        caminho,
        pagesize=A4,
        leftMargin=1.8*cm,
        rightMargin=1.8*cm,
        topMargin=3.4*cm,
        bottomMargin=1.4*cm,
    )

    styles = getSampleStyleSheet()
    W_util = W - 3.6*cm

    def estilo(nome, **kw):
        return ParagraphStyle(nome, **kw)

    s_intro = estilo('intro', fontName='Helvetica', fontSize=9, textColor=CINZA_TEXTO,
                     leading=14, spaceAfter=6)
    s_obs   = estilo('obs', fontName='Helvetica-Oblique', fontSize=8,
                     textColor=colors.HexColor('#6b7280'), leading=12)
    s_nota  = estilo('nota', fontName='Helvetica', fontSize=8.5,
                     textColor=AZUL_MEDIO, leading=13, leftIndent=0.3*cm)

    SP  = lambda n=6: Spacer(1, n)
    HR  = lambda: HRFlowable(width='100%', thickness=0.5, color=CINZA_BORDA, spaceAfter=4)

    story = []

    # ── Intro ──────────────────────────────────────────────────────────────────
    story.append(SP(8))
    story.append(Paragraph(
        'Este formulário reúne todas as informações necessárias para integrar sua escola à plataforma '
        '<b>SynerEduc</b>. Preencha com atenção — quanto mais completo, mais rápido será o processo '
        'de ativação. Em caso de dúvidas, entre em contato com nossa equipe.',
        s_intro))
    story.append(Paragraph(
        'Prazo estimado de ativação após envio completo: <b>5 a 7 dias úteis.</b>',
        s_nota))
    story.append(SP(10))

    # ══════════════════════════════════════════════════════════════════════════
    # SEÇÃO 1 — IDENTIFICAÇÃO
    # ══════════════════════════════════════════════════════════════════════════
    story.append(KeepTogether([
        SectionHeader('01', 'Identificação da Escola'),
        SP(8),
        InputBox('Nome oficial da escola (conforme CNPJ)', width=W_util),
        SP(4),
        linha_dois_campos('CNPJ', 'Código INEP (se houver)', W_util),
        SP(4),
        InputBox('Nome do diretor(a) responsável', width=W_util),
        SP(4),
        linha_dois_campos('E-mail institucional', 'Telefone / WhatsApp principal', W_util),
        SP(4),
        InputBox('Site da escola (se houver)', width=W_util),
        SP(4),
        linha_tres_campos('Instagram', 'Facebook', 'YouTube / Outro', W_util),
        SP(12),
    ]))

    # ══════════════════════════════════════════════════════════════════════════
    # SEÇÃO 2 — ENDEREÇO
    # ══════════════════════════════════════════════════════════════════════════
    story.append(KeepTogether([
        SectionHeader('02', 'Endereço'),
        SP(8),
        InputBox('Logradouro (rua / avenida)', width=W_util),
        SP(4),
        linha_tres_campos('Número', 'Complemento', 'Bairro', W_util),
        SP(4),
        linha_tres_campos('Cidade', 'Estado (UF)', 'CEP', W_util),
        SP(12),
    ]))

    # ══════════════════════════════════════════════════════════════════════════
    # SEÇÃO 3 — IDENTIDADE VISUAL
    # ══════════════════════════════════════════════════════════════════════════
    story.append(KeepTogether([
        SectionHeader('03', 'Identidade Visual'),
        SP(8),
        Paragraph('Envie os arquivos por e-mail ou WhatsApp junto com este formulário.', s_obs),
        SP(6),
    ]))

    check_visual = [
        ('Logo da escola', 'Formato PNG ou SVG, preferencialmente com fundo transparente'),
        ('Cor principal (primária)', 'Código hexadecimal — ex: #1E40AF'),
        ('Cor secundária (se houver)', 'Codigo hexadecimal ou "nao ha"'),
        ('Foto da fachada da escola', 'JPG/PNG, boa resolucao'),
        ('Fotos internas (opcional)', 'Salas de aula, patio, biblioteca, laboratorio...'),
        ('Carimbo institucional', 'Usado em documentos oficiais — PNG fundo transparente'),
        ('Assinatura do(a) diretor(a)', 'PNG fundo transparente, para historicos e certificados'),
    ]
    for texto, obs in check_visual:
        story.append(CheckItem(texto, obs))
        story.append(SP(3))
    story.append(SP(10))

    # ══════════════════════════════════════════════════════════════════════════
    # SEÇÃO 4 — ESTRUTURA ESCOLAR
    # ══════════════════════════════════════════════════════════════════════════
    story.append(KeepTogether([
        SectionHeader('04', 'Estrutura Escolar'),
        SP(8),
        linha_dois_campos(
            'Modalidade(s) de ensino  (ex: Presencial / EAD / Hibrido)',
            'Numero estimado de alunos ativos',
            W_util),
        SP(4),
    ]))

    story.append(Paragraph('Series / anos ofertados — marque as que se aplicam:', s_obs))
    story.append(SP(5))

    series = [
        ('Educacao Infantil', None),
        ('1o ao 5o ano — Ensino Fundamental I', None),
        ('6o ao 9o ano — Ensino Fundamental II', None),
        ('1a a 3a serie — Ensino Medio', None),
        ('EJA / Supletivo', None),
        ('Pos-medio / Tecnico', None),
    ]
    for s, o in series:
        story.append(CheckItem(s, o))
        story.append(SP(2))

    story.append(SP(8))
    story.append(InputBox('Numero de turmas por serie (descreva brevemente)', height=1.2*cm, width=W_util))
    story.append(SP(4))
    story.append(linha_dois_campos('Numero de professores', 'Numero de funcionarios administrativos', W_util))
    story.append(SP(12))

    # ══════════════════════════════════════════════════════════════════════════
    # SEÇÃO 5 — HORÁRIOS
    # ══════════════════════════════════════════════════════════════════════════
    story.append(KeepTogether([
        SectionHeader('05', 'Horarios de Funcionamento'),
        SP(8),
        linha_tres_campos('Turno manha (entrada / saida)', 'Turno tarde (entrada / saida)', 'Turno noturno (se houver)', W_util),
        SP(4),
        InputBox('Dias de funcionamento  (ex: Segunda a Sexta)', width=W_util),
        SP(4),
        InputBox('Observacoes sobre horarios (intervalo, aula dupla, etc.)', height=1.0*cm, width=W_util),
        SP(12),
    ]))

    # ══════════════════════════════════════════════════════════════════════════
    # SEÇÃO 6 — DOCUMENTOS OFICIAIS
    # ══════════════════════════════════════════════════════════════════════════
    story.append(KeepTogether([
        SectionHeader('06', 'Documentos Oficiais — Modelos para o Sistema'),
        SP(8),
        Paragraph('Envie os modelos que a escola ja utiliza. O sistema ira replicar o layout automaticamente.', s_obs),
        SP(6),
    ]))

    docs = [
        ('Modelo de Historico Escolar', 'PDF ou Word do modelo atual'),
        ('Modelo de Declaracao de Matricula', None),
        ('Modelo de Declaracao de Frequencia', None),
        ('Modelo de Declaracao de Conclusao de Serie', None),
        ('Modelo de Certificado de Conclusao', 'Ensino Medio ou Fundamental'),
        ('Modelo de Boletim Escolar', 'Layout atual da escola'),
        ('Modelo de Contrato de Prestacao de Servicos', 'Usado na matricula'),
    ]
    for texto, obs in docs:
        story.append(CheckItem(texto, obs))
        story.append(SP(3))
    story.append(SP(10))

    # ══════════════════════════════════════════════════════════════════════════
    # SEÇÃO 7 — MATERIAL PEDAGÓGICO E IA
    # ══════════════════════════════════════════════════════════════════════════
    story.append(KeepTogether([
        SectionHeader('07', 'Material Pedagogico e Inteligencia Artificial'),
        SP(8),
        Paragraph('Estas informacoes configuram os agentes de IA da plataforma para a realidade da sua escola.', s_obs),
        SP(8),
    ]))

    ia_checks = [
        ('Regimento Interno da escola', 'PDF — usado pela IA para responder perguntas de alunos e pais'),
        ('Manual do Aluno', 'PDF — normas, direitos e deveres'),
        ('Calendario Escolar 2026', 'PDF ou imagem — feriados, eventos, provas'),
        ('Grade de disciplinas por serie', 'Lista ou tabela das materias por ano/serie'),
        ('Material didatico adotado', 'Nome do sistema de apostilas ou livros utilizados'),
    ]
    for texto, obs in ia_checks:
        story.append(CheckItem(texto, obs))
        story.append(SP(3))

    story.append(SP(8))
    story.append(InputBox(
        'O material didatico e o mesmo utilizado pelo Colegio Conexao Maranhense?  (Sim / Nao — se nao, qual?)',
        height=0.8*cm, width=W_util))
    story.append(SP(4))
    story.append(InputBox(
        'Ha algum programa de inclusao ou necessidades especiais que a IA deve conhecer?',
        height=0.8*cm, width=W_util))
    story.append(SP(12))

    # ══════════════════════════════════════════════════════════════════════════
    # SEÇÃO 8 — ACESSO AO SISTEMA
    # ══════════════════════════════════════════════════════════════════════════
    story.append(KeepTogether([
        SectionHeader('08', 'Acesso ao Sistema'),
        SP(8),
        Paragraph('<b>Gestor principal da escola no sistema:</b>', s_obs),
        SP(4),
        linha_dois_campos('Nome completo do gestor', 'E-mail de acesso', W_util),
        SP(4),
        linha_dois_campos('Telefone / WhatsApp do gestor', 'Cargo / Funcao', W_util),
        SP(10),
        Paragraph('<b>Contato tecnico / TI (se houver pessoa diferente do gestor):</b>', s_obs),
        SP(4),
        linha_dois_campos('Nome completo', 'E-mail', W_util),
        SP(4),
        InputBox('Telefone / WhatsApp', width=W_util),
        SP(12),
    ]))

    # ══════════════════════════════════════════════════════════════════════════
    # SEÇÃO 9 — MISSÃO E CONTEXTO
    # ══════════════════════════════════════════════════════════════════════════
    story.append(KeepTogether([
        SectionHeader('09', 'Missao, Visao e Contexto da Escola'),
        SP(8),
        Paragraph('Estas informacoes sao usadas na pagina do site e nos agentes de IA da escola.', s_obs),
        SP(6),
        InputBox('Missao da escola  (em ate 2 linhas)', height=1.1*cm, width=W_util),
        SP(4),
        InputBox('Visao da escola  (em ate 2 linhas)', height=1.1*cm, width=W_util),
        SP(4),
        InputBox('Breve historia da escola  (quando foi fundada, proposta pedagogica...)', height=1.8*cm, width=W_util),
        SP(4),
        InputBox('Diferenciais da escola  (o que torna a escola unica para pais e alunos)', height=1.3*cm, width=W_util),
        SP(12),
    ]))

    # ══════════════════════════════════════════════════════════════════════════
    # SEÇÃO 10 — INFORMAÇÕES FINANCEIRAS
    # ══════════════════════════════════════════════════════════════════════════
    story.append(KeepTogether([
        SectionHeader('10', 'Informacoes Financeiras  (para o modulo de mensalidades)'),
        SP(8),
        linha_dois_campos('Valor da mensalidade por serie (ou faixa)', 'Dia de vencimento padrao', W_util),
        SP(4),
        InputBox('Formas de pagamento aceitas  (ex: PIX, boleto, cartao, dinheiro)', width=W_util),
        SP(4),
        InputBox('Politica de desconto por pontualidade ou irmaos (se houver)', height=0.9*cm, width=W_util),
        SP(4),
        InputBox('Banco / conta para recebimento  (banco, agencia, conta)', width=W_util),
        SP(12),
    ]))

    # ══════════════════════════════════════════════════════════════════════════
    # ASSINATURA
    # ══════════════════════════════════════════════════════════════════════════
    story.append(SectionHeader('', 'Confirmacao e Assinatura', AZUL_ESCURO))
    story.append(SP(10))
    story.append(Paragraph(
        'Confirmo que as informacoes fornecidas sao verdadeiras e autorizo a SynerEduc a utiliza-las '
        'para configuracao da plataforma educacional.',
        s_intro))
    story.append(SP(16))

    ass_table = Table(
        [[
            Table([[''], [HRFlowable(width='100%', thickness=0.5, color=CINZA_BORDA)],
                   [Paragraph('Nome completo', s_obs)]],
                  style=TableStyle([('BOTTOMPADDING', (0,0), (-1,-1), 2),
                                    ('TOPPADDING', (0,0), (-1,-1), 0)])),
            Spacer(1, 1),
            Table([[''], [HRFlowable(width='100%', thickness=0.5, color=CINZA_BORDA)],
                   [Paragraph('Assinatura', s_obs)]],
                  style=TableStyle([('BOTTOMPADDING', (0,0), (-1,-1), 2),
                                    ('TOPPADDING', (0,0), (-1,-1), 0)])),
            Spacer(1, 1),
            Table([[''], [HRFlowable(width='100%', thickness=0.5, color=CINZA_BORDA)],
                   [Paragraph('Data', s_obs)]],
                  style=TableStyle([('BOTTOMPADDING', (0,0), (-1,-1), 2),
                                    ('TOPPADDING', (0,0), (-1,-1), 0)])),
        ]],
        colWidths=[W_util*0.44, 0.5*cm, W_util*0.36, 0.5*cm, W_util*0.20],
        style=TableStyle([('VALIGN', (0,0), (-1,-1), 'BOTTOM'),
                          ('LEFTPADDING', (0,0), (-1,-1), 0),
                          ('RIGHTPADDING', (0,0), (-1,-1), 0)])
    )
    story.append(ass_table)
    story.append(SP(16))
    story.append(HR())
    story.append(SP(6))

    # Box de envio
    envio = Table(
        [[Paragraph(
            '<b>Como enviar este formulario:</b>  Fotografe ou escaneie as paginas preenchidas e envie junto '
            'com os arquivos solicitados (logo, documentos, fotos) para o WhatsApp ou e-mail da equipe SynerEduc. '
            'Nossa equipe entrara em contato em ate 24 horas apos o recebimento.',
            ParagraphStyle('envio', fontName='Helvetica', fontSize=8.5,
                           textColor=AZUL_ESCURO, leading=13))]],
        colWidths=[W_util],
        style=TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), AZUL_BG),
            ('ROUNDEDCORNERS', [6]),
            ('BOX', (0,0), (-1,-1), 0.5, AZUL_CLARO),
            ('LEFTPADDING', (0,0), (-1,-1), 10),
            ('RIGHTPADDING', (0,0), (-1,-1), 10),
            ('TOPPADDING', (0,0), (-1,-1), 8),
            ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ])
    )
    story.append(envio)

    doc.build(story, onFirstPage=build_header, onLaterPages=build_header)
    print(f'PDF gerado: {caminho}')


if __name__ == '__main__':
    gerar()
