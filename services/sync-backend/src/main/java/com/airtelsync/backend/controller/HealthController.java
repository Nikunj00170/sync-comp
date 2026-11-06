package com.airtelsync.backend.controller;

import com.airtelsync.backend.dto.HealthResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/health")
public class HealthController {

	@GetMapping
	public ResponseEntity<HealthResponse> health() {
		return ResponseEntity.ok(HealthResponse.up("sync-backend"));
	}

}