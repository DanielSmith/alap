// Copyright 2026 Daniel Smith
// Licensed under the Apache License, Version 2.0
// See https://www.apache.org/licenses/LICENSE-2.0

package alap;

import java.net.InetAddress;
import java.net.URI;
import java.net.UnknownHostException;

/**
 * SSRF (Server-Side Request Forgery) guard — Java port of ssrf-guard.ts.
 *
 * <p>Syntactic check — inspects the hostname string, not DNS. Catches direct
 * IP usage and known private patterns. Does NOT protect against DNS rebinding.
 */
public final class SsrfGuard {

    // IPv4 CIDR ranges: {address bytes, prefix length}
    private static final long[][] IPV4_RANGES = {
        {127, 0, 0, 0, 8},       // Loopback
        {10, 0, 0, 0, 8},        // RFC 1918
        {172, 16, 0, 0, 12},     // RFC 1918
        {192, 168, 0, 0, 16},    // RFC 1918
        {169, 254, 0, 0, 16},    // Link-local / cloud metadata
        {0, 0, 0, 0, 8},         // "This" network
        {100, 64, 0, 0, 10},     // Shared address space (CGN)
        {192, 0, 0, 0, 24},      // IETF protocol assignments
        {192, 0, 2, 0, 24},      // Documentation (TEST-NET-1)
        {198, 51, 100, 0, 24},   // Documentation (TEST-NET-2)
        {203, 0, 113, 0, 24},    // Documentation (TEST-NET-3)
        {224, 0, 0, 0, 4},       // Multicast
        {240, 0, 0, 0, 4},       // Reserved
    };

    private SsrfGuard() {}

    /**
     * Returns {@code true} if the URL targets a private, reserved, or loopback host.
     * Malformed URLs return {@code true} (fail closed).
     */
    public static boolean isPrivateHost(String url) {
        if (url == null || url.isBlank()) {
            return true;
        }

        String hostname;
        try {
            URI uri = new URI(url);
            hostname = uri.getHost();
        } catch (Exception e) {
            return true; // fail closed
        }

        if (hostname == null || hostname.isEmpty()) {
            return true;
        }

        hostname = hostname.toLowerCase();

        // Strip IPv6 brackets
        if (hostname.startsWith("[") && hostname.endsWith("]")) {
            hostname = hostname.substring(1, hostname.length() - 1);
        }

        // localhost variants
        if ("localhost".equals(hostname) || hostname.endsWith(".localhost")) {
            return true;
        }

        // Try parsing as IP address (only if it looks like one — avoid DNS lookups)
        if (!looksLikeIpLiteral(hostname)) {
            return false; // regular domain name
        }
        try {
            InetAddress addr = InetAddress.getByName(hostname);
            byte[] bytes = addr.getAddress();

            if (bytes.length == 4) {
                return isPrivateIPv4(bytes);
            }

            // IPv6
            if (bytes.length == 16) {
                // Check IPv4-mapped (::ffff:x.x.x.x)
                if (isIPv4Mapped(bytes)) {
                    byte[] v4 = new byte[] { bytes[12], bytes[13], bytes[14], bytes[15] };
                    return isPrivateIPv4(v4);
                }
                return isPrivateIPv6(bytes);
            }

            return true; // unknown format — fail closed
        } catch (Exception e) {
            // Not an IP literal — regular hostname
            return false;
        }
    }

    /** Check if hostname looks like an IP literal (not a domain name). */
    private static boolean looksLikeIpLiteral(String hostname) {
        if (hostname.isEmpty()) return false;
        char first = hostname.charAt(0);
        // IPv4: starts with digit; IPv6: contains ':'
        return Character.isDigit(first) || hostname.contains(":");
    }

    private static boolean isPrivateIPv4(byte[] addr) {
        long ip = ((addr[0] & 0xFFL) << 24)
                 | ((addr[1] & 0xFFL) << 16)
                 | ((addr[2] & 0xFFL) << 8)
                 | (addr[3] & 0xFFL);

        for (long[] range : IPV4_RANGES) {
            long rangeIp = (range[0] << 24) | (range[1] << 16) | (range[2] << 8) | range[3];
            long mask = 0xFFFFFFFFL << (32 - range[4]);
            if ((ip & mask) == (rangeIp & mask)) {
                return true;
            }
        }
        return false;
    }

    private static boolean isIPv4Mapped(byte[] addr) {
        // ::ffff:x.x.x.x = 10 zero bytes + 0xff 0xff + 4 IPv4 bytes
        for (int i = 0; i < 10; i++) {
            if (addr[i] != 0) return false;
        }
        return (addr[10] & 0xFF) == 0xFF && (addr[11] & 0xFF) == 0xFF;
    }

    private static boolean isPrivateIPv6(byte[] addr) {
        // ::1 (loopback)
        boolean allZero = true;
        for (int i = 0; i < 15; i++) {
            if (addr[i] != 0) { allZero = false; break; }
        }
        if (allZero && addr[15] == 1) return true;

        int first = (addr[0] & 0xFF);
        int second = (addr[1] & 0xFF);

        // fe80::/10 (link-local)
        if (first == 0xFE && (second & 0xC0) == 0x80) return true;

        // fc00::/7 (unique local)
        if ((first & 0xFE) == 0xFC) return true;

        // :: (unspecified)
        boolean allZeros = true;
        for (byte b : addr) {
            if (b != 0) { allZeros = false; break; }
        }
        if (allZeros) return true;

        // ff00::/8 (multicast)
        if (first == 0xFF) return true;

        return false;
    }
}
