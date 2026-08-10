-- Item codes and asset numbers used to be typed by hand and checked with a
-- "does this already exist?" query before insert. That is both collision-
-- prone (two people reach for WH-0044) and racy: concurrent creates can
-- both pass the check and then one dies on the unique constraint. These
-- sequences make the server the only source of a code, the same way
-- employee_number_seq already owns EMP-00001 (see V2__employee_structure).
--
-- Prefixes: WH- warehouse items, MN- maintenance items (spare parts),
-- AST- assets. Zero-padded to 4 digits to match the codes already in use.

create sequence if not exists warehouse_item_code_seq start 1;
create sequence if not exists maintenance_item_code_seq start 1;
create sequence if not exists asset_number_seq start 1;

-- Start each sequence past whatever is already in the table, so the legacy
-- import (V61) and anything entered by hand keep their codes and the next
-- generated one cannot land on top of them. is_called = false makes the
-- very next nextval() return exactly this number rather than one past it.
-- The regex guard skips any code that does not follow the pattern, so a
-- stray hand-typed "PART-001" cannot poison the max.
select setval(
    'warehouse_item_code_seq',
    coalesce((
        select max(substring(code from 4)::bigint)
        from inventory_item
        where domain = 'WAREHOUSE' and code ~ '^WH-[0-9]+$'
    ), 0) + 1,
    false
);

select setval(
    'maintenance_item_code_seq',
    coalesce((
        select max(substring(code from 4)::bigint)
        from inventory_item
        where domain = 'MAINTENANCE' and code ~ '^MN-[0-9]+$'
    ), 0) + 1,
    false
);

select setval(
    'asset_number_seq',
    coalesce((
        select max(substring(asset_number from 5)::bigint)
        from asset
        where asset_number ~ '^AST-[0-9]+$'
    ), 0) + 1,
    false
);
