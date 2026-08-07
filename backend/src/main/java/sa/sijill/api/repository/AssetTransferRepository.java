package sa.sijill.api.repository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import sa.sijill.api.domain.AssetTransfer;

public interface AssetTransferRepository extends JpaRepository<AssetTransfer, UUID> {

    List<AssetTransfer> findByAssetIdOrderByCreatedAtDesc(UUID assetId);
}
