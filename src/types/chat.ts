// src/types/chat.ts
// Tipos compartilhados pelos agentes de IA (F5.0)

export type PerfilAgente =
  | 'secretaria'
  | 'coordenador'
  | 'gestor'
  | 'professor'
  | 'aluno'
  | 'financeiro'
  | 'admin_geral'
  | 'admin_synerEduc'

export type StatusMensagem = 'enviando' | 'ok' | 'erro'

export interface Mensagem {
  id:        string
  role:      'user' | 'assistant'
  conteudo:  string
  status:    StatusMensagem
  timestamp: Date
}

export interface ToolUseRequest {
  id:    string
  name:  string
  input: Record<string, unknown>
}

export interface RespostaProxy {
  tipo:      'resposta' | 'tool_use'
  texto?:    string
  tool_use?: ToolUseRequest[]
  mensagens?: { role: 'user' | 'assistant'; content: unknown }[]
  uso?:      { input_tokens: number; output_tokens: number }
  erro?:     string
}
