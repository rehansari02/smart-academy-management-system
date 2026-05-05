import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// const API_URL = import.meta.env.VITE_API_URL + '/students/';
const API_URL = `${import.meta.env.VITE_API_URL}/students/`;

axios.defaults.withCredentials = true;

export const fetchStudents = createAsyncThunk(
  "students/fetchAll",
  async (params, thunkAPI) => {
    try {
      const queryParams = { ...params };
      // By default, exclude cancelled students unless explicitly requested
      if (queryParams.includeCancelled !== true) {
        queryParams.isCancelled = false;
      }
      delete queryParams.includeCancelled; // Remove from params as it's not a backend param

      const response = await axios.get(API_URL, { params: queryParams });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const fetchStudentById = createAsyncThunk(
  "students/fetchOne",
  async (id, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}${id}`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// New Action: Confirm Registration
export const confirmRegistration = createAsyncThunk(
  "students/confirmRegistration",
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await axios.post(
        `${API_URL}${id}/confirm-registration`,
        data
      );
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const registerStudent = createAsyncThunk(
  "students/register",
  async (studentData, thunkAPI) => {
    try {
      // Check if data contains file -> Convert to FormData
      let payload = studentData;
      let headers = {};

      if (studentData.studentPhoto instanceof File) {
        const formData = new FormData();
        Object.keys(studentData).forEach((key) => {
          if (studentData[key] !== null && studentData[key] !== undefined) {
            // Handle Nested Objects (like feeDetails)
            if (
              typeof studentData[key] === "object" &&
              !(studentData[key] instanceof File) &&
              !(studentData[key] instanceof Date)
            ) {
              formData.append(key, JSON.stringify(studentData[key])); // Stringify objects for backend
            } else {
              formData.append(key, studentData[key]);
            }
          }
        });
        payload = formData;
        headers = { "Content-Type": "multipart/form-data" };
      }

      const response = await axios.post(API_URL, payload, { headers });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// New Action: Update Student
export const updateStudent = createAsyncThunk(
  "students/update",
  async ({ id, data }, thunkAPI) => {
    try {
      let payload = data;
      let headers = {};

      // Check for File in Update
      if (data.studentPhoto instanceof File) {
        const formData = new FormData();
        Object.keys(data).forEach((key) => {
          if (data[key] !== null) formData.append(key, data[key]);
        });
        payload = formData;
        headers = { "Content-Type": "multipart/form-data" };
      }

      const response = await axios.put(`${API_URL}${id}`, payload, { headers });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const toggleActiveStatus = createAsyncThunk(
  "students/toggleStatus",
  async (id, thunkAPI) => {
    try {
      await axios.put(`${API_URL}${id}/toggle`);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(error.message);
    }
  }
);

export const resetStudentLogin = createAsyncThunk(
  "students/resetLogin",
  async ({ id, data }, thunkAPI) => {
    try {
      const response = await axios.put(`${API_URL}${id}/reset-login`, data);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const deleteStudent = createAsyncThunk(
  "students/delete",
  async (id, thunkAPI) => {
    try {
      await axios.delete(`${API_URL}${id}`);
      return id;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const cancelStudent = createAsyncThunk(
  "students/cancel",
  async (id, thunkAPI) => {
    try {
      const response = await axios.put(`${API_URL}${id}/cancel`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const reactivateStudent = createAsyncThunk(
  "students/reactivate",
  async (id, thunkAPI) => {
    try {
      const response = await axios.put(`${API_URL}${id}/reactivate`);
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const fetchExamPendingStudents = createAsyncThunk(
  "students/fetchExamPending",
  async (params, thunkAPI) => {
    try {
      const response = await axios.get(`${API_URL}exam-pending`, { params });
      return response.data;
    } catch (error) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

const studentSlice = createSlice({
  name: "students",
  initialState: {
    students: [],
    examPendingStudents: [],
    examPendingPagination: { page: 1, pages: 1, count: 0 },
    currentStudent: null,
    pagination: { page: 1, pages: 1, count: 0 },
    isLoading: false,
    isSuccess: false,
    message: "",
  },
  reducers: {
    resetStatus: (state) => {
      state.isSuccess = false;
      state.message = "";
      state.currentStudent = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudents.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchStudents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.students = action.payload.students || [];
        state.pagination = {
          page: action.payload.page || 1,
          pages: action.payload.pages || 1,
          count: action.payload.count || 0,
        };
      })
      .addCase(fetchStudents.rejected, (state, action) => {
        state.isLoading = false;
        state.students = [];
      })
      .addCase(fetchStudentById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchStudentById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentStudent = action.payload;
      })
      .addCase(registerStudent.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = "Admission Created Successfully";
      })
      .addCase(registerStudent.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.message = action.payload;
      })
      .addCase(updateStudent.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(updateStudent.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = "Student Updated Successfully";
      })
      .addCase(updateStudent.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.message = action.payload;
      })
      .addCase(confirmRegistration.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(confirmRegistration.fulfilled, (state) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = "Student Registration Completed";
      })
      .addCase(confirmRegistration.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.message = action.payload; // Error message
      })
      .addCase(toggleActiveStatus.fulfilled, (state, action) => {
        const student = state.students.find((s) => s._id === action.payload);
        if (student) student.isActive = !student.isActive;
      })
      .addCase(resetStudentLogin.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(resetStudentLogin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = "Login Credentials Updated & SMS Sent";
      })
      .addCase(resetStudentLogin.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.message = action.payload;
      })
      .addCase(deleteStudent.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(deleteStudent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = "Student Deleted Successfully";
        state.students = state.students.filter(
          (student) => student._id !== action.payload
        );
      })
      .addCase(deleteStudent.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.message = action.payload;
      })
      .addCase(cancelStudent.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(cancelStudent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = "Student Admission Cancelled Successfully";
        // Optionally update the student in state if needed
        const student = state.students.find((s) => s._id === action.payload._id);
        if (student) {
          student.isCancelled = true;
        }
      })
      .addCase(cancelStudent.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.message = action.payload;
      })
      .addCase(reactivateStudent.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(reactivateStudent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isSuccess = true;
        state.message = "Student Admission Reactivated Successfully";
        const student = state.students.find((s) => s._id === action.payload._id);
        if (student) {
          student.isCancelled = false;
        }
      })
      .addCase(reactivateStudent.rejected, (state, action) => {
        state.isLoading = false;
        state.isSuccess = false;
        state.message = action.payload;
      })
      .addCase(fetchExamPendingStudents.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchExamPendingStudents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.examPendingStudents = action.payload.students || [];
        state.examPendingPagination = {
          page: action.payload.page || 1,
          pages: action.payload.pages || 1,
          count: action.payload.count || 0,
        };
      })
      .addCase(fetchExamPendingStudents.rejected, (state, action) => {
        state.isLoading = false;
        state.examPendingStudents = [];
      });
  },
});

export const { resetStatus } = studentSlice.actions;
export default studentSlice.reducer;
