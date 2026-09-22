import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  filter: '',
  inventoryFilter: 'todos',
};

export const filterSlice = createSlice({
  name: 'filter',
  initialState,
  reducers: {
    setFilter: (state, action) => {
      state.filter = action.payload;
    },
    setInventoryFilter: (state, action) => {
      state.inventoryFilter = action.payload;
    },
  },
});

export const { setFilter, setInventoryFilter } = filterSlice.actions;

export default filterSlice.reducer;
