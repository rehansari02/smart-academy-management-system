import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { 
    MessageSquare, 
    Settings, 
    BarChart3, 
    History, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle,
    ShieldCheck,
    RefreshCw,
    ToggleLeft,
    ToggleRight,
    ChevronLeft,
    ChevronRight,
    Calendar,
    Search
} from 'lucide-react';
import moment from 'moment';

const SmsStation = () => {
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [data, setData] = useState(null);
    
    // Filter & Pagination States
    const [filters, setFilters] = useState({
        startDate: moment().subtract(7, 'days').format('YYYY-MM-DD'),
        endDate: moment().format('YYYY-MM-DD'),
        search: '',
        page: 1,
        limit: 10
    });

    const fetchStationData = async (pageOverride) => {
        try {
            setLoading(true);
            const currentPage = pageOverride || filters.page;
            const params = {
                ...filters,
                page: currentPage
            };
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/sms/station`, { 
                params,
                withCredentials: true 
            });
            setData(response.data);
        } catch (error) {
            console.error("Failed to fetch SMS station data", error);
            toast.error("Failed to load SMS station details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStationData();
    }, []);

    const handleFilterChange = (e) => {
        setFilters({
            ...filters,
            [e.target.name]: e.target.value,
            page: 1 // Reset to page 1 on filter change
        });
    };

    const handlePageChange = (newPage) => {
        if (newPage < 1 || newPage > (data?.pagination?.pages || 1)) return;
        setFilters({ ...filters, page: newPage });
        fetchStationData(newPage);
    };

    const handleToggleSms = async (field, currentValue) => {
        if (!data) return;
        
        try {
            setUpdating(true);
            const newValue = !currentValue;
            const response = await axios.put(`${import.meta.env.VITE_API_URL}/sms/settings`, { 
                [field]: newValue 
            }, { withCredentials: true });
            
            setData({
                ...data,
                setting: response.data
            });
            
            const fieldLabel = field.replace('is', '').replace('Enabled', '');
            toast.success(`${fieldLabel} SMS ${newValue ? 'Enabled' : 'Disabled'}`);
        } catch (error) {
            console.error("Failed to update SMS settings", error);
            toast.error("Failed to update settings");
        } finally {
            setUpdating(false);
        }
    };

    if (loading && !data) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-50">
                <RefreshCw className="animate-spin text-primary w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                            <MessageSquare className="text-primary w-8 h-8" />
                            SMS Station
                        </h1>
                        <p className="text-gray-500 mt-1">Control every SMS category manually and track delivery performance.</p>
                    </div>
                    
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 px-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Master Control</span>
                            <span className={`text-sm font-bold ${data?.setting?.isGlobalEnabled ? 'text-green-600' : 'text-red-600'}`}>
                                {data?.setting?.isGlobalEnabled ? 'SYSTEM ACTIVE' : 'SYSTEM PAUSED'}
                            </span>
                        </div>
                        <button 
                            onClick={() => handleToggleSms('isGlobalEnabled', data?.setting?.isGlobalEnabled)}
                            disabled={updating}
                            className={`p-1 rounded-full transition-all duration-300 ${updating ? 'opacity-50' : ''}`}
                        >
                            {data?.setting?.isGlobalEnabled ? (
                                <ToggleRight className="w-12 h-12 text-green-500 cursor-pointer" />
                            ) : (
                                <ToggleLeft className="w-12 h-12 text-gray-300 cursor-pointer" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Granular Toggles Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <ControlCard 
                        title="Admission SMS" 
                        description="Welcome & registration messages"
                        isEnabled={data?.setting?.isAdmissionEnabled}
                        onToggle={() => handleToggleSms('isAdmissionEnabled', data?.setting?.isAdmissionEnabled)}
                        disabled={updating || !data?.setting?.isGlobalEnabled}
                    />
                    <ControlCard 
                        title="Fees SMS" 
                        description="Receipt & deposit confirmations"
                        isEnabled={data?.setting?.isFeesEnabled}
                        onToggle={() => handleToggleSms('isFeesEnabled', data?.setting?.isFeesEnabled)}
                        disabled={updating || !data?.setting?.isGlobalEnabled}
                    />
                    <ControlCard 
                        title="Attendance SMS" 
                        description="Absence alerts to parents"
                        isEnabled={data?.setting?.isAttendanceEnabled}
                        onToggle={() => handleToggleSms('isAttendanceEnabled', data?.setting?.isAttendanceEnabled)}
                        disabled={updating || !data?.setting?.isGlobalEnabled}
                    />
                    <ControlCard 
                        title="Inquiry SMS" 
                        description="Follow-up & inquiry alerts"
                        isEnabled={data?.setting?.isInquiryEnabled}
                        onToggle={() => handleToggleSms('isInquiryEnabled', data?.setting?.isInquiryEnabled)}
                        disabled={updating || !data?.setting?.isGlobalEnabled}
                    />
                    <ControlCard 
                        title="Exam Schedule SMS" 
                        description="Exam date alerts to parents"
                        isEnabled={data?.setting?.isExamScheduleEnabled}
                        onToggle={() => handleToggleSms('isExamScheduleEnabled', data?.setting?.isExamScheduleEnabled)}
                        disabled={updating || !data?.setting?.isGlobalEnabled}
                    />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard 
                        icon={<CheckCircle2 className="text-green-500" />} 
                        label="Successfully Sent" 
                        value={data?.stats?.totalSent || 0} 
                        color="green"
                    />
                    <StatCard 
                        icon={<XCircle className="text-red-500" />} 
                        label="Sending Failed" 
                        value={data?.stats?.totalFailed || 0} 
                        color="red"
                    />
                    <StatCard 
                        icon={<ShieldCheck className="text-blue-500" />} 
                        label="Skipped (Disabled)" 
                        value={data?.stats?.totalDisabled || 0} 
                        color="blue"
                    />
                    <StatCard 
                        icon={<BarChart3 className="text-purple-500" />} 
                        label="Total Attempts" 
                        value={data?.stats?.totalAttempts || 0} 
                        color="purple"
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Recent Logs Table */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white sticky top-0 z-10">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                <History size={18} className="text-primary" />
                                Recent SMS Logs
                            </h3>
                            
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                                    <Search size={14} className="text-gray-400 ml-1" />
                                    <input 
                                        type="text" 
                                        name="search"
                                        placeholder="Mobile or Message..."
                                        value={filters.search}
                                        onChange={handleFilterChange}
                                        className="bg-transparent text-[11px] font-bold text-gray-600 outline-none w-32"
                                    />
                                </div>
                                <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-lg border border-gray-100">
                                    <Calendar size={14} className="text-gray-400 ml-1" />
                                    <input 
                                        type="date" 
                                        name="startDate"
                                        value={filters.startDate}
                                        onChange={handleFilterChange}
                                        className="bg-transparent text-[11px] font-bold text-gray-600 outline-none w-28"
                                    />
                                    <span className="text-gray-300">to</span>
                                    <input 
                                        type="date" 
                                        name="endDate"
                                        value={filters.endDate}
                                        onChange={handleFilterChange}
                                        className="bg-transparent text-[11px] font-bold text-gray-600 outline-none w-28"
                                    />
                                </div>
                                <button 
                                    onClick={() => fetchStationData(1)}
                                    className="p-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm"
                                    title="Search"
                                >
                                    <Search size={16} />
                                </button>
                                <button 
                                    onClick={() => fetchStationData()}
                                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 border border-gray-100"
                                    title="Refresh"
                                >
                                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto flex-grow">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-400 tracking-wider border-b">
                                    <tr>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4">Category</th>
                                        <th className="px-6 py-4">Recipient</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data?.recentLogs?.length > 0 ? data.recentLogs.map((log) => (
                                        <tr key={log._id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                                                {moment(log.createdAt).format('DD/MM hh:mm A')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-wide">
                                                    {log.category || 'General'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-700">
                                                {log.mobileNumber}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={log.status} />
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic">
                                                No SMS logs found for the selected range.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        {data?.pagination && data.pagination.pages > 1 && (
                            <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                <div className="text-xs text-gray-500 font-medium">
                                    Showing <span className="text-gray-800 font-bold">{data.recentLogs.length}</span> of <span className="text-gray-800 font-bold">{data.pagination.total}</span> logs
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => handlePageChange(filters.page - 1)}
                                        disabled={filters.page === 1}
                                        className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    
                                    <div className="flex items-center px-3 h-8 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700">
                                        Page {data.pagination.page} of {data.pagination.pages}
                                    </div>

                                    <button 
                                        onClick={() => handlePageChange(filters.page + 1)}
                                        disabled={filters.page === data.pagination.pages}
                                        className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Templates Section */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <Settings size={18} className="text-primary" />
                                Active Templates
                            </h3>
                            <div className="space-y-4">
                                <TemplateItem 
                                    title="Admission" 
                                    text="Welcome to Smart Institute, Dear, {name}. your admission has been successfully completed. Enrollment No. {no}, course {course}, Batch Time {time}"
                                />
                                <TemplateItem 
                                    title="Fees" 
                                    text="Dear, {name}. Your Course fees {amt} has been deposited for {purpose}, Reg.No. {no}. Thank you, Smart Institute"
                                />
                                <TemplateItem 
                                    title="Attendance" 
                                    text="Dear, {name} is Absent in class on today {date} for {time}, Batch Time-{batch}. Regards, Smart Institute"
                                />
                                <TemplateItem 
                                    title="Exam Schedule" 
                                    text="Dear, {name}. Your exam has been scheduled from {fromDate} to {toDate}, for any other details contact your {branch} Branch. Regards, Smart Institute"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ControlCard = ({ title, description, isEnabled, onToggle, disabled }) => (
    <div className={`bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between transition-all ${disabled ? 'opacity-60' : 'hover:shadow-md'}`}>
        <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-gray-800">{title}</h4>
            <button 
                onClick={onToggle}
                disabled={disabled}
                className="transition-transform active:scale-95"
            >
                {isEnabled ? (
                    <ToggleRight className="w-10 h-10 text-green-500 cursor-pointer" />
                ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-300 cursor-pointer" />
                )}
            </button>
        </div>
        <p className="text-xs text-gray-500 leading-tight">{description}</p>
    </div>
);

const StatCard = ({ icon, label, value, color }) => {
    const bgColors = {
        green: 'bg-green-50',
        red: 'bg-red-50',
        blue: 'bg-blue-50',
        purple: 'bg-purple-50'
    };
    
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md hover:-translate-y-1">
            <div className={`p-3 rounded-xl ${bgColors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black text-gray-800 mt-1">{value.toLocaleString()}</p>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const configs = {
        success: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle2 size={10} />, label: 'Sent' },
        failed: { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle size={10} />, label: 'Failed' },
        disabled: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <AlertTriangle size={10} />, label: 'Skipped' }
    };
    
    const config = configs[status] || configs.disabled;
    
    return (
        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 w-fit ${config.bg} ${config.text}`}>
            {config.icon}
            {config.label}
        </span>
    );
};

const TemplateItem = ({ title, text }) => (
    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
        <p className="text-xs font-bold text-gray-500 uppercase mb-1">{title}</p>
        <p className="text-sm text-gray-700 leading-tight italic font-medium">"{text}"</p>
    </div>
);

export default SmsStation;
