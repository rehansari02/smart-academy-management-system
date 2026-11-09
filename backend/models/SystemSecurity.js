const mongoose = require('mongoose');

const systemSecuritySchema = new mongoose.Schema({
    configKey: {
        type: String,
        required: true,
        unique: true,
        default: 'system_lock_config'
    },
    loginBlocked: {
        type: Boolean,
        default: false
    },
    printBlocked: {
        type: Boolean,
        default: false
    },
    maintenance403: {
        type: Boolean,
        default: false
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('SystemSecurity', systemSecuritySchema);
