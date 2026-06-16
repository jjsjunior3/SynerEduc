// src/utils/versaoApp.ts
//
// Exemplos de incremento:
//   '1.0.2' → '1.0.3' (correção de bug)
//   '1.0.3' → '1.1.0' (nova funcionalidade)

const VERSAO_ATUAL = '1.8.3';
const CHAVE_VERSAO = 'ava_versao';

export function verificarVersao(): void {
  try {
    const versaoSalva = localStorage.getItem(CHAVE_VERSAO);

    if (versaoSalva !== VERSAO_ATUAL) {
      console.info(`[versaoApp] Atualizando ${versaoSalva} → ${VERSAO_ATUAL}`);

      // 1) Preserva as chaves do Supabase Auth (sb-*) para não deslogar
      const sessaoSupabase = Object.entries(localStorage)
        .filter(([key]) => key.startsWith('sb-'))
        .reduce((acc, [key, val]) => { acc[key] = val; return acc; }, {} as Record<string, string>);

      const usuarioAva = localStorage.getItem('ava_user');

      // 2) Limpa todo o localStorage
      localStorage.clear();

      // 3) Restaura a sessão
      Object.entries(sessaoSupabase).forEach(([key, val]) => localStorage.setItem(key, val));
      if (usuarioAva) localStorage.setItem('ava_user', usuarioAva);

      // 4) Grava a versão nova
      localStorage.setItem(CHAVE_VERSAO, VERSAO_ATUAL);

      // 5) Limpa cache de Service Workers se existir
      if ('caches' in window) {
        caches.keys().then(keys => keys.forEach(key => caches.delete(key)));
      }

      // 6) Reload forçado — ignora cache do browser
      window.location.replace(window.location.pathname + '?v=' + VERSAO_ATUAL);
    }
  } catch (err) {
    console.warn('[versaoApp] Não foi possível verificar a versão:', err);
  }
}

export function getVersaoAtual(): string {
  return VERSAO_ATUAL;
}