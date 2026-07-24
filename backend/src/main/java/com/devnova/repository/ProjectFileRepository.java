package com.devnova.repository;

import com.devnova.model.Project;
import com.devnova.model.ProjectFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectFileRepository extends JpaRepository<ProjectFile, UUID> {
    List<ProjectFile> findByProject(Project project);
    Optional<ProjectFile> findByProjectIdAndPathAndName(UUID projectId, String path, String name);
}
