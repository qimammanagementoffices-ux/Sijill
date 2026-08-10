-- The third name column has always held Hindi (see i18n/config.ts); it was
-- only ever named "ur". Rename the columns and the i18n label keys to match.
alter table category      rename column name_ur to name_hi;
alter table department    rename column name_ur to name_hi;
alter table job_title     rename column name_ur to name_hi;
alter table inventory_item rename column name_ur to name_hi;
alter table asset         rename column name_ur to name_hi;
alter table room          rename column name_ur to name_hi;
alter table fault_type    rename column name_ur to name_hi;

update translation set key = replace(key, '.nameUrLabel', '.nameHiLabel')
where key like '%.nameUrLabel';
