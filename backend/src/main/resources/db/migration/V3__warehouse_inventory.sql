-- Phase 3a: reusable inventory module (parameterized by domain per
-- sijill-master-spec.md §7), warehouse invoices, need requests.
-- Only 'WAREHOUSE' is populated today; 'MAINTENANCE' is reserved for a
-- later phase reusing these same tables, per the same section's explicit
-- "one reusable inventory module... not two copied code paths" rule.

create table category (
    id          uuid primary key default gen_random_uuid(),
    domain      varchar(20) not null check (domain in ('WAREHOUSE', 'MAINTENANCE', 'ASSET', 'ROOM')),
    name_ar     varchar(200) not null,
    name_en     varchar(200) not null,
    active      boolean not null default true,
    version     integer not null default 0,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create table inventory_item (
    id                      uuid primary key default gen_random_uuid(),
    domain                  varchar(20) not null check (domain in ('WAREHOUSE', 'MAINTENANCE')),
    code                    varchar(50) not null,
    name_ar                 varchar(200) not null,
    name_en                 varchar(200) not null,
    category_id             uuid references category(id),
    quantity                integer not null default 0,
    unit                    varchar(50),
    weight                  numeric(10,3),
    date_added              date not null default current_date,
    min_quantity            integer not null default 0,
    last_purchase_price     numeric(12,2),
    tax_rate                numeric(5,2),
    tax_inclusive_price     numeric(12,2),
    active                  boolean not null default true,
    version                 integer not null default 0,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now(),
    unique (domain, code)
);

create table purchase_invoice (
    id                      uuid primary key default gen_random_uuid(),
    domain                  varchar(20) not null check (domain in ('WAREHOUSE', 'MAINTENANCE')),
    invoice_number          varchar(50) not null,
    invoice_date            date not null,
    vendor                  varchar(200) not null,
    tax_rate                numeric(5,2) not null default 0,
    subtotal                numeric(14,2) not null,
    tax_total               numeric(14,2) not null,
    total                   numeric(14,2) not null,
    created_by_employee_id  uuid references employee(id),
    version                 integer not null default 0,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now(),
    unique (domain, invoice_number)
);

create table purchase_invoice_line (
    id                  uuid primary key default gen_random_uuid(),
    invoice_id          uuid not null references purchase_invoice(id),
    inventory_item_id   uuid not null references inventory_item(id),
    quantity            integer not null,
    unit_price          numeric(12,2) not null,
    line_total          numeric(14,2) not null
);

create table need_request (
    id                      uuid primary key default gen_random_uuid(),
    requester_employee_id   uuid not null references employee(id),
    department_id           uuid references department(id),
    category_id             uuid references category(id),
    notes                   text,
    status                  varchar(20) not null,
    suggested_start_date    date,
    version                 integer not null default 0,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

create table need_request_line (
    id                  uuid primary key default gen_random_uuid(),
    need_request_id     uuid not null references need_request(id),
    inventory_item_id   uuid not null references inventory_item(id),
    quantity_requested  integer not null,
    quantity_issued     integer
);

create table need_request_action (
    id                  uuid primary key default gen_random_uuid(),
    need_request_id     uuid not null references need_request(id),
    actor_employee_id   uuid not null references employee(id),
    action              varchar(20) not null,
    reason              text,
    created_at          timestamptz not null default now()
);

create index idx_inventory_item_domain on inventory_item (domain);
create index idx_need_request_status on need_request (status);
create index idx_need_request_requester on need_request (requester_employee_id);
