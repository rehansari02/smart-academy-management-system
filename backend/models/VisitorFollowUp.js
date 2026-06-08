const mongoose = require('mongoose');

const visitorFollowUpSchema = new mongoose.Schema({
    visitorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Visitor', required: true },
    scheduledDate: { type: Date, required: true },
    callingDate: { type: Date },
    status: {
        type: String,
        enum: ["Open", "Close", "Complete", "Recall", "InProgress", "Pending", "Converted"],
        default: "Open"
    },
    remark: { type: String },
    attendedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    followUpBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

visitorFollowUpSchema.index({ scheduledDate: 1 });
visitorFollowUpSchema.index({ visitorId: 1, scheduledDate: -1 });
visitorFollowUpSchema.index({ branchId: 1, scheduledDate: 1 });

module.exports = mongoose.model('VisitorFollowUp', visitorFollowUpSchema);
