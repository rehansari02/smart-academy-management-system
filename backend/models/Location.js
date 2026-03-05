const mongoose = require('mongoose');

const stateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a state name'],
        unique: true,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

const citySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a city name'],
        trim: true
    },
    stateId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'State',
        required: [true, 'Please specify a state']
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Compound index to ensure unique city names within a state
citySchema.index({ name: 1, stateId: 1 }, { unique: true });

const State = mongoose.model('State', stateSchema);
const City = mongoose.model('City', citySchema);

module.exports = { State, City };
