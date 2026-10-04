insert into public.recurso_documentos
  (slug, titulo, resumen, destinatarios, version, actualizado_en)
values
  (
    'catalogo-svg',
    'Catálogo de SVG',
    'Ilustraciones vectoriales y assets gráficos de EDUQA.PE, listos para usar en la interfaz.',
    'Diseño, desarrollo y agentes de IA',
    1,
    now()
  )
on conflict (slug) do update
set
  titulo = excluded.titulo,
  resumen = excluded.resumen,
  destinatarios = excluded.destinatarios,
  actualizado_en = now();
