import axios from 'axios';

// Assuming vite proxy is set up or base URL is defined elsewhere. 
// If not, we might need a config file, but usually axios instance is preferred.
// For now using relative path assuming proxy.

// const API_URL = 'http://localhost:5000/api/visitors';
const API_URL = `${import.meta.env.VITE_API_URL}/visitors`;

// for production use uncomment below one line
// const API_URL = '/api/visitors';


const createVisitor = async (visitorData) => {
    const response = await axios.post(`${API_URL}/create`, visitorData);
    return response.data;
};

const getAllVisitors = async (filters = {}) => {
    const { fromDate, toDate, search, searchField, studentName, referenceBy, limit, inquirySource, employeeId, allocatedTo, onlyWithFollowups, excludeFollowedVisitors, dateFilterType, scope } = filters;
    const params = new URLSearchParams();
    if (fromDate) params.append('fromDate', fromDate);
    if (toDate) params.append('toDate', toDate);
    if (search) params.append('search', search);
    if (searchField) params.append('searchField', searchField);
    if (studentName) params.append('studentName', studentName);
    if (referenceBy) params.append('referenceBy', referenceBy);
    if (limit) params.append('limit', limit);
    if (inquirySource) params.append('inquirySource', inquirySource);
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (employeeId) params.append('employeeId', employeeId);
    if (allocatedTo) params.append('allocatedTo', allocatedTo);
    if (onlyWithFollowups) params.append('onlyWithFollowups', onlyWithFollowups);
    if (excludeFollowedVisitors) params.append('excludeFollowedVisitors', excludeFollowedVisitors);
    if (dateFilterType) params.append('dateFilterType', dateFilterType);
    if (scope) params.append('scope', scope);

    const response = await axios.get(`${API_URL}/all?${params.toString()}`);
    return response.data;
};

const getVisitorById = async (id) => {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
};

const updateVisitor = async (id, visitorData) => {
    const response = await axios.put(`${API_URL}/${id}`, visitorData);
    return response.data;
};

const createVisitorFollowUp = async (followUpData) => {
    const response = await axios.post(`${API_URL}/followups`, followUpData);
    return response.data;
};

const getVisitorFollowUps = async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.fromDate) params.append('fromDate', filters.fromDate);
    if (filters.toDate) params.append('toDate', filters.toDate);
    if (filters.search) params.append('search', filters.search);
    if (filters.searchField) params.append('searchField', filters.searchField);
    if (filters.studentName) params.append('studentName', filters.studentName);
    if (filters.referenceBy) params.append('referenceBy', filters.referenceBy);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.branchId) params.append('branchId', filters.branchId);
    if (filters.visitorId) params.append('visitorId', filters.visitorId);
    if (filters.employeeId) params.append('employeeId', filters.employeeId);
    if (filters.dateFilterType) params.append('dateFilterType', filters.dateFilterType);
    if (filters.isDone !== undefined) params.append('isDone', String(filters.isDone));
    if (filters.excludeVisitorReportActivity) params.append('excludeVisitorReportActivity', filters.excludeVisitorReportActivity);

    const response = await axios.get(`${API_URL}/followups?${params.toString()}`);
    return response.data;
};

const deleteVisitorFollowUp = async (id) => {
    const response = await axios.delete(`${API_URL}/followups/${id}`);
    return response.data;
};

const deleteVisitor = async (id) => {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
};

export default {
    createVisitor,
    getAllVisitors,
    getVisitorById,
    updateVisitor,
    createVisitorFollowUp,
    getVisitorFollowUps,
    deleteVisitorFollowUp,
    deleteVisitor
};


