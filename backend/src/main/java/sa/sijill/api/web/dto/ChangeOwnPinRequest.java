package sa.sijill.api.web.dto;

/** Self-service PIN change: the caller proves the current PIN, then sets a new one. */
public record ChangeOwnPinRequest(String currentPin, String pin, String pinConfirm) {}
