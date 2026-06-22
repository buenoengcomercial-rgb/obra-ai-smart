
REVOKE EXECUTE ON FUNCTION public.has_company_access(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE POLICY "wa sessoes via contato" ON public.whatsapp_sessoes FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.whatsapp_contatos c WHERE c.id = contato_id AND public.has_company_access(auth.uid(), c.empresa_id)));
