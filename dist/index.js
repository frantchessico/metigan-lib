// src/lib/errors.ts
var MetiganError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MetiganError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
};
var ValidationError = class extends MetiganError {
  constructor(message) {
    super(message);
    this.name = "ValidationError";
  }
};
var ApiError = class extends MetiganError {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
};
var WebhookSignatureError = class extends MetiganError {
  constructor(message, reason) {
    super(message);
    this.name = "WebhookSignatureError";
    this.reason = reason;
  }
};

// src/lib/config.ts
var API_URL = typeof process !== "undefined" && process.env?.METIGAN_API_URL || "https://api.metigan.io";
var SDK_VERSION = "2.5.0";
var DEFAULT_TIMEOUT = 3e4;
var DEFAULT_RETRY_COUNT = 3;
var DEFAULT_RETRY_DELAY = 1e3;
var MAX_FILE_SIZE = 7 * 1024 * 1024;

// src/core/client.ts
function ensureFetch() {
  if (typeof fetch === "undefined") {
    throw new MetiganError(
      'Global fetch is not available. Metigan requires Node.js 18+ or a modern browser. On older runtimes, provide a fetch polyfill (e.g. `globalThis.fetch = require("undici").fetch`).'
    );
  }
}
function buildUrl(baseUrl, path, query) {
  const url = baseUrl.replace(/\/+$/, "") + path;
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === void 0 || value === null || value === "") continue;
    qs.append(key, String(value));
  }
  const s = qs.toString();
  return s ? `${url}${url.includes("?") ? "&" : "?"}${s}` : url;
}
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var HttpClient = class {
  constructor(options) {
    if (!options.apiKey) {
      throw new MetiganError("API key is required");
    }
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || API_URL).replace(/\/+$/, "");
    this.timeout = options.timeout ?? DEFAULT_TIMEOUT;
    this.retryCount = Math.max(1, options.retryCount ?? DEFAULT_RETRY_COUNT);
    this.retryDelay = options.retryDelay ?? DEFAULT_RETRY_DELAY;
  }
  headers(hasJsonBody) {
    const h = {
      Accept: "application/json",
      "x-api-key": this.apiKey,
      "X-Metigan-Client": `metigan-js/${SDK_VERSION}`
    };
    if (hasJsonBody) h["Content-Type"] = "application/json";
    return h;
  }
  /**
   * Perform a request with retries, timeout and typed errors.
   * Resolves the parsed JSON body (or `undefined` for an empty 2xx).
   * @throws {ApiError} on a non-2xx response (carries `status` and `data`)
   * @throws {MetiganError} on network failure or timeout
   */
  async request(method, path, opts = {}) {
    ensureFetch();
    const url = buildUrl(this.baseUrl, path, opts.query);
    const isForm = opts.form !== void 0;
    const init = { method, headers: this.headers(!isForm && opts.body !== void 0) };
    if (isForm) init.body = opts.form;
    else if (opts.body !== void 0) init.body = JSON.stringify(opts.body);
    const timeout = opts.timeout ?? this.timeout;
    let lastError;
    for (let attempt = 0; attempt < this.retryCount; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeout);
      const onAbort = () => controller.abort();
      if (opts.signal) {
        if (opts.signal.aborted) controller.abort();
        else opts.signal.addEventListener("abort", onAbort, { once: true });
      }
      try {
        const res = await fetch(url, { ...init, signal: controller.signal });
        const payload = await parseBody(res);
        if (res.ok) return payload;
        if (res.status < 500) throw apiError(res.status, payload);
        lastError = apiError(res.status, payload);
      } catch (err) {
        if (err instanceof ApiError && err.status !== void 0 && err.status < 500) throw err;
        lastError = toMetiganError(err, opts.signal);
        if (opts.signal?.aborted) throw lastError;
      } finally {
        clearTimeout(timer);
        opts.signal?.removeEventListener("abort", onAbort);
      }
      if (attempt < this.retryCount - 1) await sleep(this.retryDelay * Math.pow(2, attempt));
    }
    throw lastError instanceof Error ? lastError : new MetiganError("Request failed after multiple attempts");
  }
};
async function parseBody(res) {
  const text = await res.text();
  if (!text) return void 0;
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}
function apiError(status, payload) {
  const data = payload ?? {};
  const message = typeof data.message === "string" && data.message || typeof data.error === "string" && data.error || `Request failed with status ${status}`;
  const err = new ApiError(message, status);
  err.data = data;
  return err;
}
function toMetiganError(err, signal) {
  if (err instanceof MetiganError) return err;
  const aborted = err?.name === "AbortError";
  if (aborted) {
    return new MetiganError(
      signal?.aborted ? "Request was aborted" : "Request timed out"
    );
  }
  const message = err?.message || "Unknown error";
  return new MetiganError(`Failed to connect to the Metigan API: ${message}`);
}

