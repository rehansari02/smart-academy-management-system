/**
 * Fix Course Commission Types
 * 
 * Issue 1: Courses created BEFORE the schema had commissionType field
 *   → commissionType is null/undefined, but commission value (4, 5) was meant as percentage
 * 
 * Issue 2: Courses incorrectly set to 'Amount' with small commission values
 *   → e.g., ₹5 and ₹4 are clearly percentages (5%, 4%), not fixed amounts
 * 
 * Legitimate Amount values: ₹500 per student makes sense as a fixed amount
 * 
 * Fix: 
 *   - If commissionType is null and commission > 0 → set to 'Percentage'
 *   - If commissionType is 'Amount' and commission ≤ 100 → set to 'Percentage'
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const courseSchema = new mongoose.Schema({
    name: String,
    shortName: String,
    commissionType: { type: String, enum: ['Percentage', 'Amount'] },
    commission: { type: Number, default: 0 },
    courseFees: Number,
    isActive: Boolean,
    isDeleted: Boolean
}, { collection: 'courses' });

const Course = mongoose.model('Course', courseSchema);

const FIXED_AMOUNT_THRESHOLD = 100; // Values ≤ 100 are almost certainly percentages

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('Connected to MongoDB\n');

        // Step 1: Show all non-deleted courses with their commission data
        const allCourses = await Course.find({ $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }] }).lean();
        
        console.log('=== ALL COURSES - COMMISSION DATA ===\n');
        console.log('Name'.padEnd(52), 'Type'.padEnd(14), 'Value'.padEnd(8), 'Fees'.padEnd(10), 'Status');
        console.log('='.repeat(96));
        
        allCourses.forEach(c => {
            const name = (c.name || 'Unknown').substring(0, 49).padEnd(52);
            const type = (c.commissionType || 'NULL').padEnd(14);
            const value = String(c.commission ?? 0).padEnd(8);
            const fees = String(c.courseFees ?? 0).padEnd(10);
            
            let status = '✅ OK';
            if (!c.commissionType && (c.commission || 0) > 0) {
                status = '⚠️  NULL → should be Percentage';
            } else if (c.commissionType === 'Amount' && (c.commission || 0) > 0 && (c.commission || 0) <= FIXED_AMOUNT_THRESHOLD) {
                status = '⚠️  Amount → should be Percentage';
            }
            
            console.log(name, type, value, fees, status);
        });

        // Step 2: Courses with null commissionType and non-zero commission → set to Percentage
        const nullTypeCount = await Course.countDocuments({
            $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
            commissionType: { $exists: false },
            commission: { $gt: 0 }
        });

        // Also handle case where commissionType is explicitly null
        const nullExplicitCount = await Course.countDocuments({
            $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
            commissionType: null,
            commission: { $gt: 0 }
        });

        // Step 3: Courses with Amount type and small commission → set to Percentage
        const wrongAmountCount = await Course.countDocuments({
            $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
            commissionType: 'Amount',
            commission: { $gt: 0, $lte: FIXED_AMOUNT_THRESHOLD }
        });

        const totalToFix = nullTypeCount + nullExplicitCount + wrongAmountCount;
        console.log(`\n=== COURSES TO FIX: ${totalToFix} ===`);
        console.log(`  • Missing commissionType (null): ${nullTypeCount + nullExplicitCount}`);
        console.log(`  • Wrong type (Amount ≤ ${FIXED_AMOUNT_THRESHOLD}): ${wrongAmountCount}`);
        console.log(`  • Legitimate Amount (> ${FIXED_AMOUNT_THRESHOLD}): already correct\n`);

        if (totalToFix > 0) {
            // Fix 1: Missing commissionType → set to Percentage
            if (nullTypeCount > 0) {
                const r1 = await Course.updateMany(
                    {
                        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
                        commissionType: { $exists: false },
                        commission: { $gt: 0 }
                    },
                    { $set: { commissionType: 'Percentage' } }
                );
                console.log(`✅ Fixed ${r1.modifiedCount} courses with missing commissionType → Percentage`);
            }

            if (nullExplicitCount > 0) {
                const r2 = await Course.updateMany(
                    {
                        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
                        commissionType: null,
                        commission: { $gt: 0 }
                    },
                    { $set: { commissionType: 'Percentage' } }
                );
                console.log(`✅ Fixed ${r2.modifiedCount} courses with null commissionType → Percentage`);
            }

            // Fix 2: Wrong Amount type → set to Percentage
            if (wrongAmountCount > 0) {
                const r3 = await Course.updateMany(
                    {
                        $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
                        commissionType: 'Amount',
                        commission: { $gt: 0, $lte: FIXED_AMOUNT_THRESHOLD }
                    },
                    { $set: { commissionType: 'Percentage' } }
                );
                console.log(`✅ Fixed ${r3.modifiedCount} courses with Amount (≤${FIXED_AMOUNT_THRESHOLD}) → Percentage`);
            }

            // Step 4: Verify the fix
            console.log('\n=== VERIFICATION ===\n');
            
            const remainingNull = await Course.countDocuments({
                $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
                commissionType: { $exists: false },
                commission: { $gt: 0 }
            });
            const remainingWrongAmount = await Course.countDocuments({
                $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }],
                commissionType: 'Amount',
                commission: { $gt: 0, $lte: FIXED_AMOUNT_THRESHOLD }
            });

            if (remainingNull === 0 && remainingWrongAmount === 0) {
                console.log('✅ All fixes applied successfully. No remaining issues.');
            } else {
                console.log(`⚠️  Remaining issues: ${remainingNull} null + ${remainingWrongAmount} wrong amount`);
            }

            // Show final state
            const updated = await Course.find({
                $or: [{ isDeleted: { $ne: true } }, { isDeleted: { $exists: false } }]
            }).select('name commission commissionType courseFees').lean();

            console.log('\n=== FINAL STATE ===\n');
            console.log('Name'.padEnd(52), 'Type'.padEnd(14), 'Value'.padEnd(8));
            console.log('-'.repeat(74));
            updated.forEach(c => {
                const name = (c.name || 'Unknown').substring(0, 49).padEnd(52);
                const type = (c.commissionType || 'NULL').padEnd(14);
                const value = String(c.commission ?? 0).padEnd(8);
                console.log(name, type, value);
            });
        } else {
            console.log('✅ No fixes needed. All courses are correctly configured.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

main();
