package com.devnova.service;

public interface AiProvider {
    String explainError(String language, String mainFileName, String codeContext, String errorLog);
    String getAutoFixPatches(String language, String mainFileName, String codeContext, String errorLog);
    String getChatResponse(String chatHistory, String prompt);
    String analyzeComplexity(String language, String mainFileName, String codeContext);
    String generateTestCases(String language, String mainFileName, String codeContext);
    String reviewCode(String language, String mainFileName, String codeContext);
}
