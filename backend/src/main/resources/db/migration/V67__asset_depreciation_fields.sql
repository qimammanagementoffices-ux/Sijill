-- Numbered 67, not 59: production is already past 62, and Flyway runs with
-- outOfOrder off, so a migration below the applied version aborts startup.
-- Asset's depreciation fields need these columns or ddl-auto: validate fails.
alter table asset add column if not exists depreciation_rate numeric(5,2);
alter table asset add column if not exists accumulated_depreciation numeric(14,2);
alter table asset add column if not exists period_end_balance numeric(14,2);
alter table asset add column if not exists period_end_date date;
