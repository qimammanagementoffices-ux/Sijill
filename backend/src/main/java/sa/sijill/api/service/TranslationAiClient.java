package sa.sijill.api.service;

import java.util.Map;

// One implementation exists today (AnthropicTranslationAiClient) — kept as
// an interface anyway since app.translation.provider was already scaffolded
// (render.yaml, application.yml) as a configurable choice before this
// feature existed; a second provider can implement this later without
// touching LanguageService.
public interface TranslationAiClient {

    /**
     * Translates every value in {@code sourceEnglish} (key -> English UI
     * string) into {@code targetLanguageName}. Returns a map with the same
     * keys, translated values. Throws ApiException.internal if the provider
     * call fails or returns something that can't be parsed back into the
     * same key set.
     */
    Map<String, String> translateBatch(Map<String, String> sourceEnglish, String targetLanguageName);

    /**
     * Translates a single short piece of text (e.g. a category name) from
     * {@code sourceLanguageName} to {@code targetLanguageName}. Unlike
     * {@link #translateBatch}, the source language is not fixed to English.
     * Throws ApiException.internal/validation on the same conditions as
     * translateBatch.
     */
    String translateText(String text, String sourceLanguageName, String targetLanguageName);
}
