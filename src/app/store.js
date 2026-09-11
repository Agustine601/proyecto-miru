import { configureStore } from '@reduxjs/toolkit';

import displayReducer from '../components/containers/displaySlice';
import loginReducer from '../loginSlice';
import userReducer from '../components/containers/userSlice';
import filterReducer from '../components/Items/filterSlice';

import { setupListeners } from '@reduxjs/toolkit/dist/query';

import { itemsApi } from '../services/items';
import { movementsApi } from '../services/movements';
import { workOrdersApi } from '../services/workOrders';

export const store = configureStore({
  reducer: {
    display: displayReducer,
    login: loginReducer,
    user: userReducer,
    filter: filterReducer,

    [itemsApi.reducerPath]: itemsApi.reducer,
    [movementsApi.reducerPath]: movementsApi.reducer,
    [workOrdersApi.reducerPath]: workOrdersApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(itemsApi.middleware)
      .concat(movementsApi.middleware)
      .concat(workOrdersApi.middleware),
});

setupListeners(store.dispatch);