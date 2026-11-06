package com.airtelsync.backend.application;

import com.airtelsync.backend.persistence.CustomerStore;
import org.springframework.stereotype.Service;

@Service
public class CustomerQueries {
    private final CustomerStore store;
    public CustomerQueries(CustomerStore store) { this.store = store; }
    public <T> CustomerStore.Page<T> list(String subject, String prefix, Class<T> type, int limit, String after) {
        return store.list(subject, prefix, type, limit, after);
    }
}
