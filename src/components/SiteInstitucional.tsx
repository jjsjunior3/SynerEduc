// src/components/SiteInstitucional.tsx
import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { useTheme } from '../contexts/ThemeContext';
import {
  BookOpen,
  Users,
  Award,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
  GraduationCap,
  Monitor,
  Lightbulb,
  School,
  Waves,
  Dumbbell,
  UtensilsCrossed,
  Trophy,
  Cpu,
  Sun,
  Moon,
} from 'lucide-react';

interface SiteInstitucionalProps {
  onAccessPortal: () => void;
}

export default function SiteInstitucional({ onAccessPortal }: SiteInstitucionalProps) {
  const { theme, toggleTheme } = useTheme();
  const [showMatriculaDialog, setShowMatriculaDialog] = useState(false);
  const [formularioData, setFormularioData] = useState({
    nomeAluno: '',
    serie: '',
    turno: 'matutino',
    nomeResponsavel: '',
    email: '',
    telefone: ''
  });

  const infraestrutura = [
    { icone: <School className="w-8 h-8" />, titulo: 'Salas Climatizadas', descricao: 'Ambientes modernos e confortáveis com ar-condicionado' },
    { icone: <Dumbbell className="w-8 h-8" />, titulo: 'Quadra Poliesportiva', descricao: 'Espaço completo para práticas esportivas' },
    { icone: <Trophy className="w-8 h-8" />, titulo: 'Campo de Futebol', descricao: 'Campo oficial para treinos e competições' },
    { icone: <Waves className="w-8 h-8" />, titulo: 'Piscina', descricao: 'Área aquática para recreação e aulas de natação' },
    { icone: <UtensilsCrossed className="w-8 h-8" />, titulo: 'Área Gourmet', descricao: 'Espaço de convivência e alimentação' },
    { icone: <Cpu className="w-8 h-8" />, titulo: 'Lab. de Robótica', descricao: 'Tecnologia e inovação para o futuro' },
  ];

  const diferenciais = [
    { icone: <Users className="w-8 h-8" />, titulo: 'Professores Qualificados', descricao: 'Equipe pedagógica experiente e especializada' },
    { icone: <BookOpen className="w-8 h-8" />, titulo: 'Material Didático', descricao: 'Conteúdo atualizado e de qualidade' },
    { icone: <Award className="w-8 h-8" />, titulo: 'Certificação MEC', descricao: 'Diploma reconhecido nacionalmente' },
    { icone: <Lightbulb className="w-8 h-8" />, titulo: 'Metodologia Inovadora', descricao: 'Ensino que prepara para o futuro' },
  ];

  const handleFormularioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numeroWhatsApp = '5598983532145';
    const mensagemWhatsApp =
      `Olá, gostaria de solicitar uma matrícula para o Colégio Conexão EAD Maranhense com os seguintes dados:%0A%0A` +
      `*Nome do Aluno:* ${formularioData.nomeAluno}%0A` +
      `*Série Pretendida:* ${formularioData.serie}%0A` +
      `*Turno:* ${formularioData.turno}%0A` +
      `*Nome do Responsável:* ${formularioData.nomeResponsavel}%0A` +
      `*E-mail:* ${formularioData.email}%0A` +
      `*Telefone/WhatsApp:* ${formularioData.telefone}%0A%0A` +
      `Solicitação enviada em: ${new Date().toLocaleString('pt-BR')}`;
    window.open(`https://wa.me/${numeroWhatsApp}?text=${mensagemWhatsApp}`, '_blank');
    setShowMatriculaDialog(false);
    setFormularioData({ nomeAluno: '', serie: '', turno: 'matutino', nomeResponsavel: '', email: '', telefone: '' });
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── HEADER ── */}
      <header className="bg-card/95 backdrop-blur-sm shadow-md border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <img src="/logo-colegio-conexao.png" alt="Colégio Conexão" className="w-12 h-12" />
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
                  Colégio Conexão
                </h1>
                <p className="text-xs text-muted-foreground">Colégio Conexão Maranhense</p>
              </div>
            </div>

            {/* Nav */}
            <nav className="hidden md:flex items-center gap-6">
              {['sobre', 'infraestrutura', 'diferenciais', 'contato'].map((id) => (
                <button
                  key={id}
                  onClick={() => scrollToSection(id)}
                  className="text-muted-foreground hover:text-orange-600 transition-colors capitalize"
                >
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </button>
              ))}
            </nav>

            {/* Ações */}
            <div className="flex items-center gap-3">
              {/* Toggle dark mode */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-secondary text-secondary-foreground hover:bg-accent transition-colors border border-border"
                aria-label="Alternar tema"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>

              {/* Acessar Portal — único botão no header */}
              <Button
                onClick={onAccessPortal}
                className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Acessar Portal
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ── HERO com vídeo ── */}
      <section className="relative h-screen overflow-hidden">
        <div className="absolute inset-0 w-full h-full z-0">
          <video autoPlay loop muted playsInline className="w-full h-full object-cover">
            <source src="/video1.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-orange-600/70 via-green-600/60 to-orange-600/70 z-10" />

        {/* Conteúdo */}
        <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center py-20">
          <div className="text-white max-w-3xl">
            <h2
              className="text-6xl md:text-8xl lg:text-9xl font-extrabold mb-6 leading-tight drop-shadow-lg"
              style={{
                textShadow: '1.5px 1.5px 0px #FF8C00, -1.5px -1.5px 0px #FF8C00, 1.5px -1.5px 0px #FF8C00, -1.5px 1.5px 0px #FF8C00'
              }}
            >
              Educação de
              <span className="block text-orange-400">Qualidade</span>
              para o Futuro
            </h2>
            <p className="text-2xl md:text-3xl lg:text-4xl mb-8 text-gray-100 font-medium drop-shadow-md">
              Ensino do 1º ao 9º ano com infraestrutura completa e metodologia moderna
            </p>

            {/* Apenas um botão no banner */}
            <Button
              onClick={() => setShowMatriculaDialog(true)}
              size="lg"
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-lg px-8 py-6 shadow-2xl hover:shadow-orange-500/50 transition-all"
            >
              Matricule-se Agora
              <ChevronRight className="ml-2" />
            </Button>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce z-20">
          <div className="w-8 h-12 border-2 border-white rounded-full flex items-start justify-center p-2">
            <div className="w-2 h-3 bg-white rounded-full" />
          </div>
        </div>
      </section>

      {/* ── SOBRE ── */}
      <section id="sobre" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Sobre o <span className="text-orange-600">Colégio Conexão</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Oferecemos educação de excelência do 1º ao 9º ano do Ensino Fundamental,
              combinando infraestrutura moderna com metodologia inovadora.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <GraduationCap className="w-8 h-8 text-white" />, grad: 'from-orange-500 to-orange-600', border: 'border-orange-200 dark:border-orange-900 hover:border-orange-400', titulo: 'Ensino Fundamental', desc: 'Do 1º ao 9º ano com currículo completo e atualizado' },
              { icon: <Monitor className="w-8 h-8 text-white" />, grad: 'from-green-500 to-green-600', border: 'border-green-200 dark:border-green-900 hover:border-green-400', titulo: 'EAD de Qualidade', desc: 'Plataforma moderna e intuitiva para aprendizado online' },
              { icon: <Award className="w-8 h-8 text-white" />, grad: 'from-orange-500 to-green-600', border: 'border-orange-200 dark:border-orange-900 hover:border-orange-400', titulo: 'Reconhecimento MEC', desc: 'Certificação oficial com validade nacional' },
            ].map((item, i) => (
              <Card key={i} className={`border-2 ${item.border} transition-all hover:shadow-xl`}>
                <CardContent className="p-8 text-center">
                  <div className={`w-16 h-16 bg-gradient-to-br ${item.grad} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-3">{item.titulo}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── INFRAESTRUTURA ── */}
      <section id="infraestrutura" className="py-20 bg-muted/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Nossa <span className="text-orange-600">Infraestrutura</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Espaços modernos e completos para o desenvolvimento integral dos nossos alunos
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {infraestrutura.map((item, index) => (
              <Card
                key={index}
                className="border-2 border-transparent hover:border-orange-400 dark:hover:border-orange-600 transition-all hover:shadow-2xl group bg-card"
              >
                <CardContent className="p-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform text-white">
                    {item.icone}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.titulo}</h3>
                  <p className="text-muted-foreground text-sm">{item.descricao}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── DIFERENCIAIS ── */}
      <section id="diferenciais" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Nossos <span className="text-green-600">Diferenciais</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              O que torna o Colégio Conexão único na educação maranhense
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {diferenciais.map((item, index) => (
              <div key={index} className="text-center group">
                <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-lg text-white">
                  {item.icone}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{item.titulo}</h3>
                <p className="text-muted-foreground text-sm">{item.descricao}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 bg-gradient-to-r from-orange-600 via-green-600 to-orange-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
          <h2 className="text-4xl font-bold mb-6">Faça Parte da Nossa História</h2>
          <p className="text-xl mb-8 opacity-90">
            Matrículas abertas para o ano letivo de 2026. Garanta sua vaga!
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              onClick={() => setShowMatriculaDialog(true)}
              size="lg"
              className="bg-white text-orange-600 hover:bg-gray-100 font-bold text-lg px-8 py-6 shadow-2xl"
            >
              Matricule-se Agora
              <ChevronRight className="ml-2" />
            </Button>
            <Button
              onClick={() => scrollToSection('contato')}
              size="lg"
              variant="outline"
              className="border-2 border-white text-white hover:bg-white/20 font-bold text-lg px-8 py-6 shadow-2xl"
            >
              Fale Conosco
            </Button>
          </div>
        </div>
      </section>

      {/* ── CONTATO ── */}
      <section id="contato" className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">
              Entre em <span className="text-orange-600">Contato</span>
            </h2>
            <p className="text-xl text-muted-foreground">Estamos prontos para atender você</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: <MapPin className="w-8 h-8 text-orange-600" />, bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'hover:border-orange-400', titulo: 'Endereço', info: ['Av. João Pessoa, n 262', 'Outeiro da Cruz, São Luís - MA'] },
              { icon: <Phone className="w-8 h-8 text-green-600" />, bg: 'bg-green-100 dark:bg-green-900/30', border: 'hover:border-green-400', titulo: 'Telefone', info: ['(98) 3243-3057', '(98) 982532145'] },
              { icon: <Mail className="w-8 h-8 text-orange-600" />, bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'hover:border-orange-400', titulo: 'E-mail', info: ['secretaria@conexaoma.com.br'] },
            ].map((item, i) => (
              <Card key={i} className={`text-center border-2 border-border ${item.border} transition-all hover:shadow-xl`}>
                <CardContent className="p-8">
                  <div className={`w-16 h-16 ${item.bg} rounded-full flex items-center justify-center mx-auto mb-4`}>
                    {item.icon}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">{item.titulo}</h3>
                  {item.info.map((linha, j) => (
                    <p key={j} className="text-muted-foreground">{linha}</p>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/logo-colegio-conexao.png" alt="Logo" className="w-10 h-10" />
                <div>
                  <h3 className="font-bold text-lg">Colégio Conexão</h3>
                  <p className="text-sm text-gray-400">Maranhense</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                Educação de qualidade para o futuro dos seus filhos
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-orange-400">Links Rápidos</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><button onClick={() => scrollToSection('sobre')} className="hover:text-white transition-colors">Sobre Nós</button></li>
                <li><button onClick={() => scrollToSection('infraestrutura')} className="hover:text-white transition-colors">Infraestrutura</button></li>
                <li><button onClick={() => scrollToSection('diferenciais')} className="hover:text-white transition-colors">Diferenciais</button></li>
                <li><button onClick={onAccessPortal} className="hover:text-white transition-colors">Portal do Aluno</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4 text-green-400">Horário de Atendimento</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Segunda a Sexta: 8h às 18h</li>
                <li>Sábado: 8h às 12h</li>
                <li>Domingo: Fechado</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-gray-400 text-sm">
            <p>&copy; 2026 Colégio Conexão EAD Maranhense. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

      {/* ── MODAL MATRÍCULA ── */}
      <Dialog open={showMatriculaDialog} onOpenChange={setShowMatriculaDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center mb-2">
              <span className="bg-gradient-to-r from-orange-600 to-green-600 bg-clip-text text-transparent">
                Faça sua Matrícula
              </span>
            </DialogTitle>
            <DialogDescription className="text-center text-muted-foreground">
              Preencha os dados abaixo para solicitar sua matrícula
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormularioSubmit} className="space-y-4 mt-4">
            <div>
              <Label htmlFor="nomeAluno">Nome do Aluno *</Label>
              <Input id="nomeAluno" required value={formularioData.nomeAluno}
                onChange={(e) => setFormularioData({ ...formularioData, nomeAluno: e.target.value })}
                placeholder="Digite o nome completo" />
            </div>
            <div>
              <Label htmlFor="serie">Série Pretendida *</Label>
              <Select required value={formularioData.serie}
                onValueChange={(value) => setFormularioData({ ...formularioData, serie: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione a série" /></SelectTrigger>
                <SelectContent>
                  {['1º Ano','2º Ano','3º Ano','4º Ano','5º Ano','6º Ano','7º Ano','8º Ano','9º Ano'].map((s, i) => (
                    <SelectItem key={i} value={`${i+1}ano`}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="turno">Turno *</Label>
              <Select required value={formularioData.turno}
                onValueChange={(value) => setFormularioData({ ...formularioData, turno: value })}>
                <SelectTrigger><SelectValue placeholder="Selecione o turno" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="matutino">Matutino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="nomeResponsavel">Nome do Responsável *</Label>
              <Input id="nomeResponsavel" required value={formularioData.nomeResponsavel}
                onChange={(e) => setFormularioData({ ...formularioData, nomeResponsavel: e.target.value })}
                placeholder="Digite o nome completo" />
            </div>
            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" type="email" required value={formularioData.email}
                onChange={(e) => setFormularioData({ ...formularioData, email: e.target.value })}
                placeholder="seu@email.com" />
            </div>
            <div>
              <Label htmlFor="telefone">Telefone/WhatsApp *</Label>
              <Input id="telefone" required value={formularioData.telefone}
                onChange={(e) => setFormularioData({ ...formularioData, telefone: e.target.value })}
                placeholder="(98) 98765-4321" />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowMatriculaDialog(false)} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-gradient-to-r from-orange-500 to-green-600 hover:from-orange-600 hover:to-green-700 text-white">
                Enviar Solicitação
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}