import React from 'react';
import { Users } from 'lucide-react';
import VisitorForm from '../../../components/transaction/VisitorForm';
import { useLocation, useNavigate } from 'react-router-dom';

const Visitors = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const visitorData = location.state?.visitorData;

    const handleSuccess = () => {
        // After save/update, clear state if needed
        navigate('/transaction/visitors', { replace: true, state: {} });
    };

    return (
        <div className="container mx-auto p-4">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 border-b pb-4 gap-4">
                    <div className="flex items-center gap-3">
                        <Users className="text-indigo-600" size={32} />
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Visitor Entry Form</h2>
                            <p className="text-sm text-gray-500">Add or update visitor information</p>
                        </div>
                    </div>
                </div>

                <VisitorForm 
                    initialData={visitorData} 
                    onSuccess={handleSuccess}
                />
            </div>
        </div>
    );
};

export default Visitors;