// src/lib/security.ts
var DANGEROUS_TAGS = [
  "script",
  "iframe",
  "object",
  "embed",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "applet",
  "meta",
  "link",
  "base",
  "frame",
  "frameset",
  "layer",
  "ilayer",
  "bgsound"
];
var DANGEROUS_ATTRIBUTES = [
  "onclick",
  "ondblclick",
  "onmousedown",
  "onmouseup",
  "onmouseover",
  "onmousemove",
  "onmouseout",
  "onkeydown",
  "onkeypress",
  "onkeyup",
  "onload",
  "onerror",
  "onunload",
  "onabort",
  "onreset",
  "onsubmit",
  "onfocus",
  "onblur",
  "onchange",
  "oninput",
  "onscroll",
  "onresize",
  "javascript:",
  "vbscript:",
  "data:"
];
var ALLOWED_MIME_TYPES = [
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "text/csv",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Archives
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  // Audio/Video
  "audio/mpeg",
  "audio/wav",
  "video/mp4",
  "video/webm"
];
var BLOCKED_MIME_TYPES = [
  "application/x-msdownload",
  "application/x-executable",
  "application/x-msdos-program",
  "application/javascript",
  "text/javascript",
  "application/x-javascript",
  "text/html",
  // Can contain scripts
  "application/xhtml+xml",
  "application/x-shockwave-flash"
];
function sanitizeHtml(html) {
  if (!html || typeof html !== "string") {
    return "";
  }
  let sanitized = html;
  for (const tag of DANGEROUS_TAGS) {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>|<${tag}[^>]*\\/?>`, "gi");
    sanitized = sanitized.replace(regex, "");
  }
  for (const attr of DANGEROUS_ATTRIBUTES) {
    const attrRegex = new RegExp(`\\s*${attr}\\s*=\\s*["'][^"']*["']`, "gi");
    sanitized = sanitized.replace(attrRegex, "");
    const attrRegex2 = new RegExp(`\\s*${attr}\\s*=\\s*[^\\s>]+`, "gi");
    sanitized = sanitized.replace(attrRegex2, "");
  }
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, 'href="#"');
  sanitized = sanitized.replace(/src\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, 'src=""');
  sanitized = sanitized.replace(/href\s*=\s*["']?\s*data:[^"'>\s]*/gi, 'href="#"');
  return sanitized;
}
function isAllowedMimeType(mimeType) {
  if (!mimeType) return false;
  const normalizedType = mimeType.toLowerCase().trim();
  if (BLOCKED_MIME_TYPES.includes(normalizedType)) {
    return false;
  }
  return ALLOWED_MIME_TYPES.includes(normalizedType);
}
function isSafeFileExtension(filename) {
  if (!filename) return false;
  const DANGEROUS_EXTENSIONS = [
    ".exe",
    ".bat",
    ".cmd",
    ".com",
    ".msi",
    ".scr",
    ".pif",
    ".js",
    ".jse",
    ".vbs",
    ".vbe",
    ".wsf",
    ".wsh",
    ".ps1",
    ".jar",
    ".sh",
    ".bash",
    ".app",
    ".dmg",
    ".deb",
    ".rpm"
  ];
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return !DANGEROUS_EXTENSIONS.includes(ext);
}
function sanitizeEmail(email) {
  if (!email || typeof email !== "string") {
    return "";
  }
  return email.replace(/[\r\n]/g, "").trim();
}
function sanitizeSubject(subject) {
  if (!subject || typeof subject !== "string") {
    return "";
  }
  return subject.replace(/[\r\n]/g, "").trim().substring(0, 998);
}
var RateLimiter = class {
  constructor(config = { maxRequests: 10, windowMs: 1e3 }) {
    this.requests = [];
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }
  /**
   * Check if a request can be made
   * @returns True if request is allowed
   */
  canMakeRequest() {
    const now = Date.now();
    this.requests = this.requests.filter((time) => now - time < this.windowMs);
    return this.requests.length < this.maxRequests;
  }
  /**
   * Record a request
   */
  recordRequest() {
    this.requests.push(Date.now());
  }
  /**
   * Try to make a request - checks and records if allowed
   * @returns True if request was allowed and recorded
   */
  tryRequest() {
    if (this.canMakeRequest()) {
      this.recordRequest();
      return true;
    }
    return false;
  }
  /**
   * Get time until next request is allowed (in ms)
   * @returns Milliseconds until next request is allowed, or 0 if allowed now
   */
  getTimeUntilNextRequest() {
    if (this.canMakeRequest()) {
      return 0;
    }
    const now = Date.now();
    const oldestRequest = Math.min(...this.requests);
    return Math.max(0, this.windowMs - (now - oldestRequest));
  }
  /**
   * Reset the rate limiter
   */
  reset() {
    this.requests = [];
  }
};
var DebugLogger = class {
  constructor(enabled = false, prefix = "[Metigan]") {
    this.enabled = enabled;
    this.prefix = prefix;
  }
  enable() {
    this.enabled = true;
  }
  disable() {
    this.enabled = false;
  }
  log(...args) {
    if (this.enabled) {
      console.log(this.prefix, ...args);
    }
  }
  warn(...args) {
    if (this.enabled) {
      console.warn(this.prefix, ...args);
    }
  }
  error(...args) {
    if (this.enabled) {
      console.error(this.prefix, ...args);
    }
  }
  info(...args) {
    if (this.enabled) {
      console.info(this.prefix, ...args);
    }
  }
};

// src/lib/metigan.ts
var STATUS_OPTIONS = [
  { value: "200", label: "200 - Ok" },
  { value: "201", label: "201 - Created" },
  { value: "400", label: "400 - Bad Request" },
  { value: "401", label: "401 - Unauthorized" },
  { value: "403", label: "403 - Forbidden" },
  { value: "404", label: "404 - Not Found" },
  { value: "422", label: "422 - Unprocessable Content" },
  { value: "429", label: "429 - Too Many Requests" },
  { value: "451", label: "451 - Unavailable For Legal Reasons" },
  { value: "500", label: "500 - Internal Server Error" }
];
var debugLogger = null;
function getDebugLogger(enabled = false) {
  if (!debugLogger) {
    debugLogger = new DebugLogger(enabled, "[Metigan]");
  }
  return debugLogger;
}
var MetiganLogger = class {
  constructor(http, apiKey, userId, debugEnabled = false) {
    this.disabled = false;
    this.pendingLogs = [];
    this.isBatchProcessing = false;
    this.batchTimeout = null;
    this.http = http;
    this.apiKey = apiKey;
    this.userId = userId;
    this.debug = getDebugLogger(debugEnabled);
  }
  /**
   * Disables the logger
   */
  disable() {
    this.disabled = true;
    this.clearPendingLogs();
  }
  /**
   * Enables the logger
   */
  enable() {
    this.disabled = false;
  }
  /**
   * Clears pending logs
   */
  clearPendingLogs() {
    this.pendingLogs = [];
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
  /**
   * Validate and format status code for API compatibility
   * @param status - HTTP status code
   * @returns Valid status code and its label
   * @private
   */
  _validateStatus(status) {
    const statusStr = status.toString();
    const validStatus = STATUS_OPTIONS.find((option) => option.value === statusStr);
    if (validStatus) {
      return {
        code: statusStr,
        label: validStatus.label
      };
    } else {
      const defaultStatus = STATUS_OPTIONS.find((option) => option.value === "500");
      return {
        code: "500",
        label: defaultStatus ? defaultStatus.label : "500 - Internal Server Error"
      };
    }
  }
  /**
   * Determine the appropriate userAgent
   * @returns UserAgent string
   */
  _getUserAgent() {
    return "SDK";
  }
  /**
   * Processes the pending logs batch
   */
  async processBatch() {
    if (this.disabled || this.pendingLogs.length === 0 || this.isBatchProcessing) {
      return;
    }
    this.isBatchProcessing = true;
    this.batchTimeout = null;
    try {
      const logBatch = [...this.pendingLogs];
      this.pendingLogs = [];
      const userAgent = this._getUserAgent();
      const batchData = logBatch.map((log) => {
        const validatedStatus = this._validateStatus(log.status);
        return {
          userId: this.userId,
          apiKey: this.apiKey,
          endpoint: log.endpoint,
          status: validatedStatus.code,
          statusLabel: validatedStatus.label,
          method: log.method,
          userAgent,
          timestamp: (/* @__PURE__ */ new Date()).toISOString()
        };
      });
      await this.http.request("POST", "/api/logs", { body: { logs: batchData }, timeout: 5e3 }).catch((err) => {
        this.debug.warn("Warning processing logs batch:", err?.message || "Unknown error");
      });
    } catch (error) {
      this.debug.warn("Error processing logs batch:", error.message || "Unknown error");
    } finally {
      this.isBatchProcessing = false;
      if (this.pendingLogs.length > 0) {
        this.scheduleBatchProcessing();
      }
    }
  }
  /**
   * Schedules batch processing
   */
  scheduleBatchProcessing() {
    if (!this.batchTimeout && !this.disabled) {
      this.batchTimeout = setTimeout(() => this.processBatch(), 1e3);
    }
  }
  /**
   * Logs an operation to be sent in batch to the logs API
   */
  async log(endpoint, status, method) {
    if (this.disabled) return;
    this.pendingLogs.push({ endpoint, status, method });
    this.scheduleBatchProcessing();
  }
};
var MetiganError2 = class extends Error {
  constructor(message) {
    super(message);
    this.name = "MetiganError";
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
};
var Metigan = class {
  /**
   * Create a new Metigan client
   * @param apiKey - Your API key
   * @param options - Client options
   */
  constructor(apiKey, options = {}) {
    if (!apiKey) {
      throw new MetiganError2("API key is required");
    }
    if (apiKey.length < 10) {
      throw new MetiganError2("Invalid API key format");
    }
    this.http = new HttpClient({
      apiKey,
      baseUrl: options.baseUrl,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay
    });
    this.debug = getDebugLogger(options.debug || false);
    this.shouldSanitizeHtml = options.sanitizeHtml !== false;
    if (options.enableRateLimit !== false) {
      this.rateLimiter = new RateLimiter({
        maxRequests: options.maxRequestsPerSecond || 10,
        windowMs: 1e3
      });
    } else {
      this.rateLimiter = null;
    }
    const userId = options.userId || "anonymous";
    this.logger = new MetiganLogger(this.http, apiKey, userId, options.debug || false);
    if (options.disableLogs) {
      this.logger.disable();
    }
    this.debug.log("Metigan client initialized");
  }
  /**
   * Enables logging
   */
  enableLogging() {
    this.logger.enable();
  }
  /**
   * Disables logging
   */
  disableLogging() {
    this.logger.disable();
  }
  /**
   * Validates an email address format
   * @param email - The email to validate
   * @returns True if email is valid
   * @private
   */
  _validateEmail(email) {
    if (!email || typeof email !== "string") return false;
    const parts = email.split("@");
    if (parts.length !== 2) return false;
    if (parts[0].length === 0) return false;
    const domainParts = parts[1].split(".");
    if (domainParts.length < 2) return false;
    if (domainParts.some((part) => part.length === 0)) return false;
    return true;
  }
  /**
   * Extracts email address from a format like "Name <email@example.com>"
   * @param from - The from field which might include a name
   * @returns The extracted email address
   * @private
   */
  _extractEmailAddress(from) {
    if (!from) return "";
    const angleMatch = from.match(/<([^>]+)>/);
    if (angleMatch) {
      return angleMatch[1].trim();
    }
    return from.trim();
  }
  /**
   * Validates email message data
   * @param messageData - The email message data
   * @returns Validation result with status and error message
   * @private
   */
  _validateMessageData(messageData) {
    if (!messageData.from) {
      return { isValid: false, error: "Sender email (from) is required" };
    }
    if (!messageData.recipients || !Array.isArray(messageData.recipients) || messageData.recipients.length === 0) {
      return { isValid: false, error: "Recipients must be a non-empty array" };
    }
    if (!messageData.subject) {
      return { isValid: false, error: "Subject is required" };
    }
    if (!messageData.content && !messageData.templateId) {
      return { isValid: false, error: "Either content or templateId is required" };
    }
    const fromEmail = this._extractEmailAddress(messageData.from);
    if (!fromEmail || !this._validateEmail(fromEmail)) {
      return { isValid: false, error: `Invalid sender email format: ${fromEmail}` };
    }
    for (const recipient of messageData.recipients) {
      const recipientEmail = this._extractEmailAddress(recipient);
      if (!recipientEmail || !this._validateEmail(recipientEmail)) {
        return { isValid: false, error: `Invalid recipient email format: ${recipientEmail}` };
      }
    }
    if (messageData.cc && Array.isArray(messageData.cc)) {
      for (const cc of messageData.cc) {
        const ccEmail = this._extractEmailAddress(cc);
        if (!ccEmail || !this._validateEmail(ccEmail)) {
          return { isValid: false, error: `Invalid CC email format: ${ccEmail}` };
        }
      }
    }
    if (messageData.bcc && Array.isArray(messageData.bcc)) {
      for (const bcc of messageData.bcc) {
        const bccEmail = this._extractEmailAddress(bcc);
        if (!bccEmail || !this._validateEmail(bccEmail)) {
          return { isValid: false, error: `Invalid BCC email format: ${bccEmail}` };
        }
      }
    }
    if (messageData.replyTo) {
      const replyToEmail = this._extractEmailAddress(messageData.replyTo);
      if (!replyToEmail || !this._validateEmail(replyToEmail)) {
        return { isValid: false, error: `Invalid reply-to email format: ${replyToEmail}` };
      }
    }
    return { isValid: true };
  }
  /**
   * Process attachments for the email
   * @param attachments - Array of files or file-like objects
   * @returns Processed attachments
   * @private
   */
  async _processAttachments(attachments) {
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
      return [];
    }
    const processedAttachments = [];
    for (const file of attachments) {
      let buffer;
      let filename;
      let mimetype;
      if (typeof File !== "undefined" && file instanceof File) {
        if (file.size > MAX_FILE_SIZE) {
          throw new MetiganError2(`File ${file.name} exceeds the maximum size of 7MB`);
        }
        buffer = await file.arrayBuffer();
        filename = file.name;
        mimetype = file.type || this._getMimeType(file.name);
      } else if ("buffer" in file && "originalname" in file) {
        const nodeFile = file;
        if (nodeFile.buffer.length > MAX_FILE_SIZE) {
          throw new MetiganError2(`File ${nodeFile.originalname} exceeds the maximum size of 7MB`);
        }
        buffer = nodeFile.buffer;
        filename = nodeFile.originalname;
        mimetype = nodeFile.mimetype || this._getMimeType(nodeFile.originalname);
      } else if ("content" in file && "filename" in file) {
        const customFile = file;
        let contentSize = 0;
        if (customFile.content instanceof ArrayBuffer) {
          contentSize = customFile.content.byteLength;
        } else if (customFile.content instanceof Buffer || customFile.content instanceof Uint8Array) {
          contentSize = customFile.content.length;
        } else if (typeof customFile.content === "string") {
          contentSize = Buffer.from(customFile.content).length;
        }
        if (contentSize > MAX_FILE_SIZE) {
          throw new MetiganError2(`File ${customFile.filename} exceeds the maximum size of 7MB`);
        }
        buffer = customFile.content;
        filename = customFile.filename;
        mimetype = customFile.contentType || this._getMimeType(customFile.filename);
      } else {
        throw new MetiganError2("Invalid attachment format");
      }
      let content = buffer;
      if (typeof window !== "undefined") {
        if (buffer instanceof ArrayBuffer) {
          const uint8Array = new Uint8Array(buffer);
          const binary = Array.from(uint8Array).map((b) => String.fromCharCode(b)).join("");
          content = btoa(binary);
        } else if (buffer instanceof Uint8Array) {
          const binary = Array.from(buffer).map((b) => String.fromCharCode(b)).join("");
          content = btoa(binary);
        }
      }
      processedAttachments.push({
        filename,
        content,
        contentType: mimetype,
        encoding: "base64",
        disposition: "attachment"
      });
    }
    return processedAttachments;
  }
  /**
   * Validate attachments for security
   * @param attachments - Array of attachments to validate
   * @throws MetiganError if validation fails
   * @private
   */
  async _validateAttachments(attachments) {
    for (const file of attachments) {
      let filename;
      let mimetype;
      if (typeof File !== "undefined" && file instanceof File) {
        filename = file.name;
        mimetype = file.type;
      } else if ("buffer" in file && "originalname" in file) {
        const nodeFile = file;
        filename = nodeFile.originalname;
        mimetype = nodeFile.mimetype;
      } else if ("content" in file && "filename" in file) {
        const customFile = file;
        filename = customFile.filename;
        mimetype = customFile.contentType;
      } else {
        throw new MetiganError2("Invalid attachment format");
      }
      if (!isSafeFileExtension(filename)) {
        throw new MetiganError2(`File extension not allowed for security reasons: ${filename}`);
      }
      if (mimetype && !isAllowedMimeType(mimetype)) {
        this.debug.warn(`MIME type not in allowlist: ${mimetype} for ${filename}`);
      }
    }
  }
  /**
   * Get MIME type based on file extension
   * @param filename - File name
   * @returns MIME type
   * @private
   */
  _getMimeType(filename) {
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeMap = {
      "pdf": "application/pdf",
      "doc": "application/msword",
      "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "xls": "application/vnd.ms-excel",
      "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "ppt": "application/vnd.ms-powerpoint",
      "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "jpg": "image/jpeg",
      "jpeg": "image/jpeg",
      "png": "image/png",
      "gif": "image/gif",
      "svg": "image/svg+xml",
      "txt": "text/plain",
      "html": "text/html",
      "css": "text/css",
      "js": "application/javascript",
      "json": "application/json",
      "xml": "application/xml",
      "zip": "application/zip",
      "rar": "application/x-rar-compressed",
      "tar": "application/x-tar",
      "mp3": "audio/mpeg",
      "mp4": "video/mp4",
      "wav": "audio/wav",
      "avi": "video/x-msvideo",
      "csv": "text/csv"
    };
    return ext && mimeMap[ext] ? mimeMap[ext] : "application/octet-stream";
  }
  /**
   * Send an email
   * @param options - Email options
   * @returns Response from the API
   */
  async sendEmail(options) {
    if (this.rateLimiter && !this.rateLimiter.tryRequest()) {
      const waitTime = this.rateLimiter.getTimeUntilNextRequest();
      throw new MetiganError2(`Rate limit exceeded. Please wait ${waitTime}ms before making another request.`);
    }
    let statusCode = 500;
    try {
      const validation = this._validateMessageData(options);
      if (!validation.isValid) {
        throw new MetiganError2(validation.error || "Invalid email data");
      }
      const sanitizedOptions = {
        ...options,
        from: sanitizeEmail(options.from),
        recipients: options.recipients.map((r) => sanitizeEmail(r)),
        subject: sanitizeSubject(options.subject),
        content: options.content ? this.shouldSanitizeHtml ? sanitizeHtml(options.content) : options.content : void 0,
        templateId: options.templateId,
        cc: options.cc?.map((c) => sanitizeEmail(c)),
        bcc: options.bcc?.map((b) => sanitizeEmail(b)),
        replyTo: options.replyTo ? sanitizeEmail(options.replyTo) : void 0
      };
      const useTemplate = !!options.templateId;
      this.debug.log("Email sanitized and validated");
      let formData;
      const attachmentsAreFileLike = !!options.attachments && options.attachments.length > 0 && options.attachments.every(
        (a) => typeof File !== "undefined" && a instanceof File || typeof Blob !== "undefined" && a instanceof Blob
      );
      if (options.attachments && options.attachments.length > 0) {
        await this._validateAttachments(options.attachments);
        if (attachmentsAreFileLike) {
          formData = new FormData();
          formData.append("from", sanitizedOptions.from);
          formData.append("recipients", JSON.stringify(sanitizedOptions.recipients));
          formData.append("subject", sanitizedOptions.subject);
          if (useTemplate && sanitizedOptions.templateId) {
            formData.append("useTemplate", "true");
            formData.append("templateId", sanitizedOptions.templateId);
          } else if (sanitizedOptions.content) {
            formData.append("content", sanitizedOptions.content);
          }
          if (sanitizedOptions.cc && sanitizedOptions.cc.length > 0) {
            formData.append("cc", JSON.stringify(sanitizedOptions.cc));
          }
          if (sanitizedOptions.bcc && sanitizedOptions.bcc.length > 0) {
            formData.append("bcc", JSON.stringify(sanitizedOptions.bcc));
          }
          if (sanitizedOptions.replyTo) {
            formData.append("replyTo", sanitizedOptions.replyTo);
          }
          for (const file of options.attachments) {
            formData.append("files", file, file.name);
          }
        } else {
          const processedAttachments = await this._processAttachments(options.attachments);
          formData = {
            from: sanitizedOptions.from,
            recipients: sanitizedOptions.recipients,
            subject: sanitizedOptions.subject,
            attachments: processedAttachments
          };
          if (useTemplate && sanitizedOptions.templateId) {
            formData.useTemplate = "true";
            formData.templateId = sanitizedOptions.templateId;
          } else if (sanitizedOptions.content) {
            formData.content = sanitizedOptions.content;
          }
          if (sanitizedOptions.cc && sanitizedOptions.cc.length > 0) {
            formData.cc = sanitizedOptions.cc;
          }
          if (sanitizedOptions.bcc && sanitizedOptions.bcc.length > 0) {
            formData.bcc = sanitizedOptions.bcc;
          }
          if (sanitizedOptions.replyTo) {
            formData.replyTo = sanitizedOptions.replyTo;
          }
        }
      } else {
        formData = {
          from: sanitizedOptions.from,
          recipients: sanitizedOptions.recipients,
          subject: sanitizedOptions.subject
        };
        if (useTemplate && sanitizedOptions.templateId) {
          formData.useTemplate = "true";
          formData.templateId = sanitizedOptions.templateId;
        } else if (sanitizedOptions.content) {
          formData.content = sanitizedOptions.content;
        }
        if (sanitizedOptions.cc && sanitizedOptions.cc.length > 0) {
          formData.cc = sanitizedOptions.cc;
        }
        if (sanitizedOptions.bcc && sanitizedOptions.bcc.length > 0) {
          formData.bcc = sanitizedOptions.bcc;
        }
        if (sanitizedOptions.replyTo) {
          formData.replyTo = sanitizedOptions.replyTo;
        }
      }
      try {
        const isMultipart = typeof FormData !== "undefined" && formData instanceof FormData;
        const response = await this.http.request(
          "POST",
          "/api/email/send",
          isMultipart ? { form: formData } : { body: formData }
        );
        statusCode = 200;
        await this.logger.log(
          `/email/send`,
          statusCode,
          "POST"
        );
        return response;
      } catch (httpError) {
        if (httpError.status) {
          statusCode = httpError.status;
        }
        await this.logger.log(
          `/email/send`,
          statusCode,
          "POST"
        );
        if (httpError.status) {
          if (httpError.data && httpError.data.error) {
            throw new MetiganError2(httpError.data.message || httpError.data.error);
          } else {
            throw new MetiganError2(`Request failed with status ${httpError.status}`);
          }
        }
        throw new MetiganError2("Failed to connect to the email service");
      }
    } catch (error) {
      await this.logger.log(
        `/email/send/error`,
        statusCode,
        "POST"
      );
      if (error instanceof MetiganError2) {
        throw error;
      }
      throw new MetiganError2("An unexpected error occurred while sending email");
    }
  }
  /**
  * Generates a unique tracking ID for email analytics
  * @returns A unique tracking ID string
  * @private
  */
  /**
   * Send OTP email (fast lane)
   * @param options - OTP send options
   */
  async sendOtp(options) {
    const recipient = options.to || options.email;
    if (!recipient) {
      throw new MetiganError2("Recipient email is required");
    }
    if (!options.from) {
      throw new MetiganError2("Sender email (from) is required");
    }
    if (!options.code) {
      throw new MetiganError2("OTP code is required");
    }
    const payload = {
      ...options.to ? { to: recipient } : { email: recipient },
      from: sanitizeEmail(options.from),
      code: options.code,
      appName: options.appName,
      expiresInMinutes: options.expiresInMinutes,
      subject: options.subject ? sanitizeSubject(options.subject) : void 0,
      idempotencyKey: options.idempotencyKey
    };
    return this.http.request("POST", "/api/otp/send", { body: payload });
  }
  /**
   * Send transactional email (fast lane)
   * @param options - Transactional send options
   */
  async sendTransactional(options) {
    const recipient = options.to || options.email;
    if (!recipient) {
      throw new MetiganError2("Recipient email is required");
    }
    if (!options.from) {
      throw new MetiganError2("Sender email (from) is required");
    }
    if (!options.subject) {
      throw new MetiganError2("Subject is required");
    }
    const content = options.content || options.html;
    if (!content) {
      throw new MetiganError2("Content or html is required");
    }
    const payload = {
      ...options.to ? { to: recipient } : { email: recipient },
      from: sanitizeEmail(options.from),
      subject: sanitizeSubject(options.subject),
      content: this.shouldSanitizeHtml ? sanitizeHtml(content) : content,
      idempotencyKey: options.idempotencyKey
    };
    return this.http.request("POST", "/api/transactional/send", { body: payload });
  }
  /**
   * Enable debug mode
   */
  enableDebug() {
    this.debug.enable();
  }
  /**
   * Disable debug mode
   */
  disableDebug() {
    this.debug.disable();
  }
  /**
   * Reset rate limiter (useful for testing)
   */
  resetRateLimit() {
    if (this.rateLimiter) {
      this.rateLimiter.reset();
    }
  }
  /**
   * Check if rate limit allows a request
   * @returns True if request is allowed
   */
  canMakeRequest() {
    if (!this.rateLimiter) return true;
    return this.rateLimiter.canMakeRequest();
  }
  /**
   * Get time until next request is allowed (in ms)
   * @returns Milliseconds until next request is allowed, or 0 if allowed now
   */
  getTimeUntilNextRequest() {
    if (!this.rateLimiter) return 0;
    return this.rateLimiter.getTimeUntilNextRequest();
  }
};
var metigan_default = Metigan;

// src/lib/forms.ts
var MetiganForms = class {
  /**
   * Create a new MetiganForms instance
   * @param options - Forms module options
   */
  constructor(options) {
    this.http = new HttpClient(options);
  }
  makeRequest(method, endpoint, data) {
    return this.http.request(method, endpoint, { body: data });
  }
  /**
   * Submit data to a form
   * @param options - Submission options
   * @returns Submission response
   */
  async submit(options) {
    if (!options.formId) {
      throw new ValidationError("Form ID is required");
    }
    if (!options.data || Object.keys(options.data).length === 0) {
      throw new ValidationError("Submission data is required");
    }
    const response = await this.makeRequest(
      "POST",
      "/api/submissions",
      {
        formId: options.formId,
        data: options.data
      }
    );
    return response;
  }
  /**
   * Get form by ID or slug
   * @param formIdOrSlug - Form ID or slug
   * @returns Form configuration
   */
  async getForm(formIdOrSlug) {
    if (!formIdOrSlug) {
      throw new ValidationError("Form ID or slug is required");
    }
    const response = await this.makeRequest(
      "GET",
      `/api/forms/${formIdOrSlug}`
    );
    return response;
  }
  /**
   * Get form by slug (public)
   * @param slug - Form slug
   * @returns Form configuration for public display
   */
  async getPublicForm(slug) {
    if (!slug) {
      throw new ValidationError("Form slug is required");
    }
    const response = await this.makeRequest(
      "GET",
      `/f/${slug}/api`
    );
    return response;
  }
  /**
   * List all forms
   * @param options - Pagination options
   * @returns List of forms
   */
  async listForms(options) {
    const params = new URLSearchParams();
    if (options?.page) {
      params.append("page", options.page.toString());
    }
    if (options?.limit) {
      params.append("limit", options.limit.toString());
    }
    const queryString = params.toString();
    const endpoint = queryString ? `/api/forms?${queryString}` : "/api/forms";
    const response = await this.makeRequest("GET", endpoint);
    return response;
  }
  /**
   * Get form analytics
   * @param formId - Form ID
   * @returns Form analytics data
   */
  async getAnalytics(formId) {
    if (!formId) {
      throw new ValidationError("Form ID is required");
    }
    const response = await this.makeRequest(
      "GET",
      `/api/forms/${formId}/analytics`
    );
    return response;
  }
  /**
   * Create a new form
   * @param config - Form configuration
   * @returns Created form
   */
  async createForm(config) {
    if (!config.title) {
      throw new ValidationError("Form title is required");
    }
    if (!config.fields || config.fields.length === 0) {
      throw new ValidationError("At least one field is required");
    }
    const response = await this.makeRequest("POST", "/api/forms", config);
    return response;
  }
  /**
   * Update an existing form
   * @param formId - Form ID
   * @param config - Updated form configuration
   * @returns Updated form
   */
  async updateForm(formId, config) {
    if (!formId) {
      throw new ValidationError("Form ID is required");
    }
    const response = await this.makeRequest(
      "PUT",
      `/api/forms/${formId}`,
      config
    );
    return response;
  }
  /**
   * Delete a form
   * @param formId - Form ID
   * @returns Success status
   */
  async deleteForm(formId) {
    if (!formId) {
      throw new ValidationError("Form ID is required");
    }
    const response = await this.makeRequest(
      "DELETE",
      `/api/forms/${formId}`
    );
    return response;
  }
  /**
   * Publish a form
   * @param formId - Form ID
   * @param slug - Optional custom slug
   * @returns Published form URL
   */
  async publishForm(formId, slug) {
    if (!formId) {
      throw new ValidationError("Form ID is required");
    }
    const response = await this.makeRequest(
      "POST",
      `/api/forms/${formId}/publish`,
      { slug }
    );
    return response;
  }
  /**
   * Unpublish a form
   * @param formId - Form ID
   * @returns Success status
   */
  async unpublishForm(formId) {
    if (!formId) {
      throw new ValidationError("Form ID is required");
    }
    const response = await this.makeRequest(
      "DELETE",
      `/api/forms/${formId}/publish`
    );
    return response;
  }
  /**
   * Get form submissions
   * @param formId - Form ID
   * @param options - Pagination options
   * @returns List of submissions
   */
  async getSubmissions(formId, options) {
    if (!formId) {
      throw new ValidationError("Form ID is required");
    }
    const params = new URLSearchParams();
    params.append("formId", formId);
    if (options?.page) {
      params.append("page", options.page.toString());
    }
    if (options?.limit) {
      params.append("limit", options.limit.toString());
    }
    const response = await this.makeRequest(
      "GET",
      `/api/submissions?${params.toString()}`
    );
    return response;
  }
};

// src/core/normalize.ts
function withId(obj) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    const rec = obj;
    if (rec.id === void 0 && typeof rec._id === "string") {
      return { ...rec, id: rec._id };
    }
  }
  return obj;
}
function withIds(arr) {
  return Array.isArray(arr) ? arr.map((x) => withId(x)) : arr;
}

// src/lib/contacts.ts
var MetiganContacts = class {
  /**
   * Create a new MetiganContacts instance
   * @param options - Contacts module options
   */
  constructor(options) {
    this.http = new HttpClient(options);
  }
  /** Validate email format (local, before hitting the API). */
  validateEmail(email) {
    if (!email || typeof email !== "string") return false;
    const parts = email.split("@");
    if (parts.length !== 2) return false;
    if (parts[0].length === 0) return false;
    const domainParts = parts[1].split(".");
    if (domainParts.length < 2) return false;
    if (domainParts.some((part) => part.length === 0)) return false;
    return true;
  }
  request(method, endpoint, data, params) {
    return this.http.request(method, endpoint, { body: data, query: params });
  }
  /**
   * Create a new contact
   * @param options - Contact creation options
   * @returns Created contact
   */
  async create(options) {
    if (!options.email) {
      throw new ValidationError("Email is required");
    }
    if (!this.validateEmail(options.email)) {
      throw new ValidationError("Invalid email format");
    }
    if (!options.audienceId) {
      throw new ValidationError("Audience ID is required");
    }
    const response = await this.request("POST", "/api/contacts", {
      email: options.email.toLowerCase().trim(),
      firstName: options.firstName,
      lastName: options.lastName,
      phone: options.phone,
      audienceId: options.audienceId,
      tags: options.tags || [],
      customFields: options.customFields || {},
      status: options.status || "subscribed"
    });
    return withId(response);
  }
  /**
   * Get a contact by ID
   * @param contactId - Contact ID
   * @returns Contact data
   */
  async get(contactId) {
    if (!contactId) {
      throw new ValidationError("Contact ID is required");
    }
    return withId(await this.request("GET", `/api/contacts/${encodeURIComponent(contactId)}`));
  }
  /**
   * Get a contact by email
   * @param email - Contact email
   * @param audienceId - Audience ID
   * @returns Contact data
   */
  async getByEmail(email, audienceId) {
    if (!email) {
      throw new ValidationError("Email is required");
    }
    if (!audienceId) {
      throw new ValidationError("Audience ID is required");
    }
    return withId(
      await this.request("GET", `/api/contacts/email/${encodeURIComponent(email)}`, void 0, { audienceId })
    );
  }
  /**
   * Update a contact
   * @param contactId - Contact ID
   * @param options - Update options
   * @returns Updated contact
   */
  async update(contactId, options) {
    if (!contactId) {
      throw new ValidationError("Contact ID is required");
    }
    return withId(await this.request("PATCH", `/api/contacts/${encodeURIComponent(contactId)}`, options));
  }
  /**
   * Delete a contact
   * @param contactId - Contact ID
   * @param audienceId - Audience ID (required by the server)
   * @returns Success status
   */
  async delete(contactId, audienceId) {
    if (!contactId) {
      throw new ValidationError("Contact ID is required");
    }
    return this.request(
      "DELETE",
      `/api/contacts/${encodeURIComponent(contactId)}`,
      void 0,
      audienceId ? { audienceId } : void 0
    );
  }
  /**
   * List contacts with filters
   * @param filters - List filters
   * @returns Contact list
   */
  async list(filters) {
    const response = await this.request("GET", "/api/contacts", void 0, {
      audienceId: filters?.audienceId,
      status: filters?.status,
      tag: filters?.tag,
      search: filters?.search,
      page: filters?.page,
      limit: filters?.limit
    });
    if (response && Array.isArray(response.contacts)) {
      response.contacts = withIds(response.contacts);
    }
    return response;
  }
  /**
   * Subscribe a contact (set status to subscribed)
   * @param contactId - Contact ID
   * @returns Updated contact
   */
  async subscribe(contactId) {
    return this.update(contactId, { status: "subscribed" });
  }
  /**
   * Unsubscribe a contact
   * @param contactId - Contact ID
   * @returns Updated contact
   */
  async unsubscribe(contactId) {
    return this.update(contactId, { status: "unsubscribed" });
  }
  /**
   * Add tags to a contact
   * @param contactId - Contact ID
   * @param tags - Tags to add
   * @returns Updated contact
   */
  async addTags(contactId, tags) {
    if (!contactId) {
      throw new ValidationError("Contact ID is required");
    }
    if (!tags || tags.length === 0) {
      throw new ValidationError("At least one tag is required");
    }
    return withId(await this.request("POST", `/api/contacts/${encodeURIComponent(contactId)}/tags`, { tags }));
  }
  /**
   * Remove tags from a contact
   * @param contactId - Contact ID
   * @param tags - Tags to remove
   * @returns Updated contact
   */
  async removeTags(contactId, tags) {
    if (!contactId) {
      throw new ValidationError("Contact ID is required");
    }
    if (!tags || tags.length === 0) {
      throw new ValidationError("At least one tag is required");
    }
    return withId(await this.request("DELETE", `/api/contacts/${encodeURIComponent(contactId)}/tags`, { tags }));
  }
  /**
   * Bulk import contacts into an audience
   * @param contacts - Array of contacts to import
   * @param audienceId - Target audience ID
   * @returns Import result
   */
  async bulkImport(contacts, audienceId) {
    if (!contacts || contacts.length === 0) {
      throw new ValidationError("At least one contact is required");
    }
    if (!audienceId) {
      throw new ValidationError("Audience ID is required");
    }
    const invalidEmails = contacts.filter((c) => !this.validateEmail(c.email));
    if (invalidEmails.length > 0) {
      throw new ValidationError(`Invalid email format for: ${invalidEmails.map((c) => c.email).join(", ")}`);
    }
    return this.request("POST", "/api/contacts/bulk", {
      contacts: contacts.map((c) => ({ ...c, email: c.email.toLowerCase().trim() })),
      audienceId
    });
  }
  async export(audienceId, format = "json") {
    if (!audienceId) {
      throw new ValidationError("Audience ID is required");
    }
    if (format === "csv") {
      return this.request("GET", "/api/contacts/export", void 0, { audienceId, format: "csv" });
    }
    const response = await this.request("GET", "/api/contacts/export", void 0, {
      audienceId,
      format: "json"
    });
    return withIds(response?.data ?? []);
  }
  /**
   * Search contacts
   * @param query - Search query (min 2 characters)
   * @param audienceId - Optional audience ID to filter
   * @returns Matching contacts
   */
  async search(query, audienceId) {
    if (!query || query.length < 2) {
      throw new ValidationError("Search query must be at least 2 characters");
    }
    const response = await this.request("GET", "/api/contacts/search", void 0, {
      q: query,
      audienceId
    });
    return withIds(response?.contacts ?? []);
  }
};

// src/lib/audiences.ts
var MetiganAudiences = class {
  /**
   * Create a new MetiganAudiences instance
   * @param options - Audiences module options
   */
  constructor(options) {
    this.http = new HttpClient(options);
  }
  makeRequest(method, endpoint, data, params) {
    return this.http.request(method, endpoint, { body: data, query: params });
  }
  /**
   * Create a new audience
   * @param options - Audience creation options
   * @returns Created audience
   */
  async create(options) {
    if (!options.name) {
      throw new ValidationError("Audience name is required");
    }
    if (options.name.length < 2) {
      throw new ValidationError("Audience name must be at least 2 characters");
    }
    const response = await this.makeRequest("POST", "/api/audiences", {
      name: options.name.trim(),
      description: options.description?.trim()
    });
    return withId(response);
  }
  /**
   * Get an audience by ID
   * @param audienceId - Audience ID
   * @returns Audience data
   */
  async get(audienceId) {
    if (!audienceId) {
      throw new ValidationError("Audience ID is required");
    }
    const response = await this.makeRequest("GET", `/api/audiences/${encodeURIComponent(audienceId)}`);
    return withId(response);
  }
  /**
   * Update an audience
   * @param audienceId - Audience ID
   * @param options - Update options
   * @returns Updated audience
   */
  async update(audienceId, options) {
    if (!audienceId) {
      throw new ValidationError("Audience ID is required");
    }
    if (options.name && options.name.length < 2) {
      throw new ValidationError("Audience name must be at least 2 characters");
    }
    const response = await this.makeRequest(
      "PATCH",
      `/api/audiences/${encodeURIComponent(audienceId)}`,
      {
        name: options.name?.trim(),
        description: options.description?.trim()
      }
    );
    return withId(response);
  }
  /**
   * Delete an audience
   * @param audienceId - Audience ID
   * @returns Success status
   */
  async delete(audienceId) {
    if (!audienceId) {
      throw new ValidationError("Audience ID is required");
    }
    const response = await this.makeRequest(
      "DELETE",
      `/api/audiences/${audienceId}`
    );
    return response;
  }
  /**
   * List all audiences
   * @param options - Pagination options
   * @returns Audience list
   */
  async list(options) {
    const params = new URLSearchParams();
    if (options?.page) {
      params.append("page", options.page.toString());
    }
    if (options?.limit) {
      params.append("limit", options.limit.toString());
    }
    const queryString = params.toString();
    const endpoint = queryString ? `/api/audiences?${queryString}` : "/api/audiences";
    const response = await this.makeRequest("GET", endpoint);
    if (response && Array.isArray(response.audiences)) {
      response.audiences = withIds(response.audiences);
    }
    return response;
  }
  /**
   * Get audience statistics
   * @param audienceId - Audience ID
   * @returns Audience statistics
   */
  async getStats(audienceId) {
    if (!audienceId) {
      throw new ValidationError("Audience ID is required");
    }
    const response = await this.makeRequest(
      "GET",
      `/api/audiences/${audienceId}/stats`
    );
    return response;
  }
  /**
   * Get total count of contacts in an audience
   * @param audienceId - Audience ID
   * @returns Contact count
   */
  async getCount(audienceId) {
    if (!audienceId) {
      throw new ValidationError("Audience ID is required");
    }
    const response = await this.makeRequest(
      "GET",
      `/api/audiences/${audienceId}/count`
    );
    return response.count;
  }
  /**
   * Merge two audiences
   * @param sourceAudienceId - Source audience ID (will be deleted)
   * @param targetAudienceId - Target audience ID (will receive contacts)
   * @returns Merged audience
   */
  async merge(sourceAudienceId, targetAudienceId) {
    if (!sourceAudienceId) {
      throw new ValidationError("Source audience ID is required");
    }
    if (!targetAudienceId) {
      throw new ValidationError("Target audience ID is required");
    }
    if (sourceAudienceId === targetAudienceId) {
      throw new ValidationError("Source and target audiences must be different");
    }
    const response = await this.makeRequest(
      "POST",
      "/api/audiences/merge",
      {
        sourceAudienceId,
        targetAudienceId
      }
    );
    return withId(response);
  }
  /**
   * Duplicate an audience
   * @param audienceId - Audience ID to duplicate
   * @param newName - Name for the new audience
   * @returns New duplicated audience
   */
  async duplicate(audienceId, newName) {
    if (!audienceId) {
      throw new ValidationError("Audience ID is required");
    }
    if (!newName || newName.length < 2) {
      throw new ValidationError("New audience name must be at least 2 characters");
    }
    const response = await this.makeRequest(
      "POST",
      `/api/audiences/${encodeURIComponent(audienceId)}/duplicate`,
      { name: newName.trim() }
    );
    return withId(response);
  }
  /**
   * Clean audience (remove bounced and unsubscribed contacts)
   * @param audienceId - Audience ID
   * @returns Cleanup result
   */
  async clean(audienceId) {
    if (!audienceId) {
      throw new ValidationError("Audience ID is required");
    }
    const response = await this.makeRequest(
      "POST",
      `/api/audiences/${audienceId}/clean`
    );
    return response;
  }
  /**
   * Search audiences by name
   * @param query - Search query
   * @returns Matching audiences
   */
  async search(query) {
    if (!query || query.length < 2) {
      throw new ValidationError("Search query must be at least 2 characters");
    }
    const response = await this.makeRequest(
      "GET",
      "/api/audiences/search",
      void 0,
      { q: query }
    );
    return withIds(response.audiences);
  }
};

// src/lib/templates.ts
var MetiganTemplates = class {
  constructor(options) {
    this.http = new HttpClient(options);
  }
  makeRequest(method, endpoint, data) {
    return this.http.request(method, endpoint, { body: data });
  }
  /**
   * List all templates
   * @param options - Pagination options
   * @returns List of templates with pagination info
   * 
   * @example
   * ```typescript
   * const templates = await metigan.templates.list();
   * console.log(templates.templates); // Array of templates
   * ```
   */
  async list(options = {}) {
    const params = new URLSearchParams();
    if (options.page) params.append("page", options.page.toString());
    if (options.limit) params.append("limit", options.limit.toString());
    const queryString = params.toString();
    const url = `/api/templates${queryString ? `?${queryString}` : ""}`;
    return this.makeRequest("GET", url);
  }
  /**
   * Get a specific template by ID
   * @param templateId - The template ID
   * @returns Template details
   * 
   * @example
   * ```typescript
   * const template = await metigan.templates.get('template-id');
   * console.log(template.name, template.subject);
   * ```
   */
  async get(templateId) {
    if (!templateId) {
      throw new MetiganError("Template ID is required");
    }
    const url = `/api/templates/${templateId}`;
    return this.makeRequest("GET", url);
  }
  /**
   * Check if a template exists
   * @param templateId - The template ID to check
   * @returns True if template exists
   * 
   * @example
   * ```typescript
   * const exists = await metigan.templates.exists('template-id');
   * if (exists) {
   *   // Template is valid, can use it for sending
   * }
   * ```
   */
  async exists(templateId) {
    try {
      await this.get(templateId);
      return true;
    } catch (error) {
      return false;
    }
  }
};

// src/lib/suppressions.ts
var BATCH = 1e3;
function day(v) {
  return v instanceof Date ? v.toISOString() : v;
}
var MetiganSuppressions = class {
  constructor(options) {
    this.http = new HttpClient(options);
  }
  request(method, endpoint, data) {
    return this.http.request(method, endpoint, { body: data });
  }
  /**
   * List suppressed addresses.
   *
   * @example
   * ```typescript
   * const { data, summary } = await metigan.suppressions.list({ reason: 'hard_bounce', search: '@acme.com' });
   * ```
   */
  async list(options = {}) {
    const p = new URLSearchParams();
    if (options.page) p.set("page", String(options.page));
    if (options.limit) p.set("limit", String(options.limit));
    if (options.reason) p.set("reason", options.reason);
    if (options.source) p.set("source", options.source);
    if (options.search) p.set("search", options.search);
    if (options.from) p.set("from", day(options.from));
    if (options.to) p.set("to", day(options.to));
    if (options.sort) p.set("sort", options.sort);
    const qs = p.toString();
    return this.request("GET", `/api/suppressions${qs ? `?${qs}` : ""}`);
  }
  /**
   * Look an address up: whether it is suppressed, why, and the changes made to it.
   */
  async get(email) {
    if (!email) throw new MetiganError("Email is required");
    const res = await this.request("GET", `/api/suppressions/${encodeURIComponent(email)}`);
    return res.data;
  }
  /**
   * Whether Metigan would refuse to send to `email`.
   *
   * @example
   * ```typescript
   * if (await metigan.suppressions.isSuppressed('ana@example.com')) { … }
   * ```
   */
  async isSuppressed(email) {
    return (await this.get(email)).suppressed;
  }
  /**
   * Suppress addresses (any number: sent in batches of 1000). Addresses
   * already suppressed keep their reason.
   *
   * @example
   * ```typescript
   * // Opt-outs recorded in your CRM:
   * await metigan.suppressions.add(['ana@example.com'], { reason: 'unsubscribe' });
   * ```
   */
  async add(emails, options = {}) {
    const list = (Array.isArray(emails) ? emails : [emails]).filter((e) => typeof e === "string" && e.trim() !== "");
    if (list.length === 0) throw new MetiganError("At least one email is required");
    const out = { added: [], alreadySuppressed: {}, invalid: [] };
    for (let i = 0; i < list.length; i += BATCH) {
      const res = await this.request("POST", "/api/suppressions", {
        emails: list.slice(i, i + BATCH),
        reason: options.reason ?? "manual",
        note: options.note
      });
      out.added.push(...res.data.added);
      Object.assign(out.alreadySuppressed, res.data.alreadySuppressed);
      out.invalid.push(...res.data.invalid);
    }
    return out;
  }
  /**
   * Remove one address from the list. Throws an ApiError with status 409
   * (`consent_required`) for an unsubscribe without `consent: true`, 403
   * (`support_only`) for a spam complaint and 404 when not suppressed.
   */
  async remove(email, options = {}) {
    if (!email) throw new MetiganError("Email is required");
    const p = new URLSearchParams();
    if (options.consent) p.set("consent", "true");
    if (options.note) p.set("note", options.note);
    const qs = p.toString();
    const res = await this.request(
      "DELETE",
      `/api/suppressions/${encodeURIComponent(email)}${qs ? `?${qs}` : ""}`
    );
    return res.data;
  }
  /**
   * Remove several addresses; each follows its removal policy and the
   * result says what happened to every one (never throws for policy).
   */
  async removeMany(emails, options = {}) {
    const list = emails.filter((e) => typeof e === "string" && e.trim() !== "");
    const out = { removed: [], notFound: [], supportOnly: [], consentRequired: [], invalid: [] };
    for (let i = 0; i < list.length; i += BATCH) {
      const res = await this.request("POST", "/api/suppressions/remove", {
        emails: list.slice(i, i + BATCH),
        consent: options.consent ?? false,
        note: options.note
      });
      for (const k of Object.keys(out)) out[k].push(...res.data[k]);
    }
    return out;
  }
};
function isSuppressionPolicyError(err) {
  return err instanceof ApiError && (err.status === 403 || err.status === 409);
}

// src/lib/webhooks.ts
var WEBHOOK_EVENT_NAMES = [
  "email.sent",
  "email.delivered",
  "email.opened",
  "email.clicked",
  "email.bounced",
  "email.complained",
  "email.unsubscribed",
  "email.failed",
  "contact.created",
  "contact.deleted",
  "audience.created",
  "audience.updated",
  "audience.deleted"
];
function isWebhookEvent(event, name) {
  return event.event === name;
}
var DEFAULT_TOLERANCE_SECONDS = 300;
var encoder = new TextEncoder();
async function verifyWebhook(rawBody, options) {
  const secret = options.secret;
  if (!secret) {
    throw new WebhookSignatureError(
      "A signing secret is required to verify the webhook.",
      "missing_secret"
    );
  }
  const signatureHeader = options.signature ?? getHeader(options.headers, "x-webhook-signature");
  if (!signatureHeader) {
    throw new WebhookSignatureError(
      "Missing the X-Webhook-Signature header.",
      "missing_signature"
    );
  }
  const parsed = parseSignatureHeader(signatureHeader);
  const headerTs = options.timestamp ?? getHeader(options.headers, "x-webhook-timestamp");
  const timestamp = parsed.timestamp ?? toNumber(headerTs);
  if (parsed.signatures.length === 0) {
    throw new WebhookSignatureError(
      "The X-Webhook-Signature header has no v1 signature.",
      "invalid_signature_format"
    );
  }
  const tolerance = options.toleranceSeconds ?? DEFAULT_TOLERANCE_SECONDS;
  if (tolerance > 0) {
    if (timestamp === void 0) {
      throw new WebhookSignatureError(
        "The signature has no timestamp; cannot enforce the tolerance window.",
        "invalid_signature_format"
      );
    }
    const now = options.nowSeconds ?? Math.floor(Date.now() / 1e3);
    if (Math.abs(now - timestamp) > tolerance) {
      throw new WebhookSignatureError(
        "The webhook timestamp is outside the tolerance window.",
        "timestamp_out_of_tolerance"
      );
    }
  }
  const bodyBytes = toBytes(rawBody);
  const signedTs = parsed.timestamp ?? timestamp;
  if (signedTs === void 0) {
    throw new WebhookSignatureError(
      "The signature has no timestamp to verify against.",
      "invalid_signature_format"
    );
  }
  const expected = await hmacSha256Hex(secret, signedTs, bodyBytes);
  const matched = parsed.signatures.some(
    (candidate) => constantTimeEqual(candidate, expected)
  );
  if (!matched) {
    throw new WebhookSignatureError(
      "No signature in the header matched the computed signature.",
      "no_signature_match"
    );
  }
  let event;
  try {
    event = JSON.parse(bytesToUtf8(bodyBytes));
  } catch {
    throw new WebhookSignatureError(
      "The webhook body is not valid JSON.",
      "invalid_payload"
    );
  }
  if (!event || typeof event !== "object" || typeof event.event !== "string") {
    throw new WebhookSignatureError(
      "The webhook body is not a Metigan event.",
      "invalid_payload"
    );
  }
  return event;
}
var MetiganWebhooks = class {
  constructor(options = {}) {
    this.options = options;
    /** Every event name Metigan can deliver. */
    this.events = WEBHOOK_EVENT_NAMES;
  }
  /**
   * Verify a webhook signature and return the typed event. The secret and
   * tolerance fall back to the ones this client was created with.
   */
  verify(rawBody, options = {}) {
    return verifyWebhook(rawBody, {
      ...options,
      secret: options.secret ?? this.options.secret,
      toleranceSeconds: options.toleranceSeconds ?? this.options.toleranceSeconds
    });
  }
  /** Narrow a verified event to a specific name (re-export of {@link isWebhookEvent}). */
  is(event, name) {
    return isWebhookEvent(event, name);
  }
};
function parseSignatureHeader(header) {
  const out = { signatures: [] };
  const tokens = header.split(/[\s,]+/).filter(Boolean);
  let sawScheme = false;
  for (const token of tokens) {
    const eq = token.indexOf("=");
    if (eq === -1) continue;
    const key = token.slice(0, eq);
    const value = token.slice(eq + 1);
    if (key === "t") {
      sawScheme = true;
      const n = toNumber(value);
      if (n !== void 0) out.timestamp = n;
    } else if (key === "v1") {
      sawScheme = true;
      if (value) out.signatures.push(value.toLowerCase());
    }
  }
  if (!sawScheme && /^[0-9a-f]+$/i.test(header.trim())) {
    out.signatures.push(header.trim().toLowerCase());
  }
  return out;
}
async function hmacSha256Hex(secret, timestamp, body) {
  const subtle = await getSubtle();
  const prefix = encoder.encode(`${timestamp}.`);
  const message = concatBytes(prefix, body);
  const key = await subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await subtle.sign("HMAC", key, message);
  return bufferToHex(signature);
}
var cachedSubtle;
async function getSubtle() {
  if (cachedSubtle) return cachedSubtle;
  const g = typeof globalThis !== "undefined" ? globalThis : {};
  if (g.crypto?.subtle) {
    cachedSubtle = g.crypto.subtle;
    return cachedSubtle;
  }
  try {
    const nodeCrypto = await import('crypto');
    if (nodeCrypto?.webcrypto?.subtle) {
      cachedSubtle = nodeCrypto.webcrypto.subtle;
      return cachedSubtle;
    }
  } catch {
  }
  throw new WebhookSignatureError(
    "The Web Crypto API is not available in this runtime.",
    "crypto_unavailable"
  );
}
function toBytes(body) {
  if (typeof body === "string") return encoder.encode(body);
  if (body instanceof Uint8Array) return body;
  if (body instanceof ArrayBuffer) return new Uint8Array(body);
  if (ArrayBuffer.isView(body)) {
    return new Uint8Array(body.buffer, body.byteOffset, body.byteLength);
  }
  throw new WebhookSignatureError(
    "Unsupported body type; pass a string, Buffer, Uint8Array or ArrayBuffer.",
    "invalid_payload"
  );
}
function bytesToUtf8(bytes) {
  return new TextDecoder("utf-8").decode(bytes);
}
function concatBytes(a, b) {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}
function bufferToHex(buffer) {
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}
function constantTimeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
function getHeader(headers, name) {
  if (!headers) return void 0;
  const lower = name.toLowerCase();
  if (typeof headers.get === "function") {
    const v = headers.get(name) ?? headers.get(lower);
    return v == null ? void 0 : String(v);
  }
  if (headers instanceof Map) {
    for (const [k, v] of headers) {
      if (k.toLowerCase() === lower) return Array.isArray(v) ? v[0] : String(v);
    }
    return void 0;
  }
  const obj = headers;
  for (const k of Object.keys(obj)) {
    if (k.toLowerCase() === lower) {
      const v = obj[k];
      return Array.isArray(v) ? v[0] : v;
    }
  }
  return void 0;
}
function toNumber(value) {
  if (value === void 0) return void 0;
  const raw = Array.isArray(value) ? value[0] : value;
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : void 0;
}

// src/index.ts
var Metigan2 = class {
  /**
   * Create a new Metigan client
   * @param options - Client options
   */
  constructor(options) {
    if (!options.apiKey) {
      throw new MetiganError("API key is required");
    }
    this.email = new Metigan(options.apiKey, {
      baseUrl: options.baseUrl,
      userId: options.userId,
      disableLogs: options.disableLogs,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay,
      debug: options.debug,
      sanitizeHtml: options.sanitizeHtml,
      enableRateLimit: options.enableRateLimit,
      maxRequestsPerSecond: options.maxRequestsPerSecond
    });
    this.forms = new MetiganForms({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay
    });
    this.contacts = new MetiganContacts({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay
    });
    this.audiences = new MetiganAudiences({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay
    });
    this.templates = new MetiganTemplates({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay
    });
    this.suppressions = new MetiganSuppressions({
      baseUrl: options.baseUrl,
      apiKey: options.apiKey,
      timeout: options.timeout,
      retryCount: options.retryCount,
      retryDelay: options.retryDelay
    });
    this.webhooks = new MetiganWebhooks({
      secret: options.webhookSecret
    });
  }
};
var src_default = Metigan2;

export { ALLOWED_MIME_TYPES, API_URL, ApiError, BLOCKED_MIME_TYPES, DEFAULT_RETRY_COUNT, DEFAULT_RETRY_DELAY, DEFAULT_TIMEOUT, DebugLogger, MAX_FILE_SIZE, Metigan2 as Metigan, MetiganAudiences, MetiganContacts, metigan_default as MetiganEmail, Metigan as MetiganEmailClient, MetiganError, MetiganForms, MetiganSuppressions, MetiganTemplates, MetiganWebhooks, RateLimiter, SDK_VERSION, ValidationError, WEBHOOK_EVENT_NAMES, WebhookSignatureError, src_default as default, isAllowedMimeType, isSafeFileExtension, isSuppressionPolicyError, isWebhookEvent, sanitizeEmail, sanitizeHtml, sanitizeSubject, verifyWebhook };
//# sourceMappingURL=index.js.map
//# sourceMappingURL=index.js.map