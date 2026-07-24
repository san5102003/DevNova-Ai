package com.devnova.repository;

import com.devnova.model.AiRequest;
import com.devnova.model.Project;
import com.devnova.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AiRequestRepository extends JpaRepository<AiRequest, UUID> {
    List<AiRequest> findByUserOrderByCreatedAtDesc(User user);
    List<AiRequest> findByProjectOrderByCreatedAtAsc(Project project);
}
