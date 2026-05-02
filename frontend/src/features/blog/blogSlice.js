import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = `${import.meta.env.VITE_API_URL}/blogs`;

// Get all blogs
export const fetchBlogs = createAsyncThunk('blogs/fetchAll', async (_, thunkAPI) => {
    try {
        const response = await axios.get(API_URL);
        return response.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data.message);
    }
});

// Create blog
export const createBlog = createAsyncThunk('blogs/create', async (formData, thunkAPI) => {
    try {
        const config = {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true
        };
        const response = await axios.post(API_URL, formData, config);
        return response.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data.message);
    }
});

// Update blog
export const updateBlog = createAsyncThunk('blogs/update', async ({ id, formData }, thunkAPI) => {
    try {
        const config = {
            headers: { 'Content-Type': 'multipart/form-data' },
            withCredentials: true
        };
        const response = await axios.put(`${API_URL}/${id}`, formData, config);
        return response.data;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data.message);
    }
});

// Delete blog
export const deleteBlog = createAsyncThunk('blogs/delete', async (id, thunkAPI) => {
    try {
        const config = { withCredentials: true };
        await axios.delete(`${API_URL}/${id}`, config);
        return id;
    } catch (error) {
        return thunkAPI.rejectWithValue(error.response.data.message);
    }
});

const blogSlice = createSlice({
    name: 'blogs',
    initialState: {
        blogs: [],
        isLoading: false,
        isSuccess: false,
        isError: false,
        message: ''
    },
    reducers: {
        resetBlogState: (state) => {
            state.isLoading = false;
            state.isSuccess = false;
            state.isError = false;
            state.message = '';
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchBlogs.pending, (state) => { state.isLoading = true; })
            .addCase(fetchBlogs.fulfilled, (state, action) => {
                state.isLoading = false;
                state.blogs = action.payload;
            })
            .addCase(fetchBlogs.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            .addCase(createBlog.fulfilled, (state, action) => {
                state.isSuccess = true;
                state.blogs.unshift(action.payload);
            })
            .addCase(updateBlog.fulfilled, (state, action) => {
                state.isSuccess = true;
                const index = state.blogs.findIndex(b => b._id === action.payload._id);
                if (index !== -1) state.blogs[index] = action.payload;
            })
            .addCase(deleteBlog.fulfilled, (state, action) => {
                state.isSuccess = true;
                state.blogs = state.blogs.filter(b => b._id !== action.payload);
            });
    }
});

export const { resetBlogState } = blogSlice.actions;
export default blogSlice.reducer;
