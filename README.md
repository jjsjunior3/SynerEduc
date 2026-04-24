# 🎓 AVA Conexão EAD — Plataforma de Gestão Escolar

> **Sistema completo de Ambiente Virtual de Aprendizagem em produção**, atendendo alunos, professores, coordenadores e administradores de uma rede escolar no Maranhão.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white&style=for-the-badge)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white&style=for-the-badge)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?logo=tailwindcss&logoColor=white&style=for-the-badge)
![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white&style=for-the-badge)

---

## 📋 Sobre o Projeto

O **AVA Conexão EAD** é uma plataforma de gestão escolar completa que desenvolvi para o **Colégio Conexão EAD Maranhense**, combinando meus **18 anos de experiência em gestão escolar** com desenvolvimento frontend moderno.

O sistema está **em produção** e é utilizado diariamente por alunos, professores e coordenação da escola.

### O Problema

A escola operava com processos manuais — lançamento de notas em planilhas, comunicados via WhatsApp, controle de frequência em papel, atividades sem rastreamento de entrega. Isso gerava retrabalho, perda de informação e dificuldade de acompanhamento pedagógico.

### A Solução

Uma plataforma web unificada que centraliza toda a operação acadêmica: notas, frequência, atividades, comunicados, agenda, boletim, relatórios — acessível para todos os perfis de usuário, com tema dark/light e notificações em tempo real.

---

## ✨ Funcionalidades Principais

### 👨‍🎓 Painel do Aluno
- Dashboard com **média geral**, **frequência** e **faltas (30 dias)** em cards dinâmicos (cores mudam conforme desempenho)
- Visualização de disciplinas com cores distintas
- Entrega de atividades com upload de arquivos
- Visualização de **nota e feedback do professor** após correção
- Comunicados da escola com suporte a anexos (imagem/PDF)
- Boletim escolar, agenda diária e grade horária
- Acesso rápido: Boletim, Agenda, Horários, Comunicados

### 👨‍🏫 Painel do Professor
- Lançamento de notas (AV1, AV2, Recuperação) com cálculo automático
- Criação de atividades com upload de enunciado
- Correção de atividades com **nota e feedback** para o aluno
- Cards de resumo: **Atividades Enviadas**, **Pendentes de Correção**, **Comunicados**
- Gestão de agenda diária por disciplina/turma
- Lançamento de frequência
- Fórum de discussão por disciplina

### 👩‍💼 Painel do Coordenador
- Supervisão e edição de agendas dos professores
- Envio de comunicados com anexos (imagem, PDF, documento)
- Edição e exclusão de comunicados no histórico
- Visualização e impressão de boletins de qualquer aluno
- Relatórios pedagógicos: desempenho por turma, frequência, destaques e alertas
- Controle de frequência geral com busca e filtros

### 🔧 Painel do Administrador
- Gerenciamento completo de usuários (CRUD)
- Vínculos professor ↔ disciplina ↔ série
- Gestão de horários e configurações da escola

### 📚 Painel do Conteudista
- Upload e gestão de materiais pedagógicos (PDFs)
- Organização por disciplina, série e bimestre

---

## 🧠 Regras de Negócio

### Sistema de Notas
```
Média do Bimestre = (AV1 + AV2) / 2

Se Recuperação existe e é maior que a menor nota:
  → Substitui a menor nota entre AV1 e AV2
  → Recalcula a média

Média Final = soma das 4 médias bimestrais / 4
  → Calculada SOMENTE quando os 4 bimestres estão preenchidos

Situação:
  ✅ Média ≥ 7.0 → Aprovado
  ⚠️ Média 5.0 – 6.9 → Recuperação
  ❌ Média < 5.0 → Reprovado
```

### Fluxo de Atividades
```
Professor cria atividade (com enunciado em PDF)
  → Aluno visualiza e envia arquivo de resposta
    → Professor recebe, corrige e atribui nota + feedback
      → Aluno vê a nota em destaque e o comentário do professor
```

### Sistema de Frequência
```
Frequência registrada diariamente por disciplina
  ≥ 85% → Regular (verde)
  75-84% → Atenção (amarelo)
  < 75% → Situação Crítica (vermelho)
```

---

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────┐
│            Frontend (React + Vite)           │
│  TypeScript · Tailwind · Radix UI · Recharts │
└─────────────────┬───────────────────────────┘
                  │ REST API + WebSocket
