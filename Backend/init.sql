create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  full_name text not null check (length(trim(full_name)) > 0),
  password_hash text not null,
  role text not null default 'viewer',
  created_at timestamptz not null default now()
);

create table if not exists candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (length(trim(full_name)) > 0),
  email text not null default '',
  phone text not null default '',
  desired_role text not null check (length(trim(desired_role)) > 0),
  years_experience numeric(5, 1) not null default 0 check (years_experience >= 0),
  education text not null default '',
  location text not null default '',
  skills text[] not null default '{}',
  certifications text[] not null default '{}',
  experience_summary text not null default '',
  status text not null default 'Recepción'
    check (status in ('Recepción', 'Filtro inicial', 'Entrevista', 'Evaluación', 'Oferta', 'Contratado', 'Rechazado')),
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users add column if not exists candidate_id uuid references candidates (id) on delete set null;
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check
  check (role in ('admin', 'hr', 'viewer', 'candidate'));
alter table users drop constraint if exists users_candidate_role_check;
alter table users add constraint users_candidate_role_check
  check ((role = 'candidate' and candidate_id is not null) or (role <> 'candidate' and candidate_id is null));
create unique index if not exists users_candidate_id_unique_idx on users (candidate_id);

create table if not exists vacancies (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) > 0),
  department text not null default '',
  mode text not null default '',
  min_experience numeric(5, 1) not null default 0 check (min_experience >= 0),
  required_skills text[] not null default '{}',
  required_certifications text[] not null default '{}',
  required_education text not null default '',
  description text not null default '',
  status text not null default 'Abierta' check (status in ('Abierta', 'Cerrada')),
  created_by uuid references users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references candidates (id) on delete cascade,
  vacancy_id uuid not null references vacancies (id) on delete cascade,
  assigned_by uuid references users (id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (candidate_id, vacancy_id)
);

create table if not exists candidate_status_history (
  id bigint generated always as identity primary key,
  candidate_id uuid not null references candidates (id) on delete cascade,
  status text not null,
  changed_by uuid references users (id) on delete set null,
  changed_at timestamptz not null default now()
);

create index if not exists candidates_created_at_idx on candidates (created_at desc);
create index if not exists candidates_status_idx on candidates (status);
create index if not exists candidates_skills_idx on candidates using gin (skills);
create index if not exists candidates_certifications_idx on candidates using gin (certifications);
create index if not exists vacancies_status_created_at_idx on vacancies (status, created_at desc);
create index if not exists assignments_vacancy_id_idx on assignments (vacancy_id);
create index if not exists candidate_status_history_candidate_changed_idx
  on candidate_status_history (candidate_id, changed_at desc);

create or replace function record_candidate_status_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into candidate_status_history (candidate_id, status, changed_by)
    values (
      new.id,
      new.status,
      coalesce(nullif(current_setting('app.current_user_id', true), '')::uuid, new.created_by)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists candidate_status_history_trigger on candidates;
create trigger candidate_status_history_trigger
after insert or update on candidates
for each row execute function record_candidate_status_change();

create or replace function touch_candidate_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists candidate_updated_at_trigger on candidates;
create trigger candidate_updated_at_trigger
before update on candidates
for each row execute function touch_candidate_updated_at();

create or replace function touch_vacancy_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists vacancy_updated_at_trigger on vacancies;
create trigger vacancy_updated_at_trigger
before update on vacancies
for each row execute function touch_vacancy_updated_at();
