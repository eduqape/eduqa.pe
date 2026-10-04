-- Redes nuevas para los perfiles del equipo: sitio web personal y las redes
-- habituales en docencia e investigación (Google Scholar, Kaggle, Hugging Face)
-- y en diseño (Behance, Dribbble). La lista tiene que coincidir con
-- `REDES_PERSONA` en src/lib/redes.ts.
alter table public.personas_redes
  drop constraint if exists personas_redes_red_check;

alter table public.personas_redes
  add constraint personas_redes_red_check check (
    red in (
      'web', 'linkedin', 'github', 'gitlab', 'x', 'bluesky', 'threads',
      'instagram', 'facebook', 'youtube', 'tiktok', 'substack', 'medium',
      'huggingface', 'kaggle', 'scholar', 'researchgate', 'orcid',
      'behance', 'dribbble'
    )
  );
