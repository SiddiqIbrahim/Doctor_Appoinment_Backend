// Simple in-memory sliding window rate limiter for password reset endpoints
const requestRecords = new Map();

/**
 * Factory for rate limiting middleware
 * @param {Object} options
 * @param {number} options.windowMs 
 * @param {number} options.max 
 * @param {string} options.message 
 */
const rateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 5,
  message = "Too many requests from this IP. Please try again after 15 minutes.",
} = {}) => {
  return (req, res, next) => {
    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown_ip";
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.1) {
      for (const [key, timestamps] of requestRecords.entries()) {
        const valid = timestamps.filter((t) => now - t < windowMs);
        if (valid.length === 0) {
          requestRecords.delete(key);
        } else {
          requestRecords.set(key, valid);
        }
      }
    }

    const timestamps = requestRecords.get(ip) || [];
    const recent = timestamps.filter((t) => now - t < windowMs);

    if (recent.length >= max) {
      const oldest = recent[0];
      const waitTimeSec = Math.ceil((windowMs - (now - oldest)) / 1000);
      return res.status(429).json({
        msg: message,
        retryAfterSeconds: waitTimeSec,
      });
    }

    recent.push(now);
    requestRecords.set(ip, recent);
    next();
  };
};

module.exports = {
  authRateLimiter: rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: "Too many password reset requests. Please wait 15 minutes before trying again.",
  }),
};
