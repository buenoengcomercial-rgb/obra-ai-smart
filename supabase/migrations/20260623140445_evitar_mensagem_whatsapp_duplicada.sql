create unique index if not exists uq_whatsapp_mensagens_wa_message_id
  on public.whatsapp_mensagens (wa_message_id)
  where wa_message_id is not null;
