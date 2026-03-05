import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMaterials } from '../../features/master/materialSlice';
import { fetchSubjects } from '../../features/master/masterSlice';
import Loading from '../../components/Loading';
import { FileText, Download, Search, RefreshCw, Calendar, File } from 'lucide-react';
import moment from 'moment';

const FreeStudyMaterial = () => {
    const dispatch = useDispatch();
    const { materials, isLoading } = useSelector((state) => state.materials);

    const [filters, setFilters] = useState({
        fromDate: '',
        toDate: '',
        searchBy: 'title',
        value: '',
        studentView: 'true' // Force student view in API
    });

    useEffect(() => {
        dispatch(fetchMaterials(filters));
        dispatch(fetchSubjects());
    }, [dispatch, filters]); // Fetch on filter change

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const resetFilters = () => {
         setFilters({
            fromDate: '',
            toDate: '',
            searchBy: 'title',
            value: '',
            studentView: 'true'
         });
    };

    if (isLoading && materials.length === 0) return <Loading />;

    return (
        <div className="container mx-auto p-4">
            {/* Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                    <FileText className="text-primary" />
                    Free Study Material
                </h1>
                <p className="text-gray-500 mt-1">Access study resources provided by the institute.</p>
            </div>

            {/* Filter Section - Styled like StudentList */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 border border-gray-200">
                <h2 className="text-sm font-bold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <Search size={16}/> Search Study Material
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                     <div>
                        <label className="text-xs text-gray-500">From Date</label>
                        <input type="date" name="fromDate" value={filters.fromDate} onChange={handleFilterChange} className="w-full border p-1 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">To Date</label>
                        <input type="date" name="toDate" value={filters.toDate} onChange={handleFilterChange} className="w-full border p-1 rounded text-sm"/>
                    </div>
                    <div>
                        <label className="text-xs text-gray-500">Search By</label>
                         <div className="flex gap-2">
                            <select name="searchBy" value={filters.searchBy} onChange={handleFilterChange} className="border p-1 rounded text-sm outline-none w-1/3">
                                <option value="title">Title</option>
                                <option value="subject">Subject</option>
                            </select>
                            <input type="text" name="value" value={filters.value} onChange={handleFilterChange} placeholder="Search..." className="w-full border p-1 rounded text-sm outline-none"/>
                        </div>
                    </div>
                    <div className="flex items-end gap-2">
                         <button onClick={resetFilters} className="bg-gray-200 p-2 rounded hover:bg-gray-300 text-gray-700 w-full flex justify-center"><RefreshCw size={18}/></button>
                         <button onClick={() => dispatch(fetchMaterials(filters))} className="bg-primary text-white p-2 rounded hover:bg-blue-800 w-full flex justify-center">Search</button>
                    </div>
                </div>
            </div>

            {/* Materials List - Table Styled like StudentList */}
            <div className="bg-white rounded-lg shadow overflow-x-auto border">
                <table className="w-full border-collapse min-w-[1000px]">
                    <thead>
                        <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                            <th className="p-2 border font-semibold w-12 text-center">Sr. No.</th>
                            <th className="p-2 border font-semibold">Subject</th>
                            <th className="p-2 border font-semibold">Title</th>
                            <th className="p-2 border font-semibold">Description</th>
                            <th className="p-2 border font-semibold">Date</th>
                            <th className="p-2 border font-semibold text-center w-32">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {materials && materials.length > 0 ? (
                            materials.map((material, index) => (
                                <tr key={material._id || index} className="group hover:bg-blue-50 text-xs border-b border-gray-100 transition-colors">
                                     <td className="p-2 border text-center font-bold text-gray-700">
                                        {index + 1}
                                    </td>
                                     <td className="p-2 border font-semibold text-blue-800">
                                        {material.subject?.name || '-'}
                                    </td>
                                    <td className="p-2 border font-medium text-gray-900">
                                        {material.title}
                                    </td>
                                    <td className="p-2 border text-gray-600 max-w-xs truncate">
                                        {material.description || '-'}
                                    </td>
                                    <td className="p-2 border text-gray-600 whitespace-nowrap">
                                         {moment(material.createdAt).format('DD MMM, YYYY')}
                                    </td>
                                    <td className="p-2 border text-center sticky right-0 bg-white group-hover:bg-blue-50">
                                        {material.document ? (
                                            <a 
                                                href={`${import.meta.env.VITE_API_URL.replace('/api', '')}/${material.document}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 transition-colors shadow-sm font-semibold"
                                            >
                                                <Download size={14} />
                                                Download
                                            </a>
                                        ) : (
                                            <span className="text-gray-400 italic flex items-center justify-center gap-1">
                                                <File size={14}/> No File
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-400 italic">
                                    No study materials found matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
             {/* Pagination Footer Placeholder (if needed in future) */}
             <div className="bg-gray-50 px-4 py-3 border-t flex justify-between items-center mt-2 rounded-lg">
                  <span className="text-xs text-gray-500">Showing {materials.length} records</span>
             </div>
        </div>
    );
};

export default FreeStudyMaterial;
