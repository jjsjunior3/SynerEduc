// src/utils/versaoApp.ts
//
// ⚠️ IMPORTANTE: Incremente VERSAO_ATUAL a cada deploy para forçar
// atualização nos navegadores dos usuários.
//
// Exemplos de incremento:
//   '1.0.0' → '1.1.0' (nova funcionalidade)
//   '1.1.0' → '1.1.1' (correção de bug)
//   '1.1.1' → '2.0.0' (mudança grande)

const VERSAO_ATUAL = '1.0.1';
const CHAVE_VERSAO = 'ava_versao';

export function verificarVersao(): void {
  try {
    const versaoSalva = localStorage.getItem(CHAVE_VERSAO);

    if (versaoSalva !== VERSAO_ATUAL) {
      // Preserva apenas o usuário logado
      const usuario = localStorage.getItem('ava_user');

      // Limpa todo o localStorage
      localStorage.clear();

      // Restaura o usuário para não deslogar
      if (usuario) {
        localStorage.setItem('ava_user', usuario);
      }

      // Registra a nova versão
      localStorage.setItem(CHAVE_VERSAO, VERSAO_ATUAL);

      // Força reload buscando arquivos novos do servidor (ignora cache)
      window.location.reload();
    }
  } catch (err) {
    // Em modo privado ou se localStorage estiver bloqueado, ignora silenciosamente
    console.warn('[versaoApp] Não foi possível verificar a versão:', err);
  }
}

export function getVersaoAtual(): string {
  return VERSAO_ATUAL;
}