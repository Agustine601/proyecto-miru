import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const communicationsApi = createApi({
  reducerPath: 'communicationsApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/' }),
  tagTypes: ['Communication'],
  endpoints: (builder) => ({
    getCommunications: builder.query({
      query: () => 'communications',
      providesTags: ['Communication'],
    }),

    sendCommunication: builder.mutation({
      query: (body) => ({
        url: 'communications',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Communication'],
    }),

    markCommunicationRead: builder.mutation({
      query: (id) => ({
        url: `communications/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Communication'],
    }),

    toggleCommunicationPin: builder.mutation({
      query: ({ id, pinned }) => ({
        url: `communications/${id}/pin`,
        method: 'PATCH',
        body: { pinned },
      }),
      invalidatesTags: ['Communication'],
    }),
  }),
});

export const {
  useGetCommunicationsQuery,
  useSendCommunicationMutation,
  useMarkCommunicationReadMutation,
  useToggleCommunicationPinMutation,
} = communicationsApi;
