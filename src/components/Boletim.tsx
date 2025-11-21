import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../supabase/supabaseClient";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "./ui/card";
import {
  Table,
  TableHeader,
  TableHead,
  TableRow,
  TableBody,
  TableCell
} from "./ui/table";
import { Loader2, AlertTriangle, BookOpen, Trophy, Target } from "lucide-react";
import { Button } from "./ui/button";

interface Nota {
  disciplina: string;
  bimestre_nome: string;
  av1: number;
  av2: number;
  media: number | null;
  media_final: number | null;
  status_final: string;
}

export default function Boletim() {
  const { usuario } = useAuth();
  const [notas, setNotas] = useState<Nota[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buscarNotas();
  }, [usuario]);

  async function buscarNotas() {
    setLoading(true);
    setErro(null);
    if (!usuario?.id) return;

    try {
      const { data, error } = await supabase
        .from("vw_boletim")
        .select("disciplina,bimestre_nome,av1,av2,media,media_final,status_final")
        .eq("user_id", usuario.id)
        .order("disciplina", { ascending: true })
        .order("bimestre_nome", { ascending: true });

      if (error) throw error;
      setNotas(data || []);
    } catch (err: any) {
      console.error("❌ Erro ao buscar boletim:", err.message);
      setErro("Erro ao carregar boletim. Tente novamente mais tarde.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-blue-600">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Carregando boletim...
      </div>
    );
  }

  if (erro) {
    return (
      <div className="text-center mt-10">
        <div className="flex items-center justify-center mb-4 text-red-600">
          <AlertTriangle className="w-6 h-6 mr-2" />
          <span>{erro}</span>
        </div>
        <Button variant="outline" onClick={buscarNotas}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  if (notas.length === 0) {
    return (
      <div className="text-center text-gray-600 mt-10">
        Nenhuma nota registrada ainda.
      </div>
    );
  }

  // agrupamento por disciplina
  const disciplinas = Array.from(new Set(notas.map(n => n.disciplina)));

  return (
    <div className="p-6 space-y-8">
      <Card className="shadow-md">
        <CardHeader className="flex items-center gap-2">
          <BookOpen className="text-blue-600 w-5 h-5" />
          <CardTitle>📘 Boletim Escolar</CardTitle>
        </CardHeader>
        <CardContent>
          {disciplinas.map((disciplina) => {
            const notasDisciplina = notas.filter(n => n.disciplina === disciplina);
            const mediaFinal = notasDisciplina.reduce((acc, n) => acc + (n.media_final ?? 0), 0) / notasDisciplina.length;
            const status = mediaFinal >= 7 ? "Aprovado" : mediaFinal >= 5 ? "Recuperação" : "Reprovado";
            const corStatus =
              status === "Aprovado"
                ? "text-green-600"
                : status === "Recuperação"
                ? "text-yellow-600"
                : "text-red-600";

            return (
              <div key={disciplina} className="mb-10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-600" />
                    {disciplina}
                  </h3>
                  <p className={`font-semibold ${corStatus}`}>{status}</p>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">Bimestre</TableHead>
                      <TableHead className="text-center">AV1</TableHead>
                      <TableHead className="text-center">AV2</TableHead>
                      <TableHead className="text-center">Média</TableHead>
                      <TableHead className="text-center">Média Final</TableHead>
                      <TableHead className="text-center">Situação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notasDisciplina.map((n, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{n.bimestre_nome}</TableCell>
                        <TableCell className="text-center">{n.av1?.toFixed(1) ?? "-"}</TableCell>
                        <TableCell className="text-center">{n.av2?.toFixed(1) ?? "-"}</TableCell>
                        <TableCell className="text-center font-medium">
                          {n.media !== null ? n.media.toFixed(1) : "-"}
                        </TableCell>
                        <TableCell className="text-center font-medium">
                          {n.media_final !== null ? n.media_final.toFixed(1) : "-"}
                        </TableCell>
                        <TableCell
                          className={`text-center font-semibold ${
                            n.status_final === "aprovado"
                              ? "text-green-600"
                              : n.status_final === "recuperacao"
                              ? "text-yellow-600"
                              : n.status_final === "reprovado"
                              ? "text-red-600"
                              : "text-gray-500"
                          }`}
                        >
                          {n.status_final}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-2 text-sm text-gray-500">
                  <span className="font-semibold">Média geral: </span>
                  {mediaFinal.toFixed(2)} —{" "}
                  <span className={corStatus}>{status}</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <CardTitle>Legenda</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p><strong>AV1 / AV2:</strong> Avaliações do bimestre.</p>
          <p><strong>Média:</strong> (AV1 + AV2) ÷ 2</p>
          <p><strong>Média Final:</strong> nota após eventual recuperação</p>
          <p><strong>Status:</strong> aprovado (≥7), recuperação (5–6.9), reprovado (&amp;lt;5)</p>
        </CardContent>
      </Card>
    </div>
  );
}
