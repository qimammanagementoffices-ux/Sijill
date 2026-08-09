package sa.sijill.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import sa.sijill.api.error.ApiException;

// No Anthropic SDK dependency added for this — a single plain HTTP call via
// java.net.http.HttpClient (built into the JDK) doesn't warrant pulling in
// a whole client library for one endpoint. app.translation.enabled/
// provider/api-key/model were already scaffolded (application.yml,
// render.yaml) before this feature existed; provider is validated here
// rather than silently ignored.
@Service
public class AnthropicTranslationAiClient implements TranslationAiClient {

    private static final String API_URL = "https://api.anthropic.com/v1/messages";
    private static final String ANTHROPIC_VERSION = "2023-06-01";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final boolean enabled;
    private final String provider;
    private final String apiKey;
    private final String model;

    public AnthropicTranslationAiClient(
            ObjectMapper objectMapper,
            @Value("${app.translation.enabled:false}") boolean enabled,
            @Value("${app.translation.provider:}") String provider,
            @Value("${app.translation.api-key:}") String apiKey,
            @Value("${app.translation.model:claude-haiku-4-5-20251001}") String model) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
        this.enabled = enabled;
        this.provider = provider;
        this.apiKey = apiKey;
        this.model = model;
    }

    @Override
    public Map<String, String> translateBatch(Map<String, String> sourceEnglish, String targetLanguageName) {
        if (!enabled) {
            throw ApiException.validation(
                    "AI translation is not enabled. Set TRANSLATION_HELPER_ENABLED=true and configure"
                            + " TRANSLATION_PROVIDER/TRANSLATION_API_KEY.",
                    Map.of());
        }
        if (!"anthropic".equalsIgnoreCase(provider)) {
            throw ApiException.validation(
                    "Unsupported TRANSLATION_PROVIDER '" + provider + "' — only 'anthropic' is implemented.",
                    Map.of());
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw ApiException.validation("TRANSLATION_API_KEY is not set.", Map.of());
        }

        String prompt = buildPrompt(sourceEnglish, targetLanguageName);
        String requestBody = buildRequestBody(prompt);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("x-api-key", apiKey)
                .header("anthropic-version", ANTHROPIC_VERSION)
                .header("content-type", "application/json")
                .timeout(Duration.ofSeconds(120))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw ApiException.internal("AI translation request failed: " + e.getMessage());
        }
        if (response.statusCode() != 200) {
            throw ApiException.internal(
                    "AI translation provider returned " + response.statusCode() + ": " + response.body());
        }

        Map<String, String> translated = parseResponse(response.body());
        if (!translated.keySet().equals(sourceEnglish.keySet())) {
            throw ApiException.internal(
                    "AI translation response didn't cover the exact same key set as the request — provider may"
                            + " have dropped or renamed keys. Try again, or translate a smaller batch.");
        }
        return translated;
    }

    @Override
    public String translateText(String text, String sourceLanguageName, String targetLanguageName) {
        requireConfigured();

        String prompt = "Translate the following text from " + sourceLanguageName + " to " + targetLanguageName + ".\n"
                + "This is a short category/label name for a school administration web app — keep it concise and"
                + " natural as a UI label, not a literal word-for-word translation.\n"
                + "Return ONLY the translated text — no quotes, no explanation, no extra text.\n\n" + text;
        String requestBody = buildRequestBody(prompt);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("x-api-key", apiKey)
                .header("anthropic-version", ANTHROPIC_VERSION)
                .header("content-type", "application/json")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw ApiException.internal("AI translation request failed: " + e.getMessage());
        }
        if (response.statusCode() != 200) {
            throw ApiException.internal(
                    "AI translation provider returned " + response.statusCode() + ": " + response.body());
        }

        try {
            JsonNode root = objectMapper.readTree(response.body());
            String result = root.path("content").path(0).path("text").asText("");
            return stripCodeFences(result.trim()).trim();
        } catch (Exception e) {
            throw ApiException.internal("Failed to parse AI translation response: " + e.getMessage());
        }
    }

    private void requireConfigured() {
        if (!enabled) {
            throw ApiException.validation(
                    "AI translation is not enabled. Set TRANSLATION_HELPER_ENABLED=true and configure"
                            + " TRANSLATION_PROVIDER/TRANSLATION_API_KEY.",
                    Map.of());
        }
        if (!"anthropic".equalsIgnoreCase(provider)) {
            throw ApiException.validation(
                    "Unsupported TRANSLATION_PROVIDER '" + provider + "' — only 'anthropic' is implemented.",
                    Map.of());
        }
        if (apiKey == null || apiKey.isBlank()) {
            throw ApiException.validation("TRANSLATION_API_KEY is not set.", Map.of());
        }
    }

    private String buildPrompt(Map<String, String> sourceEnglish, String targetLanguageName) {
        try {
            String sourceJson = objectMapper.writeValueAsString(sourceEnglish);
            return "Translate the values of this JSON object from English to " + targetLanguageName + ".\n"
                    + "This is short UI text (buttons, labels, messages) for a school administration web app —"
                    + " keep translations concise and natural for interface use, not formal prose.\n"
                    + "Keep every key exactly as-is. Return ONLY a valid JSON object with the same keys and"
                    + " translated string values — no markdown code fences, no explanation, no extra text.\n\n"
                    + sourceJson;
        } catch (Exception e) {
            throw ApiException.internal("Failed to build translation request: " + e.getMessage());
        }
    }

    private String buildRequestBody(String prompt) {
        try {
            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("max_tokens", 8192);
            body.put("messages", new Object[] {Map.of("role", "user", "content", prompt)});
            return objectMapper.writeValueAsString(body);
        } catch (Exception e) {
            throw ApiException.internal("Failed to build translation request: " + e.getMessage());
        }
    }

    private Map<String, String> parseResponse(String responseBody) {
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            String text = root.path("content").path(0).path("text").asText("");
            String jsonText = stripCodeFences(text.trim());
            JsonNode translationNode = objectMapper.readTree(jsonText);
            Map<String, String> result = new LinkedHashMap<>();
            translationNode.fields().forEachRemaining(entry -> result.put(entry.getKey(), entry.getValue().asText()));
            return result;
        } catch (Exception e) {
            throw ApiException.internal(
                    "Failed to parse AI translation response as JSON: " + e.getMessage());
        }
    }

    // Models sometimes wrap JSON in ```json ... ``` despite instructions not to.
    private String stripCodeFences(String text) {
        if (text.startsWith("```")) {
            int firstNewline = text.indexOf('\n');
            int lastFence = text.lastIndexOf("```");
            if (firstNewline != -1 && lastFence > firstNewline) {
                return text.substring(firstNewline + 1, lastFence).trim();
            }
        }
        return text;
    }
}
