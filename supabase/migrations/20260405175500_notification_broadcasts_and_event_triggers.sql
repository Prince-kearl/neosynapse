create or replace function public.create_user_notification(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_category text default 'general',
  p_action_url text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_user_id is null then
    return null;
  end if;

  insert into public.user_notifications (
    user_id,
    title,
    body,
    category,
    action_url,
    metadata
  )
  values (
    p_user_id,
    p_title,
    p_body,
    coalesce(nullif(p_category, ''), 'general'),
    p_action_url,
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.create_user_notification(uuid, text, text, text, text, jsonb) to authenticated;

create or replace function public.create_role_notification(
  p_target_role public.user_role,
  p_title text,
  p_body text,
  p_category text default 'system',
  p_action_url text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if not public.has_role(auth.uid(), 'admin'::public.user_role) then
    raise exception 'Only admins can broadcast role notifications';
  end if;

  insert into public.user_notifications (
    user_id,
    title,
    body,
    category,
    action_url,
    metadata
  )
  select
    ur.user_id,
    p_title,
    p_body,
    coalesce(nullif(p_category, ''), 'system'),
    p_action_url,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'source', 'admin_broadcast',
      'target_role', p_target_role::text,
      'actor_id', auth.uid()
    )
  from public.user_roles ur
  where ur.role = p_target_role;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.create_role_notification(public.user_role, text, text, text, text, jsonb) to authenticated;

create or replace function public.notify_on_appointment_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.create_user_notification(
      new.patient_id,
      'Appointment requested',
      'Your appointment request has been created and is awaiting confirmation.',
      'appointment',
      '/patient/appointments',
      jsonb_build_object('appointment_id', new.id, 'status', new.status)
    );

    if new.professional_id is not null then
      perform public.create_user_notification(
        new.professional_id,
        'New appointment assigned',
        'A new patient appointment has been assigned to you.',
        'appointment',
        '/professional/encounters',
        jsonb_build_object('appointment_id', new.id, 'status', new.status)
      );
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' then
    if new.professional_id is distinct from old.professional_id and new.professional_id is not null then
      perform public.create_user_notification(
        new.professional_id,
        'Appointment assignment updated',
        'You have been assigned to an appointment.',
        'appointment',
        '/professional/encounters',
        jsonb_build_object('appointment_id', new.id, 'status', new.status)
      );
    end if;

    if new.status is distinct from old.status then
      perform public.create_user_notification(
        new.patient_id,
        'Appointment status updated',
        format('Your appointment status changed from %s to %s.', old.status, new.status),
        'appointment',
        '/patient/appointments',
        jsonb_build_object('appointment_id', new.id, 'old_status', old.status, 'new_status', new.status)
      );

      if new.professional_id is not null then
        perform public.create_user_notification(
          new.professional_id,
          'Appointment status updated',
          format('Appointment status changed from %s to %s.', old.status, new.status),
          'appointment',
          '/professional/encounters',
          jsonb_build_object('appointment_id', new.id, 'old_status', old.status, 'new_status', new.status)
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_appointment_change on public.appointments;
create trigger trg_notify_on_appointment_change
after insert or update of status, professional_id on public.appointments
for each row
execute function public.notify_on_appointment_change();

create or replace function public.notify_on_clinical_note_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_professional_id uuid;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  select e.patient_id, e.professional_id
  into v_patient_id, v_professional_id
  from public.encounters e
  where e.id = new.encounter_id;

  if new.status = 'review' and v_professional_id is not null then
    perform public.create_user_notification(
      v_professional_id,
      'Clinical note moved to review',
      'A clinical note in your encounter workflow has been submitted for review.',
      'clinical',
      '/professional/notes',
      jsonb_build_object('clinical_note_id', new.id, 'encounter_id', new.encounter_id)
    );
  end if;

  if new.status = 'finalized' then
    if v_patient_id is not null then
      perform public.create_user_notification(
        v_patient_id,
        'Clinical note finalized',
        'A clinician finalized notes related to your recent encounter.',
        'clinical',
        '/patient/reports',
        jsonb_build_object('clinical_note_id', new.id, 'encounter_id', new.encounter_id)
      );
    end if;

    if v_professional_id is not null then
      perform public.create_user_notification(
        v_professional_id,
        'Clinical note finalized',
        'A clinical note has been finalized in your workflow.',
        'clinical',
        '/professional/notes',
        jsonb_build_object('clinical_note_id', new.id, 'encounter_id', new.encounter_id)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_clinical_note_status_change on public.clinical_notes;
create trigger trg_notify_on_clinical_note_status_change
after update of status on public.clinical_notes
for each row
execute function public.notify_on_clinical_note_status_change();

create or replace function public.notify_on_medical_report_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_status text;
  v_old_status text;
begin
  if tg_op = 'INSERT' then
    perform public.create_user_notification(
      new.patient_id,
      'New medical report available',
      'A new medical report has been added to your records.',
      'clinical',
      '/patient/reports',
      jsonb_build_object('report_id', new.id, 'report_type', new.report_type)
    );

    return new;
  end if;

  if tg_op = 'UPDATE' then
    v_new_status := coalesce(new.report_json->>'status', '');
    v_old_status := coalesce(old.report_json->>'status', '');

    if v_new_status <> '' and v_new_status is distinct from v_old_status then
      perform public.create_user_notification(
        new.patient_id,
        'Medical report status updated',
        format('Your report status changed from %s to %s.', nullif(v_old_status, ''), v_new_status),
        'clinical',
        '/patient/reports',
        jsonb_build_object('report_id', new.id, 'old_status', nullif(v_old_status, ''), 'new_status', v_new_status)
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_on_medical_report_change on public.medical_reports;
create trigger trg_notify_on_medical_report_change
after insert or update of report_json on public.medical_reports
for each row
execute function public.notify_on_medical_report_change();
