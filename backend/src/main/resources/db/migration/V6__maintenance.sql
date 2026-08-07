-- Phase 4: maintenance fault types + request workflow. Parts/categories/
-- invoices reuse the reusable inventory module from V3 (Domain.MAINTENANCE),
-- no new tables needed for those.

create table fault_type (
    id                      uuid primary key default gen_random_uuid(),
    name_ar                 varchar(200) not null,
    name_en                 varchar(200) not null,
    suggested_category_id   uuid references category(id),
    version                 integer not null default 0,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

create table maintenance_request (
    id                      uuid primary key default gen_random_uuid(),
    requester_employee_id   uuid not null references employee(id),
    department_id           uuid references department(id),
    fault_type_id           uuid references fault_type(id),
    location                varchar(200),
    priority                varchar(20) not null,
    description             text,
    status                  varchar(20) not null,
    suggested_start_date    date,
    version                 integer not null default 0,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

create table maintenance_request_action (
    id                      uuid primary key default gen_random_uuid(),
    maintenance_request_id uuid not null references maintenance_request(id),
    actor_employee_id       uuid not null references employee(id),
    action                  varchar(20) not null,
    reason                  text,
    created_at              timestamptz not null default now()
);

-- Populated only at finish -- no upfront request-line equivalent, unlike
-- need_request_line (master spec §7: "finish flow may record parts used").
create table maintenance_request_part_used (
    id                      uuid primary key default gen_random_uuid(),
    maintenance_request_id uuid not null references maintenance_request(id),
    inventory_item_id       uuid not null references inventory_item(id),
    quantity                integer not null
);

create index idx_maintenance_request_status on maintenance_request (status);
create index idx_maintenance_request_requester on maintenance_request (requester_employee_id);
