const logger = require('../utils/logger');
const promClient = require('prom-client');

// Metrics
const blockedRequestsCounter = new promClient.Counter({
  name: 'waf_blocked_requests_total',
  help: 'Total number of requests blocked by WAF',
  labelNames: ['reason', 'endpoint'],
});

const suspiciousActivityCounter = new promClient.Counter({
  name: 'waf_suspicious_activity_total',
  help: 'Total suspicious activity detected',
  labelNames: ['type', 'ip'],
});

// SQL Injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\bunion\b.*\bselect\b)/i,
  /(\bselect\b.*\bfrom\b)/i,
  /(\binsert\b.*\binto\b)/i,
  /(\bdelete\b.*\bfrom\b)/i,
  /(\bdrop\b.*\btable\b)/i,
  /(\bupdate\b.*\bset\b)/i,
  /(\bexec\b.*\()/i,
  /(;.*drop)/i,
  /(;.*delete)/i,
  /(;.*update)/i,
  /('.*or.*'.*=.*')/i,
  /('.*or.*1.*=.*1)/i,
  /(--)/,
  /(\/\*.*\*\/)/,
];

// XSS patterns
const XSS_PATTERNS = [
  /<script[^>]*>.*<\/script>/i,
  /<iframe[^>]*>/i,
  /<object[^>]*>/i,
  /<embed[^>]*>/i,
  /javascript:/i,
  /on\w+\s*=/i,  // onerror=, onload=, etc.
  /<img[^>]*onerror/i,
  /eval\s*\(/i,
  /expression\s*\(/i,
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%2e%2e\//i,
  /\.\.%2f/i,
];

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$]/,
  /\$\(/,
  /\$\{/,
];

class WAFMiddleware {
  constructor() {
    this.blockedIPs = new Map(); // IP -> { count, lastAttempt, blockedUntil }
    this.suspiciousIPs = new Map(); // IP -> { count, firstSeen }
    
    // Clean up old entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  // Main WAF middleware
  protect() {
    return (req, res, next) => {
      const ip = this.getClientIP(req);
      const path = req.path;

      try {
        // Check if IP is blocked
        if (this.isIPBlocked(ip)) {
          const blockedUntil = this.blockedIPs.get(ip).blockedUntil;
          const remainingTime = Math.ceil((blockedUntil - Date.now()) / 1000);
          
          logger.warn(`Blocked request from ${ip} - blocked for ${remainingTime}s more`);
          blockedRequestsCounter.inc({ reason: 'ip_blocked', endpoint: path });
          
          return res.status(403).json({
            success: false,
            error: 'Access forbidden',
            message: `Your IP has been temporarily blocked. Try again in ${remainingTime} seconds.`,
            retryAfter: remainingTime,
          });
        }

        // Validate request method
        if (!this.isValidMethod(req.method)) {
          this.recordSuspiciousActivity(ip, 'invalid_method');
          blockedRequestsCounter.inc({ reason: 'invalid_method', endpoint: path });
          return res.status(405).json({
            success: false,
            error: 'Method not allowed',
          });
        }

        // Check for SQL injection
        if (this.detectSQLInjection(req)) {
          logger.warn(`SQL injection attempt detected from ${ip} on ${path}`);
          this.recordSuspiciousActivity(ip, 'sql_injection');
          this.blockIP(ip, 'sql_injection');
          blockedRequestsCounter.inc({ reason: 'sql_injection', endpoint: path });
          
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Malicious request detected',
          });
        }

        // Check for XSS
        if (this.detectXSS(req)) {
          logger.warn(`XSS attempt detected from ${ip} on ${path}`);
          this.recordSuspiciousActivity(ip, 'xss');
          this.blockIP(ip, 'xss');
          blockedRequestsCounter.inc({ reason: 'xss', endpoint: path });
          
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Malicious request detected',
          });
        }

        // Check for path traversal
        if (this.detectPathTraversal(req)) {
          logger.warn(`Path traversal attempt detected from ${ip} on ${path}`);
          this.recordSuspiciousActivity(ip, 'path_traversal');
          this.blockIP(ip, 'path_traversal');
          blockedRequestsCounter.inc({ reason: 'path_traversal', endpoint: path });
          
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Malicious request detected',
          });
        }

        // Check for command injection
        if (this.detectCommandInjection(req)) {
          logger.warn(`Command injection attempt detected from ${ip} on ${path}`);
          this.recordSuspiciousActivity(ip, 'command_injection');
          this.blockIP(ip, 'command_injection');
          blockedRequestsCounter.inc({ reason: 'command_injection', endpoint: path });
          
          return res.status(403).json({
            success: false,
            error: 'Forbidden',
            message: 'Malicious request detected',
          });
        }

        // Validate Content-Type for POST/PUT requests
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          const contentType = req.get('Content-Type');
          if (!contentType || !contentType.includes('application/json')) {
            blockedRequestsCounter.inc({ reason: 'invalid_content_type', endpoint: path });
            return res.status(415).json({
              success: false,
              error: 'Unsupported Media Type',
              message: 'Content-Type must be application/json',
            });
          }
        }

        // Validate request body size
        const contentLength = parseInt(req.get('Content-Length') || '0');
        if (contentLength > 1024 * 1024) { // 1MB limit
          blockedRequestsCounter.inc({ reason: 'body_too_large', endpoint: path });
          return res.status(413).json({
            success: false,
            error: 'Payload Too Large',
            message: 'Request body exceeds maximum size',
          });
        }

        // Request passed all checks
        next();
      } catch (error) {
        logger.error('WAF middleware error:', error);
        next(error);
      }
    };
  }

  // Get client IP address
  getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
           req.headers['x-real-ip'] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  // Check if IP is blocked
  isIPBlocked(ip) {
    const blocked = this.blockedIPs.get(ip);
    if (!blocked) return false;
    
    if (Date.now() > blocked.blockedUntil) {
      this.blockedIPs.delete(ip);
      return false;
    }
    
    return true;
  }

  // Block an IP address
  blockIP(ip, reason) {
    const existing = this.blockedIPs.get(ip) || { count: 0 };
    const blockDuration = Math.min(10 * 60 * 1000 * (existing.count + 1), 60 * 60 * 1000); // Max 1 hour
    
    this.blockedIPs.set(ip, {
      count: existing.count + 1,
      lastAttempt: Date.now(),
      blockedUntil: Date.now() + blockDuration,
      reason,
    });
    
    logger.warn(`IP ${ip} blocked for ${blockDuration / 1000}s due to ${reason}`);
  }

  // Record suspicious activity
  recordSuspiciousActivity(ip, type) {
    const existing = this.suspiciousIPs.get(ip) || { count: 0, firstSeen: Date.now() };
    existing.count++;
    this.suspiciousIPs.set(ip, existing);
    
    suspiciousActivityCounter.inc({ type, ip });
    
    // Block if too many suspicious activities
    if (existing.count >= 5) {
      this.blockIP(ip, 'repeated_suspicious_activity');
    }
  }

  // Validate HTTP method
  isValidMethod(method) {
    const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
    return allowedMethods.includes(method);
  }

  // Detect SQL injection
  detectSQLInjection(req) {
    const inputs = [
      ...Object.values(req.query || {}),
      ...Object.values(req.body || {}),
      ...Object.values(req.params || {}),
      req.path,
    ];

    return inputs.some(input => {
      if (typeof input !== 'string') return false;
      return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
    });
  }

  // Detect XSS
  detectXSS(req) {
    const inputs = [
      ...Object.values(req.query || {}),
      ...Object.values(req.body || {}),
      ...Object.values(req.params || {}),
    ];

    return inputs.some(input => {
      if (typeof input !== 'string') return false;
      return XSS_PATTERNS.some(pattern => pattern.test(input));
    });
  }

  // Detect path traversal
  detectPathTraversal(req) {
    const path = req.path;
    return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(path));
  }

  // Detect command injection
  detectCommandInjection(req) {
    const inputs = [
      ...Object.values(req.query || {}),
      ...Object.values(req.body || {}),
      ...Object.values(req.params || {}),
    ];

    return inputs.some(input => {
      if (typeof input !== 'string') return false;
      return COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(input));
    });
  }

  // Cleanup old entries
  cleanup() {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;

    // Clean up blocked IPs
    for (const [ip, data] of this.blockedIPs.entries()) {
      if (now > data.blockedUntil) {
        this.blockedIPs.delete(ip);
      }
    }

    // Clean up suspicious IPs
    for (const [ip, data] of this.suspiciousIPs.entries()) {
      if (now - data.firstSeen > fiveMinutes) {
        this.suspiciousIPs.delete(ip);
      }
    }

    logger.info(`WAF cleanup: ${this.blockedIPs.size} blocked IPs, ${this.suspiciousIPs.size} suspicious IPs`);
  }

  // Get statistics
  getStats() {
    return {
      blockedIPs: this.blockedIPs.size,
      suspiciousIPs: this.suspiciousIPs.size,
      blockedIPsList: Array.from(this.blockedIPs.entries()).map(([ip, data]) => ({
        ip,
        reason: data.reason,
        blockedUntil: new Date(data.blockedUntil).toISOString(),
        remainingSeconds: Math.ceil((data.blockedUntil - Date.now()) / 1000),
      })),
    };
  }
}

module.exports = new WAFMiddleware();
