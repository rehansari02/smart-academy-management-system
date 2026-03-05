import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// const API_URL = import.meta.env.VITE_API_URL + '/student-portal/';
const API_URL = `${import.meta.env.VITE_API_URL}/student-portal/`;

// Fetch Dashboard Stats
export const fetchDashboardStats = createAsyncThunk(
    'studentPortal/fetchDashboardStats',
    async (_, thunkAPI) => {
        try {
            const response = await axios.get(`${API_URL}dashboard`);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Fetch Course Details
export const fetchCourseDetails = createAsyncThunk(
    'studentPortal/fetchCourseDetails',
    async (_, thunkAPI) => {
        try {
            const response = await axios.get(`${API_URL}course`);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Submit Feedback - Although component might handle it, good to have here for consistency if needed
export const submitCourseFeedback = createAsyncThunk(
    'studentPortal/submitFeedback',
    async (feedbackData, thunkAPI) => {
        try {
            const response = await axios.post(`${API_URL}feedback`, feedbackData);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Study Material Thunks
export const fetchStudyMaterials = createAsyncThunk(
    'studentPortal/fetchStudyMaterials',
    async (_, thunkAPI) => {
        try {
            const response = await axios.get(`${API_URL}materials`);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Free Learning (MCQ) Thunks
export const fetchFreeLearningQuestions = createAsyncThunk(
    'studentPortal/fetchFreeLearningQuestions',
    async (_, thunkAPI) => {
        try {
            const response = await axios.get(`${API_URL}learning/questions`);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

export const submitQuiz = createAsyncThunk(
    'studentPortal/submitQuiz',
    async (quizData, thunkAPI) => {
        try {
            const response = await axios.post(`${API_URL}learning/submit`, quizData);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

export const fetchQuizReport = createAsyncThunk(
    'studentPortal/fetchQuizReport',
    async (_, thunkAPI) => {
        try {
            const response = await axios.get(`${API_URL}learning/report`);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

// Fetch Student Fees
export const fetchStudentFees = createAsyncThunk(
    'studentPortal/fetchStudentFees',
    async (_, thunkAPI) => {
        try {
            const response = await axios.get(`${API_URL}fees`);
            return response.data;
        } catch (error) {
            return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
        }
    }
);

const studentPortalSlice = createSlice({
    name: 'studentPortal',
    initialState: {
        stats: null,
        courseDetails: null,
        studyMaterials: [],
        quizQuestions: [],
        quizResult: null,
        quizReports: [],
        fees: [], // Added fees state
        isLoading: false,
        isError: false,
        message: '',
    },
    reducers: {
        resetPortalState: (state) => {
            state.isLoading = false;
            state.isError = false;
            state.message = '';
            state.quizResult = null;
        },
        resetQuizResult: (state) => {
            state.quizResult = null;
        }
    },
    extraReducers: (builder) => {
        builder
            // Dashboard Stats
            .addCase(fetchDashboardStats.pending, (state) => { state.isLoading = true; state.isError = false; })            
            .addCase(fetchDashboardStats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.stats = action.payload;
            })
            .addCase(fetchDashboardStats.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Course Details
            .addCase(fetchCourseDetails.pending, (state) => { state.isLoading = true; })
            .addCase(fetchCourseDetails.fulfilled, (state, action) => {
                state.isLoading = false;
                state.courseDetails = action.payload;
            })
            .addCase(fetchCourseDetails.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Study Materials
            .addCase(fetchStudyMaterials.pending, (state) => { state.isLoading = true; })
            .addCase(fetchStudyMaterials.fulfilled, (state, action) => {
                state.isLoading = false;
                state.studyMaterials = action.payload;
            })
            .addCase(fetchStudyMaterials.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Quiz Questions
            .addCase(fetchFreeLearningQuestions.pending, (state) => { state.isLoading = true; })
            .addCase(fetchFreeLearningQuestions.fulfilled, (state, action) => {
                state.isLoading = false;
                state.quizQuestions = action.payload;
            })
            .addCase(fetchFreeLearningQuestions.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Submit Quiz
            .addCase(submitQuiz.pending, (state) => { state.isLoading = true; })
            .addCase(submitQuiz.fulfilled, (state, action) => {
                state.isLoading = false;
                state.quizResult = action.payload;
            })
            .addCase(submitQuiz.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
             // Quiz Report
            .addCase(fetchQuizReport.pending, (state) => { state.isLoading = true; })
            .addCase(fetchQuizReport.fulfilled, (state, action) => {
                state.isLoading = false;
                state.quizReports = action.payload;
            })
            .addCase(fetchQuizReport.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            })
            // Student Fees
            .addCase(fetchStudentFees.pending, (state) => { state.isLoading = true; })
            .addCase(fetchStudentFees.fulfilled, (state, action) => {
                state.isLoading = false;
                state.fees = action.payload;
            })
            .addCase(fetchStudentFees.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload;
            });
    },
});

export const { resetPortalState, resetQuizResult } = studentPortalSlice.actions;
export default studentPortalSlice.reducer;
