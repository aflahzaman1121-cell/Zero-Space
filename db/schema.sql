create table if not exists batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('mentor','student')),
  full_name text not null,
  class_level int,
  parent_name text,
  parent_phone text,
  batch_id uuid references batches(id) on delete set null,
  must_change_password boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  paper text not null,
  chapter text not null,
  topic text not null,
  difficulty text not null default 'medium' check (difficulty in ('easy','medium','hard')),
  text text not null,
  options jsonb not null,
  correct int not null check (correct between 0 and 3),
  solution text not null default '',
  wrong jsonb not null default '{}'::jsonb,
  archived boolean not null default false,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  paper text not null,
  type text not null check (type in ('quiz','weekly','module','practice','mock')),
  time_limit_min int not null,
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  marks double precision not null default 1,
  negative double precision not null default 0,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists test_questions (
  test_id uuid not null references tests(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  primary key (test_id, question_id)
);
create table if not exists test_assignments (
  test_id uuid not null references tests(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  primary key (test_id, student_id)
);
create table if not exists attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references tests(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  started_at timestamptz not null default now(),
  deadline timestamptz not null,
  submitted_at timestamptz,
  auto_submitted boolean not null default false,
  question_order jsonb not null,
  answers jsonb not null default '{}'::jsonb,
  time_per_question jsonb not null default '{}'::jsonb,
  tab_switches int not null default 0,
  score double precision,
  max_score double precision,
  unique (test_id, student_id)
);
create table if not exists attempt_reports (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references attempts(id) on delete cascade,
  student_id uuid not null references users(id) on delete cascade,
  test_id uuid not null references tests(id) on delete cascade,
  summary text not null,
  data jsonb not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists manual_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id) on delete cascade,
  kind text not null check (kind in ('practice','video','note')),
  value double precision,
  note text,
  entry_date date not null default current_date,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  w_recent double precision not null default 40,
  w_mastery double precision not null default 25,
  w_consistency double precision not null default 20,
  w_trend double precision not null default 15,
  low_readiness double precision not null default 40,
  mentor_email text
);
insert into settings (id) values (1) on conflict do nothing;
create table if not exists parent_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id) on delete cascade,
  week_start date not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft','approved')),
  updated_at timestamptz not null default now(),
  unique (student_id, week_start)
);
create index if not exists attempts_student_idx on attempts(student_id);
create index if not exists reports_unread_idx on attempt_reports(is_read, created_at desc);
create table if not exists login_failures (
  username text not null,
  failed_at timestamptz not null default now()
);
create index if not exists login_failures_idx on login_failures(username, failed_at);
alter table attempts add column if not exists results jsonb;
create table if not exists test_batches (
  test_id uuid not null references tests(id) on delete cascade,
  batch_id uuid not null references batches(id) on delete cascade,
  primary key (test_id, batch_id)
);
