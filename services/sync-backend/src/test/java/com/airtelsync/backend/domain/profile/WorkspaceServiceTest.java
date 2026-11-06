package com.airtelsync.backend.domain.profile;

import com.airtelsync.backend.domain.TestFixtures;
import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.Invoice;
import com.airtelsync.backend.domain.model.Kyc;
import com.airtelsync.backend.domain.model.Notification;
import com.airtelsync.backend.domain.model.Order;
import com.airtelsync.backend.domain.model.OrderStatus;
import com.airtelsync.backend.domain.model.Profile;
import com.airtelsync.backend.domain.model.Workspace;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import com.airtelsync.backend.TestcontainersConfiguration;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class WorkspaceServiceTest {

    @Autowired
    private WorkspaceService workspaceService;

    @Test
    void initialWorkspaceHasCorrectProfile() {
        Workspace workspace = workspaceService.initialWorkspace();
        Profile profile = workspace.profile();

        assertEquals("Aanya Sharma", profile.name());
        assertEquals("Northstar Studio", profile.business());
        assertEquals("aanya@example.com", profile.email());
        assertEquals(Profile.Industry.professional, profile.industry());
        assertEquals("Bengaluru", profile.city());
        assertEquals(1, profile.tier());
        assertEquals(12, profile.employees());
        assertEquals(1, profile.sites());
        assertEquals(6000, profile.budget());
        assertTrue(profile.hasGstin());
        assertEquals(List.of("productivity", "security"), profile.priorities());
    }

    @Test
    void initialWorkspaceHasActiveOrder() {
        Workspace workspace = workspaceService.initialWorkspace();
        Order active = workspace.orders().stream()
            .filter(o -> o.status() == OrderStatus.active)
            .findFirst()
            .orElseThrow();

        assertEquals("SYNC-20481", active.id());
        assertEquals("Your connected workspace", active.name());
        assertEquals(4, active.lines().size());
        assertEquals(0, active.quote().errors().size());
        assertEquals(6, active.events().size()); // orderSteps length
    }

    @Test
    void initialWorkspaceHasPendingOrder() {
        Workspace workspace = workspaceService.initialWorkspace();
        Order pending = workspace.orders().stream()
            .filter(o -> o.status() == OrderStatus.scheduled)
            .findFirst()
            .orElseThrow();

        assertEquals("SYNC-20846", pending.id());
        assertEquals("Studio guest Wi-Fi", pending.name());
        assertEquals(2, pending.lines().size());
        assertEquals(0, pending.quote().errors().size());
    }

    @Test
    void initialWorkspaceHasInvoices() {
        Workspace workspace = workspaceService.initialWorkspace();
        assertEquals(2, workspace.invoices().size());

        Invoice current = workspace.invoices().stream()
            .filter(i -> i.id().equals("INV-2026-0042"))
            .findFirst()
            .orElseThrow();
        assertEquals("unpaid", current.status());

        Invoice previous = workspace.invoices().stream()
            .filter(i -> i.id().equals("INV-2026-0031"))
            .findFirst()
            .orElseThrow();
        assertEquals("paid", previous.status());
    }

    @Test
    void initialWorkspaceHasKyc() {
        Workspace workspace = workspaceService.initialWorkspace();
        Kyc kyc = workspace.kyc();

        assertEquals("pending", kyc.status());
        assertNull(kyc.provider());
        assertFalse(kyc.consent());
        assertTrue(kyc.documents().isEmpty());
    }

    @Test
    void initialWorkspaceHasNotifications() {
        Workspace workspace = workspaceService.initialWorkspace();
        assertEquals(3, workspace.notifications().size());

        Notification n1 = workspace.notifications().stream()
            .filter(n -> n.id().equals("n1"))
            .findFirst()
            .orElseThrow();
        assertEquals("Your installation is on the calendar", n1.title());
        assertFalse(n1.read());

        Notification n2 = workspace.notifications().stream()
            .filter(n -> n.id().equals("n2"))
            .findFirst()
            .orElseThrow();
        assertEquals("One bill. Every service.", n2.title());

        Notification n3 = workspace.notifications().stream()
            .filter(n -> n.id().equals("n3"))
            .findFirst()
            .orElseThrow();
        assertEquals("Let's finish your business profile", n3.title());
    }

    @Test
    void initialWorkspacePreferences() {
        Workspace workspace = workspaceService.initialWorkspace();
        Workspace.Preferences prefs = workspace.preferences();

        assertTrue(prefs.emailUpdates());
        assertTrue(prefs.reminders());
        assertFalse(prefs.compactMotion());
    }

    @Test
    void activeOrderLinesMatchExpected() {
        Workspace workspace = workspaceService.initialWorkspace();
        Order active = workspace.orders().stream()
            .filter(o -> o.status() == OrderStatus.active)
            .findFirst()
            .orElseThrow();

        assertEquals(List.of("P02", "P16", "P20", "P17"),
            active.lines().stream().map(CartLine::productId).toList());
    }

    @Test
    void pendingOrderLinesMatchExpected() {
        Workspace workspace = workspaceService.initialWorkspace();
        Order pending = workspace.orders().stream()
            .filter(o -> o.status() == OrderStatus.scheduled)
            .findFirst()
            .orElseThrow();

        assertEquals(List.of("P22", "P01"),
            pending.lines().stream().map(CartLine::productId).toList());
    }

    @Test
    void workspaceUsesFixedTimezoneForDemoData() {
        Workspace workspace = workspaceService.initialWorkspace();
        // Verify demo timestamps are generated (not empty)
        Order active = workspace.orders().stream()
            .filter(o -> o.status() == OrderStatus.active)
            .findFirst()
            .orElseThrow();
        assertFalse(active.createdAt().isEmpty());
        assertFalse(active.events().isEmpty());
        assertFalse(active.events().get(0).at().isEmpty());

        Order pending = workspace.orders().stream()
            .filter(o -> o.status() == OrderStatus.scheduled)
            .findFirst()
            .orElseThrow();
        assertFalse(pending.createdAt().isEmpty());
        assertFalse(pending.events().isEmpty());
        assertFalse(pending.events().get(0).at().isEmpty());
    }
    @Test
    void workspaceTimestampsAreValidInstantsAndMilestonesAreSpaced() {
        Workspace workspace = workspaceService.initialWorkspace();
        workspace.notifications().forEach(n -> java.time.Instant.parse(n.createdAt()));
        workspace.invoices().forEach(i -> {
            java.time.Instant.parse(i.issuedAt());
            java.time.Instant.parse(i.dueAt());
        });
        workspace.orders().forEach(o -> {
            java.time.Instant.parse(o.createdAt());
            o.events().forEach(e -> java.time.Instant.parse(e.at()));
        });
        Order pending = workspace.orders().getFirst();
        assertEquals(pending.createdAt(), pending.events().getFirst().at());
        for (int i = 1; i < pending.events().size(); i++) {
            assertEquals(51840L, java.time.Duration.between(
                java.time.Instant.parse(pending.events().get(i - 1).at()),
                java.time.Instant.parse(pending.events().get(i).at())).toSeconds());
        }
    }
    @Test
    void previousInvoiceUsesPreviousCalendarMonth() {
        for (String instant : List.of("2026-03-01T12:00:00Z", "2026-03-31T12:00:00Z", "2027-01-01T12:00:00Z")) {
            java.time.Instant now = java.time.Instant.parse(instant);
            Workspace workspace = workspaceService.initialWorkspace(now);
            String expected = now.atZone(java.time.ZoneId.of("Asia/Kolkata")).minusMonths(1)
                .format(java.time.format.DateTimeFormatter.ofPattern("MMMM yyyy", java.util.Locale.forLanguageTag("en-IN")));
            assertEquals(expected, workspace.invoices().get(1).period());
        }
    }
}