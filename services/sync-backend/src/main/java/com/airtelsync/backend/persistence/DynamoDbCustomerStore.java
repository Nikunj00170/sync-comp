package com.airtelsync.backend.persistence;

import com.airtelsync.backend.exception.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;
import java.util.*;

@Repository
@ConditionalOnProperty(name = "sync.storage", havingValue = "dynamodb")
public class DynamoDbCustomerStore implements CustomerStore {
    private final DynamoDbClient client;
    private final String table;
    private final ObjectMapper json = new ObjectMapper();
    public DynamoDbCustomerStore(DynamoDbClient client, @Value("${SYNC_DYNAMODB_TABLE}") String table) {
        if (table.isBlank()) throw new IllegalArgumentException("SYNC_DYNAMODB_TABLE is required");
        this.client = client; this.table = table;
    }
    private static AttributeValue text(String value) { return AttributeValue.builder().s(value).build(); }
    private static AttributeValue number(long value) { return AttributeValue.builder().n(Long.toString(value)).build(); }
    private Map<String, AttributeValue> key(String subject, String key) {
        return Map.of("PK", text("CUSTOMER#" + subject), "SK", text(key));
    }
    public <T> Optional<Stored<T>> get(String subject, String key, Class<T> type) {
        var item = client.getItem(GetItemRequest.builder().tableName(table).key(key(subject, key)).consistentRead(true).build()).item();
        return item.isEmpty() ? Optional.empty() : Optional.of(decode(item, type));
    }
    public <T> Page<T> list(String subject, String prefix, Class<T> type, int limit, String after) {
        InMemoryCustomerStore.validatePage(prefix, limit, after);
        var request = QueryRequest.builder().tableName(table).consistentRead(true).limit(limit)
            .keyConditionExpression("PK = :owner AND begins_with(SK, :prefix)")
            .expressionAttributeValues(Map.of(":owner", text("CUSTOMER#" + subject), ":prefix", text(prefix)));
        if (after != null) request.exclusiveStartKey(key(subject, after));
        var result = client.query(request.build());
        String next = result.hasLastEvaluatedKey() && !result.lastEvaluatedKey().isEmpty() ? result.lastEvaluatedKey().get("SK").s() : null;
        return new Page<>(result.items().stream().map(item -> decode(item, type).value()).toList(), next);
    }
    private <T> Stored<T> decode(Map<String, AttributeValue> item, Class<T> type) {
        try { return new Stored<>(Long.parseLong(item.get("revision").n()), json.readValue(item.get("payload").s(), type)); }
        catch (Exception ex) { throw new IllegalStateException("Stored customer record cannot be decoded", ex); }
    }
    public void transact(String subject, List<Write> writes) {
        if (writes.isEmpty() || writes.size() > 100 || writes.stream().map(Write::key).distinct().count() != writes.size())
            throw new IllegalArgumentException("Invalid transaction");
        var operations = new ArrayList<TransactWriteItem>();
        for (var write : writes) {
            String payload;
            try { payload = json.writeValueAsString(write.value()); }
            catch (Exception ex) { throw new IllegalStateException("Customer record cannot be encoded", ex); }
            if (payload.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 350000)
                throw new IllegalArgumentException("Customer record is too large");
            if (write.expectedVersion() == null) {
                // Atomic ADD avoids repeated revisions during concurrent unconditional saves.
                operations.add(TransactWriteItem.builder().update(Update.builder().tableName(table).key(key(subject, write.key()))
                    .updateExpression("SET payload = :payload ADD revision :one")
                    .expressionAttributeValues(Map.of(":payload", text(payload), ":one", number(1))).build()).build());
            } else {
                long version = write.expectedVersion();
                var item = new HashMap<>(key(subject, write.key()));
                item.put("payload", text(payload)); item.put("revision", number(version + 1));
                var put = Put.builder().tableName(table).item(item);
                if (version == 0) put.conditionExpression("attribute_not_exists(PK)");
                else put.conditionExpression("revision = :expected").expressionAttributeValues(Map.of(":expected", number(version)));
                operations.add(TransactWriteItem.builder().put(put.build()).build());
            }
        }
        try {
            client.transactWriteItems(TransactWriteItemsRequest.builder().transactItems(operations)
                .clientRequestToken(UUID.randomUUID().toString()).build());
        } catch (TransactionCanceledException ex) {
            boolean conflict = ex.cancellationReasons().stream().anyMatch(r ->
                "ConditionalCheckFailed".equals(r.code()) || "TransactionConflict".equals(r.code()));
            if (conflict) throw ApiException.conflict("The record changed. Refresh and retry.");
            throw ex;
        }
    }
}
