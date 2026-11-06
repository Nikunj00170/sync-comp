package com.airtelsync.backend.config;

/** Resolve the server issuer from the existing AWS pool/region environment contract. */
public final class CognitoIssuer {
    private CognitoIssuer() {}
    public static String resolve(String issuer, String poolId, String region) {
        if (!issuer.isBlank()) return issuer;
        if (poolId.isBlank()) return "";
        if (!poolId.matches("[a-z]{2}(?:-gov)?-[a-z]+-[0-9]_[A-Za-z0-9]+"))
            throw new IllegalArgumentException("COGNITO_USER_POOL_ID must be an actual Cognito pool ID");
        String poolRegion = poolId.substring(0, poolId.indexOf('_'));
        if (!region.isBlank() && !region.equals(poolRegion))
            throw new IllegalArgumentException("AWS_REGION and COGNITO_USER_POOL_ID region must match, or set COGNITO_ISSUER_URI explicitly");
        String domain = poolRegion.startsWith("cn-") ? "amazonaws.com.cn" : "amazonaws.com";
        return "https://cognito-idp." + poolRegion + "." + domain + "/" + poolId;
    }
}
