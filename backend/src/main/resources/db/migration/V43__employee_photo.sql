alter table employee add column photo_attachment_id uuid references attachment(id);

alter table attachment drop constraint attachment_owner_type_check;
alter table attachment add constraint attachment_owner_type_check
    check (owner_type in ('INVENTORY_ITEM', 'ROOM', 'ASSET', 'BRANDING', 'MAINTENANCE', 'EMPLOYEE'));
