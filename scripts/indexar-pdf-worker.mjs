// scripts/indexar-pdf-worker.ts
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
var SUPABASE_URL = process.env.VITE_SUPABASE_URL ?? "";
var SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ?? "";
var ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";
var PINECONE_KEY = process.env.PINECONE_API_KEY ?? "";
var PINECONE_HOST = process.env.PINECONE_HOST ?? "";
var OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
var EMBED_MODEL = "bge-m3:567m";
var OCR_MODEL = "claude-haiku-4-5-20251001";
var WORDS_POR_CHUNK = 400;
var OVERLAP_WORDS = 50;
var BATCH_PINECONE = 50;
var pdfId = process.argv[2];
if (!pdfId) {
  console.error("\u274C Uso: indexar-pdf-worker.ts <pdf-id>");
  process.exit(1);
}
var supabase = createClient(SUPABASE_URL, SERVICE_KEY);
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function chunkarTexto(texto) {
  const palavras = texto.replace(/\s+/g, " ").trim().split(" ");
  if (!palavras.length) return [];
  const chunks = [];
  let inicio = 0;
  while (inicio < palavras.length) {
    const fim = Math.min(inicio + WORDS_POR_CHUNK, palavras.length);
    chunks.push(palavras.slice(inicio, fim).join(" "));
    if (fim === palavras.length) break;
    inicio = fim - OVERLAP_WORDS;
  }
  return chunks.filter((c) => c.trim().length > 50);
}
async function extrairTextoPDF(pdfBytes, numPages) {
  const base64 = Buffer.from(pdfBytes).toString("base64");
  process.stdout.write(`
     \u{1F4D6} enviando PDF completo para OCR`);
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: OCR_MODEL,
      max_tokens: 8e3,
      messages: [{
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
          { type: "text", text: "Extraia TODO o texto vis\xEDvel neste livro did\xE1tico escolar, p\xE1gina por p\xE1gina. Preserve par\xE1grafos, t\xEDtulos, subt\xEDtulos e enunciados de exerc\xEDcios. Retorne apenas o texto extra\xEDdo, sem coment\xE1rios adicionais." }
        ]
      }]
    })
  });
  const tokensRestantes = parseInt(resp.headers.get("anthropic-ratelimit-tokens-remaining") ?? "99999");
  if (tokensRestantes < 8e3) {
    const resetHeader = resp.headers.get("anthropic-ratelimit-tokens-reset");
    if (resetHeader) {
      const resetMs = new Date(resetHeader).getTime() - Date.now();
      if (resetMs > 0 && resetMs < 12e4) {
        process.stdout.write(` [aguardando ${Math.ceil(resetMs / 1e3)}s rate limit]`);
        await sleep(resetMs + 500);
      }
    }
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    if (resp.status === 429) {
      process.stdout.write(" [429, aguardando 60s]");
      await sleep(6e4);
      return extrairTextoPDF(pdfBytes);
    }
    if (resp.status === 400) {
      throw new Error(`PDF rejeitado pelo Claude (400): ${err?.error?.message ?? "muito grande ou inv\xE1lido"}`);
    }
    throw new Error(`Anthropic OCR ${resp.status}: ${err?.error?.message ?? "desconhecido"}`);
  }
  const data = await resp.json();
  const texto = (data.content ?? []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const tokens = data.usage?.output_tokens ?? 0;
  process.stdout.write(` \u2713 (${tokens} tokens output)`);
  return texto;
}
async function gerarEmbeddings(textos) {
  const resp = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, input: textos })
  });
  if (!resp.ok) throw new Error(`Ollama BGE-M3 ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  return data.embeddings;
}
async function deletarVetores(id) {
  await fetch(`${PINECONE_HOST}/vectors/delete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Key": PINECONE_KEY },
    body: JSON.stringify({ filter: { pdf_id: { "$eq": id } } })
  });
}
async function upsertPinecone(vetores) {
  const resp = await fetch(`${PINECONE_HOST}/vectors/upsert`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Api-Key": PINECONE_KEY },
    body: JSON.stringify({ vectors: vetores })
  });
  if (!resp.ok) throw new Error(`Pinecone upsert ${resp.status}: ${await resp.text()}`);
}
async function atualizarStatus(id, patch) {
  await fetch(`${SUPABASE_URL}/rest/v1/pdfs_conteudista?id=eq.${id}`, {
    method: "PATCH",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(patch)
  });
}
async function main() {
  const { data: pdf, error } = await supabase.from("pdfs_conteudista").select("id, nome, disciplina, serie, bimestre, url, tipo_documento").eq("id", pdfId).single();
  if (error || !pdf) {
    console.error(`
     \u274C PDF ${pdfId} n\xE3o encontrado: ${error?.message}`);
    process.exit(1);
  }
  try {
    const resp = await fetch(pdf.url);
    if (!resp.ok) throw new Error(`Download falhou (${resp.status})`);
    const pdfBytes = new Uint8Array(await resp.arrayBuffer());
    process.stdout.write(`
   \u{1F4E5} ${(pdfBytes.length / 1024 / 1024).toFixed(1)}MB`);
    await atualizarStatus(pdf.id, { status_indexacao: "indexando" });
    const textoCompleto = await extrairTextoPDF(pdfBytes);
    if (!textoCompleto.trim()) throw new Error("Nenhum texto extra\xEDdo ap\xF3s OCR");
    const palavras = textoCompleto.split(/\s+/).length;
    process.stdout.write(`
     \u{1F4DD} ${palavras.toLocaleString("pt-BR")} palavras`);
    const chunks = chunkarTexto(textoCompleto);
    process.stdout.write(` \u2192 ${chunks.length} chunks`);
    if (!chunks.length) throw new Error("Nenhum chunk gerado");
    await deletarVetores(pdf.id);
    let totalVetores = 0;
    for (let i = 0; i < chunks.length; i += BATCH_PINECONE) {
      const lote = chunks.slice(i, i + BATCH_PINECONE);
      const embeddings = await gerarEmbeddings(lote);
      const vetores = lote.map((texto, j) => ({
        id: `${pdf.id}_${i + j}`,
        values: embeddings[j],
        metadata: {
          pdf_id: pdf.id,
          nome_arquivo: pdf.nome,
          disciplina: pdf.disciplina,
          serie: pdf.serie,
          bimestre: pdf.bimestre,
          tipo_documento: pdf.tipo_documento ?? "material_didatico",
          chunk_index: i + j,
          texto: texto.slice(0, 800)
        }
      }));
      await upsertPinecone(vetores);
      totalVetores += lote.length;
    }
    await atualizarStatus(pdf.id, {
      status_indexacao: "indexado",
      indexado_em: (/* @__PURE__ */ new Date()).toISOString(),
      chunks_indexados: totalVetores,
      erro_indexacao: null
    });
    process.stdout.write(`
     \u2705 ${totalVetores} vetores no Pinecone
`);
    process.exit(0);
  } catch (err) {
    await atualizarStatus(pdf.id, {
      status_indexacao: "erro",
      erro_indexacao: err.message?.slice(0, 500)
    });
    process.stdout.write(`
     \u274C ${err.message}
`);
    process.exit(1);
  }
}
main();
