

import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  email: null,
  role: 'guest',
  isOwner: false,
};

export const userSlice = createSlice({
  name: 'user',

  initialState,

  reducers: {
    setUser: (state, action) => {
      state.user = action.payload.name;
      state.email = action.payload.email;
      state.role = action.payload.role || 'user';
      state.isOwner = action.payload.isOwner || false;
    },

    clearUser: (state) => {
      state.user = null;
      state.email = null;
      state.role = 'guest';
      state.isOwner = false;
    },
  },
});

export const {
  setUser,
  clearUser,
} = userSlice.actions;

export default userSlice.reducer;

