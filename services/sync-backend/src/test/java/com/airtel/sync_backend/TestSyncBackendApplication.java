package com.airtel.sync_backend;

import org.springframework.boot.SpringApplication;

public class TestSyncBackendApplication {

	public static void main(String[] args) {
		SpringApplication.from(SyncBackendApplication::main).with(TestcontainersConfiguration.class).run(args);
	}

}
