import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const workOrdersApi = createApi({
  reducerPath: 'workOrdersApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['WorkOrder'],
  endpoints: (builder) => ({
    getWorkOrders: builder.query({
      query: () => 'work-orders',
      providesTags: ['WorkOrder'],
    }),
    createWorkOrder: builder.mutation({
      query: (body) => ({
        url: 'work-orders',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['WorkOrder'],
    }),
    dispatchWorkOrderItem: builder.mutation({
      query: ({ id, itemIndex, responsable }) => ({
        url: `work-orders/${id}/items/${itemIndex}/dispatch`,
        method: 'POST',
        body: { responsable },
      }),
      invalidatesTags: ['WorkOrder'],
    }),
    cancelWorkOrder: builder.mutation({
      query: (id) => ({
        url: `work-orders/${id}/cancel`,
        method: 'POST',
      }),
      invalidatesTags: ['WorkOrder'],
    }),
  }),
});

export const {
  useGetWorkOrdersQuery,
  useCreateWorkOrderMutation,
  useDispatchWorkOrderItemMutation,
  useCancelWorkOrderMutation,
} = workOrdersApi;
