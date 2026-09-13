import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const warehouseApi = createApi({
  reducerPath: 'warehouseApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['WarehouseMap'],
  endpoints: (builder) => ({
    getWarehouseMap: builder.query({
      query: () => 'warehouse-map',
      providesTags: ['WarehouseMap'],
    }),
    saveWarehouseMap: builder.mutation({
      query: (body) => ({ url: 'warehouse-map', method: 'PUT', body }),
      invalidatesTags: ['WarehouseMap'],
    }),
  }),
});

export const { useGetWarehouseMapQuery, useSaveWarehouseMapMutation } = warehouseApi;
