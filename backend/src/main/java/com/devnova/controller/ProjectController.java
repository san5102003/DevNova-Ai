package com.devnova.controller;

import com.devnova.dto.FileDto;
import com.devnova.dto.MessageResponse;
import com.devnova.dto.ProjectDto;
import com.devnova.model.Execution;
import com.devnova.model.Project;
import com.devnova.model.User;
import com.devnova.repository.ExecutionRepository;
import com.devnova.repository.UserRepository;
import com.devnova.security.services.UserDetailsImpl;
import com.devnova.service.CodeExecutorService;
import com.devnova.service.ProjectService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private ProjectService projectService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CodeExecutorService codeExecutorService;

    @Autowired
    private ExecutionRepository executionRepository;

    private User getAuthenticatedUser(UserDetailsImpl userDetails) {
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new IllegalArgumentException("Authenticated user not found"));
    }

    @GetMapping
    public ResponseEntity<List<ProjectDto>> getAllProjects(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getAuthenticatedUser(userDetails);
        return ResponseEntity.ok(projectService.getProjectsByOwner(user));
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<?> getProject(@PathVariable UUID projectId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getAuthenticatedUser(userDetails);
        return projectService.getProjectDto(projectId, user)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(404).body(new MessageResponse("Project not found or access denied")));
    }

    @PostMapping
    public ResponseEntity<ProjectDto> createProject(@RequestBody Map<String, String> request, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getAuthenticatedUser(userDetails);
        String name = request.getOrDefault("name", "New Project");
        String description = request.getOrDefault("description", "");
        String language = request.getOrDefault("language", "python");
        return ResponseEntity.ok(projectService.createProject(name, description, language, user));
    }

    @DeleteMapping("/{projectId}")
    public ResponseEntity<?> deleteProject(@PathVariable UUID projectId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getAuthenticatedUser(userDetails);
        try {
            projectService.deleteProject(projectId, user);
            return ResponseEntity.ok(new MessageResponse("Project deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @PostMapping("/{projectId}/files")
    public ResponseEntity<?> saveFile(@PathVariable UUID projectId, @RequestBody FileDto fileDto, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getAuthenticatedUser(userDetails);
        try {
            FileDto savedFile = projectService.createOrUpdateFile(projectId, fileDto, user);
            return ResponseEntity.ok(savedFile);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @DeleteMapping("/{projectId}/files/{fileId}")
    public ResponseEntity<?> deleteFile(@PathVariable UUID projectId, @PathVariable UUID fileId, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getAuthenticatedUser(userDetails);
        try {
            projectService.deleteFile(projectId, fileId, user);
            return ResponseEntity.ok(new MessageResponse("File deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        }
    }

    @Data
    public static class RunRequest {
        private String language;
        private String mainFileName;
        private String stdin;
    }

    @PostMapping("/{projectId}/run")
    public ResponseEntity<?> runProjectCode(@PathVariable UUID projectId, @RequestBody RunRequest runRequest, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        User user = getAuthenticatedUser(userDetails);
        
        Project project = projectService.getProjectEntity(projectId, user)
                .orElseThrow(() -> new IllegalArgumentException("Project not found or access denied"));

        List<FileDto> files = project.getFiles().stream()
                .map(f -> FileDto.builder()
                        .name(f.getName())
                        .path(f.getPath())
                        .content(f.getContent())
                        .build())
                .toList();

        CodeExecutorService.ExecutionResult executionResult = codeExecutorService.executeBatch(
                runRequest.getLanguage(),
                files,
                runRequest.getMainFileName(),
                runRequest.getStdin()
        );

        // Record execution in Database
        Execution executionRecord = Execution.builder()
                .project(project)
                .user(user)
                .language(runRequest.getLanguage())
                .status(executionResult.status)
                .exitCode(executionResult.exitCode)
                .stdout(executionResult.stdout)
                .stderr(executionResult.stderr)
                .durationMs(executionResult.durationMs)
                .build();
        executionRepository.save(executionRecord);

        return ResponseEntity.ok(executionResult);
    }
}
