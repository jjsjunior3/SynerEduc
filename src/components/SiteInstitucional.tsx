import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import {
  ChevronDown,
  ChevronRight,
  Phone,
  UserPlus,
  BookOpen,
} from "lucide-react";

interface SiteInstitucionalProps {
  onAccessPortal: () => void;
}

/**
 * Página pública do Colégio Conexão EAD Maranhense
 * Mostra informações institucionais e opções de matrícula.
 */
export default function SiteInstitucional({ onAccessPortal }: SiteInstitucionalProps) {
  const [showMatriculaDialog, setShowMatriculaDialog] = useState(false);
  const [showFormularioMatricula, setShowFormularioMatricula] = useState(false);
  const [formularioData, setFormularioData] = useState({
    nomeAluno: "",
    serie: "",
    turno: "",
    nomeResponsavel: "",
    email: "",
    telefone: "",
  });

  const handleMatriculaOption = (option: "rematricula" | "nova") => {
    setShowMatriculaDialog(false);
    if (option === "rematricula") {
      onAccessPortal();
    } else {
      setShowFormularioMatricula(true);
    }
  };

  const handleFormularioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const body = `
Aluno: ${formularioData.nomeAluno}
Série: ${formularioData.serie}
Turno: ${formularioData.turno}
Responsável: ${formularioData.nomeResponsavel}
E-mail: ${formularioData.email}
Telefone: ${formularioData.telefone}
`;
    window.location.href = `mailto:contato@conexaoead.edu.br?subject=Nova Matrícula&amp;body=${encodeURIComponent(
      body
    )}`;
    setShowFormularioMatricula(false);
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Topo */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Colégio Conexão</h1>
              <p className="text-xs text-orange-600">Maranhense</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onAccessPortal}>
              Portal
            </Button>
            <Dialog open={showMatriculaDialog} onOpenChange={setShowMatriculaDialog}>
              <DialogTrigger asChild>
                <Button className="bg-orange-600 hover:bg-orange-700 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Matrícula
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tipo de Matrícula</DialogTitle>
                  <DialogDescription>
                    Escolha a opção para prosseguir
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => handleMatriculaOption("rematricula")}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Rematrícula
                  </Button>
                  <Button
                    onClick={() => handleMatriculaOption("nova")}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    Nova Matrícula
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      {/* Corpo Principal */}
      <main className="max-w-6xl mx-auto px-4 py-16 space-y-20">
        <section className="text-center space-y-6">
          <Badge className="bg-orange-100 text-orange-700">📚 Ensino de Qualidade</Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Conectando conhecimento e futuro
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Escola fundamental com metodologia inovadora e professores experientes.
          </p>
          <div className="flex justify-center gap-4">
            <Button
              size="lg"
              className="bg-orange-600 hover:bg-orange-700 text-white"
              onClick={() => setShowMatriculaDialog(true)}
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Fazer Matrícula
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-green-600 text-green-600 hover:bg-green-50"
            >
              <Phone className="w-5 h-5 mr-2" />
              (98) 3243‑3057
            </Button>
          </div>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <Card className="border-orange-200 hover:shadow-md">
            <CardHeader>
              <CardTitle>Anos Iniciais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                1º ao 5º ano com reforço individualizado.
              </p>
            </CardContent>
          </Card>
          <Card className="border-green-200 hover:shadow-md">
            <CardHeader>
              <CardTitle>Anos Finais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                6º ao 9º ano focado em competências e preparo para ensino médio.
              </p>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Rodapé */}
      <footer className="bg-gray-900 text-white py-8 text-center text-sm">
        <p>
          © 2025 Colégio Conexão EAD Maranhense – Todos os direitos reservados.
        </p>
      </footer>

      {/* Modal de formulário de matrícula */}
      <Dialog open={showFormularioMatricula} onOpenChange={setShowFormularioMatricula}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Matrícula</DialogTitle>
            <DialogDescription>
              Preencha os dados para solicitar matrícula
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormularioSubmit} className="space-y-4">
            <div>
              <Label>Nome do Aluno</Label>
              <Input
                value={formularioData.nomeAluno}
                onChange={(e) =>
                  setFormularioData((p) => ({ ...p, nomeAluno: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label>Série</Label>
              <Select
                onValueChange={(v) =>
                  setFormularioData((p) => ({ ...p, serie: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione série" />
                </SelectTrigger>
                <SelectContent>
                  {["1º ano","2º ano","3º ano","4º ano","5º ano","6º ano","7º ano","8º ano","9º ano"].map((ano)=>(
                    <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Turno</Label>
              <Select
                onValueChange={(v) =>
                  setFormularioData((p) => ({ ...p, turno: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione turno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="matutino">Matutino</SelectItem>
                  <SelectItem value="vespertino">Vespertino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável</Label>
              <Input
                value={formularioData.nomeResponsavel}
                onChange={(e) =>
                  setFormularioData((p) => ({
                    ...p,
                    nomeResponsavel: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <Label>E‑mail</Label>
              <Input
                type="email"
                value={formularioData.email}
                onChange={(e) =>
                  setFormularioData((p) => ({ ...p, email: e.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={formularioData.telefone}
                onChange={(e) =>
                  setFormularioData((p) => ({ ...p, telefone: e.target.value }))
                }
                required
              />
            </div>
            <Button type="submit" className="w-full bg-orange-600 hover:bg-orange-700">
              Enviar Solicitação
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
