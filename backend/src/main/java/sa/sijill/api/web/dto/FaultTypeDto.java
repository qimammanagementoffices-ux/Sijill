package sa.sijill.api.web.dto;

import java.util.UUID;
import sa.sijill.api.domain.FaultType;

public record FaultTypeDto(UUID id, String nameAr, String nameEn, String nameHi, LocalizedRef suggestedCategory, int version) {

    public static FaultTypeDto from(FaultType faultType) {
        return new FaultTypeDto(
                faultType.getId(),
                faultType.getNameAr(),
                faultType.getNameEn(),
                faultType.getNameHi(),
                faultType.getSuggestedCategory() == null ? null : new LocalizedRef(
                        faultType.getSuggestedCategory().getId(),
                        faultType.getSuggestedCategory().getNameAr(),
                        faultType.getSuggestedCategory().getNameEn()),
                faultType.getVersion());
    }
}
