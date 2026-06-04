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
            console.log("[SMS] No SmsSetting found. Creating default settings...");
            setting = await SmsSetting.create({ 
                isGlobalEnabled: true,
                isAdmissionEnabled: true,
                isFeesEnabled: true,
                isAttendanceEnabled: true,
                isInquiryEnabled: true
            });
        }

        console.log(`[SMS] Settings - Global: ${setting.isGlobalEnabled} | ${category}: ${setting['is' + category + 'Enabled'] ?? true}`);

        if (!setting.isGlobalEnabled) {
            console.log("SMS Skipped: SMS sending is disabled globally.");
            await SmsLog.create({
                mobileNumber,
                message,
                status: 'disabled',
                category
            });
            throw new Error('SMS sending is disabled globally');
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
            throw new Error(`SMS sending is disabled for ${category}`);
        }

        const username = process.env.SMS_USERNAME;
        const password = process.env.SMS_PASSWORD;
        const senderId = process.env.SMS_SENDER_ID || 'SMINT';

        if (!username || !password) {
            console.error(`[SMS] CRITICAL: SMS_USERNAME or SMS_PASSWORD environment variables are not set!`);
        }

        // Prepare the URL
        const apiUrl = 'https://pgapi.smartping.io/fe/api/v1/send';

        console.log(`[SMS] Sending via API: ${apiUrl} | To: ${mobileNumber} | From: ${senderId} | Msg: ${message.substring(0, 50)}...`);

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

        const isAccepted = response.data?.statusCode === 200
            && response.data?.state === 'SUBMIT_ACCEPTED';
        if (!isAccepted) {
            throw new Error(`SMS gateway rejected message: ${JSON.stringify(response.data)}`);
        }

        // 2. Log success
        await SmsLog.create({
            mobileNumber,
            message,
            category,
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
                category,
                status: 'failed',
                error: error.message
            });
        } catch (logError) {
            console.error("Failed to create SMS Log:", logError.message);
        }
        
        throw error;
    }
};

module.exports = sendSMS;
