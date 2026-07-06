create or replace function public.platform_update_program(
  program_id uuid,
  program_name text,
  interview_questions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = platform, public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  updated_program platform.workspace_programs%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select email into current_email from auth.users where id = current_user_id;

  if current_email is distinct from 'mikehilton.work@gmail.com' then
    raise exception 'This platform is currently limited to mikehilton.work@gmail.com.' using errcode = '42501';
  end if;

  if nullif(trim(program_name), '') is null then
    raise exception 'Program name is required.' using errcode = '22023';
  end if;

  if jsonb_typeof(interview_questions) is distinct from 'array' then
    raise exception 'Interview questions must be an array.' using errcode = '22023';
  end if;

  update platform.workspace_programs
  set name = trim(program_name),
      manifest_overrides = jsonb_set(
        coalesce(manifest_overrides, '{}'::jsonb),
        '{questions}',
        interview_questions,
        true
      ),
      updated_at = now()
  where id = program_id
  returning * into updated_program;

  if updated_program.id is null then
    raise exception 'Program not found.' using errcode = '22023';
  end if;

  return to_jsonb(updated_program);
end;
$$;

create or replace function public.platform_create_interview_session(
  program_id uuid,
  participant_name text,
  participant_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = platform, public, extensions
as $$
declare
  current_user_id uuid := auth.uid();
  current_email text;
  selected_program platform.workspace_programs%rowtype;
  created_participant platform.participants%rowtype;
  created_session platform.interview_sessions%rowtype;
  public_token text := replace(extensions.gen_random_uuid()::text, '-', '');
  questions jsonb;
  first_question text;
begin
  if current_user_id is null then
    raise exception 'Authentication required.' using errcode = '28000';
  end if;

  select email into current_email from auth.users where id = current_user_id;

  if current_email is distinct from 'mikehilton.work@gmail.com' then
    raise exception 'This platform is currently limited to mikehilton.work@gmail.com.' using errcode = '42501';
  end if;

  if nullif(trim(participant_name), '') is null then
    raise exception 'Participant name is required.' using errcode = '22023';
  end if;

  select * into selected_program
  from platform.workspace_programs
  where id = program_id;

  if selected_program.id is null then
    raise exception 'Program not found.' using errcode = '22023';
  end if;

  questions := coalesce(selected_program.manifest_overrides -> 'questions', '[]'::jsonb);

  if jsonb_array_length(questions) = 0 then
    questions := case selected_program.program_key
      when 'sales-discovery' then
        '[
          {"id":"q1","text":"Walk me through how a qualified opportunity moves from first conversation to signed customer.","extract_key":"Sales process"},
          {"id":"q2","text":"What objections or points of confusion slow deals down most often?","extract_key":"Sales objections"},
          {"id":"q3","text":"What information do sellers repeatedly need but have trouble finding or explaining?","extract_key":"Enablement gaps"}
        ]'::jsonb
      when 'customer-success-discovery' then
        '[
          {"id":"q1","text":"What behaviors tell you a customer is getting real value?","extract_key":"Success signals"},
          {"id":"q2","text":"Where do customers tend to get stuck, surprised, or disappointed?","extract_key":"Retention risks"},
          {"id":"q3","text":"What should every new team member understand about supporting these customers well?","extract_key":"Support playbook"}
        ]'::jsonb
      when 'legacy-weaver' then
        '[
          {"id":"q1","text":"Where would you like to begin your story?","extract_key":"Origin story"},
          {"id":"q2","text":"Tell me about a memory that still feels vivid or meaningful to you.","extract_key":"Meaningful memory"},
          {"id":"q3","text":"What would you want future generations to understand about your life?","extract_key":"Legacy message"}
        ]'::jsonb
      else
        '[
          {"id":"q1","text":"Where is your team already using AI today, even informally?","extract_key":"Current AI usage"},
          {"id":"q2","text":"Which recurring workflows feel slow, manual, or dependent on tribal knowledge?","extract_key":"Workflow friction"},
          {"id":"q3","text":"What risks, policies, or customer concerns would need to be handled before AI could be adopted more broadly?","extract_key":"Adoption risks"}
        ]'::jsonb
    end;

    update platform.workspace_programs
    set manifest_overrides = jsonb_set(
          coalesce(manifest_overrides, '{}'::jsonb),
          '{questions}',
          questions,
          true
        ),
        updated_at = now()
    where id = selected_program.id
    returning * into selected_program;
  end if;

  first_question := coalesce(questions -> 0 ->> 'text', 'Tell me about what matters most here.');

  insert into platform.participants (workspace_id, program_id, display_name, email, role_label, metadata)
  values (
    selected_program.workspace_id,
    selected_program.id,
    trim(participant_name),
    nullif(trim(participant_email), ''),
    coalesce(selected_program.label_overrides ->> 'participant', 'Participant'),
    jsonb_build_object('source', 'admin-created')
  )
  returning * into created_participant;

  insert into platform.interview_sessions (
    workspace_id,
    program_id,
    participant_id,
    track_key,
    status,
    title,
    started_at,
    metadata
  )
  values (
    selected_program.workspace_id,
    selected_program.id,
    created_participant.id,
    selected_program.program_key,
    'in_progress',
    selected_program.name || ' with ' || trim(participant_name),
    now(),
    jsonb_build_object('public_token', public_token, 'question_count', jsonb_array_length(questions))
  )
  returning * into created_session;

  insert into platform.interview_messages (session_id, role, content, sequence, metadata)
  values (
    created_session.id,
    'agent',
    first_question,
    1,
    jsonb_build_object('question_index', 0)
  );

  return jsonb_build_object(
    'session', to_jsonb(created_session),
    'participant', to_jsonb(created_participant),
    'token', public_token
  );
