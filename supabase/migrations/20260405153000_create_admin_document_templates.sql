create table if not exists public.admin_document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  template_type text not null,
  description text,
  content text not null,
  is_active boolean not null default true,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_document_templates_category_check
    check (category in ('document', 'report')),
  constraint admin_document_templates_template_type_check
    check (
      template_type in (
        'clinical_note',
        'discharge_summary',
        'referral_letter',
        'prescription',
        'consultation_report',
        'follow_up_report',
        'lab_report',
        'radiology_report'
      )
    )
);

create unique index if not exists admin_document_templates_name_unique_idx
  on public.admin_document_templates (lower(btrim(name)));

alter table public.admin_document_templates enable row level security;

drop policy if exists "admins can read document templates" on public.admin_document_templates;
create policy "admins can read document templates"
on public.admin_document_templates
for select
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

drop policy if exists "admins can insert document templates" on public.admin_document_templates;
create policy "admins can insert document templates"
on public.admin_document_templates
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

drop policy if exists "admins can update document templates" on public.admin_document_templates;
create policy "admins can update document templates"
on public.admin_document_templates
for update
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

drop policy if exists "admins can delete document templates" on public.admin_document_templates;
create policy "admins can delete document templates"
on public.admin_document_templates
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and ur.role = 'admin'
  )
);

insert into public.admin_document_templates (name, category, template_type, description, content, is_active)
select *
from (
  values
    (
      'General Clinical Note',
      'document',
      'clinical_note',
      'Structured SOAP note template for consultations.',
      'Subjective:\n- Chief complaint:\n- History of present illness:\n\nObjective:\n- Vitals:\n- Examination findings:\n\nAssessment:\n- Primary diagnosis:\n- Differential diagnosis:\n\nPlan:\n- Investigations:\n- Treatment:\n- Follow-up:\n',
      true
    ),
    (
      'Discharge Summary',
      'document',
      'discharge_summary',
      'Discharge summary template after completed encounter.',
      'Patient Information:\n- Name:\n- ID:\n\nAdmission Details:\n- Admission date:\n- Discharge date:\n- Primary diagnosis:\n\nHospital Course:\n- Key interventions:\n\nDischarge Medications:\n- Medication:\n- Dose:\n- Duration:\n\nFollow-up Instructions:\n- Next visit:\n- Warning signs:\n',
      true
    ),
    (
      'Consultation Report',
      'report',
      'consultation_report',
      'Professional consultation report template.',
      'Consultation Overview:\n- Date/time:\n- Clinician:\n- Patient:\n\nClinical Findings:\n- Symptoms:\n- Exam findings:\n\nClinical Impression:\n- Diagnosis:\n\nRecommendations:\n- Treatment plan:\n- Follow-up plan:\n',
      true
    ),
    (
      'Lab Result Interpretation',
      'report',
      'lab_report',
      'Template for documenting lab report interpretation.',
      'Lab Panel:\n- Test name:\n- Collection date:\n\nResults:\n- Key values:\n- Abnormal flags:\n\nInterpretation:\n- Clinical significance:\n\nNext Steps:\n- Repeat testing:\n- Additional investigations:\n',
      true
    )
) as defaults(name, category, template_type, description, content, is_active)
where not exists (
  select 1 from public.admin_document_templates
);