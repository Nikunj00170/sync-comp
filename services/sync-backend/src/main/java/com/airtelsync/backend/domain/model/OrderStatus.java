package com.airtelsync.backend.domain.model;

public enum OrderStatus {
    received,
    verification,
    confirmed,
    scheduled,
    installing,
    active,
    cancelled
}