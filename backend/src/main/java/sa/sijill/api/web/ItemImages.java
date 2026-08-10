package sa.sijill.api.web;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import sa.sijill.api.domain.Attachment;
import sa.sijill.api.domain.AttachmentOwnerType;
import sa.sijill.api.domain.InventoryItem;
import sa.sijill.api.repository.AttachmentRepository;

// Thumbnail lookup shared by the warehouse-item and maintenance-part lists:
// one query for a whole page rather than a lookup per row.
final class ItemImages {

    private ItemImages() {}

    // Images only -- a PDF spec sheet is an attachment too, and it has no
    // thumbnail. Earliest upload wins when an item has several.
    static Map<UUID, String> firstImageByItem(AttachmentRepository attachments, List<InventoryItem> items) {
        if (items.isEmpty()) {
            return Map.of();
        }
        List<UUID> ids = items.stream().map(InventoryItem::getId).toList();
        return attachments.findByOwnerTypeAndOwnerIdIn(AttachmentOwnerType.INVENTORY_ITEM, ids).stream()
                .filter(a -> a.getContentType() != null && a.getContentType().startsWith("image/"))
                .sorted(Comparator.comparing(Attachment::getCreatedAt))
                .collect(Collectors.toMap(Attachment::getOwnerId, Attachment::getUrl, (first, later) -> first));
    }
}
