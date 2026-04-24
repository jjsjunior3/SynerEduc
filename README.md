# 🎓 AVA Conexão EAD Maranhense

**Plataforma completa de Ambiente Virtual de Aprendizagem (AVA)** desenvolvida para gestão escolar de educação a distância, atendendo alunos, professores, coordenadores e administradores.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6.3-646CFF?logo=vite&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.x-06B6D4?logo=tailwindcss&logoColor=white)

---

## 📋 Sobre o Projeto

O AVA Conexão é um sistema de gestão escolar completo que cobre todo o ciclo acadêmico — desde o lançamento de notas e frequência até comunicados, atividades com correção e feedback, relatórios pedagógicos e controle de agenda.

### Funcionalidades Principais

- **5 perfis de acesso** com dashboards personalizados
- **Sistema de notas** com AV1, AV2, recuperação e cálculo automático de média
- **Controle de frequência** com relatórios e alertas
- **Atividades** com upload de arquivos, correção e feedback do professor
- **Comunicados** com anexos (imagem/PDF), filtros por destinatário
- **Agenda do professor** com supervisão da coordenação
- **Boletim escolar** com impressão em PDF
- **Fórum de discussão** por disciplina
- **Aulas ao vivo** com agendamento
- **Tema dark/light** em toda a plataforma
- **Notificações em tempo real** via Supabase Realtime

---

## 🏗 Arquitetura

```
Frontend (React + Vite)
    ↕ REST API + Realtime WebSocket
Backend (Supabase)
    ├── PostgreSQL (banco de dados)
    ├── Auth (autenticação)
    ├── Storage (arquivos/imagens)
    └── Realtime (notificações)
```

---

## 🔒 Acesso e Privacidade

Este é um **projeto privado em produção** utilizado pelo Colégio Conexão EAD Maranhense com dados reais de alunos, professores e funcionários. O código-fonte e banco de dados não são disponibilizados publicamente em conformidade com a **LGPD (Lei Geral de Proteção de Dados)**.

Demonstrações do sistema, arquitetura e funcionalidades podem ser apresentadas sob demanda em entrevistas ou reuniões técnicas.

> 📫 **Contato para demonstração:** [jrsantosdev1@gmail.com]

---

## 👥 Perfis de Acesso

| Perfil | Funcionalidades |
|--------|----------------|
| **Aluno** | Visualiza notas, frequência, média geral, entrega atividades, vê feedback, comunicados |
| **Professor** | Lança notas, cria atividades, corrige trabalhos, gerencia agenda, lança frequência |
| **Coordenador** | Supervisiona agendas, emite boletins, envia comunicados, relatórios pedagógicos |
| **Conteudista** | Gerencia materiais pedagógicos (PDFs, vídeos) por disciplina e bimestre |
| **Administrador** | Gerencia usuários, vínculos professor-disciplina-série, configurações |

---

## 📁 Estrutura do Projeto

```
src/
├── components/          # ~60 componentes React
│   ├── ui/              # Biblioteca base (shadcn/ui + Radix)
│   ├── Dashboard*.tsx   # 5 dashboards por perfil
│   ├── Boletim*.tsx     # Sistema de notas
│   ├── Atividades*.tsx  # Atividades e entregas
│   └── ...
├── contexts/            # AuthContext, ThemeContext
├── config/              # Configurações da escola
├── supabase/            # Cliente e migrações
├── types/               # Tipos TypeScript
└── App.tsx              # Componente raiz
```

---

## 🗄 Banco de Dados

**15+ tabelas** no PostgreSQL via Supabase, incluindo: `users`, `notas`, `frequencia_diaria`, `atividades`, `atividades_alunos`, `comunicados`, `agenda_professor`, `disciplinas`, `series`, `turmas`, e mais.

**5 Storage Buckets** para arquivos: comunicados, avatars, entregas de atividades, enunciados e materiais pedagógicos.

---

## 🛣 Roadmap

- [x] MVP com 5 perfis de acesso
- [x] Sistema de notas com recuperação
- [x] Atividades com correção e feedback
- [x] Comunicados com anexos
- [ ] Responsividade mobile completa
- [ ] Módulo financeiro (gestor/secretaria)
- [ ] Portal do responsável (pais)
- [ ] Controle de estoque
- [ ] Suporte multi-segmento (EAD + Presencial)
- [ ] IA para histórico escolar
- [ ] Virada de ano letivo

---

## 🛠 Stack Tecnológica

| Tecnologia | Uso |
|-----------|-----|
| React 18 + TypeScript | Frontend SPA |
| Vite 6 (SWC) | Build tool |
| Tailwind CSS | Estilização |
| Radix UI + shadcn/ui | Componentes acessíveis |
| Supabase | Backend (DB, Auth, Storage, Realtime) |
| Recharts | Gráficos e visualizações |
| jsPDF | Geração de relatórios em PDF |
| Sonner | Notificações toast |
| Lucide React | Ícones |

---

## 📄 Licença

Projeto privado — Colégio Conexão EAD Maranhense.

---

*Desenvolvido com 18 anos de experiência em gestão escolar.*🏫 AVA – Colégio Conexão
Documentação Técnica do Banco de Dados (Supabase)
Este documento descreve a modelagem de dados do Ambiente Virtual de Aprendizagem (AVA) do Colégio Conexão.
Contém explicações das tabelas, relacionamentos e usuários envolvidos no sistema.

🧩 Visão Geral
O banco é estruturado para abranger 5 perfis principais:

