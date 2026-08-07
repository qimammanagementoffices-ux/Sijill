-- Phase 6a: file uploads (shared media viewer backing store) + branding.
-- owner_type/owner_id is a generic polymorphic reference rather than one
-- join table per entity — same "one reusable module" reasoning as the
-- domain-parameterized category/inventory_item tables.

create table attachment (
    id                          uuid primary key default gen_random_uuid(),
    owner_type                  varchar(30) not null check (owner_type in ('INVENTORY_ITEM', 'ROOM', 'ASSET', 'BRANDING')),
    owner_id                    uuid not null,
    storage_key                 text not null,
    url                         text not null,
    filename                    varchar(255) not null,
    content_type                varchar(100) not null,
    size_bytes                  bigint not null,
    uploaded_by_employee_id     uuid references employee(id),
    created_at                  timestamptz not null default now()
);

create index idx_attachment_owner on attachment (owner_type, owner_id);

-- Single-row settings table — no id lookup needed, the app always reads/
-- writes the one row.
create table branding_setting (
    id                  boolean primary key default true check (id = true),
    preset              varchar(30) not null default 'default',
    primary_color       varchar(7) not null default '#0f766e',
    logo_attachment_id  uuid references attachment(id),
    version             integer not null default 0,
    updated_at          timestamptz not null default now()
);

insert into branding_setting (id) values (true);
