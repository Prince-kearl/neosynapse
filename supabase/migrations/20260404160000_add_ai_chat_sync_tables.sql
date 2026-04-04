create table if not exists public.ai_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'New Conversation',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_chat_sessions_user_id_idx on public.ai_chat_sessions(user_id);
create index if not exists ai_chat_sessions_user_updated_idx on public.ai_chat_sessions(user_id, updated_at desc);

create table if not exists public.ai_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ai_chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  image_url text,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_messages_session_id_idx on public.ai_chat_messages(session_id);
create index if not exists ai_chat_messages_created_at_idx on public.ai_chat_messages(session_id, created_at asc);

alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_chat_sessions' and policyname = 'Users can manage own chat sessions'
  ) then
    create policy "Users can manage own chat sessions"
      on public.ai_chat_sessions
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ai_chat_messages' and policyname = 'Users can manage own chat messages'
  ) then
    create policy "Users can manage own chat messages"
      on public.ai_chat_messages
      for all
      using (
        exists (
          select 1
          from public.ai_chat_sessions s
          where s.id = ai_chat_messages.session_id
            and s.user_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1
          from public.ai_chat_sessions s
          where s.id = ai_chat_messages.session_id
            and s.user_id = auth.uid()
        )
      );
  end if;
end $$;