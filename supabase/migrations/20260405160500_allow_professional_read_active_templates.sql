drop policy if exists "professionals can read active document templates" on public.admin_document_templates;
create policy "professionals can read active document templates"
on public.admin_document_templates
for select
to authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'professional'
  )
);