┌─────────────────▼───────────────────────────┐
│              Supabase (BaaS)                 │
│  ┌──────────┐ ┌──────┐ ┌────────┐ ┌──────┐  │
│  │PostgreSQL│ │ Auth │ │Storage │ │Real- │  │
│  │  15+     │ │email/│ │5 buck- │ │time  │  │
│  │ tabelas  │ │senha │ │ets     │ │notify│  │
│  └──────────┘ └──────┘ └────────┘ └──────┘  │
└─────────────────────────────────────────────┘
```

### Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 6 (SWC) |
| Estilização | Tailwind CSS + CSS Variables (dark/light) |
| Componentes | Radix UI + shadcn/ui (40+ componentes) |
| Backend | Supabase (PostgreSQL + Auth + Storage + Realtime) |
| Gráficos | Recharts |
| PDF | jsPDF + jspdf-autotable |
| Notificações | Sonner + Supabase Realtime |
| Ícones | Lucide React |

---

## 🗄 Banco de Dados

**15+ tabelas** no PostgreSQL via Supabase:

| Tabela | Descrição |
|--------|-----------|
| `users` | Todos os usuários (5 perfis) |
| `notas` | AV1, AV2, recuperação, média por bimestre |
| `frequencia_diaria` | Presença diária por aluno/disciplina |
| `atividades` | Atividades criadas pelos professores |
| `atividades_alunos` | Entregas com nota e feedback |
| `comunicados` | Comunicados com anexos e público-alvo |
| `agenda_professor` | Planejamento diário com supervisão |
| `disciplinas` | Matérias com cores personalizadas |
| `series` / `turmas` | Estrutura escolar |
| `professores_disciplinas_series` | Vínculos professor-disciplina-série |
| `horarios_escolar` | Grade horária |
| `materiais_pdf` | Materiais pedagógicos |
| `notificacoes` | Notificações em tempo real |
| `forum_topicos` / `forum_respostas` | Fórum por disciplina |

**5 Storage Buckets:** comunicados, avatars, entregas_atividades, atividades, pdfs-conteudista

---

## 📊 Números do Projeto

| Métrica | Valor |
|---------|-------|
| Componentes React | ~60 |
| Tabelas no banco | 15+ |
| Perfis de acesso | 5 |
| Buckets de storage | 5 |
| Linhas de código (estimado) | 20.000+ |

---

## 🎨 Design

- **Tema Dark/Light** em toda a plataforma
- **Design System** consistente com Radix UI + shadcn/ui
- **Cores dinâmicas** nos cards de desempenho (verde/amarelo/vermelho conforme performance)
- **Responsivo** para desktop e tablets
- **Impressão** de boletins em layout profissional landscape

---

## 🛣 Roadmap

- [x] MVP com 5 perfis de acesso
- [x] Sistema de notas com recuperação automática
- [x] Atividades com correção e feedback
- [x] Comunicados com anexos (imagem/PDF)
- [x] Boletim escolar com impressão em PDF
- [x] Frequência com relatórios e alertas
- [x] Tema dark/light completo
- [x] Notificações em tempo real
- [ ] 📱 Responsividade mobile completa
- [ ] 💰 Módulo financeiro (gestor/secretaria)
- [ ] 👨‍👩‍👧 Portal do responsável (pais)
- [ ] 📦 Controle de estoque (limpeza/manutenção)
- [ ] 🏫 Multi-segmento (EAD + Presencial)
- [ ] 🤖 IA para histórico escolar
- [ ] 📅 Virada de ano letivo

---

## 🔒 Acesso e Privacidade

Este é um **projeto privado em produção** utilizado pelo Colégio Conexão EAD Maranhense com dados reais de alunos, professores e funcionários.

O código-fonte não é disponibilizado publicamente em conformidade com a **LGPD** (Lei Geral de Proteção de Dados).

> **Demonstrações do sistema, arquitetura e funcionalidades podem ser apresentadas sob demanda em entrevistas ou reuniões técnicas.**

---

## 👨‍💻 Sobre o Desenvolvedor

**José João Santos Júnior** — 18 anos de experiência em gestão escolar (coordenação pedagógica, direção e administração), aplicando conhecimento real do setor educacional no desenvolvimento de soluções tecnológicas.

[![LinkedIn](https://img.shields.io/badge/-LinkedIn-0A66C2?logo=linkedin&logoColor=fff&style=for-the-badge)](https://www.linkedin.com/in/jrsantosdev1/)

---

*Projeto em desenvolvimento contínuo — Abril/2026*
