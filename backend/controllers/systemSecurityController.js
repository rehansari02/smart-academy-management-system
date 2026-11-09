const SystemSecurity = require('../models/SystemSecurity');

// Fast in-memory cache for ultra-low latency & zero db bottlenecks
let securityCache = {
    loginBlocked: false,
    printBlocked: false,
    maintenance403: false,
    updatedAt: new Date()
};

// Initialize configuration from DB on server startup
const initSystemSecurity = async () => {
    try {
        let doc = await SystemSecurity.findOne({ configKey: 'system_lock_config' });
        if (!doc) {
            doc = await SystemSecurity.create({
                configKey: 'system_lock_config',
                loginBlocked: false,
                printBlocked: false,
                maintenance403: false
            });
        }
        securityCache = {
            loginBlocked: Boolean(doc.loginBlocked),
            printBlocked: Boolean(doc.printBlocked),
            maintenance403: Boolean(doc.maintenance403),
            updatedAt: doc.updatedAt || new Date()
        };
        console.log('[SystemSecurity] Loaded config from DB:', securityCache);
    } catch (error) {
        console.error('[SystemSecurity] Failed to init system security config:', error.message);
    }
};

// Synchronous fast accessor for middlewares
const getSecurityConfig = () => securityCache;

// GET /api/system-security/status
const getSecurityStatus = async (req, res) => {
    try {
        return res.json({
            success: true,
            data: securityCache
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/system-security/update
const updateSecurityStatus = async (req, res) => {
    try {
        const { loginBlocked, printBlocked, maintenance403 } = req.body;

        const updateData = {};
        if (typeof loginBlocked === 'boolean') updateData.loginBlocked = loginBlocked;
        if (typeof printBlocked === 'boolean') updateData.printBlocked = printBlocked;
        if (typeof maintenance403 === 'boolean') updateData.maintenance403 = maintenance403;
        updateData.updatedAt = new Date();

        const updatedDoc = await SystemSecurity.findOneAndUpdate(
            { configKey: 'system_lock_config' },
            { $set: updateData },
            { new: true, upsert: true }
        );

        securityCache = {
            loginBlocked: Boolean(updatedDoc.loginBlocked),
            printBlocked: Boolean(updatedDoc.printBlocked),
            maintenance403: Boolean(updatedDoc.maintenance403),
            updatedAt: updatedDoc.updatedAt || new Date()
        };

        return res.json({
            success: true,
            data: securityCache
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    initSystemSecurity,
    getSecurityConfig,
    getSecurityStatus,
    updateSecurityStatus
};
