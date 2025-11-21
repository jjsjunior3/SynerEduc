🏫 AVA – Colégio Conexão
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