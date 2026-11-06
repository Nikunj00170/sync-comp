package com.airtelsync.backend.domain.catalogue;

import com.airtelsync.backend.domain.TestFixtures;
import com.airtelsync.backend.domain.model.Product;
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
class CatalogueServiceTest {

    @Autowired
    private CatalogueService catalogueService;

    @Test
    void loadsAll25Products() {
        List<Product> products = catalogueService.getAllProducts();
        assertEquals(25, products.size());
    }

    @Test
    void findsProductById() {
        Product p01 = catalogueService.getById("P01");
        assertEquals("P01", p01.id());
        assertEquals("Biz Fibre 100", p01.name());
        assertEquals(99900, p01.price());
    }

    @Test
    void throwsOnUnknownProduct() {
        assertThrows(IllegalArgumentException.class, () -> catalogueService.getById("UNKNOWN"));
    }

    @Test
    void productHasCorrectStructure() {
        Product p01 = catalogueService.getById("P01");
        assertEquals("Connectivity", p01.category());
        assertEquals("per site", p01.unit());
        assertEquals(0, p01.setup());
        assertEquals(12, p01.contract());
        assertEquals(List.of(1, 2), p01.tiers());
        assertEquals(1, p01.minEmployees());
        assertEquals(1, p01.minSites());
        assertFalse(p01.requiresGstin());
        assertTrue(p01.dependencies().isEmpty());
        assertEquals(5, p01.installDays());
        assertEquals(List.of("micro", "prof"), p01.segments());
    }

    @Test
    void productWithDependencies() {
        Product p09 = catalogueService.getById("P09");
        assertEquals(List.of("P01", "P02", "P03", "P05", "P06"), p09.dependencies());
    }

    @Test
    void productWithSetupCost() {
        Product p05 = catalogueService.getById("P05");
        assertEquals(1000000, p05.setup());
        assertEquals(800000, p05.price());
    }

    @Test
    void allPricesAreInPaise() {
        for (Product product : catalogueService.getAllProducts()) {
            assertTrue(product.price() > 0, "Product " + product.id() + " must have positive price");
            assertTrue(product.setup() >= 0, "Product " + product.id() + " setup must be non-negative");
        }
    }
}