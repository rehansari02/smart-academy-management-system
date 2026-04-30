import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/employees/`;

axios.defaults.withCredentials = true;

export const fetchEmployees = createAsyncThunk('employees/fetchAll', async (filters, thunkAPI) => {
    try {
        const response = await axios.get(API_URL, { params: filters });
        return response.data;
    } catch (error) { return thunkAPI.rejectWithValue(error.message); }
});

export const createEmployee = createAsyncThunk('employees/create', async (data, thunkAPI) => {
    try {
        console.log("[API Debug] Creating employee with data type:", data.constructor.name);
        
        if (data instanceof FormData) {
            console.log("[API Debug] FormData contents:");
            for (let [key, value] of data.entries()) {
                if (key === 'photo') {
                    console.log(`  ${key}:`, value instanceof File ? `File(${value.name}, ${value.size} bytes)` : value);
                } else {
                    console.log(`  ${key}:`, value);
                }
            }
        } else {
            console.log("[API Debug] Regular object data:", data);
        }
        
        const response = await axios.post(API_URL, data, {
            headers: {
                'Content-Type': data instanceof FormData ? 'multipart/form-data' : 'application/json'
            }
        });
        
        console.log("[API Debug] Employee creation successful:", response.data);
        return response.data;
    } catch (error) { 
        console.error("[API Debug] Employee creation failed:", error);
        console.error("[API Debug] Error response:", error.response?.data);
        console.error("[API Debug] Error status:", error.response?.status);
        
        const message = (error.response && error.response.data && error.response.data.message) || error.message;
        return thunkAPI.rejectWithValue(message); 
    }
});

export const updateEmployee = createAsyncThunk('employees/update', async ({ id, data }, thunkAPI) => {
    try {
        const response = await axios.put(API_URL + id, data);
        return response.data;
    } catch (error) {
        const message = (error.response && error.response.data && error.response.data.message) || error.message;
        return thunkAPI.rejectWithValue(message);
    }
});

export const deleteEmployee = createAsyncThunk('employees/delete', async (id, thunkAPI) => {
    try {
        const response = await axios.delete(API_URL + id);
        return response.data; // Expecting { id: ..., message: ... }
    } catch (error) {
        return thunkAPI.rejectWithValue(error.message);
    }
});

const employeeSlice = createSlice({
    name: 'employees',
    initialState: {
        employees: [],
        isLoading: false,
        isSuccess: false,
        isError: false,
        message: ''
    },
    reducers: {
        resetEmployeeStatus: (state) => {
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchEmployees.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchEmployees.fulfilled, (state, action) => {
                state.isLoading = false;
                state.employees = action.payload;
            })
            .addCase(fetchEmployees.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(createEmployee.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(createEmployee.fulfilled, (state, action) => {
                state.isLoading = false;
                state.employees.unshift(action.payload);
                state.isSuccess = true;
                state.message = 'Employee Added Successfully';
            })
            .addCase(createEmployee.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(updateEmployee.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(updateEmployee.fulfilled, (state, action) => {
                state.isLoading = false;
                const index = state.employees.findIndex(e => e._id === action.payload._id);
                if (index !== -1) {
                    state.employees[index] = action.payload;
                }
                state.isSuccess = true;
                state.message = 'Employee Updated Successfully';
            })
            .addCase(updateEmployee.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(deleteEmployee.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(deleteEmployee.fulfilled, (state, action) => {
                state.isLoading = false;
                state.employees = state.employees.filter(e => e._id !== action.payload.id);
                state.isSuccess = true;
                state.message = 'Employee Deleted Successfully';
            })
            .addCase(deleteEmployee.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    }
});

export const { resetEmployeeStatus } = employeeSlice.actions;
export default employeeSlice.reducer;