import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        user: null,
        token: localStorage.getItem('token') || null,
        isAuthenticated: false,
    },
    reducers: {
        setUser: (state, action) => {
            state.user = {
                userId: action.payload.userId,
                role: action.payload.role,
                username: action.payload.username,
            };
            state.isAuthenticated = true;
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.isAuthenticated = false;
            localStorage.removeItem('token');
        },
    },
});

export const { setUser, logout } = authSlice.actions;
export default authSlice.reducer;
