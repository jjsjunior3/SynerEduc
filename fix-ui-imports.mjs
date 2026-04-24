/**
 * fix-ui-imports.mjs
 * 
 * Script para corrigir imports versionados nos componentes ui/
 * Gerados pelo Figma/Locofy com formato: "@radix-ui/react-select@2.1.6"
 * Corrige para: "@radix-ui/react-select"
 * 
 * USO: node fix-ui-imports.mjs
 * Executar na raiz do projeto (onde está a pasta src/)
 */

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const UI_DIR = join('src', 'components', 'ui');

// Regex que captura imports como: from "pacote@versão"  ou  from 'pacote@versão'
// Exemplos que ele pega:
//   from "@radix-ui/react-select@2.1.6"
//   from "class-variance-authority@0.7.1"  
//   from "lucide-react@0.487.0"
//   from "sonner@2.0.3"
const VERSIONED_IMPORT_REGEX = /from\s+["']([^"']+?)@\d+[\d.]*["']/g;

async function fixFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  
  // Verifica se tem imports versionados
  if (!VERSIONED_IMPORT_REGEX.test(content)) {
    return { file: filePath, changed: false };
  }
  
  // Reset regex lastIndex
  VERSIONED_IMPORT_REGEX.lastIndex = 0;
  
  const fixed = content.replace(VERSIONED_IMPORT_REGEX, (match, packageName) => {
    return `from "${packageName}"`;
  });
  
  if (fixed !== content) {
    await writeFile(filePath, fixed, 'utf-8');
    
    // Contar quantos imports foram corrigidos
    VERSIONED_IMPORT_REGEX.lastIndex = 0;
    const matches = content.match(VERSIONED_IMPORT_REGEX);
    return { file: filePath, changed: true, count: matches?.length || 0 };
  }
  
  return { file: filePath, changed: false };
}

async function main() {
  console.log('🔧 Corrigindo imports versionados nos componentes ui/...\n');
  
  try {
    const files = await readdir(UI_DIR);
    const tsxFiles = files.filter(f => f.endsWith('.tsx') || f.endsWith('.ts'));
    
    let totalFixed = 0;
    let totalImports = 0;
    
    for (const file of tsxFiles) {
      const filePath = join(UI_DIR, file);
      const result = await fixFile(filePath);
      
      if (result.changed) {
        console.log(`  ✅ ${file} — ${result.count} import(s) corrigido(s)`);
        totalFixed++;
        totalImports += result.count || 0;
      }
    }
    
    console.log(`\n📊 Resultado:`);
    console.log(`   Arquivos analisados: ${tsxFiles.length}`);
    console.log(`   Arquivos corrigidos: ${totalFixed}`);
    console.log(`   Imports corrigidos:  ${totalImports}`);
    
    if (totalFixed > 0) {
      console.log(`\n✅ Pronto! Agora você pode usar o vite.config.ts limpo (sem aliases).`);
    } else {
      console.log(`\n✅ Nenhum import versionado encontrado. Os arquivos já estão corretos.`);
    }
    
  } catch (err) {
    console.error('❌ Erro:', err.message);
    console.error('   Certifique-se de executar o script na raiz do projeto (onde está a pasta src/)');
  }
}

main();
