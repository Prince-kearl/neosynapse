-- Ensure ai_chat_messages has image_url for chat sync compatibility
-- Safe to run multiple times.

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'ai_chat_messages'
  ) then
    alter table public.ai_chat_messages
      add column if not exists image_url text;
  end if;
end $$;
