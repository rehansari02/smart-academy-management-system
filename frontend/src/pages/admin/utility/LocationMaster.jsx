import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
    fetchStates,
    createState,
    updateState,
    deleteState,
    fetchCities,
    createCity,
    updateCity,
    deleteCity,
    resetMasterStatus
} from '../../../features/master/masterSlice';
import { toast } from 'react-toastify';
import { Edit, Trash2, Plus, Search, X } from 'lucide-react';
import { TableSkeleton } from '../../../components/common/SkeletonLoader';

const LocationMaster = () => {
    const dispatch = useDispatch();
    const { states, cities, isLoading, isSuccess, message } = useSelector((state) => state.master);

    // State Management
    const [showStateModal, setShowStateModal] = useState(false);
    const [stateFormData, setStateFormData] = useState({ name: '', isActive: true });
    const [editStateId, setEditStateId] = useState(null);
    const [stateSearchTerm, setStateSearchTerm] = useState('');

    // City Management
    const [showCityModal, setShowCityModal] = useState(false);
    const [cityFormData, setCityFormData] = useState({ name: '', stateId: '', isActive: true });
    const [editCityId, setEditCityId] = useState(null);
    const [selectedStateFilter, setSelectedStateFilter] = useState('');
    const [citySearchTerm, setCitySearchTerm] = useState('');

    useEffect(() => {
        dispatch(fetchStates());
        dispatch(fetchCities());
    }, [dispatch]);

    useEffect(() => {
        if (isSuccess && message) {
            toast.success(message);
            dispatch(resetMasterStatus());
        }
    }, [isSuccess, message, dispatch]);

    // --- STATE HANDLERS ---
    const handleAddState = () => {
        setStateFormData({ name: '', isActive: true });
        setEditStateId(null);
        setShowStateModal(true);
    };

    const handleEditState = (state) => {
        setStateFormData({ name: state.name, isActive: state.isActive });
        setEditStateId(state._id);
        setShowStateModal(true);
    };

    const handleStateSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editStateId) {
                await dispatch(updateState({ id: editStateId, data: stateFormData })).unwrap();
            } else {
                await dispatch(createState(stateFormData)).unwrap();
            }
            setShowStateModal(false);
            dispatch(fetchStates());
        } catch (error) {
            toast.error(error || 'Operation failed');
        }
    };

    const handleDeleteState = async (id) => {
        if (window.confirm('Are you sure you want to delete this state? All associated cities will also be deleted.')) {
            try {
                await dispatch(deleteState(id)).unwrap();
                dispatch(fetchStates());
                dispatch(fetchCities());
            } catch (error) {
                toast.error(error || 'Delete failed');
            }
        }
    };

    // --- CITY HANDLERS ---
    const handleAddCity = () => {
        setCityFormData({ name: '', stateId: '', isActive: true });
        setEditCityId(null);
        setShowCityModal(true);
    };

    const handleEditCity = (city) => {
        setCityFormData({
            name: city.name,
            stateId: city.stateId?._id || city.stateId,
            isActive: city.isActive
        });
        setEditCityId(city._id);
        setShowCityModal(true);
    };

    const handleCitySubmit = async (e) => {
        e.preventDefault();
        if (!cityFormData.stateId) {
            toast.error('Please select a state');
            return;
        }
        try {
            if (editCityId) {
                await dispatch(updateCity({ id: editCityId, data: cityFormData })).unwrap();
            } else {
                await dispatch(createCity(cityFormData)).unwrap();
            }
            setShowCityModal(false);
            dispatch(fetchCities());
        } catch (error) {
            toast.error(error || 'Operation failed');
        }
    };

    const handleDeleteCity = async (id) => {
        if (window.confirm('Are you sure you want to delete this city?')) {
            try {
                await dispatch(deleteCity(id)).unwrap();
                dispatch(fetchCities());
            } catch (error) {
                toast.error(error || 'Delete failed');
            }
        }
    };

    // --- FILTERING ---
    const filteredStates = Array.isArray(states) ? states.filter(state =>
        state && state.name.toLowerCase().includes(stateSearchTerm.toLowerCase())
    ) : [];

    const filteredCities = Array.isArray(cities) ? cities.filter(city => {
        const matchesSearch = city && city.name.toLowerCase().includes(citySearchTerm.toLowerCase());
        const matchesState = !selectedStateFilter || (city.stateId?._id === selectedStateFilter || city.stateId === selectedStateFilter);
        return matchesSearch && matchesState;
    }) : [];

    return (
        <div className="container mx-auto px-4 py-8">
            {/* Page Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Location Master</h1>
                <p className="text-gray-500 text-sm">Manage states and cities for dropdowns across the application</p>
            </div>

            {/* STATE MANAGEMENT SECTION */}
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-700">States</h2>
                    <button
                        onClick={handleAddState}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 shadow-sm"
                    >
                        <Plus size={20} />
                        Add State
                    </button>
                </div>

                {/* State Search */}
                <div className="mb-4 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search states..."
                        className="pl-10 w-full md:w-1/3 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={stateSearchTerm}
                        onChange={(e) => setStateSearchTerm(e.target.value)}
                    />
                </div>

                {/* States Table */}
                <div className="bg-white rounded-lg shadow overflow-x-auto border">
                    {isLoading ? (
                        <div className="p-4"><TableSkeleton rows={5} cols={4} /></div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                                    <th className="p-2 border font-semibold w-12 text-center">Sr No</th>
                                    <th className="p-2 border font-semibold">State Name</th>
                                    <th className="p-2 border font-semibold text-center">Status</th>
                                    <th className="p-2 border font-semibold text-center w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredStates.length > 0 ? (
                                    filteredStates.map((state, index) => (
                                        <tr key={state._id} className="hover:bg-blue-50 text-xs text-gray-700 transition-colors">
                                            <td className="p-2 border text-center">{index + 1}</td>
                                            <td className="p-2 border font-medium text-gray-900">{state.name}</td>
                                            <td className="p-2 border text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${state.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                    {state.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="p-2 border text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditState(state)}
                                                        className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded hover:bg-blue-100 transition"
                                                        title="Edit"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteState(state._id)}
                                                        className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded hover:bg-red-100 transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-gray-500">
                                            No states found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* CITY MANAGEMENT SECTION */}
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-700">Cities</h2>
                    <button
                        onClick={handleAddCity}
                        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 shadow-sm"
                    >
                        <Plus size={20} />
                        Add City
                    </button>
                </div>

                {/* City Filters */}
                <div className="mb-4 flex gap-4">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search cities..."
                            className="pl-10 w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                            value={citySearchTerm}
                            onChange={(e) => setCitySearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={selectedStateFilter}
                        onChange={(e) => setSelectedStateFilter(e.target.value)}
                        className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                        <option value="">All States</option>
                        {states.map(state => (
                            <option key={state._id} value={state._id}>{state.name}</option>
                        ))}
                    </select>
                </div>

                {/* Cities Table */}
                <div className="bg-white rounded-lg shadow overflow-x-auto border">
                    {isLoading ? (
                        <div className="p-4"><TableSkeleton rows={5} cols={5} /></div>
                    ) : (
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-blue-600 text-white text-left text-xs uppercase tracking-wider">
                                    <th className="p-2 border font-semibold w-12 text-center">Sr No</th>
                                    <th className="p-2 border font-semibold">City Name</th>
                                    <th className="p-2 border font-semibold">State</th>
                                    <th className="p-2 border font-semibold text-center">Status</th>
                                    <th className="p-2 border font-semibold text-center w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredCities.length > 0 ? (
                                    filteredCities.map((city, index) => (
                                        <tr key={city._id} className="hover:bg-blue-50 text-xs text-gray-700 transition-colors">
                                            <td className="p-2 border text-center">{index + 1}</td>
                                            <td className="p-2 border font-medium text-gray-900">{city.name}</td>
                                            <td className="p-2 border">{city.stateId?.name || '-'}</td>
                                            <td className="p-2 border text-center">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${city.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-red-100 text-red-800 border-red-200'}`}>
                                                    {city.isActive ? 'Active' : 'Inactive'}
                                                </span>
                                            </td>
                                            <td className="p-2 border text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditCity(city)}
                                                        className="bg-blue-50 text-blue-600 border border-blue-200 p-1.5 rounded hover:bg-blue-100 transition"
                                                        title="Edit"
                                                    >
                                                        <Edit size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCity(city._id)}
                                                        className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded hover:bg-red-100 transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-gray-500">
                                            No cities found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* STATE MODAL */}
            {showStateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editStateId ? 'Edit State' : 'Add New State'}
                            </h2>
                            <button onClick={() => setShowStateModal(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleStateSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700">State Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={stateFormData.name}
                                    onChange={(e) => setStateFormData({ ...stateFormData, name: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mt-1"
                                    placeholder="e.g. Gujarat"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="stateActive"
                                    checked={stateFormData.isActive}
                                    onChange={(e) => setStateFormData({ ...stateFormData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <label htmlFor="stateActive" className="text-sm text-gray-700">State is Active</label>
                            </div>

                            <div className="pt-4 flex gap-3 justify-end border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowStateModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                >
                                    {editStateId ? 'Update State' : 'Create State'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* CITY MODAL */}
            {showCityModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">
                                {editCityId ? 'Edit City' : 'Add New City'}
                            </h2>
                            <button onClick={() => setShowCityModal(false)} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCitySubmit} className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700">State <span className="text-red-500">*</span></label>
                                <select
                                    value={cityFormData.stateId}
                                    onChange={(e) => setCityFormData({ ...cityFormData, stateId: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mt-1"
                                >
                                    <option value="">-- Select State --</option>
                                    {states.filter(s => s.isActive).map(state => (
                                        <option key={state._id} value={state._id}>{state.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700">City Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={cityFormData.name}
                                    onChange={(e) => setCityFormData({ ...cityFormData, name: e.target.value })}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all mt-1"
                                    placeholder="e.g. Surat"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="cityActive"
                                    checked={cityFormData.isActive}
                                    onChange={(e) => setCityFormData({ ...cityFormData, isActive: e.target.checked })}
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <label htmlFor="cityActive" className="text-sm text-gray-700">City is Active</label>
                            </div>

                            <div className="pt-4 flex gap-3 justify-end border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowCityModal(false)}
                                    className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-5 py-2.5 text-sm font-medium text-white bg-primary hover:bg-blue-700 rounded-lg shadow-sm transition-all focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                                >
                                    {editCityId ? 'Update City' : 'Create City'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LocationMaster;
