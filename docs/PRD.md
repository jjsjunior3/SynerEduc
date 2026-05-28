# PRD — Portal Conexão AVA
> Product Requirements Document  
> Colégio Conexão Maranhense · São Luís/MA  
> Última atualização: 2026-05-28

---

## 1. Problema a resolver

O Colégio Conexão Maranhense opera dois segmentos de ensino (EAD e Presencial) com equipes, alunos e processos completamente distintos. Antes desta plataforma, a gestão era fragmentada: professores enviavam atividades por WhatsApp, frequências eram anotadas em papel, boletins eram gerados em planilhas e comunicados chegavam sem controle.

**O Portal Conexão AVA centraliza tudo:** registro de frequência, lançamento de notas, agenda pedagógica, atividades, comunicados e relatórios — com acesso diferenciado por perfil e isolamento total entre os dois segmentos.

---

## 2. Usuários da plataforma

### 2.1 Aluno
**Contexto:** Acessa a plataforma para acompanhar sua vida acadêmica.  
**Necessidades:**
- Ver a agenda do dia com conteúdo trabalhado em sala e atividades para casa
- Consultar frequência e boletim em tempo real
- Acessar materiais de estudo (PDFs por bimestre)
- Receber comunicados da escola
- Entregar atividades e ver as correções dos professores

### 2.2 Professor
**Contexto:** Usa a plataforma diariamente para registros pedagógicos.  
**Necessidades:**
- Lançar agenda da aula (conteúdo, atividade, prazo) — aguarda aprovação do coordenador
- Registrar frequência de cada aula individualmente (pode ter 3 aulas no mesmo dia com a mesma turma)
- Lançar notas por bimestre e disciplina
- Criar e corrigir atividades
- Participar do fórum de disciplinas

### 2.3 Coordenador
**Contexto:** Supervisiona o trabalho pedagógico do seu segmento (EAD **ou** Presencial).  
**Necessidades:**
- Revisar e aprovar agendas dos professores antes que cheguem aos alunos
- Visualizar relatórios de frequência e desempenho por turma/série
- Acompanhar boletins de qualquer aluno
- Enviar comunicados para alunos e professores
- Gerenciar grade horária

### 2.4 Secretaria
**Contexto:** Cuida de toda a documentação de matrícula.  
**Necessidades:**
- Registrar fichas de matrícula de novos alunos
- Controlar documentos entregues (RG, CPF, comprovante, etc.)
- Emitir contratos e declarações de matrícula
- Digitalizar histórico escolar com auxílio de IA

### 2.5 Financeiro
**Contexto:** Controla o fluxo financeiro da escola.  
**Necessidades:**
- Registrar pagamentos de mensalidades
- Controlar despesas
- Gerar relatório financeiro mensal

### 2.6 Administrador
**Contexto:** Acesso total ao sistema — TI e gestão da plataforma.  
**Necessidades:**
- Criar e gerenciar todos os usuários
- Cadastrar disciplinas, séries e turmas
- Vincular professores a disciplinas e séries
- Monitorar usuários online em tempo real
- Acessar qualquer área da plataforma

### 2.7 Gestor Geral
**Contexto:** Visão estratégica da escola — diretoria.  
**Necessidades:**
- Visualizar métricas globais (total de alunos, professores, taxa de aprovação)
- Ver quem está online no momento
- Sem acesso operacional — apenas leitura

---

## 3. Segmentos de ensino — isolamento total

O sistema opera dois segmentos completamente separados:

| | EAD | Presencial |
|---|---|---|
| **Modalidade** | Ensino a distância | Ensino presencial |
| **Coordenador** | Coordenador EAD | Coordenador Presencial |
| **Dados visíveis** | Apenas alunos/professores EAD | Apenas alunos/professores Presencial |
| **Admin vê** | Ambos | Ambos |

**Regra absoluta:** Um coordenador EAD nunca pode ver dados de alunos, professores, frequências, notas ou agendas do segmento Presencial — e vice-versa.

---

## 4. Funcionalidades por área

### 4.1 Agenda Pedagógica

**Fluxo aprovado:**
```
Professor lança (status: pendente)
        ↓
Coordenador revisa e aprova (status: enviado)
        ↓
Aluno visualiza no seu painel
```

**O que o professor registra por aula:**
- Título da unidade
- Conteúdo trabalhado em sala
- Atividade para casa (opcional)
- Data de entrega da atividade (opcional)
- Observação para os alunos (opcional)

**O que o coordenador pode fazer:**
- Aprovar (enviar para os alunos)
- Editar antes de enviar
- Excluir

