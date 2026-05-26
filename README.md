# 🎓 SynerEduc — Plataforma de Gestão Escolar

> **Sistema completo de gestão escolar em produção**, atendendo dois segmentos de ensino simultâneos — EAD e Presencial — no Colégio Conexão Maranhense, São Luís/MA.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white&style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white&style=for-the-badge)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white&style=for-the-badge)

---

## 📋 Sobre o Projeto

O **SynerEduc** é uma plataforma EdTech de gestão escolar completa, desenvolvida por **José João Santos Júnior** — 18 anos de experiência em gestão escolar (coordenação pedagógica, direção e administração).

O sistema está **em produção com dados reais** e centraliza toda a operação acadêmica: matrículas, notas, frequência, atividades, comunicados, agenda, contratos, financeiro e relatórios — com isolamento completo entre segmentos e perfis de acesso.

A intenção é evoluir para um **SaaS multi-tenant**, disponível para outras instituições de ensino.

---

## ✨ Segmentos de Ensino

O sistema opera dois segmentos **completamente isolados** na mesma plataforma:

| Segmento | Status | Descrição |
|----------|--------|-----------|
| **EAD** | ✅ Em produção | Alunos, professores e coordenação do ensino a distância |
| **Presencial** | ✅ Em produção | Alunos, professores e coordenação do ensino presencial |

O isolamento é garantido em duas camadas: **RLS no Supabase** (nível de banco) e **hook `useSegmento`** (nível de frontend). Um usuário de um segmento não consegue ver dados do outro, nem via interface nem via API.

---

## 👥 Perfis de Acesso

| Perfil | Segmento | Acesso |
|--------|----------|--------|
| `administrador` | Ambos | Visão completa — EAD + Presencial |
| `admin_presencial` | Presencial | Painel exclusivo de gestão presencial |
| `gestor_geral` | Ambos | Financeiro, secretaria e relatórios |
| `secretaria` | Ambos | Matrículas, documentos e contratos |
| `financeiro` | Ambos | Pagamentos, despesas e relatórios financeiros |
| `coordenador` | EAD ou Presencial | Pedagógico, frequência, boletins e agenda |
| `professor` | EAD ou Presencial | Notas, frequência, atividades e agenda |
| `professor_conteudista` | EAD | Materiais pedagógicos em PDF |
| `aluno` | EAD ou Presencial | Próprios dados — boletim, agenda, atividades |
| `responsavel` | — | Em desenvolvimento |

---

## 🖥️ Dashboards

### 👨‍💼 Administrador
- Visão geral de ambos os segmentos
- Presença online em tempo real (heartbeat via `sessoes_ativas`)
- Acesso a todos os módulos da plataforma
- Gerenciamento completo de usuários

### 🏫 Admin Presencial
- Cadastro de professores, coordenadores e alunos presenciais
- Criação de séries e disciplinas presenciais
- Gestão de vínculos professor → disciplina → série
- Gerenciamento de usuários (editar, arquivar, desativar)
- Segmento travado em "Presencial" — impossível alterar por acidente

### 📋 Gestor Geral
- Controle de mensalidades e inadimplência
- Emissão e gestão de contratos
- Registro de despesas com categorias
- Relatórios financeiros consolidados

### 🗂️ Secretaria
- Ficha de matrícula completa
- Recebimento e controle de documentos
- Emissão de contratos de prestação de serviços
- Liberação de acesso ao portal do aluno
- Emissão de 6 tipos de documentos oficiais com PDF padronizado

### 🎓 Coordenador
- Boletins gerais — notas de todos os alunos do segmento
- Relatório de turma com gráficos e exportação PDF
- Controle de frequência com histórico e alertas
- Gestão de horários de aula
- Supervisão da agenda dos professores (visualizar, editar, liberar envio)
- Envio de comunicados com anexos
- Fórum das disciplinas (EAD)
- Impressão de boletim completo de qualquer aluno

