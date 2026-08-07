-- Phase 2a: employee/structure entities, permission catalogue, audit log.
-- Decision record D4 (docs/decision-record.md): sys.* keys live in the same
-- catalogue as emp.*/wh.*/mt.*/as.* — no separate isAdmin flag anywhere.

create table department (
    id          uuid primary key default gen_random_uuid(),
    name_ar     varchar(200) not null,
    name_en     varchar(200) not null,
    version     integer not null default 0,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create table job_title (
    id          uuid primary key default gen_random_uuid(),
    name_ar     varchar(200) not null,
    name_en     varchar(200) not null,
    version     integer not null default 0,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- Fixed catalogue, not admin-editable — rows are seeded here, never via the API.
create table permission (
    key         varchar(50) primary key,
    description varchar(300) not null
);

insert into permission (key, description) values
    ('emp.view', 'View employee directory'),
    ('emp.manage', 'Create, edit, deactivate employees and assign permissions'),
    ('emp.structure', 'Manage departments and job titles'),
    ('wh.view', 'View warehouse inventory'),
    ('wh.qty', 'Adjust warehouse quantities'),
    ('wh.items', 'Manage warehouse item catalogue'),
    ('wh.invoices', 'View warehouse purchase invoices'),
    ('wh.invoices.edit', 'Create and edit warehouse purchase invoices'),
    ('wh.costs', 'View warehouse costs'),
    ('wh.request', 'Submit warehouse need requests'),
    ('wh.act.approve', 'Approve warehouse need requests'),
    ('wh.act.reject', 'Reject warehouse need requests'),
    ('wh.act.postpone', 'Postpone warehouse need requests'),
    ('wh.act.finish', 'Finish/fulfill warehouse need requests'),
    ('mt.view', 'View maintenance data'),
    ('mt.request', 'Submit maintenance requests'),
    ('mt.act.approve', 'Approve maintenance requests'),
    ('mt.act.reject', 'Reject maintenance requests'),
    ('mt.act.postpone', 'Postpone maintenance requests'),
    ('mt.act.start', 'Start maintenance work'),
    ('mt.act.finish', 'Finish maintenance requests'),
    ('as.view', 'View assets and rooms'),
    ('as.manage', 'Manage assets and rooms'),
    ('as.request', 'Submit asset requests'),
    ('as.act.approve', 'Approve asset requests'),
    ('as.act.reject', 'Reject asset requests'),
    ('as.act.postpone', 'Postpone asset requests'),
    ('as.act.finish', 'Finish asset requests'),
    ('sys.branding', 'Manage branding/theme settings'),
    ('sys.backup', 'Manage backups and restores'),
    ('sys.audit.view', 'View the audit log');

create sequence employee_number_seq start 1;

create table employee (
    id              uuid primary key default gen_random_uuid(),
    employee_number varchar(20) not null unique,
    name            varchar(200) not null,
    phone           varchar(20) not null unique,
    pin_hash        varchar(100) not null,
    email           varchar(200),
    national_id     varchar(50) unique,
    joined_date     date not null,
    photo_key       varchar(500),
    active          boolean not null default true,
    job_title_id    uuid references job_title(id),
    version         integer not null default 0,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create table employee_department (
    employee_id     uuid not null references employee(id),
    department_id   uuid not null references department(id),
    primary key (employee_id, department_id)
);

create table employee_permission (
    employee_id     uuid not null references employee(id),
    permission_key  varchar(50) not null references permission(key),
    primary key (employee_id, permission_key)
);

create table audit_log (
    id                  uuid primary key default gen_random_uuid(),
    actor_employee_id   uuid references employee(id),
    action              varchar(100) not null,
    entity_type         varchar(100) not null,
    entity_id           uuid,
    before_state        jsonb,
    after_state         jsonb,
    created_at          timestamptz not null default now()
);

create index idx_audit_log_entity on audit_log (entity_type, entity_id);
create index idx_employee_phone on employee (phone);
