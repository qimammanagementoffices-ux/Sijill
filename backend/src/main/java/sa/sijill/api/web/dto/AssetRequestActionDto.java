package sa.sijill.api.web.dto;

import java.time.Instant;
import sa.sijill.api.domain.AssetRequestAction;

public record AssetRequestActionDto(String actorName, String action, String reason, Instant createdAt) {

    public static AssetRequestActionDto from(AssetRequestAction action) {
        return new AssetRequestActionDto(
                action.getActor().getName(), action.getAction(), action.getReason(), action.getCreatedAt());
    }
}
