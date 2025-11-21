-- Tabela de usuários (extends auth.users)
CREATE TABLE usuarios (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  nome VARCHAR NOT NULL,
  tipo VARCHAR CHECK (tipo IN ('aluno', 'professor', 'coordenador', 'administrador', 'professor_conteudista')) NOT NULL,
  serie VARCHAR,
  turma VARCHAR,
  avatar_url VARCHAR,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disciplinas
CREATE TABLE disciplinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR NOT NULL,
  descricao TEXT,
  cor VARCHAR DEFAULT '#3B82F6',
  serie VARCHAR NOT NULL,
  icone VARCHAR,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conteúdos/Materiais
CREATE TABLE conteudos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_id UUID REFERENCES disciplinas(id) ON DELETE CASCADE,
  titulo VARCHAR NOT NULL,
  tipo VARCHAR CHECK (tipo IN ('texto', 'video', 'pdf', 'atividade', 'link')) NOT NULL,
  conteudo TEXT,
  arquivo_url VARCHAR,
  video_url VARCHAR,
  ordem INTEGER DEFAULT 0,
  bimestre INTEGER CHECK (bimestre BETWEEN 1 AND 4),
  topico VARCHAR,
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Matrículas (relaciona alunos/professores com disciplinas)
CREATE TABLE matriculas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  disciplina_id UUID REFERENCES disciplinas(id) ON DELETE CASCADE,
  tipo_vinculo VARCHAR CHECK (tipo_vinculo IN ('aluno', 'professor')) NOT NULL,
  serie VARCHAR,
  turma VARCHAR,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, disciplina_id, tipo_vinculo)
);

-- Notas
CREATE TABLE notas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  disciplina_id UUID REFERENCES disciplinas(id) ON DELETE CASCADE,
  bimestre INTEGER CHECK (bimestre BETWEEN 1 AND 4) NOT NULL,
  tipo VARCHAR CHECK (tipo IN ('prova', 'trabalho', 'participacao', 'atividade')) NOT NULL,
  descricao VARCHAR,
  nota DECIMAL(4,2) CHECK (nota >= 0 AND nota <= 10),
  peso DECIMAL(3,2) DEFAULT 1.0,
  data_avaliacao DATE,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Frequência
CREATE TABLE frequencia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  disciplina_id UUID REFERENCES disciplinas(id) ON DELETE CASCADE,
  data_aula DATE NOT NULL,
  presente BOOLEAN NOT NULL,
  justificativa TEXT,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id, disciplina_id, data_aula)
);

-- Atividades
CREATE TABLE atividades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_id UUID REFERENCES disciplinas(id) ON DELETE CASCADE,
  titulo VARCHAR NOT NULL,
  descricao TEXT,
  tipo VARCHAR CHECK (tipo IN ('exercicio', 'prova', 'trabalho', 'projeto')) NOT NULL,
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL,
  data_fim TIMESTAMP WITH TIME ZONE NOT NULL,
  valor_total DECIMAL(4,2) DEFAULT 10.0,
  bimestre INTEGER CHECK (bimestre BETWEEN 1 AND 4),
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissões de atividades
CREATE TABLE submissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id UUID REFERENCES atividades(id) ON DELETE CASCADE,
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  conteudo TEXT,
  arquivo_url VARCHAR,
  nota DECIMAL(4,2),
  feedback TEXT,
  status VARCHAR CHECK (status IN ('pendente', 'entregue', 'avaliada', 'atrasada')) DEFAULT 'pendente',
  data_submissao TIMESTAMP WITH TIME ZONE,
  avaliada_por UUID REFERENCES usuarios(id),
  avaliada_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(atividade_id, usuario_id)
);

-- Fórum
CREATE TABLE forum_topicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  disciplina_id UUID REFERENCES disciplinas(id) ON DELETE CASCADE,
  titulo VARCHAR NOT NULL,
  conteudo TEXT NOT NULL,
  fixado BOOLEAN DEFAULT false,
  fechado BOOLEAN DEFAULT false,
  views INTEGER DEFAULT 0,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE forum_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topico_id UUID REFERENCES forum_topicos(id) ON DELETE CASCADE,
  conteudo TEXT NOT NULL,
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Notificações
CREATE TABLE notificacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo VARCHAR NOT NULL,
  conteudo TEXT,
  tipo VARCHAR CHECK (tipo IN ('info', 'aviso', 'urgente', 'atividade', 'nota')) DEFAULT 'info',
  lida BOOLEAN DEFAULT false,
  url VARCHAR, -- Link para ação relacionada
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE conteudos ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar conforme necessário)
CREATE POLICY "usuarios_select" ON usuarios FOR SELECT USING (true);
CREATE POLICY "disciplinas_select" ON disciplinas FOR SELECT USING (true);
-- Adicionar mais políticas específicas conforme necessário

-- Índices para performance
CREATE INDEX idx_matriculas_usuario ON matriculas(usuario_id);
CREATE INDEX idx_matriculas_disciplina ON matriculas(disciplina_id);
CREATE INDEX idx_notas_usuario_disciplina ON notas(usuario_id, disciplina_id);
CREATE INDEX idx_conteudos_disciplina ON conteudos(disciplina_id, ordem);
CREATE INDEX idx_notificacoes_usuario ON notificacoes(usuario_id, lida);