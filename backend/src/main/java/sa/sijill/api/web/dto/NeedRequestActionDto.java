package sa.sijill.api.web.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import sa.sijill.api.domain.NeedRequestAction;
import sa.sijill.api.domain.NeedRequestActionLine;

public record NeedRequestActionDto(
        String actorName, String action, String reason, Instant createdAt, List<LineEdit> lineEdits) {

    // The card renders these as "تم تعديل <صنف> من x إلى y" / "تم حذف ...",
    // resolving the item name from the request's own lines by id.
    public record LineEdit(UUID lineId, int quantityBefore, Integer quantityAfter, boolean removed) {

        static LineEdit from(NeedRequestActionLine edit) {
            return new LineEdit(
                    edit.getLine() == null ? null : edit.getLine().getId(),
                    edit.getQuantityBefore(),
                    edit.getQuantityAfter(),
                    edit.isRemoved());
        }
    }

    public static NeedRequestActionDto from(NeedRequestAction action) {
        return new NeedRequestActionDto(
                // Null actor means the system acted, not an employee.
                action.getActor() == null ? null : action.getActor().getName(),
                action.getAction(),
                action.getReason(),
                action.getCreatedAt(),
                action.getLineEdits().stream().map(LineEdit::from).toList());
    }
}
