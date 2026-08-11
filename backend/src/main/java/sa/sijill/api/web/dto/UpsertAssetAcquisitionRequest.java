package sa.sijill.api.web.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record UpsertAssetAcquisitionRequest(String documentNumber, LocalDate documentDate, String vendor,
        BigDecimal amount, String notes, List<UUID> assetIds, Integer version) {}
