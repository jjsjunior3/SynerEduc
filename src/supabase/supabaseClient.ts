// src/supabase/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

// 🔧 As variáveis vêm do arquivo .env na raiz do projeto
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;

// 🔑 Cria o client do Supabase
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
