import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const API_URL = '/api/materials/';

// Fetch Materials
export const fetchMaterials = createAsyncThunk(
  'materials/getAll',
  async (filters, thunkAPI) => {
    try {
      // filters is an object { fromDate, toDate, type, searchBy, value, isActive }
      const queryString = new URLSearchParams(filters).toString();
      const response = await axios.get(API_URL + '?' + queryString);
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Create Material
export const createMaterial = createAsyncThunk(
  'materials/create',
  async (materialData, thunkAPI) => {
    try {
      // materialData should be FormData given file upload
      const response = await axios.post(API_URL, materialData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        }
      });
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Update Material
export const updateMaterial = createAsyncThunk(
  'materials/update',
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await axios.put(API_URL + id, data, {
        headers: {
            'Content-Type': 'multipart/form-data',
        }
      });
      return response.data;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

// Delete Material
export const deleteMaterial = createAsyncThunk(
  'materials/delete',
  async (id, thunkAPI) => {
    try {
      await axios.delete(API_URL + id);
      return id;
    } catch (error) {
      const message =
        (error.response && error.response.data && error.response.data.message) ||
        error.message ||
        error.toString();
      return thunkAPI.rejectWithValue(message);
    }
  }
);

const materialSlice = createSlice({
  name: 'materials',
  initialState: {
    materials: [],
    isLoading: false,
    isError: false,
    isSuccess: false,
    message: '',
  },
  reducers: {
    resetStatus: (state) => {
      state.isLoading = false;
      state.isError = false;
      state.isSuccess = false;
      state.message = '';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMaterials.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMaterials.fulfilled, (state, action) => {
        state.isLoading = false;
        state.materials = action.payload;
      })
      .addCase(fetchMaterials.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(createMaterial.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(createMaterial.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.materials.push(action.payload);
        state.message = 'Material created successfully';
      })
      .addCase(createMaterial.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(updateMaterial.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateMaterial.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.materials = state.materials.map((m) =>
          m._id === action.payload._id ? action.payload : m
        );
        state.message = 'Material updated successfully';
      })
      .addCase(updateMaterial.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      })
      .addCase(deleteMaterial.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteMaterial.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.materials = state.materials.filter(
          (m) => m._id !== action.payload
        );
        state.message = 'Material deleted successfully';
      })
      .addCase(deleteMaterial.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload;
      });
  },
});

export const { resetStatus } = materialSlice.actions;
export default materialSlice.reducer;