**O que o aluno vê:**
- Apenas agendas aprovadas pelo coordenador
- Filtro por data e por disciplina

---

### 4.2 Frequência

**Regra central:** Cada aula do dia é uma chamada independente.

Um professor que ministra Matemática em 3 horários consecutivos faz 3 registros:
- 1ª aula: registro individual → salva → envia
- 2ª aula: novo registro → salva → envia
- 3ª aula: novo registro → salva → envia

**Status de presença por aluno por aula:**
- `presente` — aluno assistiu a aula inteira
- `ausente` — não estava presente
- `atrasado` — chegou após o início
- `evadido` — saiu antes do término

**Após salvo:** O registro fica visível com badge "Registrada". Professor pode editar se necessário (ex: aluno chegou depois e precisa mudar de ausente para atrasado).

---

### 4.3 Notas e Boletim

**Estrutura:** 4 bimestres × N disciplinas × 1 aluno

**Faixas de desempenho durante o ano:**
- `Bom` — média ≥ 7,0
- `Atenção` — média entre 5,0 e 6,9
- `Em Risco` — média < 5,0

**Importante:** Labels de "Aprovado" ou "Reprovado" só são aplicáveis após os 4 bimestres serem lançados. Durante o ano letivo, usar apenas as faixas acima.

**Boletim:** O aluno visualiza todas as notas por disciplina e bimestre. O coordenador pode imprimir o boletim de qualquer aluno.

---

### 4.4 Atividades

**Fluxo:**
1. Professor cria atividade (título, descrição, prazo, pontuação)
2. Aluno acessa e entrega (texto + arquivo opcional)
3. Professor corrige (feedback + nota) → status muda para `corrigido`

**Status das atividades:**
- `pendente` — criada, aguardando entrega
- `entregue` — aluno enviou
- `atrasado` — enviada após o prazo
- `corrigido` — professor deu feedback e nota

---

### 4.5 Comunicados

- Coordenador envia comunicados para alunos e/ou professores do seu segmento
- Suporte a imagem/anexo
- Pode ser agendado para envio futuro
- Aluno vê no painel e em notificações

---

### 4.6 Relatórios

| Relatório | Quem usa | O que mostra |
|---|---|---|
| Relatório de Turma | Coordenador | Notas e frequência consolidadas por turma, exporta PDF |
| Boletins Gerais | Coordenador | Situação de todos os alunos do segmento |
| Frequência de Alunos | Coordenador | Frequência por aluno/série/período com impressão |
| Dashboard do Coordenador | Coordenador | Gráficos: frequência por série, desempenho geral |

---

## 5. Regras de negócio imutáveis

Estas regras não podem ser alteradas por configuração — estão no core do sistema:

1. **Segmento é imutável para o usuário:** Um professor EAD não pode virar professor Presencial sem recadastro.

2. **Agenda não chega ao aluno sem aprovação:** Nunca exibir agendas com `status != 'enviado'` para alunos.

3. **Frequência é por aula, não por dia:** A chamada existe no nível de `numero_aula`, não no nível de `data`.

4. **Delete de série exclui as turmas:** Ao deletar uma série, as turmas vinculadas devem ser excluídas em cascata — nunca deixar turmas órfãs.

5. **Nome da escola:** Sempre "Colégio Conexão Maranhense" — nunca "Conexão EAD" ou variações.

6. **CNPJ:** `08.660.860/0001-63` (usado nos contratos e documentos oficiais).

---

## 6. O que está fora do escopo

- **Videoconferência integrada:** As aulas ao vivo usam link externo (Google Meet, Zoom). A plataforma agenda e exibe o link, mas não hospeda a videochamada.
- **Pagamentos online:** O módulo financeiro é apenas registro manual — não há integração com gateway de pagamento.
- **App mobile nativo:** A plataforma é web responsiva. Não há planos de app nativo.
- **Multi-tenant / multi-escola:** A plataforma é dedicada ao Colégio Conexão Maranhense. Suporte a múltiplas escolas está no roadmap futuro (Fase 3).

---

## 7. Critérios de qualidade

| Critério | Exigência |
|---|---|
| **Dark mode** | 100% funcional em todos os componentes |
| **Responsividade** | Funcional em mobile (320px) e desktop (1440px) |
| **Isolamento de segmento** | Zero vazamento de dados entre EAD e Presencial |
| **Feedback ao usuário** | Toda ação tem toast de sucesso ou erro — nunca silencia falhas |
| **Datas** | Sempre formatadas corretamente para pt-BR (sem bug UTC-3) |
| **Confirmações destrutivas** | AlertDialog do shadcn/ui — nunca window\.confirm() |