### 👨‍🏫 Professor
- Lançamento de notas por bimestre (AV1, AV2, Recuperação com cálculo automático)
- Lançamento de frequência (presente, ausente, atrasado, evadido)
- Criação de atividades com enunciado
- Correção de atividades com nota e feedback por aluno
- Agenda diária por disciplina e turma
- Grade horária
- Aulas ao vivo (EAD)
- Fórum por disciplina (EAD)

### 🎒 Aluno
- Boletim com médias por bimestre e situação final
- Frequência com percentual e histórico
- Agenda do professor (após liberação da coordenação)
- Grade horária da turma
- Atividades: visualizar, enviar arquivo e ver nota + feedback
- Comunicados da escola
- Fórum por disciplina (EAD)

### 💰 Financeiro
- Controle de pagamentos por aluno
- Registro e categorização de despesas
- Relatório financeiro consolidado
- Visão de inadimplência

---

## 🧠 Regras de Negócio

### Cálculo de Notas — EAD
```
Média Bimestral = (AV1 + AV2) / 2

Se Recuperação > menor(AV1, AV2):
  → Substitui a menor nota
  → Recalcula a média

Média Final = (Bim1 + Bim2 + Bim3 + Bim4) / 4
  → Calculada somente quando os 4 bimestres têm nota
  → Antes disso: situação = "Cursando"

Situação Final:
  ≥ 7.0 → Aprovado
  5.0–6.9 → Recuperação
  < 5.0 → Reprovado
```

### Cálculo de Notas — Presencial
```
Média Bimestral = (AV1 + AV2 + AV3) / 3

Se Recuperação > Média:
  → Substitui a média diretamente

Mesma lógica de situação final do EAD
```

### Frequência
```
Fórmula: frequência% = (presenças + atrasos) / total de aulas × 100
  Atrasado → conta como presença
  Evadido  → não conta como presença nem falta

Situação:
  ≥ 85% → Regular (verde)
  75–84% → Atenção (amarelo)
  < 75% → Crítica (vermelho)
```

---

## 🏗️ Arquitetura

```
┌──────────────────────────────────────────────┐
│           Frontend (React + Vite)            │
│  TypeScript · Tailwind v4 · Radix · Recharts │
│         Navegação via useState — sem Router  │
└─────────────────┬────────────────────────────┘
                  │ REST + Realtime
┌─────────────────▼────────────────────────────┐
│              Supabase (BaaS)                 │
│  ┌──────────┐ ┌──────┐ ┌────────┐ ┌───────┐  │
│  │PostgreSQL│ │ Auth │ │Storage │ │Real-  │  │
│  │  22+     │ │login │ │buckets │ │time   │  │
│  │ tabelas  │ │sessão│ │arquivos│ │notify │  │
│  └──────────┘ └──────┘ └────────┘ └───────┘  │
│              RLS em todas as tabelas         │
└──────────────────────────────────────────────┘
```

### Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 6 (SWC) |
| Estilização | Tailwind CSS v4 + CSS Variables |
| Componentes | Radix UI + shadcn/ui |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Gráficos | Recharts |
| PDF | `window.print()` (boletins) + jsPDF (relatórios) |
| Notificações | Sonner |
| Ícones | Lucide React |

---

## 🗄️ Banco de Dados

**22+ tabelas** no PostgreSQL via Supabase, com RLS ativo em todas:

