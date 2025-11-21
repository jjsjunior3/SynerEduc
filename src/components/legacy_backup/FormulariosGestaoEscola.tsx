import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Loader2 } from 'lucide-react';

const seriesDisponiveis = [
  '5º ano - Ensino Fundamental',
  '6º ano - Ensino Fundamental', 
  '7º ano - Ensino Fundamental',
  '8º ano - Ensino Fundamental',
  '9º ano - Ensino Fundamental',
  '1ª série - Ensino Médio',
  '2ª série - Ensino Médio',
  '3ª série - Ensino Médio'
];

// Componente FormDisciplina corrigido
export function FormDisciplina({ disciplina, onSalvar, onCancelar, salvando }: any) {
  const [dados, setDados] = useState({
    nome: disciplina?.nome || '',
    descricao: disciplina?.descricao || '',
    cargaHoraria: disciplina?.cargaHoraria || 1,
    series: disciplina?.series || [],
    ativa: disciplina?.ativa !== undefined ? disciplina.ativa : true
  });

  return (
    <>
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input
          value={dados.nome}
          onChange={(e) => setDados(prev => ({ ...prev, nome: e.target.value }))}
          placeholder="Nome da disciplina"
        />
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Input
          value={dados.descricao}
          onChange={(e) => setDados(prev => ({ ...prev, descricao: e.target.value }))}
          placeholder="Descrição da disciplina"
        />
      </div>
      <div className="space-y-2">
        <Label>Carga Horária (horas/semana)</Label>
        <Input
          type="number"
          min="1"
          max="10"
          value={dados.cargaHoraria}
          onChange={(e) => setDados(prev => ({ ...prev, cargaHoraria: parseInt(e.target.value) }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Séries</Label>
        <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
          {seriesDisponiveis.map((serie, serieIndex) => {
            const uniqueKey = `form-disciplina-serie-${serieIndex}-${serie.replace(/\s+/g, '-').toLowerCase()}`;
            return (
              <div key={uniqueKey} className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={dados.series.includes(serie)}
                  onCheckedChange={(checked) => setDados(prev => ({
                    ...prev,
                    series: checked ? [...prev.series, serie] : prev.series.filter((s) => s !== serie)
                  }))}
                />
                <Label className="text-sm">{serie}</Label>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={dados.ativa}
          onCheckedChange={(checked) => setDados(prev => ({ ...prev, ativa: checked }))}
        />
        <Label>Disciplina ativa</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button onClick={() => onSalvar(dados)} disabled={salvando || !dados.nome}>
          {salvando ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar'
          )}
        </Button>
      </div>
    </>
  );
}

// Componente FormProfessor corrigido
export function FormProfessor({ professor, onSalvar, onCancelar, salvando, disciplinas }: any) {
  const [dados, setDados] = useState({
    nome: professor?.nome || '',
    email: professor?.email || '',
    disciplinas: professor?.disciplinas || [],
    series: professor?.series || [],
    ativo: professor?.ativo !== undefined ? professor.ativo : true
  });

  // Processar disciplinas com verificação rigorosa
  const disciplinasDisponiveis = React.useMemo(() => {
    if (!disciplinas || !Array.isArray(disciplinas)) {
      console.log('[FORM_PROFESSOR] Disciplinas não é um array válido:', disciplinas);
      return [];
    }
    
    const nomes = disciplinas
      .filter((d: any) => {
        const isValid = d && d.nome && typeof d.nome === 'string' && d.nome.trim().length > 0;
        if (!isValid) {
          console.log('[FORM_PROFESSOR] Disciplina inválida ignorada:', d);
        }
        return isValid;
      })
      .map((d: any) => d.nome.trim());
      
    const nomesUnicos = [...new Set(nomes)];
    
    console.log('[FORM_PROFESSOR] Processamento de disciplinas:', {
      disciplinas_originais: disciplinas.length,
      nomes_extraidos: nomes.length,
      nomes_unicos: nomesUnicos.length,
      lista_final: nomesUnicos,
      duplicatas_removidas: nomes.length - nomesUnicos.length
    });
    
    return nomesUnicos;
  }, [disciplinas]);

  return (
    <>
      <div className="space-y-2">
        <Label>Nome</Label>
        <Input
          value={dados.nome}
          onChange={(e) => setDados(prev => ({ ...prev, nome: e.target.value }))}
          placeholder="Nome do professor"
        />
      </div>
      {!professor && (
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={dados.email}
            onChange={(e) => setDados(prev => ({ ...prev, email: e.target.value }))}
            placeholder="Email do professor"
          />
        </div>
      )}
      <div className="space-y-2">
        <Label>Disciplinas</Label>
        <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
          {disciplinasDisponiveis.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma disciplina cadastrada</p>
          ) : (
            disciplinasDisponiveis.map((disciplina, disciplinaIndex) => {
              // Criar key absolutamente única usando timestamp + index + hash da disciplina
              const timestamp = Date.now();
              const disciplinaHash = disciplina.replace(/\s+/g, '').toLowerCase();
              const uniqueKey = `professor-disc-${timestamp}-${disciplinaIndex}-${disciplinaHash}-${Math.random().toString(36).substr(2, 5)}`;
              
              return (
                <div key={uniqueKey} className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={dados.disciplinas.includes(disciplina)}
                    onCheckedChange={(checked) => setDados(prev => ({
                      ...prev,
                      disciplinas: checked ? [...prev.disciplinas, disciplina] : prev.disciplinas.filter((d) => d !== disciplina)
                    }))}
                  />
                  <Label className="text-sm">{disciplina}</Label>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Séries</Label>
        <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
          {seriesDisponiveis.map((serie, serieIndex) => {
            const uniqueKey = `professor-serie-${Date.now()}-${serieIndex}-${serie.replace(/\s+/g, '-').toLowerCase()}-${Math.random().toString(36).substr(2, 5)}`;
            return (
              <div key={uniqueKey} className="flex items-center gap-2 mb-2">
                <Checkbox
                  checked={dados.series.includes(serie)}
                  onCheckedChange={(checked) => setDados(prev => ({
                    ...prev,
                    series: checked ? [...prev.series, serie] : prev.series.filter((s) => s !== serie)
                  }))}
                />
                <Label className="text-sm">{serie}</Label>
              </div>
            );
          })}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={dados.ativo}
          onCheckedChange={(checked) => setDados(prev => ({ ...prev, ativo: checked }))}
        />
        <Label>Professor ativo</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button onClick={() => onSalvar(dados)} disabled={salvando || !dados.nome || (!professor && !dados.email)}>
          {salvando ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar'
          )}
        </Button>
      </div>
    </>
  );
}

// Componente FormSerie corrigido  
export function FormSerie({ serie, onSalvar, onCancelar, salvando, disciplinas }: any) {
  const [dados, setDados] = useState({
    nome: serie?.nome || '',
    turmas: serie?.turmas || ['A'],
    totalAlunos: serie?.totalAlunos || 0,
    disciplinas: serie?.disciplinas || [],
    ativa: serie?.ativa !== undefined ? serie.ativa : true
  });

  // Processar disciplinas com verificação rigorosa para FormSerie
  const disciplinasDisponiveis = React.useMemo(() => {
    if (!disciplinas || !Array.isArray(disciplinas)) {
      console.log('[FORM_SERIE] Disciplinas não é um array válido:', disciplinas);
      return [];
    }
    
    const nomes = disciplinas
      .filter((d: any) => {
        const isValid = d && d.nome && typeof d.nome === 'string' && d.nome.trim().length > 0;
        if (!isValid) {
          console.log('[FORM_SERIE] Disciplina inválida ignorada:', d);
        }
        return isValid;
      })
      .map((d: any) => d.nome.trim());
      
    const nomesUnicos = [...new Set(nomes)];
    
    console.log('[FORM_SERIE] Processamento de disciplinas:', {
      disciplinas_originais: disciplinas.length,
      nomes_extraidos: nomes.length,
      nomes_unicos: nomesUnicos.length,
      lista_final: nomesUnicos
    });
    
    return nomesUnicos;
  }, [disciplinas]);

  return (
    <>
      <div className="space-y-2">
        <Label>Nome da Série</Label>
        <Input
          value={dados.nome}
          onChange={(e) => setDados(prev => ({ ...prev, nome: e.target.value }))}
          placeholder="Ex: 1ª série - Ensino Médio"
        />
      </div>
      <div className="space-y-2">
        <Label>Turmas</Label>
        <div className="flex gap-2 flex-wrap border rounded-lg p-3">
          {['A', 'B', 'C', 'D', 'E'].map((turma, turmaIndex) => {
            const uniqueKey = `form-serie-turma-${Date.now()}-${turmaIndex}-${turma}-${Math.random().toString(36).substr(2, 5)}`;
            return (
              <div key={uniqueKey} className="flex items-center gap-2">
                <Checkbox
                  checked={dados.turmas.includes(turma)}
                  onCheckedChange={(checked) => setDados(prev => ({
                    ...prev,
                    turmas: checked ? [...prev.turmas, turma] : prev.turmas.filter((t) => t !== turma)
                  }))}
                />
                <Label className="text-sm">Turma {turma}</Label>
              </div>
            );
          })}
        </div>
      </div>
      <div className="space-y-2">
        <Label>Total de Alunos</Label>
        <Input
          type="number"
          min="0"
          value={dados.totalAlunos}
          onChange={(e) => setDados(prev => ({ ...prev, totalAlunos: parseInt(e.target.value) || 0 }))}
        />
      </div>
      <div className="space-y-2">
        <Label>Disciplinas</Label>
        <div className="max-h-40 overflow-y-auto border rounded-lg p-3">
          {disciplinasDisponiveis.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhuma disciplina cadastrada</p>
          ) : (
            disciplinasDisponiveis.map((disciplina, disciplinaIndex) => {
              const uniqueKey = `form-serie-disc-${Date.now()}-${disciplinaIndex}-${disciplina.replace(/\s+/g, '').toLowerCase()}-${Math.random().toString(36).substr(2, 5)}`;
              return (
                <div key={uniqueKey} className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={dados.disciplinas.includes(disciplina)}
                    onCheckedChange={(checked) => setDados(prev => ({
                      ...prev,
                      disciplinas: checked ? [...prev.disciplinas, disciplina] : prev.disciplinas.filter((d) => d !== disciplina)
                    }))}
                  />
                  <Label className="text-sm">{disciplina}</Label>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          checked={dados.ativa}
          onCheckedChange={(checked) => setDados(prev => ({ ...prev, ativa: checked }))}
        />
        <Label>Série ativa</Label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancelar} disabled={salvando}>
          Cancelar
        </Button>
        <Button onClick={() => onSalvar(dados)} disabled={salvando || !dados.nome}>
          {salvando ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar'
          )}
        </Button>
      </div>
    </>
  );
}