package com.mediTek.MediTek.repository;

import com.mediTek.MediTek.domain.Person;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

/**
 * Repository for the abstract Person entity.
 */
@Repository
public interface PersonRepository extends JpaRepository<Person, String> {
    Optional<Person> findByEmail(String email);
}

