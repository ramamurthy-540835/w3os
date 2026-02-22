/**
 * Validate URL format using URL constructor
 */
export function validateURL(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize URL by adding https:// if missing and validating protocol
 */
export function sanitizeURL(urlString: string): string {
  const trimmed = urlString.trim();

  // Reject dangerous protocols
  if (trimmed.toLowerCase().startsWith("javascript:")) {
    throw new Error("JavaScript protocol is not allowed");
  }
  if (trimmed.toLowerCase().startsWith("data:")) {
    throw new Error("Data protocol is not allowed");
  }

  // If no protocol, add https://
  if (!trimmed.match(/^https?:\/\//i)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

/**
 * Check if URL has valid protocol (http or https)
 */
export function isValidProtocol(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "http:" || urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Check for known blocked domains
 */
export function isBlockedDomain(url: string): string[] | null {
  const blockedDomains: string[] = [
    // Add any domains you want to block
  ];

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    for (const domain of blockedDomains) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return blockedDomains;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Main validation function that combines all checks
 */
export function validateAndSanitizeURL(urlString: string): {
  valid: boolean;
  url?: string;
  error?: string;
} {
  if (!urlString.trim()) {
    return {
      valid: false,
      error: "URL cannot be empty",
    };
  }

  try {
    const sanitized = sanitizeURL(urlString);

    if (!validateURL(sanitized)) {
      return {
        valid: false,
        error: "Invalid URL format",
      };
    }

    if (!isValidProtocol(sanitized)) {
      return {
        valid: false,
        error: "Only HTTP and HTTPS protocols are allowed",
      };
    }

    return {
      valid: true,
      url: sanitized,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid URL";
    return {
      valid: false,
      error: message,
    };
  }
}
