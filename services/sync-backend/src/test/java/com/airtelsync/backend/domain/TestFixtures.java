package com.airtelsync.backend.domain;

import com.airtelsync.backend.domain.model.CartLine;
import com.airtelsync.backend.domain.model.Kyc;
import com.airtelsync.backend.domain.model.Profile;
import java.util.List;

public final class TestFixtures {

    private TestFixtures() {}

    public static Profile demoProfile() {
        return new Profile(
            "Aanya Sharma",
            "Northstar Studio",
            "aanya@example.com",
            Profile.Industry.professional,
            "Bengaluru",
            1,
            12,
            1,
            6000,
            true,
            List.of("productivity", "security"),
            "24, Indiranagar, Bengaluru, Karnataka 560038",
            ""
        );
    }

    public static Profile manufacturingProfile() {
        return new Profile(
            "Manufacturing User",
            "Factory Co",
            "mfg@example.com",
            Profile.Industry.manufacturing,
            "Pune",
            1,
            25,
            3,
            40000,
            true,
            List.of("reliability"),
            "Industrial Area, Pune",
            ""
        );
    }

    public static Profile retailProfile() {
        return new Profile(
            "Retail User",
            "Shop Co",
            "retail@example.com",
            Profile.Industry.retail,
            "Mumbai",
            2,
            10,
            2,
            20000,
            false,
            List.of("productivity"),
            "Commercial St, Mumbai",
            ""
        );
    }

    public static Profile hospitalityProfile() {
        return new Profile(
            "Hospitality User",
            "Hotel Co",
            "hotel@example.com",
            Profile.Industry.hospitality,
            "Goa",
            1,
            50,
            5,
            50000,
            true,
            List.of("security", "reliability"),
            "Beach Road, Goa",
            ""
        );
    }

    public static Kyc unverifiedKyc() {
        return new Kyc("pending", null, false, List.of(), null);
    }

    public static Kyc verifiedKyc() {
        return new Kyc("demo_verified", "digio", true, List.of(), "2024-01-01T00:00:00Z");
    }

    public static List<CartLine> basicCart() {
        return List.of(new CartLine("P01", 1));
    }

    public static List<CartLine> activeCart() {
        return List.of(
            new CartLine("P02", 1),
            new CartLine("P16", 12),
            new CartLine("P20", 8),
            new CartLine("P17", 1)
        );
    }

    public static List<CartLine> pendingCart() {
        return List.of(
            new CartLine("P22", 1),
            new CartLine("P01", 1)
        );
    }
}