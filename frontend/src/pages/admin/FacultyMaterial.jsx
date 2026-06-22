import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment';
import Loading from '../../components/Loading';
import { Download, Eye, FileText, RefreshCw, Search } from 'lucide-react';

const FacultyMaterial = () => {
    const [materials, setMaterials] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        searchBy: 'title',
        value: ''
    });

    const fetchMaterials = async (nextFilters = filters) => {
        setIsLoading(true);
        try {
            const params = {
                ...nextFilters,
                facultyView: 'true'
            };
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/materials`, { params });
            setMaterials(Array.isArray(response.data) ? response.data : []);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchMaterials();
    }, []);

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const resetFilters = () => {
        const nextFilters = {
            fromDate: '',
            toDate: '',
            searchBy: 'title',
            value: ''
        };
        setFilters(nextFilters);
        fetchMaterials(nextFilters);
    };

    const previewPageUrl = (id) => `/material-preview/${id}`;
    const downloadUrl = (id) => `${import.meta.env.VITE_API_URL}/materials/download/${id}`;

    if (isLoading && materials.length === 0) return <Loading />;

    return (
        <div className="container mx-auto p-4">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <FileText className="text-primary" />
                    Faculty Material
                </h1>
                <p className="text-gray-500 mt-1">Faculty only aur student-faculty both material yahan dikhega.</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
                <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <Search size={16} /> Search Material
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                        <label className="text-xs text-gray-500">From Date</label>
                        <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="w-full border p-1 rounded text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">To Date</label>
                        <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="w-full border p-1 rounded text-sm" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Search By</label>
                        <div className="flex gap-2">
                            <select name="searchBy" value={filters.searchBy} onChange={handleFilterChange} className="border p-1 rounded text-sm outline-none w-1/3">
                                <option value="title">Title</option>
                                <option value="subject">Subject</option>
                            </select>
                            <input type="text" name="value" value={filters.value} onChange={handleFilterChange} placeholder="Search..." className="w-full border p-1 rounded text-sm outline-none" />
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                        <button onClick={resetFilters} className="bg-gray-200 p-2 rounded hover:bg-gray-300 text-gray-700 w-full flex justify-center">
                            <RefreshCw size={18} />
                        </button>
                        <button onClick={() => fetchMaterials()} className="bg-primary text-white p-2 rounded hover:bg-blue-800 w-full flex justify-center">
                            Search
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto border">
                <table className="w-full border-collapse min-w-[1000px]">
                    <thead>
                        <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                            <th className="p-2 border font-semibold w-12 text-center">Sr. No.</th>
                            <th className="p-2 border font-semibold">Subject</th>
                            <th className="p-2 border font-semibold">Title</th>
                            <th className="p-2 border font-semibold">Type</th>
                            <th className="p-2 border font-semibold">Description</th>
                            <th className="p-2 border font-semibold">Date</th>
                            <th className="p-2 border font-semibold text-center w-40">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {materials.length > 0 ? (
                            materials.map((material, index) => (
                                <tr key={material._id || index} className="group hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                                    <td className="p-2 border text-center font-bold text-gray-700">{index + 1}</td>
                                    <td className="p-2 border font-semibold text-blue-800">{material.subject?.name || '-'}</td>
                                    <td className="p-2 border font-medium text-gray-900">{material.title}</td>
                                    <td className="p-2 border text-gray-600">{material.type}</td>
                                    <td className="p-2 border text-gray-600 max-w-xs truncate">{material.description || '-'}</td>
                                    <td className="p-2 border text-gray-600 whitespace-nowrap">{moment(material.createdAt).format('DD MMM, YYYY')}</td>
                                    <td className="p-2 border text-center sticky right-0 bg-white group-hover:bg-blue-50">
                                        <div className="flex items-center justify-center gap-2">
                                            <a href={previewPageUrl(material._id)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-colors shadow-sm font-semibold">
                                                <Eye size={14} />
                                                Preview
                                            </a>
                                            {material.showDownloadButton !== false && (
                                                <a href={downloadUrl(material._id)} download className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors shadow-sm font-semibold">
                                                    <Download size={14} />
                                                    Download
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" className="p-8 text-center text-gray-400 italic">
                                    No faculty materials found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <div className="bg-gray-50 px-4 py-3 border-t flex justify-between items-center mt-2 rounded-lg">
                <span className="text-xs text-gray-500">Showing {materials.length} records</span>
            </div>
        </div>
    );
};

export default FacultyMaterial;
