package sa.sijill.api.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import sa.sijill.api.error.ApiException;

class LibreTranslateClientTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private HttpServer server;

    @AfterEach
    void stopServer() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void postsTheRequestedLanguagePairAndReadsTranslatedText() throws Exception {
        AtomicReference<String> requestBody = new AtomicReference<>();
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/translate", exchange -> {
            requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            byte[] response = "{\"translatedText\":\"اختبار\"}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, response.length);
            exchange.getResponseBody().write(response);
            exchange.close();
        });
        server.start();

        LibreTranslateClient client = client();

        assertEquals("اختبار", client.translate("test", "en", "ar"));
        JsonNode sent = objectMapper.readTree(requestBody.get());
        assertEquals("test", sent.path("q").asText());
        assertEquals("en", sent.path("source").asText());
        assertEquals("ar", sent.path("target").asText());
        assertEquals("text", sent.path("format").asText());
    }

    @Test
    void convertsProviderFailureToAControlledApplicationError() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/translate", exchange -> {
            exchange.sendResponseHeaders(503, -1);
            exchange.close();
        });
        server.start();

        ApiException error = assertThrows(
                ApiException.class,
                () -> client().translate("test", "en", "ar"));

        assertEquals("INTERNAL_ERROR", error.getCode());
        assertTrue(error.getMessage().contains("503"));
    }

    private LibreTranslateClient client() {
        String baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
        return new LibreTranslateClient(objectMapper, HttpClient.newHttpClient(), baseUrl);
    }
}
