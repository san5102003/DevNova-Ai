package com.devnova.websocket;

import com.devnova.dto.FileDto;
import com.devnova.model.Execution;
import com.devnova.model.Project;
import com.devnova.model.User;
import com.devnova.repository.ExecutionRepository;
import com.devnova.repository.UserRepository;
import com.devnova.security.jwt.JwtUtils;
import com.devnova.service.CodeExecutorService;
import com.devnova.service.ProjectService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class InteractiveExecutionHandler extends TextWebSocketHandler {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProjectService projectService;

    @Autowired
    private CodeExecutorService codeExecutorService;

    @Autowired
    private ExecutionRepository executionRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.execution.tempDir}")
    private String baseTempDir;

    @Value("${app.execution.timeoutSeconds:10}")
    private int timeoutSeconds;

    private static class ActiveProcess {
        Process process;
        BufferedWriter stdinWriter;
        Path runDir;
        Thread stdoutGobbler;
        Thread stderrGobbler;
        UUID projectId;
        User user;
        String language;
        long startTime;
        ByteArrayOutputStream stdoutCapture = new ByteArrayOutputStream();
        ByteArrayOutputStream stderrCapture = new ByteArrayOutputStream();
    }

    private final Map<String, ActiveProcess> activeProcesses = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("WebSocket connection established: {}", session.getId());
        
        // Extract token from query parameter
        String query = session.getUri().getQuery();
        String token = UriComponentsBuilder.fromUri(session.getUri()).build().getQueryParams().getFirst("token");

        if (token == null || !jwtUtils.validateJwtToken(token)) {
            sendError(session, "Unauthorized: Invalid or missing token.");
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        String username = jwtUtils.getUsernameFromJwtToken(token);
        User user = userRepository.findByUsername(username).orElse(null);
        if (user == null) {
            sendError(session, "User not found.");
            session.close(CloseStatus.POLICY_VIOLATION);
            return;
        }

        session.getAttributes().put("user", user);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        User user = (User) session.getAttributes().get("user");
        if (user == null) {
            sendError(session, "Unauthorized user context.");
            return;
        }

        Map<String, Object> payload;
        try {
            payload = objectMapper.readValue(message.getPayload(), Map.class);
        } catch (Exception e) {
            sendError(session, "Invalid JSON payload: " + e.getMessage());
            return;
        }

        String type = (String) payload.get("type");
        if (type == null) {
            sendError(session, "Missing event 'type' parameter.");
            return;
        }

        switch (type.toUpperCase()) {
            case "START":
                handleStart(session, payload, user);
                break;
            case "INPUT":
                handleInput(session, payload);
                break;
            case "STOP":
                handleStop(session);
                break;
            default:
                sendError(session, "Unknown event type: " + type);
        }
    }

    private void handleStart(WebSocketSession session, Map<String, Object> payload, User user) {
        String projectIdStr = (String) payload.get("projectId");
        String language = (String) payload.get("language");
        String mainFileName = (String) payload.get("mainFileName");

        if (projectIdStr == null || language == null || mainFileName == null) {
            sendError(session, "Missing START parameters: projectId, language, or mainFileName.");
            return;
        }

        UUID projectId = UUID.fromString(projectIdStr);

        // Stop any running process for this session first
        cleanupSessionProcess(session.getId());

        Project project = projectService.getProjectEntity(projectId, user).orElse(null);
        if (project == null) {
            sendError(session, "Project not found or access denied.");
            return;
        }

        List<FileDto> files = project.getFiles().stream()
                .map(f -> FileDto.builder()
                        .name(f.getName())
                        .path(f.getPath())
                        .content(f.getContent())
                        .build())
                .toList();

        try {
            Path baseDir = Paths.get(baseTempDir);
            if (!Files.exists(baseDir)) {
                Files.createDirectories(baseDir);
            }
            Path runDir = Files.createTempDirectory(baseDir, "run_ws_" + session.getId() + "_");

            sendMessage(session, Map.of("type", "STATUS", "data", "Compiling and launching..."));

            Process process = codeExecutorService.startInteractiveProcess(language, runDir, files, mainFileName);
            BufferedWriter stdinWriter = new BufferedWriter(new OutputStreamWriter(process.getOutputStream(), StandardCharsets.UTF_8));

            ActiveProcess ap = new ActiveProcess();
            ap.process = process;
            ap.stdinWriter = stdinWriter;
            ap.runDir = runDir;
            ap.projectId = projectId;
            ap.user = user;
            ap.language = language;
            ap.startTime = System.currentTimeMillis();

            // Spawn output capture threads
            ap.stdoutGobbler = new Thread(() -> streamOutput(session, process.getInputStream(), "STDOUT", ap.stdoutCapture));
            ap.stderrGobbler = new Thread(() -> streamOutput(session, process.getErrorStream(), "STDERR", ap.stderrCapture));

            ap.stdoutGobbler.start();
            ap.stderrGobbler.start();

            activeProcesses.put(session.getId(), ap);

            // Watchdog thread to monitor execution limits
            new Thread(() -> monitorProcess(session, session.getId(), ap)).start();

        } catch (CodeExecutorService.CompileException ce) {
            sendMessage(session, Map.of("type", "COMPILE_ERROR", "data", ce.getMessage()));
            cleanupSessionProcess(session.getId());
        } catch (Exception e) {
            log.error("Failed to start process", e);
            sendError(session, "Runtime process start failed: " + e.getMessage());
            cleanupSessionProcess(session.getId());
        }
    }

    private void handleInput(WebSocketSession session, Map<String, Object> payload) {
        ActiveProcess ap = activeProcesses.get(session.getId());
        if (ap == null || ap.process == null || !ap.process.isAlive()) {
            sendError(session, "No active running process to send input to.");
            return;
        }

        String data = (String) payload.get("data");
        if (data == null) return;

        try {
            ap.stdinWriter.write(data);
            ap.stdinWriter.flush();
        } catch (IOException e) {
            log.error("Failed to write to process stdin", e);
            sendError(session, "Failed to feed stdin: " + e.getMessage());
        }
    }

    private void handleStop(WebSocketSession session) {
        sendMessage(session, Map.of("type", "STATUS", "data", "Execution stopped by user."));
        cleanupSessionProcess(session.getId());
    }

    private void monitorProcess(WebSocketSession session, String sessionId, ActiveProcess ap) {
        try {
            boolean finished = ap.process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            long duration = System.currentTimeMillis() - ap.startTime;

            if (!finished) {
                ap.process.destroyForcibly();
                sendMessage(session, Map.of(
                        "type", "TIMEOUT",
                        "data", "Execution timed out after " + timeoutSeconds + " seconds."
                ));
                saveExecutionRecord(ap, "TIMEOUT", -1, duration);
            } else {
                int exitCode = ap.process.exitValue();
                ap.stdoutGobbler.join(1000);
                ap.stderrGobbler.join(1000);

                sendMessage(session, Map.of(
                        "type", "COMPLETE",
                        "exitCode", exitCode,
                        "durationMs", duration
                ));
                
                String status = exitCode == 0 ? "SUCCESS" : "RUNTIME_ERROR";
                saveExecutionRecord(ap, status, exitCode, duration);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        } catch (Exception e) {
            log.error("Error monitoring process", e);
        } finally {
            cleanupSessionProcess(sessionId);
        }
    }

    private void saveExecutionRecord(ActiveProcess ap, String status, int exitCode, long durationMs) {
        try {
            Project project = projectService.getProjectEntity(ap.projectId, ap.user).orElse(null);
            if (project != null) {
                Execution record = Execution.builder()
                        .project(project)
                        .user(ap.user)
                        .language(ap.language)
                        .status(status)
                        .exitCode(exitCode)
                        .stdout(ap.stdoutCapture.toString(StandardCharsets.UTF_8))
                        .stderr(ap.stderrCapture.toString(StandardCharsets.UTF_8))
                        .durationMs(durationMs)
                        .build();
                executionRepository.save(record);
            }
        } catch (Exception e) {
            log.error("Failed to save execution audit record", e);
        }
    }

    private void streamOutput(WebSocketSession session, InputStream is, String type, ByteArrayOutputStream captureStream) {
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            char[] buffer = new char[1024];
            int read;
            while ((read = reader.read(buffer)) != -1) {
                String output = new String(buffer, 0, read);
                captureStream.write(output.getBytes(StandardCharsets.UTF_8));
                if (session.isOpen()) {
                    sendMessage(session, Map.of("type", type, "data", output));
                }
            }
        } catch (IOException e) {
            // Stream closed
        }
    }

    private void cleanupSessionProcess(String sessionId) {
        ActiveProcess ap = activeProcesses.remove(sessionId);
        if (ap != null) {
            if (ap.process != null && ap.process.isAlive()) {
                ap.process.destroyForcibly();
            }
            try {
                if (ap.stdinWriter != null) ap.stdinWriter.close();
            } catch (IOException e) {
                // Ignore
            }
            if (ap.runDir != null) {
                codeExecutorService.deleteDir(ap.runDir.toFile());
            }
        }
    }

    private synchronized void sendMessage(WebSocketSession session, Map<String, Object> messagePayload) {
        if (!session.isOpen()) return;
        try {
            String json = objectMapper.writeValueAsString(messagePayload);
            session.sendMessage(new TextMessage(json));
        } catch (IOException e) {
            log.error("Error writing WebSocket message", e);
        }
    }

    private void sendError(WebSocketSession session, String errorMessage) {
        sendMessage(session, Map.of("type", "ERROR", "data", errorMessage));
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        log.info("WebSocket connection closed: {}", session.getId());
        cleanupSessionProcess(session.getId());
    }
}
