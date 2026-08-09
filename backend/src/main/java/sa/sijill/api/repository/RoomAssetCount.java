package sa.sijill.api.repository;

import java.util.UUID;

/** Projection for {@link AssetRepository#countAssetsByRoom()}. */
public interface RoomAssetCount {
    UUID getRoomId();

    Long getCount();
}
