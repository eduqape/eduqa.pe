-- #85 — v_verificacion no tiene filtro: con SELECT para anon devolvía el código
-- y el nombre de todos los certificados. La página /verificar usa ahora
-- verificar_certificado(p_codigo), que devuelve una sola fila.
-- Aplicar después de desplegar la versión de la app que ya llama a la RPC.
-- Refs: #85
revoke all on public.v_verificacion from anon, authenticated;
