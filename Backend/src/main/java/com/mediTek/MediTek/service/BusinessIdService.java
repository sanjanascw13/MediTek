package com.mediTek.MediTek.service;

import com.mediTek.MediTek.domain.IdCounter;
import com.mediTek.MediTek.repository.IdCounterRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class BusinessIdService {

    private final IdCounterRepository idCounterRepository;

    public BusinessIdService(IdCounterRepository idCounterRepository) {
        this.idCounterRepository = idCounterRepository;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String nextId(String counterName, String prefix) {
        IdCounter counter = idCounterRepository.findByEntityNameForUpdate(counterName)
                .orElseThrow(() -> new IllegalStateException(
                        "No business ID counter is configured for " + counterName + "."));
        long allocated = counter.getNextId();
        counter.setNextId(allocated + 1);
        idCounterRepository.save(counter);
        return String.format(Locale.ROOT, "%s-%06d", prefix, allocated);
    }
}
