const mongoose = require('mongoose');
const Counter = require('./Counter');

const examRequestSchema = new mongoose.Schema({
    student: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Student', 
        required: true 
    },
    examSerialNo: { type: String, unique: true }, // e.g., EX-2025-0001
    status: { 
        type: String, 
        enum: ['Pending', 'Approved', 'Cancelled', 'Completed'], 
        default: 'Pending' 
    },
    requestDate: { type: Date, default: Date.now },
    cancellationReason: { type: String },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Auto-generate Serial No
examRequestSchema.pre('save', async function() {
    if (!this.examSerialNo) {
        const year = new Date().getFullYear();
        const serialPrefix = `EX-${year}-`;
        const latestRequest = await mongoose.model('ExamRequest')
            .findOne({ examSerialNo: { $regex: `^${serialPrefix}` } })
            .sort({ examSerialNo: -1 })
            .select('examSerialNo')
            .lean();
        const latestSequence = Number(latestRequest?.examSerialNo?.split('-').pop()) || 0;

        const counter = await Counter.findOneAndUpdate(
            { _id: `examRequestSeq-${year}` },
            [
                {
                    $set: {
                        seq: {
                            $add: [
                                { $ifNull: ['$seq', latestSequence] },
                                1
                            ]
                        }
                    }
                }
            ],
            { upsert: true, returnDocument: 'after', updatePipeline: true }
        );

        this.examSerialNo = `${serialPrefix}${String(counter.seq).padStart(4, '0')}`;
    }
});

module.exports = mongoose.model('ExamRequest', examRequestSchema);
