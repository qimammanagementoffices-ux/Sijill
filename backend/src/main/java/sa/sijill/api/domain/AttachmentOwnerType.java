package sa.sijill.api.domain;

public enum AttachmentOwnerType {
    INVENTORY_ITEM,
    ROOM,
    ASSET,
    BRANDING,
    MAINTENANCE,
    EMPLOYEE,
    NEED_REQUEST,
    // Proof-of-delivery photos and paperwork attached by the storekeeper at
    // hand-over. Kept apart from NEED_REQUEST so the card does not render them
    // as if the requester had filed them.
    NEED_REQUEST_DELIVERY,
    ASSET_REQUEST,
    ASSET_ACQUISITION,
    WAREHOUSE_INVOICE
}
