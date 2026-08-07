-- Phase 5: rooms, assets, custody/transfer history, asset request workflow.
-- Asset categories reuse the existing `category` table with domain='ASSET'
-- (already reserved in V3's check constraint) — same "one reusable module,
-- not a copied table" pattern as maintenance parts categories in V6.

create table room (
    id          uuid primary key default gen_random_uuid(),
    room_number varchar(50) not null,
    name_ar     varchar(200) not null,
    name_en     varchar(200) not null,
    building    varchar(100),
    floor       varchar(50),
    active      boolean not null default true,
    version     integer not null default 0,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    unique (room_number)
);

create table asset (
    id                          uuid primary key default gen_random_uuid(),
    asset_number                varchar(50) not null unique,
    name_ar                     varchar(200) not null,
    name_en                     varchar(200) not null,
    category_id                 uuid references category(id),
    room_id                     uuid references room(id),
    custodian_employee_id       uuid references employee(id),
    status                      varchar(20) not null check (status in ('ACTIVE', 'MAINTENANCE', 'RETIRED')),
    acquisition_date            date,
    acquisition_cost            numeric(12,2),
    vendor                      varchar(200),
    notes                       text,
    public_token                uuid not null default gen_random_uuid(),
    version                     integer not null default 0,
    created_at                  timestamptz not null default now(),
    updated_at                  timestamptz not null default now(),
    unique (public_token)
);

create table asset_transfer (
    id                      uuid primary key default gen_random_uuid(),
    asset_id                uuid not null references asset(id),
    from_room_id            uuid references room(id),
    to_room_id              uuid references room(id),
    from_employee_id        uuid references employee(id),
    to_employee_id          uuid references employee(id),
    actor_employee_id       uuid not null references employee(id),
    reason                  text,
    created_at              timestamptz not null default now()
);

create table asset_request (
    id                      uuid primary key default gen_random_uuid(),
    requester_employee_id   uuid not null references employee(id),
    asset_id                uuid not null references asset(id),
    reason                  text,
    status                  varchar(20) not null,
    suggested_start_date    date,
    version                 integer not null default 0,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

create table asset_request_action (
    id                  uuid primary key default gen_random_uuid(),
    asset_request_id    uuid not null references asset_request(id),
    actor_employee_id   uuid not null references employee(id),
    action              varchar(20) not null,
    reason              text,
    created_at          timestamptz not null default now()
);

create index idx_asset_room on asset (room_id);
create index idx_asset_custodian on asset (custodian_employee_id);
create index idx_asset_transfer_asset on asset_transfer (asset_id);
create index idx_asset_request_status on asset_request (status);
create index idx_asset_request_requester on asset_request (requester_employee_id);
