package com.airtelsync.backend.persistence;

import java.util.List;
import java.util.Optional;

/** All keys are scoped by authenticated subject; writes are atomic per transaction. */
public interface CustomerStore {
    record Stored<T>(long version, T value) {}
    record Page<T>(List<T> items, String next) {}
    // expectedVersion: null = unconditional, 0 = must not exist, positive = compare-and-set.
    record Write(String key, Object value, Long expectedVersion) {
        public static Write create(String key, Object value) { return new Write(key, value, 0L); }
        public static Write replace(String key, Object value, long version) { return new Write(key, value, version); }
    }
    <T> Optional<Stored<T>> get(String subject, String key, Class<T> type);
    <T> Page<T> list(String subject, String prefix, Class<T> type, int limit, String after);
    void transact(String subject, List<Write> writes);
}
