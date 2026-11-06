package com.airtelsync.backend.domain.quote;

import com.airtelsync.backend.domain.TestFixtures;
import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.Kyc;
import com.airtelsync.backend.domain.model.Order;
import com.airtelsync.backend.domain.model.OrderStatus;
import com.airtelsync.backend.domain.model.Profile;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import com.airtelsync.backend.TestcontainersConfiguration;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class OrderServiceTest {

    @Autowired
    private OrderService orderService;

    @Autowired
    private QuoteService quoteService;

    @Test
    void makeOrderRequiresVerifiedKyc() {
        List<CartLine> lines = TestFixtures.basicCart();
        Profile profile = TestFixtures.demoProfile();
        Kyc unverified = TestFixtures.unverifiedKyc();

        assertThrows(IllegalArgumentException.class,
            () -> orderService.makeOrder(lines, profile, unverified));
    }

    @Test
    void makeOrderRequiresNonEmptyCart() {
        Profile profile = TestFixtures.demoProfile();
        Kyc verified = TestFixtures.verifiedKyc();

        assertThrows(IllegalArgumentException.class,
            () -> orderService.makeOrder(List.of(), profile, verified));
    }

    @Test
    void makeOrderRequiresValidQuote() {
        Profile profile = TestFixtures.demoProfile();
        Kyc verified = TestFixtures.verifiedKyc();
        List<CartLine> lines = List.of(new CartLine("P01", 0)); // invalid quantity

        assertThrows(IllegalArgumentException.class,
            () -> orderService.makeOrder(lines, profile, verified));
    }

    @Test
    void makeOrderCreatesValidOrder() {
        List<CartLine> lines = TestFixtures.basicCart();
        Profile profile = TestFixtures.demoProfile();
        Kyc verified = TestFixtures.verifiedKyc();

        Order order = orderService.makeOrder(lines, profile, verified);

        assertEquals(OrderStatus.received, order.status());
        assertEquals("SYNC", order.id().substring(0, 4));
        assertEquals("Biz Fibre 100", order.name());
        assertEquals(1, order.lines().size());
        assertEquals(0, order.quote().errors().size());
        assertEquals(1, order.events().size());
        assertEquals("Order received", order.events().get(0).label());
    }

    @Test
    void nextOrderAdvancesStatus() {
        Order order = orderService.makeOrder(TestFixtures.basicCart(), TestFixtures.demoProfile(), TestFixtures.verifiedKyc());

        for (OrderStatus expected : orderService.getOrderSteps()) {
            if (expected == OrderStatus.received) continue; // already received
            order = orderService.nextOrder(order);
            assertEquals(expected, order.status());
        }
    }

    @Test
    void nextOrderRecordsEvents() {
        Order order = orderService.makeOrder(TestFixtures.basicCart(), TestFixtures.demoProfile(), TestFixtures.verifiedKyc());
        int initialEvents = order.events().size();

        order = orderService.nextOrder(order);
        assertEquals(initialEvents + 1, order.events().size());

        order = orderService.nextOrder(order);
        assertEquals(initialEvents + 2, order.events().size());
    }

    @Test
    void nextOrderThrowsOnActive() {
        Order order = orderService.makeOrder(TestFixtures.basicCart(), TestFixtures.demoProfile(), TestFixtures.verifiedKyc());
        // Advance to active
        for (OrderStatus s : orderService.getOrderSteps()) {
            if (s != OrderStatus.received) {
                order = orderService.nextOrder(order);
            }
        }
        assertEquals(OrderStatus.active, order.status());
        Order finalOrder = order;
        assertThrows(IllegalArgumentException.class, () -> orderService.nextOrder(finalOrder));
    }

    @Test
    void nextOrderThrowsOnCancelled() {
        Order order = orderService.makeOrder(TestFixtures.basicCart(), TestFixtures.demoProfile(), TestFixtures.verifiedKyc());
        order = orderService.cancelOrder(order);
        assertEquals(OrderStatus.cancelled, order.status());

        Order finalOrder = order;
        assertThrows(IllegalArgumentException.class, () -> orderService.nextOrder(finalOrder));
    }

    @Test
    void cancelOrderWorksBeforeActive() {
        Order order = orderService.makeOrder(TestFixtures.basicCart(), TestFixtures.demoProfile(), TestFixtures.verifiedKyc());
        order = orderService.cancelOrder(order);
        assertEquals(OrderStatus.cancelled, order.status());

        // Event recorded
        assertEquals("Order cancelled", order.events().getLast().label());
    }

    @Test
    void cancelOrderThrowsOnActive() {
        Order order = orderService.makeOrder(TestFixtures.basicCart(), TestFixtures.demoProfile(), TestFixtures.verifiedKyc());
        // Advance to active
        for (OrderStatus s : orderService.getOrderSteps()) {
            if (s != OrderStatus.received) {
                order = orderService.nextOrder(order);
            }
        }
        Order finalOrder = order;
        assertThrows(IllegalArgumentException.class, () -> orderService.cancelOrder(finalOrder));
    }

    @Test
    void cancelOrderThrowsOnInstalling() {
        Order order = orderService.makeOrder(TestFixtures.basicCart(), TestFixtures.demoProfile(), TestFixtures.verifiedKyc());
        // Advance to installing (received -> verification -> confirmed -> scheduled -> installing)
        order = orderService.nextOrder(order); // verification
        order = orderService.nextOrder(order); // confirmed
        order = orderService.nextOrder(order); // scheduled
        order = orderService.nextOrder(order); // installing
        assertEquals(OrderStatus.installing, order.status());
        Order finalOrder = order;
        assertThrows(IllegalArgumentException.class, () -> orderService.cancelOrder(finalOrder));
    }

    @Test
    void makeIdGeneratesUniqueIds() {
        String id1 = orderService.makeId("TEST");
        String id2 = orderService.makeId("TEST");
        assertNotEquals(id1, id2);
        assertTrue(id1.startsWith("TEST-"));
        assertTrue(id2.startsWith("TEST-"));
    }

    @Test
    void statusLabelsMatchExpected() {
        assertEquals("Order received", orderService.getStatusLabel(OrderStatus.received));
        assertEquals("Verification", orderService.getStatusLabel(OrderStatus.verification));
        assertEquals("Confirmed", orderService.getStatusLabel(OrderStatus.confirmed));
        assertEquals("Installation scheduled", orderService.getStatusLabel(OrderStatus.scheduled));
        assertEquals("Getting you connected", orderService.getStatusLabel(OrderStatus.installing));
        assertEquals("Active", orderService.getStatusLabel(OrderStatus.active));
        assertEquals("Cancelled", orderService.getStatusLabel(OrderStatus.cancelled));
    }

    @Test
    void orderStepsInCorrectOrder() {
        List<OrderStatus> steps = orderService.getOrderSteps();
        assertEquals(List.of(
            OrderStatus.received,
            OrderStatus.verification,
            OrderStatus.confirmed,
            OrderStatus.scheduled,
            OrderStatus.installing,
            OrderStatus.active
        ), steps);
    }
}