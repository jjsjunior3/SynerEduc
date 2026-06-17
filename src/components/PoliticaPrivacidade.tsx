// src/components/PoliticaPrivacidade.tsx
// Política de Privacidade — LGPD (Lei 13.709/2018)
// Exibida no rodapé do login e acessível por link direto

import { ArrowLeft, Shield, Lock, Eye, Trash2, Mail } from 'lucide-react'

interface Props {
  onVoltar?: () => void
}

export default function PoliticaPrivacidade({ onVoltar }: Props) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-4">
          {onVoltar && (
            <button onClick={onVoltar}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
          )}
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            <h1 className="font-bold text-foreground">Política de Privacidade</h1>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Cabeçalho */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Política de Privacidade e Proteção de Dados</h2>
          <p className="text-muted-foreground text-sm mt-2">
            <strong>Colégio Conexão Maranhense</strong> · Sistema SynerEduc · Última atualização: {hoje}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200">
          Este documento foi elaborado em conformidade com a <strong>Lei Geral de Proteção de Dados Pessoais
          (LGPD — Lei nº 13.709/2018)</strong> e tem como objetivo informar como coletamos, usamos,
          armazenamos e protegemos os dados pessoais de alunos, responsáveis, professores e
          demais usuários do portal.
        </div>

        {/* Seção 1 */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
            Quem somos
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O <strong className="text-foreground">Colégio Conexão Maranhense</strong> é o <strong className="text-foreground">Controlador</strong> dos
            dados pessoais tratados neste sistema, responsável por definir a finalidade e os meios de tratamento.
            O sistema SynerEduc, operado pela <strong className="text-foreground">SynerEduc Tecnologia</strong>, atua como
            <strong className="text-foreground"> Operador</strong>, processando os dados estritamente conforme as instruções da escola
            e sem utilizá-los para qualquer outra finalidade.
          </p>
        </section>

        {/* Seção 2 */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
            Quais dados coletamos
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Dados dos alunos:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Nome completo, data de nascimento, filiação</li>
              <li>CPF (quando fornecido na matrícula)</li>
              <li>Série, turma e turno</li>
              <li>Notas, frequência e histórico escolar</li>
              <li>Foto 3x4 (opcional, para documentos oficiais)</li>
            </ul>
            <p className="font-medium text-foreground mt-3">Dados dos responsáveis:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Nome completo, CPF, RG</li>
              <li>Endereço, telefone e e-mail</li>
            </ul>
            <p className="font-medium text-foreground mt-3">Dados dos professores e funcionários:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Nome, e-mail, perfil de acesso e segmento</li>
              <li>Registros de agenda, frequência lançada e atividades</li>
            </ul>
          </div>
        </section>

        {/* Seção 3 */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">3</span>
            Para que usamos os dados
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            {[
              { icon: <Lock className="w-4 h-4" />, titulo: 'Execução do contrato escolar', desc: 'Matrícula, emissão de histórico, declarações e certificados.' },
              { icon: <Eye className="w-4 h-4" />,  titulo: 'Acompanhamento pedagógico', desc: 'Notas, frequência, agenda e comunicados entre escola e família.' },
              { icon: <Shield className="w-4 h-4" />, titulo: 'Obrigação legal', desc: 'Guarda de documentos exigida pelo MEC e legislação educacional.' },
              { icon: <Mail className="w-4 h-4" />,  titulo: 'Comunicação', desc: 'Notificações sobre faltas, atividades e comunicados da escola.' },
            ].map((item, i) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-card flex items-start gap-3">
                <span className="text-blue-600 mt-0.5 flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="font-medium text-foreground">{item.titulo}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Seção 4 */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">4</span>
            Quem tem acesso aos dados
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-2 font-semibold text-foreground">Perfil</th>
                  <th className="text-left px-4 py-2 font-semibold text-foreground">Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  ['Secretaria',    'Todos os dados pessoais — necessário para matrículas e documentos'],
                  ['Gestor Geral',  'Todos os dados pessoais — supervisão e emissão de documentos'],
                  ['Coordenador',   'Dados pedagógicos (notas, frequência, agenda) — sem CPF/RG'],
                  ['Professor',     'Nome do aluno, frequência e notas da sua disciplina'],
                  ['Aluno',         'Somente seus próprios dados (notas, frequência, agenda)'],
                  ['Financeiro',    'Dados de contrato e financeiros — sem dados pedagógicos'],
                ].map(([perfil, acesso], i) => (
                  <tr key={i} className="bg-card">
                    <td className="px-4 py-2.5 font-medium text-foreground">{perfil}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{acesso}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">
            Os dados <strong>não são compartilhados com terceiros</strong> para fins comerciais.
            Parceiros operacionais (ex: plataforma de infraestrutura) acessam dados somente para
            prestação do serviço, com contrato de confidencialidade.
          </p>
        </section>

        {/* Seção 5 */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">5</span>
            Por quanto tempo guardamos os dados
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-foreground font-medium w-48 flex-shrink-0">Histórico escolar:</span>
                <span>Prazo indeterminado — documento permanente exigido pelo MEC</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foreground font-medium w-48 flex-shrink-0">Ficha de matrícula:</span>
                <span>Mínimo 5 anos após a saída do aluno</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foreground font-medium w-48 flex-shrink-0">Documentos financeiros:</span>
                <span>5 anos (obrigação fiscal)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-foreground font-medium w-48 flex-shrink-0">Dados de acesso (logs):</span>
                <span>90 dias</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Seção 6 */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">6</span>
            Seus direitos como titular (Art. 18 LGPD)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            {[
              ['Acesso', 'Solicitar cópia dos seus dados pessoais armazenados'],
              ['Correção', 'Corrigir dados incompletos, inexatos ou desatualizados'],
              ['Eliminação', 'Solicitar exclusão de dados desnecessários (quando legalmente possível)'],
              ['Portabilidade', 'Receber seus dados em formato estruturado'],
              ['Informação', 'Saber com quem seus dados foram compartilhados'],
              ['Revogação', 'Revogar consentimento a qualquer momento'],
            ].map(([direito, desc], i) => (
              <div key={i} className="p-3 rounded-lg border border-border bg-card">
                <p className="font-semibold text-foreground text-xs">{direito}</p>
                <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Seção 7 */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">7</span>
            Segurança dos dados
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1.5 list-disc list-inside ml-2">
            <li>Comunicação criptografada (HTTPS/TLS em todos os acessos)</li>
            <li>Dados em repouso criptografados na infraestrutura de nuvem</li>
            <li>Controle de acesso por perfil — cada usuário vê apenas o que lhe é permitido</li>
            <li>CPF e RG visíveis somente para secretaria e gestão</li>
            <li>Chaves de API de terceiros nunca expostas ao navegador</li>
            <li>Backups automáticos diários</li>
          </ul>
        </section>

        {/* Seção 8 */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">8</span>
            Contato — Encarregado de Dados (DPO)
          </h3>
          <div className="p-4 rounded-lg border border-border bg-card text-sm space-y-1">
            <p className="text-muted-foreground">
              Para exercer seus direitos ou esclarecer dúvidas sobre o tratamento dos seus dados:
            </p>
            <p className="text-foreground font-medium mt-2">Colégio Conexão Maranhense</p>
            <p className="text-muted-foreground">Responsável pelo tratamento de dados: Secretaria Geral</p>
            <p className="text-muted-foreground">
              E-mail: <a href="mailto:privacidade@colegioconexao.com.br"
                className="text-blue-600 dark:text-blue-400 hover:underline">
                privacidade@colegioconexao.com.br
              </a>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Prazo de resposta: até 15 dias úteis, conforme Art. 18 da LGPD.
            </p>
          </div>
        </section>

        {/* Rodapé */}
        <div className="border-t border-border pt-6 text-xs text-muted-foreground text-center space-y-1">
          <p>Esta política pode ser atualizada. A versão mais recente estará sempre disponível nesta página.</p>
          <p>
            <Trash2 className="w-3 h-3 inline mr-1" />
            Em caso de incidente de segurança, a ANPD será notificada em até 72 horas, conforme Art. 48 da LGPD.
          </p>
        </div>

      </div>
    </div>
  )
}
