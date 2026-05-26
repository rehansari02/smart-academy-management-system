import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/complains`;

// Submit Complain
export const submitComplain = createAsyncThunk('complain/submit', async (complainData, thunkAPI) => {
    try {
        const config = { withCredentials: true };
        const response = await axios.post(API_URL, complainData, config);
        return response.data;
    } catch (error) {
        const message = (error.response && error.response.data && error.response.data.message) || error.message;
        return thunkAPI.rejectWithValue(message);
    }
});

// Get My Complains
export const getMyComplains = createAsyncThunk('complain/getMy', async (_, thunkAPI) => {
    try {
        const config = { withCredentials: true };
        const response = await axios.get(`${API_URL}/my`, config);
        return response.data;
    } catch (error) {
        const message = (error.response && error.response.data && error.response.data.message) || error.message;
        return thunkAPI.rejectWithValue(message);
    }
});

// Get All Complains (Admin)
export const getAllComplains = createAsyncThunk('complain/getAll', async (filters, thunkAPI) => {
    try {
        const config = { 
            params: filters,
            withCredentials: true 
        };
        const response = await axios.get(API_URL, config);
        return response.data;
    } catch (error) {
        const message = (error.response && error.response.data && error.response.data.message) || error.message;
        return thunkAPI.rejectWithValue(message);
    }
});

// Update Complain Status (Admin)
export const updateComplainStatus = createAsyncThunk('complain/updateStatus', async ({ id, status, adminRemark }, thunkAPI) => {
    try {
        const config = { withCredentials: true };
        const response = await axios.put(`${API_URL}/${id}/status`, { status, adminRemark }, config);
        return response.data;
    } catch (error) {
        const message = (error.response && error.response.data && error.response.data.message) || error.message;
        return thunkAPI.rejectWithValue(message);
    }
});

const complainSlice = createSlice({
    name: 'complain',
    initialState: {
        complains: [],
        isLoading: false,
        isSuccess: false,
        isError: false,
        message: ''
    },
    reducers: {
        resetComplainState: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(submitComplain.pending, (state) => { state.isLoading = true; })
            .addCase(submitComplain.fulfilled, (state, action) => {
                state.isLoading = false;
                state.isSuccess = true;
                state.complains.unshift(action.payload);
            })
            .addCase(submitComplain.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(getMyComplains.fulfilled, (state, action) => {
                state.complains = action.payload;
            })
            .addCase(getAllComplains.fulfilled, (state, action) => {
                state.complains = action.payload;
            })
            .addCase(updateComplainStatus.fulfilled, (state, action) => {
                const index = state.complains.findIndex(c => c._id === action.payload._id);
                if (index !== -1) {
                    state.complains[index] = action.payload;
                }
            });
    }
});

export const { resetComplainState } = complainSlice.actions;
export default complainSlice.reducer;
