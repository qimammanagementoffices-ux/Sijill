package sa.sijill.api.web.dto;

import java.time.Instant;
import sa.sijill.api.domain.NeedRequestAction;

public record NeedRequestActionDto(String actorName, String action, String reason, Instant createdAt) {

    public static NeedRequestActionDto from(NeedRequestAction action) {
        return new NeedRequestActionDto(
                action.getActor().getName(), action.getAction(), action.getReason(), action.getCreatedAt());
    }
}
