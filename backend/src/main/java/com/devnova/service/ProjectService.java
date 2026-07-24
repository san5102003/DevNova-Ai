package com.devnova.service;

import com.devnova.dto.FileDto;
import com.devnova.dto.ProjectDto;
import com.devnova.model.Project;
import com.devnova.model.ProjectFile;
import com.devnova.model.User;
import com.devnova.repository.ProjectFileRepository;
import com.devnova.repository.ProjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class ProjectService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectFileRepository projectFileRepository;

    @Transactional
    public ProjectDto createProject(String name, String description, String language, User owner) {
        Project project = Project.builder()
                .name(name)
                .description(description)
                .owner(owner)
                .build();

        String fileName = "main.py";
        String content = "print(\"Hello, DevNova AI!\")\n";

        if (language != null) {
            String langLower = language.toLowerCase().trim();
            if (langLower.equals("java")) {
                fileName = "Main.java";
                content = "public class Main {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, DevNova AI!\");\n    }\n}\n";
            } else if (langLower.equals("cpp") || langLower.equals("c++")) {
                fileName = "main.cpp";
                content = "#include <iostream>\n\nint main() {\n    std::cout << \"Hello, DevNova AI!\" << std::endl;\n    return 0;\n}\n";
            } else if (langLower.equals("javascript") || langLower.equals("js")) {
                fileName = "index.js";
                content = "console.log(\"Hello, DevNova AI!\");\n";
            }
        }

        // Create a default starter file
        ProjectFile defaultFile = ProjectFile.builder()
                .name(fileName)
                .path("")
                .content(content)
                .project(project)
                .build();

        project.getFiles().add(defaultFile);
        Project savedProject = projectRepository.save(project);
        return mapToDto(savedProject);
    }

    public List<ProjectDto> getProjectsByOwner(User owner) {
        return projectRepository.findByOwnerOrderByCreatedAtDesc(owner).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public Optional<Project> getProjectEntity(UUID projectId, User owner) {
        return projectRepository.findById(projectId)
                .filter(p -> p.getOwner().getId().equals(owner.getId()));
    }

    public Optional<ProjectDto> getProjectDto(UUID projectId, User owner) {
        return getProjectEntity(projectId, owner).map(this::mapToDto);
    }

    @Transactional
    public void deleteProject(UUID projectId, User owner) {
        Project project = projectRepository.findById(projectId)
                .filter(p -> p.getOwner().getId().equals(owner.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Project not found or access denied"));
        projectRepository.delete(project);
    }

    @Transactional
    public FileDto createOrUpdateFile(UUID projectId, FileDto fileDto, User owner) {
        Project project = projectRepository.findById(projectId)
                .filter(p -> p.getOwner().getId().equals(owner.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Project not found or access denied"));

        Optional<ProjectFile> existingFile = projectFileRepository.findByProjectIdAndPathAndName(
                projectId, fileDto.getPath(), fileDto.getName());

        ProjectFile file;
        if (existingFile.isPresent()) {
            file = existingFile.get();
            file.setContent(fileDto.getContent());
        } else {
            file = ProjectFile.builder()
                    .name(fileDto.getName())
                    .path(fileDto.getPath() == null ? "" : fileDto.getPath())
                    .content(fileDto.getContent() == null ? "" : fileDto.getContent())
                    .project(project)
                    .build();
        }

        ProjectFile savedFile = projectFileRepository.save(file);
        return mapToFileDto(savedFile);
    }

    @Transactional
    public void deleteFile(UUID projectId, UUID fileId, User owner) {
        Project project = projectRepository.findById(projectId)
                .filter(p -> p.getOwner().getId().equals(owner.getId()))
                .orElseThrow(() -> new IllegalArgumentException("Project not found or access denied"));

        ProjectFile file = projectFileRepository.findById(fileId)
                .filter(f -> f.getProject().getId().equals(project.getId()))
                .orElseThrow(() -> new IllegalArgumentException("File not found in this project"));

        projectFileRepository.delete(file);
    }

    public ProjectDto mapToDto(Project project) {
        return ProjectDto.builder()
                .id(project.getId())
                .name(project.getName())
                .description(project.getDescription())
                .ownerId(project.getOwner().getId())
                .ownerUsername(project.getOwner().getUsername())
                .files(project.getFiles().stream().map(this::mapToFileDto).collect(Collectors.toList()))
                .createdAt(project.getCreatedAt())
                .updatedAt(project.getUpdatedAt())
                .build();
    }

    private FileDto mapToFileDto(ProjectFile file) {
        return FileDto.builder()
                .id(file.getId())
                .name(file.getName())
                .content(file.getContent())
                .path(file.getPath())
                .build();
    }
}
