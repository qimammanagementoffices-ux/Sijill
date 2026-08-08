-- Phase 8 added AttachmentOwnerType.MAINTENANCE (Java enum) but missed that
-- attachment.owner_type has an explicit CHECK constraint (V10), not just a
-- bare varchar -- every maintenance-image upload was failing with a 409
-- "conflicts with existing data" (DataIntegrityViolationException on the
-- CHECK violation). Widen it the same way V15 widened backup_snapshot's.
alter table attachment drop constraint attachment_owner_type_check;
alter table attachment add constraint attachment_owner_type_check
    check (owner_type in ('INVENTORY_ITEM', 'ROOM', 'ASSET', 'BRANDING', 'MAINTENANCE'));
