package sa.sijill.api.web.dto;

import java.util.UUID;

// Deliberately narrower than UpdateEmployeeRequest -- self-service profile
// editing must never let an employee change their own jobTitle, departments,
// or permissions (that's a privilege-escalation risk gated by emp.manage).
public record UpdateSelfRequest(String name, String phone, UUID photoAttachmentId) {}
