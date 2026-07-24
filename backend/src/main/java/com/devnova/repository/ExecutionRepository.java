package com.devnova.repository;

import com.devnova.model.Execution;
import com.devnova.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExecutionRepository extends JpaRepository<Execution, UUID> {
    List<Execution> findByUserOrderByCreatedAtDesc(User user);
}
