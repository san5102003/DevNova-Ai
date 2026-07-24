package com.devnova.controller;

import com.devnova.model.Project;
import com.devnova.model.ProjectFile;
import com.devnova.model.User;
import com.devnova.repository.UserRepository;
import com.devnova.security.services.UserDetailsImpl;
import com.devnova.service.AiProvider;
import com.devnova.service.ProjectService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/ai")
public class AiController {

    @Autowired
    private com.devnova.repository.AiRequestRepository aiRequestRepository;

    @Autowired
    private AiProvider aiProvider;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private UserRepository userRepository;

    @Data
    public static class AiExecutionRequest {
        private UUID projectId;
        private String language;
        private String mainFileName;
        private String errorLog;
    }

    @Data
    public static class AiChatRequest {
        private UUID projectId;
        private String chatHistory;
        private String prompt;
    }

    private String getProjectContext(Project project) {
        StringBuilder sb = new StringBuilder();
        for (ProjectFile f : project.getFiles()) {
            sb.append("--- File: ").append(f.getName()).append(" ---\n");
            sb.append(f.getContent()).append("\n\n");
        }
        return sb.toString();
    }

    private User getAuthenticatedUser(UserDetailsImpl userDetails) {
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found"));
    }

    @GetMapping("/history/{projectId}")
    public ResponseEntity<?> getHistory(
            @PathVariable UUID projectId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getAuthenticatedUser(userDetails);
        Project project = projectService.getProjectEntity(projectId, user)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or access denied"));

        var requests = aiRequestRepository.findByProjectOrderByCreatedAtAsc(project);
        var responseList = requests.stream().map(req -> {
            var map = new java.util.HashMap<String, Object>();
            map.put("id", req.getId());
            map.put("requestType", req.getRequestType());
            map.put("prompt", req.getPrompt());
            map.put("response", req.getResponse());
            map.put("createdAt", req.getCreatedAt());
            return map;
        }).toList();

        return ResponseEntity.ok(responseList);
    }

    @PostMapping("/explain")
    public ResponseEntity<?> explainError(
            @RequestBody AiExecutionRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        User user = getAuthenticatedUser(userDetails);
        Project project = projectService.getProjectEntity(request.getProjectId(), user)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or access denied"));

        String codeContext = getProjectContext(project);
        String explanation = aiProvider.explainError(
                request.getLanguage(),
                request.getMainFileName(),
                codeContext,
                request.getErrorLog()
        );

        // Save AI Request
        try {
            com.devnova.model.AiRequest aiReq = com.devnova.model.AiRequest.builder()
                    .user(user)
                    .project(project)
                    .requestType("EXPLAIN_ERROR")
                    .prompt(request.getErrorLog())
                    .response(explanation)
                    .success(true)
                    .build();
            aiRequestRepository.save(aiReq);
        } catch (Exception e) {
            // log error but do not break user response
        }

        return ResponseEntity.ok(MapResponse.of("explanation", explanation));
    }

    @PostMapping("/autofix")
    public ResponseEntity<?> autoFix(
            @RequestBody AiExecutionRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        User user = getAuthenticatedUser(userDetails);
        Project project = projectService.getProjectEntity(request.getProjectId(), user)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or access denied"));

        String codeContext = getProjectContext(project);
        String patchesJson = aiProvider.getAutoFixPatches(
                request.getLanguage(),
                request.getMainFileName(),
                codeContext,
                request.getErrorLog()
        );

        // Save AI Request
        try {
            com.devnova.model.AiRequest aiReq = com.devnova.model.AiRequest.builder()
                    .user(user)
                    .project(project)
                    .requestType("AUTO_FIX")
                    .prompt(request.getErrorLog())
                    .response(patchesJson)
                    .success(true)
                    .build();
            aiRequestRepository.save(aiReq);
        } catch (Exception e) {
            // log error
        }

        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(patchesJson);
    }

    @PostMapping("/chat")
    public ResponseEntity<?> chatResponse(
            @RequestBody AiChatRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        User user = getAuthenticatedUser(userDetails);
        Project project = projectService.getProjectEntity(request.getProjectId(), user)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or access denied"));

        String codeContext = getProjectContext(project);
        
        String finalPrompt = String.format(
                "Active Files Context:\n%s\n\nUser Question:\n%s", 
                codeContext, request.getPrompt()
        );

        String chatResponse = aiProvider.getChatResponse(request.getChatHistory(), finalPrompt);

        // Save AI Request
        try {
            com.devnova.model.AiRequest aiReq = com.devnova.model.AiRequest.builder()
                    .user(user)
                    .project(project)
                    .requestType("CHAT")
                    .prompt(request.getPrompt())
                    .response(chatResponse)
                    .success(true)
                    .build();
            aiRequestRepository.save(aiReq);
        } catch (Exception e) {
            // log error
        }

        return ResponseEntity.ok(MapResponse.of("response", chatResponse));
    }

    @PostMapping("/complexity")
    public ResponseEntity<?> analyzeComplexity(
            @RequestBody AiExecutionRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        User user = getAuthenticatedUser(userDetails);
        Project project = projectService.getProjectEntity(request.getProjectId(), user)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or access denied"));

        String codeContext = getProjectContext(project);
        String json = aiProvider.analyzeComplexity(
                request.getLanguage(),
                request.getMainFileName(),
                codeContext
        );

        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(json);
    }

    @PostMapping("/testcases")
    public ResponseEntity<?> generateTestCases(
            @RequestBody AiExecutionRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        User user = getAuthenticatedUser(userDetails);
        Project project = projectService.getProjectEntity(request.getProjectId(), user)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or access denied"));

        String codeContext = getProjectContext(project);
        String json = aiProvider.generateTestCases(
                request.getLanguage(),
                request.getMainFileName(),
                codeContext
        );

        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(json);
    }

    @PostMapping("/review")
    public ResponseEntity<?> reviewCode(
            @RequestBody AiExecutionRequest request,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {

        User user = getAuthenticatedUser(userDetails);
        Project project = projectService.getProjectEntity(request.getProjectId(), user)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or access denied"));

        String codeContext = getProjectContext(project);
        String json = aiProvider.reviewCode(
                request.getLanguage(),
                request.getMainFileName(),
                codeContext
        );

        return ResponseEntity.ok()
                .header("Content-Type", "application/json")
                .body(json);
    }

    // Helper map response
    private static class MapResponse extends java.util.HashMap<String, Object> {
        public static MapResponse of(String key, Object val) {
            MapResponse map = new MapResponse();
            map.put(key, val);
            return map;
        }
    }
}