end;
$$;

create or replace function public.platform_get_interview_by_token(session_token text)
returns jsonb
language plpgsql
security definer
set search_path = platform, public, extensions
as $$
declare
  selected_session platform.interview_sessions%rowtype;
  selected_program platform.workspace_programs%rowtype;
  selected_participant platform.participants%rowtype;
begin
  select * into selected_session
  from platform.interview_sessions s
  where s.metadata ->> 'public_token' = session_token;

  if selected_session.id is null then
    raise exception 'Interview not found.' using errcode = '22023';
  end if;

  select * into selected_program from platform.workspace_programs where id = selected_session.program_id;
  select * into selected_participant from platform.participants where id = selected_session.participant_id;

  return jsonb_build_object(
    'session', to_jsonb(selected_session),
    'program', jsonb_build_object(
      'id', selected_program.id,
      'name', selected_program.name,
      'program_key', selected_program.program_key,
      'label_overrides', selected_program.label_overrides,
      'questions', coalesce(selected_program.manifest_overrides -> 'questions', '[]'::jsonb)
    ),
    'participant', to_jsonb(selected_participant),
    'messages', coalesce((
      select jsonb_agg(to_jsonb(m) order by m.sequence)
      from (
        select id, role, content, sequence, metadata, created_at
        from platform.interview_messages
        where session_id = selected_session.id
        order by sequence
      ) m
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.platform_submit_interview_message(
  session_token text,
  participant_response text
)
returns jsonb
language plpgsql
security definer
set search_path = platform, public, extensions
as $$
declare
  selected_session platform.interview_sessions%rowtype;
  selected_program platform.workspace_programs%rowtype;
  clean_response text := nullif(trim(participant_response), '');
  next_sequence integer;
  answered_count integer;
  questions jsonb;
  next_question text;
  answer_record record;
begin
  if clean_response is null then
    raise exception 'Response is required.' using errcode = '22023';
  end if;

  select * into selected_session
  from platform.interview_sessions s
  where s.metadata ->> 'public_token' = session_token;

  if selected_session.id is null then
    raise exception 'Interview not found.' using errcode = '22023';
  end if;

  if selected_session.status = 'complete' then
    raise exception 'This interview is already complete.' using errcode = '22023';
  end if;

  select * into selected_program from platform.workspace_programs where id = selected_session.program_id;
  questions := coalesce(selected_program.manifest_overrides -> 'questions', '[]'::jsonb);

  select coalesce(max(sequence), 0) + 1
  into next_sequence
  from platform.interview_messages
  where session_id = selected_session.id;

  select count(*)
  into answered_count
  from platform.interview_messages
  where session_id = selected_session.id
    and role = 'participant';

  insert into platform.interview_messages (session_id, role, content, sequence, metadata)
  values (
    selected_session.id,
    'participant',
    clean_response,
    next_sequence,
    jsonb_build_object('question_index', answered_count)
  );

  if answered_count + 1 < jsonb_array_length(questions) then
    next_question := coalesce(questions -> (answered_count + 1) ->> 'text', 'Tell me more about that.');

    insert into platform.interview_messages (session_id, role, content, sequence, metadata)
    values (
      selected_session.id,
      'agent',
      next_question,
      next_sequence + 1,
      jsonb_build_object('question_index', answered_count + 1)
    );
  else
    update platform.interview_sessions
    set status = 'complete',
        completed_at = now(),
        metadata = jsonb_set(metadata, '{completed_by}', '"participant"', true)
    where id = selected_session.id
    returning * into selected_session;

    insert into platform.interview_messages (session_id, role, content, sequence, metadata)
    values (
      selected_session.id,
      'agent',
      'Thank you. This interview is complete, and your responses have been saved.',
      next_sequence + 1,
      jsonb_build_object('event', 'completed')
    );

    for answer_record in
      select
        m.content,
        (m.metadata ->> 'question_index')::integer as question_index
      from platform.interview_messages m
      where m.session_id = selected_session.id
        and m.role = 'participant'
      order by m.sequence
    loop
      insert into platform.artifacts (
        workspace_id,
        program_id,
        session_id,
        artifact_type,
        title,
        body,
        tags,
        evidence,
        metadata
      )
      values (
        selected_session.workspace_id,
        selected_program.id,
        selected_session.id,
        coalesce(selected_program.label_overrides ->> 'artifact', 'Interview Answer'),
        coalesce(questions -> answer_record.question_index ->> 'extract_key', 'Question ' || (answer_record.question_index + 1)::text),
        answer_record.content,
        array[selected_program.program_key],
        jsonb_build_array(jsonb_build_object('question', questions -> answer_record.question_index ->> 'text')),
        jsonb_build_object('source', 'interview_runtime', 'question_index', answer_record.question_index)
      );
    end loop;
  end if;

  return public.platform_get_interview_by_token(session_token);
end;
$$;

revoke all on function public.platform_update_program(uuid, text, jsonb) from public;
revoke all on function public.platform_create_interview_session(uuid, text, text) from public;
revoke all on function public.platform_get_interview_by_token(text) from public;
revoke all on function public.platform_submit_interview_message(text, text) from public;

grant execute on function public.platform_update_program(uuid, text, jsonb) to authenticated;
grant execute on function public.platform_create_interview_session(uuid, text, text) to authenticated;
grant execute on function public.platform_get_interview_by_token(text) to anon, authenticated;
grant execute on function public.platform_submit_interview_message(text, text) to anon, authenticated;
