-- Permette al client (anche anonimo) di leggere le righe appena inserite con status = 'admin_report'
-- Necessario perché .insert().select('id').single() richiede accesso SELECT sulla riga appena creata
CREATE POLICY "Public can read admin report rows"
ON public.survey_submissions
FOR SELECT
USING (status = 'admin_report');