/**
 * Custom error classes for Metigan
 */

/**
 * Base error class for Metigan-specific errors
 * Hides implementation details from stack traces
 */
export class MetiganError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'MetiganError';
      
      // This prevents the implementation details from showing in the stack trace
      if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
      }
    }
  }
  
  /**
   * Error thrown when validation fails
   */
  export class ValidationError extends MetiganError {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  }
  
  /**
   * Error thrown when API request fails
   */
  export class ApiError extends MetiganError {
    /** HTTP status code of the failed response. */
    status?: number;
    /** Parsed response body of the failed response, when available. */
    data?: unknown;

    constructor(message: string, status?: number, data?: unknown) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.data = data;
    }
  }

  /**
   * Error thrown when an incoming webhook cannot be verified.
   *
   * Every failure mode of {@link verifyWebhook} — a missing or malformed
   * signature header, a timestamp outside the tolerance window, a signature
   * that does not match, or a body that is not valid JSON — raises this
   * error. Treat it as "reject the request" (respond 400) and never trust the
   * payload.
   */
  export class WebhookSignatureError extends MetiganError {
    /** Machine-readable reason, for logging/metrics. */
    readonly reason:
      | 'missing_secret'
      | 'missing_signature'
      | 'invalid_signature_format'
      | 'timestamp_out_of_tolerance'
      | 'no_signature_match'
      | 'invalid_payload'
      | 'crypto_unavailable';

    constructor(message: string, reason: WebhookSignatureError['reason']) {
      super(message);
      this.name = 'WebhookSignatureError';
      this.reason = reason;
    }
  }