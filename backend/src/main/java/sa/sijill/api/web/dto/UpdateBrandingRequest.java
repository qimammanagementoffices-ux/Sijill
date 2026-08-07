package sa.sijill.api.web.dto;

import java.util.UUID;

public record UpdateBrandingRequest(String preset, String primaryColor, UUID logoAttachmentId, int version) {}
