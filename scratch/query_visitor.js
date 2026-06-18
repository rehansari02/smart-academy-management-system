const mongoose = require('mongoose');
const mongoURI = 'mongodb://localhost:27017/education_erp';

mongoose.connect(mongoURI).then(async () => {
    console.log("Connected to MongoDB");
    const Visitor = mongoose.model('Visitor', new mongoose.Schema({}, { strict: false }));
    const VisitorFollowUp = mongoose.model('VisitorFollowUp', new mongoose.Schema({}, { strict: false }));
    const Inquiry = mongoose.model('Inquiry', new mongoose.Schema({}, { strict: false }));

    const visitor = await Visitor.findOne({ studentName: /Gaytri/i });
    console.log("Visitor:", JSON.stringify(visitor, null, 2));

    if (visitor) {
        const followups = await VisitorFollowUp.find({ visitorId: visitor._id });
        console.log("VisitorFollowUps:", JSON.stringify(followups, null, 2));

        if (visitor.inquiryId) {
            const inquiry = await Inquiry.findById(visitor.inquiryId);
            console.log("Inquiry:", JSON.stringify(inquiry, null, 2));
        }
    }
    
    mongoose.connection.close();
}).catch(err => {
    console.error(err);
});
