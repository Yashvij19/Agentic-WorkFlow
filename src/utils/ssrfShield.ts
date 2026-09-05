// src/utils/ssrfShield.ts

/**
 * Validates whether a target URL is safe to call from the server,
 * protecting against Server-Side Request Forgery (SSRF) targeting
 * internal microservices, private subnets, or cloud instance metadata.
 */
export function validateSafeUrl(urlString: string): { isSafe: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { isSafe: false, error: 'Invalid URL format.' };
  }

  // 1. Enforce strict HTTP/HTTPS protocols (block file:, ftp:, gopher:, etc.)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isSafe: false,
      error: `Protocol '${parsed.protocol}' is forbidden. Only HTTP and HTTPS are permitted.`,
    };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 2. Block Loopback and Local Hostnames
  const forbiddenHosts = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '[::1]',
    'metadata.google.internal',
    'instance-data',
  ];

  if (forbiddenHosts.includes(hostname) || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    return {
      isSafe: false,
      error: `Access to internal host '${hostname}' is blocked for security.`,
    };
  }

  // 3. Check for Decimal IP representation (e.g., 2130706433 -> 127.0.0.1)
  if (/^\d+$/.test(hostname)) {
    return {
      isSafe: false,
      error: 'Integer-encoded IP addresses are blocked for security.',
    };
  }

  // 4. Validate IPv4 address ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);

  if (match) {
    const octets = match.slice(1, 5).map(Number);

    // Verify octet bounds
    if (octets.some((o) => o < 0 || o > 255)) {
      return { isSafe: false, error: 'Malformed IP address.' };
    }

    const [a, b] = octets;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) {
      return { isSafe: false, error: 'Loopback address access is blocked.' };
    }

    // 0.0.0.0/8 (Current network)
    if (a === 0) {
      return { isSafe: false, error: 'Network address 0.0.0.0 is blocked.' };
    }

    // 169.254.0.0/16 (Link-Local & Cloud Metadata e.g. AWS/GCP/Render 169.254.169.254)
    if (a === 169 && b === 254) {
      return { isSafe: false, error: 'Cloud metadata and link-local address access is blocked.' };
    }

    // 10.0.0.0/8 (Private Class A)
    if (a === 10) {
      return { isSafe: false, error: 'Private subnet (10.0.0.0/8) access is blocked.' };
    }

    // 172.16.0.0/12 (Private Class B: 172.16.x.x - 172.31.x.x)
    if (a === 172 && b >= 16 && b <= 31) {
      return { isSafe: false, error: 'Private subnet (172.16.0.0/12) access is blocked.' };
    }

    // 192.168.0.0/16 (Private Class C)
    if (a === 192 && b === 168) {
      return { isSafe: false, error: 'Private subnet (192.168.0.0/16) access is blocked.' };
    }
  }

  return { isSafe: true };
}
