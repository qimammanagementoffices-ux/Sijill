-- V68 imported legacy records after V63 first initialized these sequences.
-- Advance each sequence beyond both its current next value and the highest
-- code now stored in its table. The greatest() guard makes this safe on live
-- databases where users may already have generated newer codes.

select setval(
    'warehouse_item_code_seq',
    greatest(
        coalesce((
            select max(substring(code from 4)::bigint)
            from inventory_item
            where domain = 'WAREHOUSE' and code ~ '^WH-[0-9]+$'
        ), 0) + 1,
        (select case when is_called then last_value + 1 else last_value end from warehouse_item_code_seq)
    ),
    false
);

select setval(
    'maintenance_item_code_seq',
    greatest(
        coalesce((
            select max(substring(code from 4)::bigint)
            from inventory_item
            where domain = 'MAINTENANCE' and code ~ '^MN-[0-9]+$'
        ), 0) + 1,
        (select case when is_called then last_value + 1 else last_value end from maintenance_item_code_seq)
    ),
    false
);

select setval(
    'asset_number_seq',
    greatest(
        coalesce((
            select max(substring(asset_number from 5)::bigint)
            from asset
            where asset_number ~ '^AST-[0-9]+$'
        ), 0) + 1,
        (select case when is_called then last_value + 1 else last_value end from asset_number_seq)
    ),
    false
);
