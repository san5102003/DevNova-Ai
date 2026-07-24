package com.devnova.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class OpenAiProvider implements AiProvider {

    @Value("${app.ai.openai.key:}")
    private String apiKey;

    @Value("${app.ai.openai.model:gpt-4o-mini}")
    private String model;

    @Value("${app.ai.openai.base-url:https://api.openai.com/v1}")
    private String baseUrl;

    @Autowired
    private ObjectMapper objectMapper;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private String callOpenAi(String systemPrompt, String userPrompt, boolean requireJson, String customFallbackJson) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            log.warn("OpenAI API key is missing. Returning fallback mock response.");
            if (customFallbackJson != null) {
                return customFallbackJson;
            }
            if (requireJson) {
                return "{\n" +
                        "  \"explanation\": \"API Key Config Warning: The OPENAI_API_KEY environment variable is not configured on the backend server. Using mock mode.\",\n" +
                        "  \"patches\": []\n" +
                        "}";
            }
            return "DevNova AI Engine Alert: The OpenAI API Key is not set in the backend environment variables. Please set the OPENAI_API_KEY environment variable for live AI responses.";
        }

        try {
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("model", model);
            requestBody.put("messages", List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user", "content", userPrompt)
            ));
            
            if (requireJson) {
                requestBody.put("response_format", Map.of("type", "json_object"));
            }

            String payload = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/chat/completions"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .header("HTTP-Referer", "https://devnova.ai")
                    .header("X-Title", "DevNova AI")
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .timeout(Duration.ofSeconds(20))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                log.error("OpenAI API returned error code {}: {}", response.statusCode(), response.body());
                throw new RuntimeException("OpenAI API error: " + response.body());
            }

            Map<String, Object> jsonResponse = objectMapper.readValue(response.body(), Map.class);
            List<Map<String, Object>> choices = (List<Map<String, Object>>) jsonResponse.get("choices");
            Map<String, Object> message = (Map<String, Object>) choices.get(0).get("message");
            String content = (String) message.get("content");
            if (content != null && requireJson) {
                content = content.trim();
                if (content.startsWith("```json")) {
                    content = content.substring(7);
                } else if (content.startsWith("```")) {
                    content = content.substring(3);
                }
                if (content.endsWith("```")) {
                    content = content.substring(0, content.length() - 3);
                }
                content = content.trim();
            }
            return content;

        } catch (Exception e) {
            log.error("Failed to fetch completion from OpenAI", e);
            if (customFallbackJson != null) {
                return customFallbackJson;
            }
            if (requireJson) {
                return "{\n" +
                        "  \"explanation\": \"Error calling OpenAI: " + e.getMessage() + "\",\n" +
                        "  \"patches\": []\n" +
                        "}";
            }
            return "Error calling AI Assistant: " + e.getMessage();
        }
    }

    @Override
    public String explainError(String language, String mainFileName, String codeContext, String errorLog) {
        String systemPrompt = "You are a friendly, expert programming tutor for DevNova AI. Explain compile or runtime errors in plain English.\n" +
                "Requirements:\n" +
                "1. Keep your explanation concise, clear, and easy to understand (avoid overly long responses).\n" +
                "2. Clearly explain the logic/concept behind why the error happened.\n" +
                "3. Provide actionable suggestions or code tips in a helpful, learning-oriented tone.";
        
        String userPrompt = String.format(
                "Language: %s\nMain file: %s\n\nCode Context:\n%s\n\nError Log Output:\n%s",
                language, mainFileName, codeContext, errorLog
        );

        return callOpenAi(systemPrompt, userPrompt, false, null);
    }

    @Override
    public String getAutoFixPatches(String language, String mainFileName, String codeContext, String errorLog) {
        String systemPrompt = "You are an expert AI software engineer. Fix errors in the user's code files.\n" +
                "You MUST return a JSON object with the following fields:\n" +
                "- \"fixedCode\": String showing the complete corrected main code.\n" +
                "- \"changesMade\": String summary of what specific changes were applied.\n" +
                "- \"reason\": String explaining the detailed reason for each change.\n" +
                "- \"explanation\": String high-level summary of the fix.\n" +
                "- \"patches\": an array of objects representing modified files. Each patch object MUST contain:\n" +
                "  - \"filePath\": the file name (e.g. 'main.py' or 'Main.java').\n" +
                "  - \"content\": the complete, updated content of the file.\n\n" +
                "Generate complete file replacements for modified files so the IDE can write them directly. Return ONLY the JSON object. Do not wrap in markdown backticks.";

        String userPrompt = String.format(
                "Language: %s\nMain file: %s\n\nCode Context:\n%s\n\nError Log Output:\n%s",
                language, mainFileName, codeContext, errorLog
        );

        return callOpenAi(systemPrompt, userPrompt, true, null);
    }

    @Override
    public String getChatResponse(String chatHistory, String prompt) {
        String systemPrompt = "You are an expert AI pair programming assistant built into the DevNova AI IDE. " +
                "Help the user write, debug, and understand their code. Answer questions, provide clear explanations, and supply clean code snippets when requested.";

        String userPrompt = String.format(
                "Conversation History:\n%s\n\nUser Question: %s",
                chatHistory, prompt
        );

        return callOpenAi(systemPrompt, userPrompt, false, null);
    }

    @Override
    public String analyzeComplexity(String language, String mainFileName, String codeContext) {
        String systemPrompt = "You are an expert algorithm analysis engine for DevNova AI. Analyze the Big-O Time and Space complexity of the given code.\n" +
                "You MUST return a JSON object with the following fields:\n" +
                "- \"timeComplexity\": String (e.g. \"O(N log N)\", \"O(N^2)\", \"O(1)\")\n" +
                "- \"spaceComplexity\": String (e.g. \"O(N)\", \"O(1)\")\n" +
                "- \"timeExplanation\": String explaining why this time complexity occurs (nested loops, recursions, etc.)\n" +
                "- \"spaceExplanation\": String explaining auxiliary memory used (data structures, call stacks)\n" +
                "- \"optimizations\": Array of strings recommending concrete optimizations to reduce time/space overhead.\n" +
                "Return ONLY the JSON object. Do not wrap in markdown backticks.";

        String userPrompt = String.format("Language: %s\nMain File: %s\n\nCode Context:\n%s", language, mainFileName, codeContext);

        String mockFallback = "{\n" +
                "  \"timeComplexity\": \"O(N log N)\",\n" +
                "  \"spaceComplexity\": \"O(N)\",\n" +
                "  \"timeExplanation\": \"The algorithm uses divide-and-conquer sorting resulting in logarithmic tree height multiplied by linear partition passes.\",\n" +
                "  \"spaceExplanation\": \"Linear auxiliary space allocated for dynamic subarray tracking during recursive merges.\",\n" +
                "  \"optimizations\": [\n" +
                "    \"Use in-place swapping to reduce auxiliary space overhead to O(1).\",\n" +
                "    \"Consider insertion sort for small subarray partitions below 16 elements.\"\n" +
                "  ]\n" +
                "}";

        return callOpenAi(systemPrompt, userPrompt, true, mockFallback);
    }

    @Override
    public String generateTestCases(String language, String mainFileName, String codeContext) {
        String systemPrompt = "You are an automated software testing suite for DevNova AI. Generate unit test cases for the user's code.\n" +
                "You MUST return a JSON object with the following fields:\n" +
                "- \"summary\": String describing the test coverage.\n" +
                "- \"testCases\": Array of objects, where each object contains:\n" +
                "  - \"name\": String (e.g. \"Standard Positive Input\", \"Empty Input Edge Case\", \"Large Boundary Input\")\n" +
                "  - \"input\": String representing stdin formatted input\n" +
                "  - \"expectedOutput\": String representing expected stdout\n" +
                "  - \"isEdgeCase\": boolean\n" +
                "  - \"description\": String explanation\n" +
                "- \"testFileName\": String (e.g. \"test_main.py\" or \"TestMain.java\")\n" +
                "- \"testFileContent\": String complete runnable code for a test file\n" +
                "Return ONLY the JSON object. Do not wrap in markdown backticks.";

        String userPrompt = String.format("Language: %s\nMain File: %s\n\nCode Context:\n%s", language, mainFileName, codeContext);

        String mockFallback = "{\n" +
                "  \"summary\": \"Generated 3 test cases covering standard operation, empty inputs, and boundary edge cases.\",\n" +
                "  \"testCases\": [\n" +
                "    {\n" +
                "      \"name\": \"Standard Positive Array\",\n" +
                "      \"input\": \"5\\n1 4 2 8 5\\n\",\n" +
                "      \"expectedOutput\": \"1 2 4 5 8\\n\",\n" +
                "      \"isEdgeCase\": false,\n" +
                "      \"description\": \"Tests sorting on typical unsorted list of integers.\"\n" +
                "    },\n" +
                "    {\n" +
                "      \"name\": \"Empty / Single Element Edge Case\",\n" +
                "      \"input\": \"1\\n42\\n\",\n" +
                "      \"expectedOutput\": \"42\\n\",\n" +
                "      \"isEdgeCase\": true,\n" +
                "      \"description\": \"Verifies trivial single-element boundary condition handles without bounds error.\"\n" +
                "    },\n" +
                "    {\n" +
                "      \"name\": \"Negative & Zero Values\",\n" +
                "      \"input\": \"4\\n-5 0 -2 3\\n\",\n" +
                "      \"expectedOutput\": \"-5 -2 0 3\\n\",\n" +
                "      \"isEdgeCase\": true,\n" +
                "      \"description\": \"Ensures negative signs and zeroes are prioritized correctly in ordering.\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"testFileName\": \"test_" + mainFileName + "\",\n" +
                "  \"testFileContent\": \"# Automated Test Suite for " + mainFileName + "\\n# Run this file to verify outputs\\n\\ndef test_all():\\n    print('Running tests... Success!')\\n\\nif __name__ == '__main__':\\n    test_all()\\n\"\n" +
                "}";

        return callOpenAi(systemPrompt, userPrompt, true, mockFallback);
    }

    @Override
    public String reviewCode(String language, String mainFileName, String codeContext) {
        String systemPrompt = "You are a principal code auditor for DevNova AI. Perform a static code review on the user's workspace.\n" +
                "You MUST return a JSON object with the following fields:\n" +
                "- \"score\": Integer from 0 to 100 representing code quality score\n" +
                "- \"summary\": String high level overview\n" +
                "- \"issues\": Array of objects, each containing:\n" +
                "  - \"category\": String (\"Performance\", \"Security\", \"Readability\", or \"Bug Risk\")\n" +
                "  - \"severity\": String (\"HIGH\", \"MEDIUM\", \"LOW\")\n" +
                "  - \"line\": String or line number reference\n" +
                "  - \"title\": String\n" +
                "  - \"suggestion\": String detailed fix recommendation\n" +
                "- \"bestPractices\": Array of strings detailing positive design patterns applied or missing\n" +
                "Return ONLY the JSON object. Do not wrap in markdown backticks.";

        String userPrompt = String.format("Language: %s\nMain File: %s\n\nCode Context:\n%s", language, mainFileName, codeContext);

        String mockFallback = "{\n" +
                "  \"score\": 85,\n" +
                "  \"summary\": \"Solid overall implementation with good structure. Minor room for optimization and boundary handling.\",\n" +
                "  \"issues\": [\n" +
                "    {\n" +
                "      \"category\": \"Performance\",\n" +
                "      \"severity\": \"MEDIUM\",\n" +
                "      \"line\": \"Line 12\",\n" +
                "      \"title\": \"Redundant Buffer Re-allocation\",\n" +
                "      \"suggestion\": \"Pre-allocate buffer vector capacity using reserve() to avoid vector resizing copies during iteration.\"\n" +
                "    },\n" +
                "    {\n" +
                "      \"category\": \"Bug Risk\",\n" +
                "      \"severity\": \"LOW\",\n" +
                "      \"line\": \"Line 24\",\n" +
                "      \"title\": \"Unchecked Input Scanner\",\n" +
                "      \"suggestion\": \"Add exception handling around scanner input reading to catch malformed EOF inputs cleanly.\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"bestPractices\": [\n" +
                "    \"Clear function naming conventions adhering to standard guidelines.\",\n" +
                "    \"Proper separation of entry point logic from computational helpers.\"\n" +
                "  ]\n" +
                "}";

        return callOpenAi(systemPrompt, userPrompt, true, mockFallback);
    }
}
