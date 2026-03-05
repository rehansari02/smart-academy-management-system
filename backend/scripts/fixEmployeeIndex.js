const mongoose = require('mongoose');
require('dotenv').config();

async function fixEmployeeIndex() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/education_erp');
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const employeesCollection = db.collection('employees');

        // Drop the existing problematic regNo index
        try {
            await employeesCollection.dropIndex('regNo_1');
            console.log('Dropped problematic regNo_1 index');
        } catch (error) {
            console.log('Index regNo_1 does not exist or already dropped:', error.message);
        }

        // Create a new sparse index
        await employeesCollection.createIndex(
            { regNo: 1 }, 
            { 
                unique: true, 
                sparse: true,
                name: 'regNo_sparse_unique'
            }
        );
        console.log('Created new sparse regNo index');

        console.log('Index fix completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Error fixing index:', error);
        process.exit(1);
    }
}

fixEmployeeIndex();
