package com.devnova.repository;

import com.devnova.model.Project;
import com.devnova.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {
    List<Project> findByOwner(User owner);
    List<Project> findByOwnerOrderByCreatedAtDesc(User owner);
}
