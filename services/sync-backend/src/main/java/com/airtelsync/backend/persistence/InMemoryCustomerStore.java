package com.airtelsync.backend.persistence;

import com.airtelsync.backend.exception.ApiException;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Repository
@ConditionalOnProperty(name = "sync.storage", havingValue = "memory", matchIfMissing = true)
public class InMemoryCustomerStore implements CustomerStore {
    private final Map<String, NavigableMap<String, Stored<Object>>> customers = new ConcurrentHashMap<>();

    public <T> Optional<Stored<T>> get(String subject, String key, Class<T> type) {
        var records = customers.get(subject);
        if (records == null) return Optional.empty();
        synchronized (records) {
            var found = records.get(key);
            return found == null ? Optional.empty() : Optional.of(new Stored<>(found.version(), type.cast(found.value())));
        }
    }

    public <T> Page<T> list(String subject, String prefix, Class<T> type, int limit, String after) {
        validatePage(prefix, limit, after);
        var records = customers.get(subject);
        if (records == null) return new Page<>(List.of(), null);
        synchronized (records) {
            var matching = records.keySet().stream().filter(k -> k.startsWith(prefix))
                .filter(k -> after == null || k.compareTo(after) > 0).limit(limit + 1L).toList();
            var keys = matching.stream().limit(limit).toList();
            return new Page<>(keys.stream().map(k -> type.cast(records.get(k).value())).toList(),
                matching.size() > limit ? keys.getLast() : null);
        }
    }

    public static void validatePage(String prefix, int limit, String after) {
        if (limit < 1 || limit > 100 || (after != null && (!after.startsWith(prefix) || after.length() > 200)))
            throw new IllegalArgumentException("Invalid pagination parameters");
    }

    public void transact(String subject, List<Write> writes) {
        if (writes.isEmpty() || writes.size() > 100 || writes.stream().map(Write::key).distinct().count() != writes.size())
            throw new IllegalArgumentException("Invalid transaction");
        var records = customers.computeIfAbsent(subject, ignored -> new TreeMap<>());
        synchronized (records) {
            for (var write : writes) {
                var current = records.get(write.key());
                long version = current == null ? 0 : current.version();
                if (write.expectedVersion() != null && write.expectedVersion() != version)
                    throw ApiException.conflict("The record changed. Refresh and retry.");
            }
            for (var write : writes) {
                var current = records.get(write.key());
                records.put(write.key(), new Stored<>(current == null ? 1 : current.version() + 1, write.value()));
            }
        }
    }
}
