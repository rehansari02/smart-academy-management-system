const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const fixDuplicates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to DB');

        const employees = await mongoose.connection.collection('employees').find().sort({ createdAt: -1 }).toArray();
        const seenEmails = new Set();
        const seenRegNos = new Set();
        
        for (const emp of employees) {
            let startDelete = false;
            
            // Check Email
            if (seenEmails.has(emp.email)) {
                console.log(`Deleting duplicate Email: ${emp.email}, ID: ${emp._id}`);
                startDelete = true;
            } else {
                seenEmails.add(emp.email);
            }
            
            // Check RegNo
            if (!startDelete && emp.regNo && seenRegNos.has(emp.regNo)) {
                console.log(`Deleting duplicate RegNo: ${emp.regNo}, ID: ${emp._id}`);
                startDelete = true;
            } else if (emp.regNo) {
                seenRegNos.add(emp.regNo);
            }
            
            if (startDelete) {
                await mongoose.connection.collection('employees').deleteOne({ _id: emp._id });
                // Also remove linked user account if exists
                if (emp.userAccount) {
                    await mongoose.connection.collection('users').deleteOne({ _id: emp.userAccount });
                    console.log(`  > Removed linked User Account: ${emp.userAccount}`);
                }
            }
        }

        console.log('Duplicate cleanup finished.');
        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

fixDuplicates();
