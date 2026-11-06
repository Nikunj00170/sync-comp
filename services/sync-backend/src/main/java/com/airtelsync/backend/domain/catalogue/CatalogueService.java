package com.airtelsync.backend.domain.catalogue;

import com.airtelsync.backend.domain.model.Product;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class CatalogueService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final Map<String, Product> productById = new ConcurrentHashMap<>();
    private final List<Product> allProducts = new ArrayList<>();

    public static final String CATALOGUE_VERSION = "case-2026-07-v1";
    public static final int DEMO_TAX_BPS = 1800;

    @PostConstruct
    public void loadCatalogue() {
        try (InputStream is = new ClassPathResource("catalogue.json").getInputStream()) {
            Product[] products = objectMapper.readValue(is, Product[].class);
            for (Product product : products) {
                productById.put(product.id(), product);
                allProducts.add(product);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Failed to load catalogue.json", e);
        }
    }

    public Optional<Product> findById(String id) {
        return Optional.ofNullable(productById.get(id));
    }

    public Product getById(String id) {
        return findById(id).orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
    }

    public List<Product> getAllProducts() {
        return List.copyOf(allProducts);
    }

    public boolean exists(String id) {
        return productById.containsKey(id);
    }
}