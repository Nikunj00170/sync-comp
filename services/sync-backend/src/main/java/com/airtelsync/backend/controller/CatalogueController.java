package com.airtelsync.backend.controller;

import com.airtelsync.backend.domain.catalogue.CatalogueService;
import com.airtelsync.backend.domain.model.Product;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/v1/catalogue")
public class CatalogueController {

    private final CatalogueService catalogueService;

    public CatalogueController(CatalogueService catalogueService) {
        this.catalogueService = catalogueService;
    }

    @GetMapping
    public ResponseEntity<List<Product>> getCatalogue() {
        return ResponseEntity.ok(catalogueService.getAllProducts());
    }
}