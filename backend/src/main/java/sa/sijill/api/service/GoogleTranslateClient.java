package sa.sijill.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import org.springframework.stereotype.Service;
import sa.sijill.api.error.ApiException;

// The same undocumented "gtx" endpoint browser extensions use to call
// Google Translate for free -- no API key, no billing, matching what the
// reference site (sijill-app.netlify.app) does client-side for its own
// category-name auto-translate. Unofficial: Google could rate-limit or
// block it without notice, and there's no SLA -- fine for a low-stakes
// convenience button, not something to build a critical path on.
@Service
public class GoogleTranslateClient {

    private static final String BASE_URL = "https://translate.googleapis.com/translate_a/single";

    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    public GoogleTranslateClient(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    }

    public String translate(String text, String sourceLang, String targetLang) {
        String url = BASE_URL + "?client=gtx&sl=" + sourceLang + "&tl=" + targetLang + "&dt=t&q="
                + URLEncoder.encode(text, StandardCharsets.UTF_8);

        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("User-Agent", "Mozilla/5.0")
                .timeout(Duration.ofSeconds(15))
                .GET()
                .build();

        HttpResponse<String> response;
        try {
            response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            throw ApiException.internal("Translation request failed: " + e.getMessage());
        }
        if (response.statusCode() != 200) {
            throw ApiException.internal("Translation service returned " + response.statusCode());
        }

        try {
            JsonNode root = objectMapper.readTree(response.body());
            StringBuilder result = new StringBuilder();
            for (JsonNode segment : root.get(0)) {
                result.append(segment.get(0).asText(""));
            }
            return result.toString();
        } catch (Exception e) {
            throw ApiException.internal("Failed to parse translation response: " + e.getMessage());
        }
    }
}
