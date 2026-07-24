package com.devnova.service;

import com.devnova.dto.FileDto;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@Slf4j
@Service
public class CodeExecutorService {

    @Value("${app.execution.timeoutSeconds:10}")
    private int timeoutSeconds;

    @Value("${app.execution.tempDir}")
    private String baseTempDir;

    public static class ExecutionResult {
        public String status; // "SUCCESS", "COMPILE_ERROR", "RUNTIME_ERROR", "TIMEOUT"
        public int exitCode = -1;
        public String stdout = "";
        public String stderr = "";
        public long durationMs = 0;
    }

    public ExecutionResult executeBatch(String language, List<FileDto> files, String mainFileName, String stdin) {
        ExecutionResult result = new ExecutionResult();
        Path runDir = null;
        try {
            // 1. Create a secure temporary run directory
            Path baseDir = Paths.get(baseTempDir);
            if (!Files.exists(baseDir)) {
                Files.createDirectories(baseDir);
            }
            runDir = Files.createTempDirectory(baseDir, "run_" + UUID.randomUUID() + "_");

            // 2. Write all files to disk in their relative paths
            writeFilesToDisk(runDir, files);

            // 3. Compile (if C++ or Java)
            String compileError = compileIfNeeded(language, runDir, files, mainFileName);
            if (compileError != null) {
                result.status = "COMPILE_ERROR";
                result.stderr = compileError;
                return result;
            }

            // 4. Run Process
            List<String> runCommand = getRunCommand(language, runDir, mainFileName);
            if (runCommand == null) {
                result.status = "RUNTIME_ERROR";
                result.stderr = "Unsupported language: " + language;
                return result;
            }

            ProcessBuilder pb = new ProcessBuilder(runCommand);
            pb.directory(runDir.toFile());
            
            // Set environment variable to make sure execution runs isolated or with standard flags
            pb.environment().put("PAGER", "cat");
            pb.environment().put("PYTHONUNBUFFERED", "1");

            long startTime = System.currentTimeMillis();
            Process process = pb.start();

            // Feed stdin
            if (stdin != null && !stdin.isEmpty()) {
                try (BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(process.getOutputStream()))) {
                    writer.write(stdin);
                    writer.flush();
                }
            } else {
                process.getOutputStream().close();
            }

            // Capture outputs asynchronously
            StreamGobbler stdoutGobbler = new StreamGobbler(process.getInputStream());
            StreamGobbler stderrGobbler = new StreamGobbler(process.getErrorStream());
            stdoutGobbler.start();
            stderrGobbler.start();

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            long endTime = System.currentTimeMillis();
            result.durationMs = endTime - startTime;

            if (!finished) {
                process.destroyForcibly();
                stdoutGobbler.join(1000);
                stderrGobbler.join(1000);
                result.stdout = stdoutGobbler.getResult();
                String capturedStderr = stderrGobbler.getResult();
                result.status = "TIMEOUT";
                result.stderr = (capturedStderr.isEmpty() ? "" : capturedStderr + "\n") + "Execution timed out after " + timeoutSeconds + " seconds.";
            } else {
                result.exitCode = process.exitValue();
                stdoutGobbler.join(1000);
                stderrGobbler.join(1000);
                result.stdout = stdoutGobbler.getResult();
                result.stderr = stderrGobbler.getResult();
                if (result.exitCode == 0) {
                    result.status = "SUCCESS";
                } else {
                    result.status = "RUNTIME_ERROR";
                }
            }

        } catch (Exception e) {
            log.error("Error executing code", e);
            result.status = "RUNTIME_ERROR";
            result.stderr = "Internal Error: " + e.getMessage();
        } finally {
            // Clean up files in workspace
            if (runDir != null) {
                deleteDir(runDir.toFile());
            }
        }
        return result;
    }

    public Process startInteractiveProcess(String language, Path runDir, List<FileDto> files, String mainFileName) throws Exception {
        // Write files
        writeFilesToDisk(runDir, files);

        // Compile
        String compileError = compileIfNeeded(language, runDir, files, mainFileName);
        if (compileError != null) {
            throw new CompileException(compileError);
        }

        // Run
        List<String> runCommand = getRunCommand(language, runDir, mainFileName);
        if (runCommand == null) {
            throw new IllegalArgumentException("Unsupported language: " + language);
        }

        ProcessBuilder pb = new ProcessBuilder(runCommand);
        pb.directory(runDir.toFile());
        pb.environment().put("PYTHONUNBUFFERED", "1");
        return pb.start();
    }

    public static class CompileException extends Exception {
        public CompileException(String message) {
            super(message);
        }
    }

    private void writeFilesToDisk(Path runDir, List<FileDto> files) throws IOException {
        for (FileDto f : files) {
            Path fileDir = runDir;
            if (f.getPath() != null && !f.getPath().trim().isEmpty()) {
                fileDir = runDir.resolve(f.getPath());
                Files.createDirectories(fileDir);
            }
            Path filePath = fileDir.resolve(f.getName());
            Files.writeString(filePath, f.getContent() != null ? f.getContent() : "");
        }
    }

    private String compileIfNeeded(String language, Path runDir, List<FileDto> files, String mainFileName) throws Exception {
        if ("cpp".equalsIgnoreCase(language) || "c++".equalsIgnoreCase(language)) {
            // Compile all .cpp files
            List<String> cppFiles = Files.walk(runDir)
                    .filter(Files::isRegularFile)
                    .map(Path::toString)
                    .filter(name -> name.endsWith(".cpp") || name.endsWith(".cc"))
                    .collect(Collectors.toList());

            if (cppFiles.isEmpty()) {
                return "No C++ source files (.cpp or .cc) found to compile.";
            }

            List<String> compileCmd = new ArrayList<>();
            compileCmd.add("g++");
            compileCmd.add("-std=c++20");
            compileCmd.addAll(cppFiles);
            compileCmd.add("-o");
            compileCmd.add("program.exe");

            return runCompilerProcess(compileCmd, runDir);

        } else if ("java".equalsIgnoreCase(language)) {
            // Compile all .java files
            List<String> javaFiles = Files.walk(runDir)
                    .filter(Files::isRegularFile)
                    .map(Path::toString)
                    .filter(name -> name.endsWith(".java"))
                    .collect(Collectors.toList());

            if (javaFiles.isEmpty()) {
                return "No Java source files (.java) found to compile.";
            }

            List<String> compileCmd = new ArrayList<>();
            compileCmd.add("javac");
            compileCmd.add("-d");
            compileCmd.add("."); // Compile outputs classes in directory root
            compileCmd.addAll(javaFiles);

            return runCompilerProcess(compileCmd, runDir);
        }
        return null; // Interpreted languages don't compile
    }

    private String runCompilerProcess(List<String> command, Path runDir) throws Exception {
        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(runDir.toFile());
        Process process = pb.start();

        StreamGobbler stderrGobbler = new StreamGobbler(process.getErrorStream());
        StreamGobbler stdoutGobbler = new StreamGobbler(process.getInputStream());
        stderrGobbler.start();
        stdoutGobbler.start();

        boolean finished = process.waitFor(15, TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            return "Compilation timed out after 15 seconds.";
        }

        if (process.exitValue() != 0) {
            stderrGobbler.join(1000);
            stdoutGobbler.join(1000);
            return stderrGobbler.getResult() + "\n" + stdoutGobbler.getResult();
        }

        return null; // Compilation Success
    }

    private List<String> getRunCommand(String language, Path runDir, String mainFileName) {
        List<String> cmd = new ArrayList<>();
        if ("python".equalsIgnoreCase(language) || "py".equalsIgnoreCase(language)) {
            cmd.add("python");
            cmd.add("-u");
            cmd.add(mainFileName);
            return cmd;
        } else if ("javascript".equalsIgnoreCase(language) || "js".equalsIgnoreCase(language)) {
            cmd.add("node");
            cmd.add(mainFileName);
            return cmd;
        } else if ("cpp".equalsIgnoreCase(language) || "c++".equalsIgnoreCase(language)) {
            cmd.add(runDir.resolve("program.exe").toString());
            return cmd;
        } else if ("java".equalsIgnoreCase(language)) {
            // Find class name from Main class file name, usually Main.java -> Main
            String className = mainFileName.endsWith(".java") 
                    ? mainFileName.substring(0, mainFileName.length() - 5) 
                    : mainFileName;
            cmd.add("java");
            cmd.add(className);
            return cmd;
        }
        return null;
    }

    public void deleteDir(File file) {
        File[] contents = file.listFiles();
        if (contents != null) {
            for (File f : contents) {
                deleteDir(f);
            }
        }
        file.delete();
    }

    private static class StreamGobbler extends Thread {
        private final InputStream is;
        private final ByteArrayOutputStream bos = new ByteArrayOutputStream();

        public StreamGobbler(InputStream is) {
            this.is = is;
        }

        @Override
        public void run() {
            try (InputStream input = is) {
                byte[] buffer = new byte[1024];
                int len;
                while ((len = input.read(buffer)) != -1) {
                    bos.write(buffer, 0, len);
                }
            } catch (IOException e) {
                // Ignore stream closed exceptions
            }
        }

        public String getResult() {
            return bos.toString(StandardCharsets.UTF_8);
        }
    }
}
