import { useEffect, useState } from 'react'
import { supabase } from '../supabase/supabaseClient'

export interface EscolaConfig {
  id: string
  dominio: string
  nome: string
  nome_curto: string
  cor_primaria: string
  cor_secundaria: string
  logo_url: string | null
  favicon_url: string | null
  cidade_uf: string | null
  email_contato: string | null
  telefone: string | null
  segmento_padrao: string
  ativo: boolean
}

// Fallback para desenvolvimento local ou domínio não cadastrado
const CONFIG_PADRAO: EscolaConfig = {
  id: '',
  dominio: 'localhost',
  nome: 'Colégio Conexão Maranhense',
  nome_curto: 'Conexão',
  cor_primaria: '#1A56A0',
  cor_secundaria: '#1E40AF',
  logo_url: '/logo-colegio-conexao.png',
  favicon_url: null,
  cidade_uf: 'São Luís/MA',
  email_contato: null,
  telefone: null,
  segmento_padrao: 'ead',
  ativo: true,
}

let cache: EscolaConfig | null = null

export function useEscolaConfig() {
  const [config, setConfig] = useState<EscolaConfig>(cache ?? CONFIG_PADRAO)
  const [loading, setLoading] = useState(!cache)

  useEffect(() => {
    if (cache) return

    const dominio = window.location.hostname.replace('www.', '')

    supabase
      .from('escola_config')
      .select('*')
      .eq('dominio', dominio)
      .eq('ativo', true)
      .single()
      .then(({ data }) => {
        const resultado = data ?? CONFIG_PADRAO
        cache = resultado
        setConfig(resultado)
        setLoading(false)

        // Aplicar cor primária como variável CSS global
        document.documentElement.style.setProperty('--cor-escola', resultado.cor_primaria)
        document.documentElement.style.setProperty('--cor-escola-secundaria', resultado.cor_secundaria)

        // Atualizar título da aba
        document.title = resultado.nome

        // Atualizar favicon se existir
        if (resultado.favicon_url) {
          const link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
          if (link) link.href = resultado.favicon_url
        }
      })
  }, [])

  return { config, loading }
}
