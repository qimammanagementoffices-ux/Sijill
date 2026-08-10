package sa.sijill.api.repository;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sa.sijill.api.domain.Asset;
import sa.sijill.api.domain.AssetStatus;

public interface AssetRepository extends JpaRepository<Asset, UUID> {

    boolean existsByAssetNumber(String assetNumber);

    java.util.Optional<Asset> findByPublicToken(UUID publicToken);

    @Query("""
            select a from Asset a
            where (:q is null or :q = ''
                or lower(a.nameAr) like lower(concat('%', :q, '%'))
                or lower(a.nameEn) like lower(concat('%', :q, '%'))
                or lower(a.assetNumber) like lower(concat('%', :q, '%')))
              and (:status is null or a.status = :status)
              and (:roomId is null or a.room.id = :roomId)
            """)
    Page<Asset> search(
            @Param("q") String q,
            @Param("status") AssetStatus status,
            @Param("roomId") UUID roomId,
            Pageable pageable);

    java.util.List<Asset> findByCustodianId(UUID custodianId);

    long countByRoom_Id(UUID roomId);

    @Query(
            value = "select room_id as roomId, count(*) as count from asset where room_id is not null group by room_id",
            nativeQuery = true)
    java.util.List<RoomAssetCount> countAssetsByRoom();

    // Server-owned asset numbers -- see V63__code_sequences.sql.
    @Query(value = "select nextval('asset_number_seq')", nativeQuery = true)
    long nextAssetNumberSequence();
}
