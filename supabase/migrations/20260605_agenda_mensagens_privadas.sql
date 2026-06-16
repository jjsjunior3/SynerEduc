CREATE TABLE IF NOT EXISTS public.agenda_mensagens_privadas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agenda_id     uuid NOT NULL REFERENCES public.agenda_professor(id) ON DELETE CASCADE,
  aluno_id      uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  aluno_nome    text NOT NULL,
  mensagem      text NOT NULL,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agenda_mensagens_privadas ENABLE ROW LEVEL SECURITY;

-- Professor que criou a agenda pode inserir/editar mensagens privadas
CREATE POLICY "amp_insert_professor" ON public.agenda_mensagens_privadas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.agenda_professor ap
      WHERE ap.id = agenda_id AND ap.professor_id = auth.uid()
    )
  );

CREATE POLICY "amp_update_professor" ON public.agenda_mensagens_privadas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.agenda_professor ap
      WHERE ap.id = agenda_id AND ap.professor_id = auth.uid()
    )
  );

CREATE POLICY "amp_delete_professor" ON public.agenda_mensagens_privadas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.agenda_professor ap
      WHERE ap.id = agenda_id AND ap.professor_id = auth.uid()
    )
  );

-- Aluno vê apenas suas próprias mensagens
CREATE POLICY "amp_select_aluno" ON public.agenda_mensagens_privadas
  FOR SELECT USING (
    aluno_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.agenda_professor ap
      WHERE ap.id = agenda_id AND ap.professor_id = auth.uid()
    )
    OR tem_tipo(ARRAY['coordenador'::text, 'administrador'::text])
  );
