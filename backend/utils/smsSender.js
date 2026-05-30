const axios = require('axios');
const SmsSetting = require('../models/SmsSetting');
const SmsLog = require('../models/SmsLog');

const sendSMS = async (mobileNumber, message, category = 'General') => {
    try {
        if (!mobileNumber) {
            console.log("SMS Skipped: No mobile number provided.");
            return;
        }

        // 1. Check Global & Category SMS Setting
        let setting = await SmsSetting.findOne();
        if (!setting) {
            // Create default setting if it doesn't exist
            setting = await SmsSetting.create({ 
                isGlobalEnabled: true,
                isAdmissionEnabled: true,
                isFeesEnabled: true,
                isAttendanceEnabled: true,
                isInquiryEnabled: true
            });
        }

        if (!setting.isGlobalEnabled) {
            console.log("SMS Skipped: SMS sending is disabled globally.");
            await SmsLog.create({
                mobileNumber,
                message,
                status: 'disabled',
                category
            });
            return { status: 'disabled', message: 'SMS sending is disabled globally' };
        }

        // Check specific category
        let isCategoryEnabled = true;
        if (category === 'Admission') isCategoryEnabled = setting.isAdmissionEnabled ?? true;
        else if (category === 'Fees') isCategoryEnabled = setting.isFeesEnabled ?? true;
        else if (category === 'Attendance') isCategoryEnabled = setting.isAttendanceEnabled ?? true;
        else if (category === 'Inquiry') isCategoryEnabled = setting.isInquiryEnabled ?? true;

        if (!isCategoryEnabled) {
            console.log(`SMS Skipped: SMS sending is disabled for category: ${category}`);
            await SmsLog.create({
                mobileNumber,
                message,
                status: 'disabled',
                category
            });
            return { status: 'disabled', message: `SMS sending is disabled for ${category}` };
        }

        const username = process.env.SMS_USERNAME;
        const password = process.env.SMS_PASSWORD;
        const senderId = process.env.SMS_SENDER_ID || 'SMINT';

        // Prepare the URL
        const apiUrl = 'https://pgapi.smartping.io/fe/api/v1/send';

        // Make the Request
        const response = await axios.get(apiUrl, {
            params: {
                username: username,
                password: password,
                unicode: 'false',
                from: senderId,
                to: mobileNumber,
                text: message
            }
        });

        console.log(`SMS Sent to ${mobileNumber}:`, response.data);

        // 2. Log success
        await SmsLog.create({
            mobileNumber,
            message,
            status: 'success',
            response: response.data
        });

        return response.data;

    } catch (error) {
        console.error("SMS Sending Failed:", error.message);
        
        // 3. Log failure
        try {
            await SmsLog.create({
                mobileNumber,
                message,
                status: 'failed',
                error: error.message
            });
        } catch (logError) {
            console.error("Failed to create SMS Log:", logError.message);
        }
        
        // We don't throw error here to avoid breaking the main registration flow
    }
};

module.exports = sendSMS;