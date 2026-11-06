package com.airtelsync.backend.persistence;

import com.airtelsync.backend.exception.ApiException;
import org.junit.jupiter.api.Test;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.*;
import org.mockito.ArgumentCaptor;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class DynamoDbCustomerStoreTest {
    record Sample(String name) {}
    DynamoDbClient client = mock(DynamoDbClient.class);
    DynamoDbCustomerStore store = new DynamoDbCustomerStore(client, "customers");
    static AttributeValue s(String value) { return AttributeValue.builder().s(value).build(); }
    @Test void queriesUseOwnerKeyAndBoundedCursorWithoutScans() {
        when(client.query(any(QueryRequest.class))).thenReturn(QueryResponse.builder()
            .items(Map.of("payload", s("{\"name\":\"example\"}"), "revision", AttributeValue.builder().n("1").build()))
            .lastEvaluatedKey(Map.of("PK", s("CUSTOMER#alice"), "SK", s("ORDER#two"))).build());
        var page = store.list("alice", "ORDER#", Sample.class, 10, "ORDER#one");
        assertEquals("example", page.items().getFirst().name()); assertEquals("ORDER#two", page.next());
        var captor = ArgumentCaptor.forClass(QueryRequest.class); verify(client).query(captor.capture());
        var request = captor.getValue();
        assertTrue(request.consistentRead()); assertEquals(10, request.limit());
        assertEquals("CUSTOMER#alice", request.expressionAttributeValues().get(":owner").s());
        assertEquals("CUSTOMER#alice", request.exclusiveStartKey().get("PK").s());
        verify(client, never()).scan(any(ScanRequest.class));
    }
    @Test void writesAreOneConditionalTransactionAndUnconditionalRevisionsAreAtomic() {
        store.transact("alice", List.of(CustomerStore.Write.create("ORDER#one", new Sample("order")),
            CustomerStore.Write.replace("KYC", new Sample("kyc"), 4),
            new CustomerStore.Write("PROFILE", new Sample("profile"), null)));
        var captor = ArgumentCaptor.forClass(TransactWriteItemsRequest.class);
        verify(client).transactWriteItems(captor.capture());
        var actions = captor.getValue().transactItems(); assertEquals(3, actions.size());
        assertEquals("attribute_not_exists(PK)", actions.get(0).put().conditionExpression());
        assertEquals("5", actions.get(1).put().item().get("revision").n());
        assertEquals("revision = :expected", actions.get(1).put().conditionExpression());
        assertTrue(actions.get(2).update().updateExpression().contains("ADD revision"));
        assertEquals("CUSTOMER#alice", actions.get(2).update().key().get("PK").s());
    }
    @Test void conditionalFailureMapsToConflictAndCapacityFailuresPropagate() {
        when(client.transactWriteItems(any(TransactWriteItemsRequest.class))).thenThrow(TransactionCanceledException.builder()
            .cancellationReasons(CancellationReason.builder().code("ConditionalCheckFailed").build()).build());
        assertEquals(409, assertThrows(ApiException.class,
            () -> store.transact("alice", List.of(CustomerStore.Write.create("ORDER#one", new Sample("one"))))).status().value());
        when(client.transactWriteItems(any(TransactWriteItemsRequest.class))).thenThrow(TransactionCanceledException.builder()
            .cancellationReasons(CancellationReason.builder().code("ProvisionedThroughputExceeded").build()).build());
        assertThrows(TransactionCanceledException.class,
            () -> store.transact("alice", List.of(CustomerStore.Write.create("ORDER#one", new Sample("one")))));
    }
    @Test void getIsConsistentAndMissingDoesNotExposeAnotherCustomer() {
        when(client.getItem(any(GetItemRequest.class))).thenReturn(GetItemResponse.builder().build());
        assertTrue(store.get("bob", "ORDER#one", Sample.class).isEmpty());
        var captor = ArgumentCaptor.forClass(GetItemRequest.class); verify(client).getItem(captor.capture());
        assertEquals("CUSTOMER#bob", captor.getValue().key().get("PK").s());
        assertTrue(captor.getValue().consistentRead());
    }
}
