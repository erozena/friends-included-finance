create table if not exists employees (
  id text primary key,
  name text not null,
  role text not null check (role in ('sales','expense','manager')),
  telegram_user_id text unique,
  linked_chat_id text
);

insert into employees (id,name,role) values
 ('richard','Richard Darling','sales'),('anastasia','Anastasia Ferrari','sales'),
 ('jean-claude','Jean-Claude Berzins','sales'),('kevin','Kevin von Whatever','expense'),
 ('svetlana','Svetlana de Monte Carlo','manager') on conflict (id) do nothing;

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  kind text not null check (kind in ('sale','expense')),
  submitter_id text not null references employees(id),
  submission_time timestamptz not null default now(),
  origin text not null check (origin in ('website','telegram')),
  origin_chat_id text,
  customer text,
  project text check (project in ('A','B')),
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  category text check (category in ('Materials','Travel','Other')),
  proposed_allocation text check (proposed_allocation in ('A','B','Company overhead')),
  final_allocation text check (final_allocation in ('A','B','Company overhead')),
  proposed_richard numeric(5,2), proposed_anastasia numeric(5,2), proposed_jean_claude numeric(5,2),
  approved_richard numeric(5,2), approved_anastasia numeric(5,2), approved_jean_claude numeric(5,2),
  commission_richard numeric(12,2) not null default 0, commission_anastasia numeric(12,2) not null default 0, commission_jean_claude numeric(12,2) not null default 0,
  status text not null check (status in ('Pending approval','Approved','Awaiting allocation','Allocated','Overhead')),
  sheets_status text not null default 'Sync pending', telegram_status text not null default 'Not applicable',
  manager_note text
);

alter table employees enable row level security;
alter table transactions enable row level security;
-- Browser clients use no Supabase key. Vercel uses the service-role key only.
