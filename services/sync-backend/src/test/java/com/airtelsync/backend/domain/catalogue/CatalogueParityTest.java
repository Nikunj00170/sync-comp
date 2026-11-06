package com.airtelsync.backend.domain.catalogue;

import com.airtelsync.backend.domain.model.Product;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import com.airtelsync.backend.TestcontainersConfiguration;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@Import(TestcontainersConfiguration.class)
@SpringBootTest
class CatalogueParityTest {

    @Autowired
    private CatalogueService catalogueService;

    @Test
    void catalogueLoadedFromCanonicalSource() throws IOException {
        // Verify all 25 products are loaded
        List<Product> products = catalogueService.getAllProducts();
        assertEquals(25, products.size());

        // Verify specific products match the canonical source
        Product p01 = catalogueService.getById("P01");
        assertEquals("Biz Fibre 100", p01.name());
        assertEquals(99900, p01.price());
        assertEquals(0, p01.setup());

        Product p22 = catalogueService.getById("P22");
        assertEquals("Secure Wi-Fi with Guest Network", p22.name());
        assertEquals(39900, p22.price());
        assertEquals(100000, p22.setup());

        // Verify dependencies are loaded correctly
        Product p09 = catalogueService.getById("P09");
        assertEquals(List.of("P01", "P02", "P03", "P05", "P06"), p09.dependencies());

        Product p10 = catalogueService.getById("P10");
        assertEquals(List.of("P01", "P02", "P03", "P05", "P06"), p10.dependencies());
    }

    @Test
    void canonicalCatalogueFileExists() {
        // Verify the shared catalogue file exists at the expected location
        Path canonicalPath = Path.of(System.getProperty("user.dir"), "../../shared/data/catalogue.json");
        assertTrue(Files.exists(canonicalPath), "Canonical catalogue not found at: " + canonicalPath.toAbsolutePath());
    }

    @Test
    void catalogueInPackagedJar() {
        // This test will be meaningful after mvn package
        // Verify the catalogue is accessible as a classpath resource
        ClassLoader cl = getClass().getClassLoader();
        var resource = cl.getResource("catalogue.json");
        assertNotNull(resource, "catalogue.json should be in classpath");
    }
}