| Tabela | Descrição |
|--------|-----------|
| `users` | Todos os usuários do sistema |
| `fichas_matricula` | Fichas de matrícula (fonte primária de alunos) |
| `documentos_matricula` | Documentos enviados por aluno |
| `contratos` | Contratos de prestação de serviços |
| `financeiro_mensalidades` | Parcelas geradas pelos contratos |
| `financeiro_despesas` | Despesas da escola |
| `series` | Séries escolares (modelo) |
| `turmas` | Turmas por ano letivo |
| `disciplinas` | Catálogo de disciplinas |
| `professores_disciplinas_series` | Vínculos professor → disciplina → série |
| `notas` | AV1, AV2, recuperação, média por bimestre |
| `frequencia_diaria` | Presença por aluno/disciplina/aula |
| `frequencia_professor` | Presença do professor |
| `registro_hora_aula` | Carga horária semanal |
| `agenda_professor` | Planejamento diário |
| `atividades` | Atividades criadas pelos professores |
| `atividades_alunos` | Entregas com nota e feedback |
| `comunicados` | Comunicados com anexos |
| `horarios_escolar` | Grade horária |
| `sessoes_ativas` | Presença online via heartbeat |
| `notificacoes` | Notificações em tempo real |
| `forum_topicos` / `forum_respostas` | Fórum por disciplina |
| `pdfs_conteudista` | Materiais pedagógicos EAD |

---

## 📊 Números do Projeto

| Métrica | Valor |
|---------|-------|
| Perfis de acesso | 10 |
| Dashboards | 8 |
| Segmentos de ensino | 2 (EAD + Presencial) |
| Tabelas no banco | 22+ |
| Componentes React | 70+ |
| Linhas de código (estimado) | 25.000+ |

---

## 🎨 Design

- **Tema Dark/Light** nativo em toda a plataforma via CSS Variables
- **Design System** consistente com Radix UI + shadcn/ui
- **Cores dinâmicas** nos cards de desempenho (verde/amarelo/vermelho conforme performance)
- **PDFs padronizados** com logo da escola, marca d'água e rodapé institucional
- **Responsivo** para desktop e tablets

---

## 🛣️ Roadmap

### Concluído ✅
- [x] 8 dashboards com perfis de acesso isolados
- [x] Segmentos EAD e Presencial em produção
- [x] Sistema de notas com recuperação automática (regra por segmento)
- [x] Atividades com correção e feedback
- [x] Comunicados com anexos (imagem/PDF)
- [x] Boletim e relatórios com PDF padronizado (logo + marca d'água)
- [x] Frequência com alertas e relatórios
- [x] Módulo financeiro completo (mensalidades, despesas, relatórios)
- [x] Secretaria: ficha de matrícula, documentos, contratos
- [x] Presença online em tempo real
- [x] Tema dark/light completo
- [x] Isolamento total EAD ↔ Presencial validado em produção

### Em desenvolvimento 🔧
- [ ] Correções pontuais no painel do admin presencial
- [ ] Testes unitários (Vitest) para funções utilitárias

### Próximas fases 🔜
- [ ] **Multi-tenant** — tabela `escolas`, isolamento por `escola_id`, login por domínio
- [ ] **Agentes de IA por perfil** — assistente com contexto real dos dados de cada usuário
- [ ] **IA para histórico escolar** — de 60 dias para segundos
- [ ] **Portal do Responsável** — agenda, boletim, frequência, comunicados, chat
- [ ] **Financeiro avançado** — boletos via Asaas, baixa automática, self-service
- [ ] **Virada de ano letivo** — promoção de série, arquivamento, preservação de histórico
- [ ] **PWA** — instalável como app, sem publicação em loja

---

## 🔒 Acesso e Privacidade

Este é um **projeto em produção** utilizado com dados reais de alunos, professores e funcionários.

O código-fonte não é disponibilizado publicamente em conformidade com a **LGPD** (Lei Geral de Proteção de Dados).

> Demonstrações do sistema, arquitetura e funcionalidades podem ser apresentadas sob demanda.

---

## 👨‍💻 Sobre o Desenvolvedor

**José João Santos Júnior** — 18 anos de experiência em gestão escolar aplicados ao desenvolvimento de soluções EdTech.

[![LinkedIn](https://img.shields.io/badge/-LinkedIn-0A66C2?logo=linkedin&logoColor=fff&style=for-the-badge)](https://www.linkedin.com/in/jrsantosdev1/)

---

*Sistema em produção — SynerEduc © 2026*
