package sa.sijill.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import sa.sijill.api.error.ApiException;

/** Calls the private LibreTranslate container on the VPS. */
@Service
public class LibreTranslateClient implements NameTranslationClient {

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;
    private final URI translateUri;

    @Autowired
    public LibreTranslateClient(
            ObjectMapper objectMapper,
            @Value("${app.name-translation.base-url:http://localhost:5000}") String baseUrl) {
        this(
                objectMapper,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build(),
                baseUrl);
    }

    LibreTranslateClient(ObjectMapper objectMapper, HttpClient httpClient, String baseUrl) {
        this.objectMapper = objectMapper;
        this.httpClient = httpClient;
        String normalizedBaseUrl = baseUrl.endsWith("/")
                ? baseUrl.substring(0, baseUrl.length() - 1)
                : baseUrl;
        this.translateUri = URI.create(normalizedBaseUrl + "/translate");
    }

    @Override
    public String translate(String text, String sourceLang, String targetLang) {
        String body;
        try {
            body = objectMapper.writeValueAsString(Map.of(
                    "q", text,
                    "source", sourceLang,
                    "target", targetLang,
                    "format", "text"));
        } catch (Exception e) {
            throw ApiException.internal("Could not prepare translation request.");
        }

        HttpRequest request = HttpRequest.newBuilder()
                .uri(translateUri)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(30))
                .POST(HttpRequest.BodyPublishers.ofString(body))
                .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw ApiException.internal("Translation request was interrupted.");
        } catch (Exception e) {
            // Never include the source text or the provider response in logs/errors.
            throw ApiException.internal("Translation service is unavailable.");
        }

        if (response.statusCode() != 200) {
            throw ApiException.internal("Translation service returned " + response.statusCode() + ".");
        }

        try {
            JsonNode root = objectMapper.readTree(response.body());
            String translated = root.path("translatedText").asText("").trim();
            if (translated.isEmpty()) {
                throw ApiException.internal("Translation service returned an empty result.");
            }
            return translated;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            throw ApiException.internal("Translation service returned an invalid response.");
        }
    }
}