Perfil	Função principal
Aluno	Consome conteúdo, envia atividades e visualiza notas.
Professor	Atribui e corrige atividades, publica materiais, gerencia chamadas e notas.
Coordenador	Supervisiona turmas, notas, boletins e comunicados.
Professor Conteudista	Produz e disponibiliza materiais PDF de estudo para alunos e professores.
Administrador	Gerencia usuários, vínculos, permissões e estrutura escolar.
⚙️ Estrutura Geral do Banco
O banco foi criado no Supabase (PostgreSQL) e segue as boas práticas de normalização.
Todas as tabelas possuem campos de auditoria, como id (uuid) e criado_em (timestamp).

📚 Tabelas Principais
1️⃣ Users
Armazena todos os usuários de todos os perfis.
Cada tipo de usuário é identificado por tipo_user.

Campos principais

nome_completo, email, usuario_login, senha
tipo_user → (‘aluno’, ‘professor’, ‘coordenador’, ‘conteudista’, ‘admin’)
ativo → ativa/desativa o login.
2️⃣ Turmas
Define as séries e grupos de alunos.

Campos

nome → Ex: “5º Ano A”, “3ª Série B”
ano_letivo
Relação:
Uma turma tem muitos alunos e muitas disciplinas.
3️⃣ Disciplinas
Lista as matérias de cada turma.

Principais campos

nome e descricao
turma_id → FK para turmas.id
Exemplo: Matemática (3ª Série), História (5º Ano)
4️⃣ Professor Disciplinas
Relaciona quais professores ministram quais disciplinas.

Usado por:

Painel do professor (consultar suas turmas e matérias).
Painel do coordenador (visualizar responsáveis de cada disciplina).
5️⃣ Matrículas
Associa alunos às turmas.
Um aluno pertence a uma ou mais turmas (dependendo do nível escolar).

Campos

aluno_id → FK para users.id
turma_id → FK para turmas.id
6️⃣ Materiais
Tabela de upload de conteúdos em PDF (apostilas, exercícios, gabaritos).

Campos

bimestre (1 – 4)
tipo (‘aluno’ ou ‘professor’)
arquivo_url (link do Supabase Storage)
enviado_por → normalmente o professor conteudista
Exemplo de uso
sql
Copiar

SELECT titulo, arquivo_url
FROM materiais
WHERE disciplina_id = 'uuid_matematica'
  AND turma_id = 'uuid_3serie'
  AND bimestre = 2
  AND tipo = 'aluno';
7️⃣ Atividades e Entregas
Define as tarefas criadas pelos professores e as respostas dos alunos.

Tabelas envolvidas

atividades → descrição do exercício, valor, prazo.
entregas → upload do aluno, status e nota.
Relacionamento

Uma atividade tem várias entregas, uma por aluno.

8️⃣ Notas Avaliadas (Boletim)
Registra AV1, AV2, média e recuperação de cada bimestre.

Campo	Descrição
av1 e av2	notas das duas avaliações bimestrais
recuperacao	nota substitutiva (se média < 7)
media_final_bimestre	recalculada automaticamente
aprovado_bimestre	booleano de aprovação

Exportar

Copiar
Exemplo de consulta

sql
Copiar

SELECT disciplina_id, bimestre, media_final_bimestre
FROM notas_avaliacoes
WHERE aluno_id = 'uuid_aluno';
9️⃣ Mural de Comunicados
Permite o envio de comunicados gerais, por turma ou individuais.

Campos

destino_tipo → (‘todos’, ‘turma’, ‘usuario’)
destino_id → identifica o alvo específico
remetente_id → autor (admin, professor ou coordenador)
🔟 Chat e Mensagens Privadas
chat_mensagens → conversa coletiva por turma.
mensagens_privadas → comunicações diretas aluno ↔ professor.
Alunos não trocam mensagens privadas entre si, apenas com professores.

11️⃣ Diário de Frequência
Controle diário de presença dos alunos.

Preenchido pelos professores; visualizado por coordenadores e administradores.

Campos

data_aula
presenca (TRUE/FALSE)
observacao (motivo da falta, notas, etc.)
12️⃣ Arquivos Enviados pelo Professor
Armazena uploads enviados por professores para toda a turma ou individualmente.

Pode incluir devolutivas de atividades, correções e comunicados extras.

Campos

professor_id, turma_id, disciplina_id
aluno_id (nulo se for envio coletivo)
arquivo_url e descricao
13️⃣ Log de Ações do Administrador
Audita todas as operações administrativas (criação, exclusão, reset de senhas, etc.).

Campos

acao → tipo da operação
alvo_usuario_id → alvo da ação
detalhes → JSON com dados adicionais
data_execucao
🧮 Views (Relatórios)
Para facilitar consultas e relatórios o banco possui:

View	Uso
vw_alunos_por_turma	Lista alunos agrupados por turma
vw_professores_disciplinas	Liga professor ↔ disciplina ↔ turma
vw_disciplinas_sem_material	Mostra quais disciplinas ainda faltam material PDF em cada bimestre

Exportar

Copiar
🔒 Políticas de Segurança (RLS)
Todas as tabelas possuem Row Level Security ativada, garantindo:

Perfil	Acesso permitido
Aluno	Somente dados da sua matrícula, atividades e notas próprias.
Professor	Somente turmas e disciplinas vinculadas.
Coordenador	Leitura global + edição de notas e comunicados.
Conteudista	Pode enviar e excluir materiais PDFs.
Administrador	Controle total (CRUD geral e logs).

Exportar

Copiar
🔗 Diagrama Relacional
O diagrama visual completo do banco está no arquivo:

colegio-conexao.dbmlcolegio-conexao.dbml](./colegio-conexao

Visualize interativamente:

👉 dbdiagram.io
