alter table public.admin_document_templates
  add column if not exists is_default boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_document_templates_default_requires_active_check'
  ) then
    alter table public.admin_document_templates
      add constraint admin_document_templates_default_requires_active_check
      check (not is_default or is_active);
  end if;
end
$$;

create unique index if not exists admin_document_templates_one_default_per_type_idx
  on public.admin_document_templates (template_type)
  where is_default = true and is_active = true;

create or replace function public.enforce_admin_document_template_default_before()
returns trigger
language plpgsql
as $$
begin
  if new.is_default then
    new.is_active := true;

    update public.admin_document_templates
    set is_default = false,
        updated_at = now()
    where template_type = new.template_type
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
      and is_default = true;
  elsif not new.is_active then
    new.is_default := false;
  end if;

  return new;
end;
$$;

create or replace function public.ensure_admin_document_template_default_after()
returns trigger
language plpgsql
as $$
declare
  target_type text;
  fallback_id uuid;
begin
  target_type := coalesce(new.template_type, old.template_type);
  if target_type is null then
    return null;
  end if;

  if exists (
    select 1
    from public.admin_document_templates
    where template_type = target_type
      and is_active = true
  ) and not exists (
    select 1
    from public.admin_document_templates
    where template_type = target_type
      and is_active = true
      and is_default = true
  ) then
    select id into fallback_id
    from public.admin_document_templates
    where template_type = target_type
      and is_active = true
    order by updated_at desc, created_at asc
    limit 1;

    if fallback_id is not null then
      update public.admin_document_templates
      set is_default = true,
          updated_at = now()
      where id = fallback_id;
    end if;
  end if;

  return null;
end;
$$;

drop trigger if exists trg_admin_document_template_default_before on public.admin_document_templates;
create trigger trg_admin_document_template_default_before
before insert or update on public.admin_document_templates
for each row
execute function public.enforce_admin_document_template_default_before();

drop trigger if exists trg_admin_document_template_default_after on public.admin_document_templates;
create trigger trg_admin_document_template_default_after
after insert or update or delete on public.admin_document_templates
for each row
execute function public.ensure_admin_document_template_default_after();

with ranked as (
  select
    id,
    template_type,
    row_number() over (
      partition by template_type
      order by is_active desc, created_at asc
    ) as rn
  from public.admin_document_templates
)
update public.admin_document_templates t
set is_default = (r.rn = 1 and t.is_active = true)
from ranked r
where r.id = t.id;