const errorHandler = (err, req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
        try {
            const hostname = new URL(origin).hostname;
            if (hostname === 'smartinstituteonline.com' || hostname.endsWith('.smartinstituteonline.com')) {
                res.header('Access-Control-Allow-Origin', origin);
                res.header('Vary', 'Origin');
                res.header('Access-Control-Allow-Credentials', 'true');
            }
        } catch (parseError) {
            // Ignore invalid Origin header and continue with normal error response.
        }
    }

    const statusCode = res.statusCode ? res.statusCode : 500;
    res.status(statusCode);
    res.json({
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    });
};

module.exports = { errorHandler };
