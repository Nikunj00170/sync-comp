package com.airtelsync.backend.persistence;

import com.airtelsync.backend.exception.ApiException;
import org.junit.jupiter.api.Test;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;

class CustomerStoreTest {
    @Test void failedConditionRollsBackEveryWrite() {
        var store = new InMemoryCustomerStore();
        store.transact("a", List.of(CustomerStore.Write.create("ORDER#1", "first")));
        assertThrows(ApiException.class, () -> store.transact("a", List.of(
            CustomerStore.Write.create("INVOICE#1", "invoice"), CustomerStore.Write.create("ORDER#1", "other"))));
        assertTrue(store.get("a", "INVOICE#1", String.class).isEmpty());
        assertTrue(store.get("b", "ORDER#1", String.class).isEmpty());
    }
    @Test void onlyOneConcurrentWriterCanClaimAKey() throws Exception {
        var store = new InMemoryCustomerStore();
        var wins = new AtomicInteger();
        try (var executor = Executors.newFixedThreadPool(8)) {
            var tasks = java.util.stream.IntStream.range(0, 24).<Callable<Void>>mapToObj(i -> () -> {
                try {
                    store.transact("a", List.of(CustomerStore.Write.create("ORDER#1", "order"),
                        CustomerStore.Write.create("INVOICE#1", "invoice")));
                    wins.incrementAndGet();
                } catch (ApiException expected) { assertEquals(409, expected.status().value()); }
                return null;
            }).toList();
            for (var result : executor.invokeAll(tasks)) result.get();
        }
        assertEquals(1, wins.get());
        assertEquals(1, store.list("a", "INVOICE#", String.class, 100, null).items().size());
    }
}
