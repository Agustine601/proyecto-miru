import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const movementsApi = createApi({
  reducerPath: 'movementsApi',

  baseQuery: fetchBaseQuery({
    baseUrl: '/',
  }),

  tagTypes: ['Movement'],

  endpoints: (builder) => ({

    // Cierre de jornada
    obtenerCierreHoy: builder.query({
      query: () => 'movements/cierre/hoy',
      providesTags: ['Movement'],
    }),

    cerrarJornada: builder.mutation({
      query: (datos = {}) => ({
        url: 'movements/cierre',
        method: 'POST',
        body: datos,
      }),
      invalidatesTags: ['Movement'],
    }),

    // Registrar consumo
    registrarConsumo: builder.mutation({
      query: (datos) => ({
        url: 'movements/consumo',
        method: 'POST',
        body: datos,
      }),
      invalidatesTags: ['Movement'],
    }),

    // Registrar entrada o salida
    registrarMovimiento: builder.mutation({
      query: (datos) => ({
        url: 'movements',
        method: 'POST',
        body: datos,
      }),
      invalidatesTags: ['Movement'],
    }),

    // Obtener historial
    obtenerMovimientos: builder.query({
      query: () => 'movements',
      providesTags: ['Movement'],
    }),
  }),
});

export const {
  useRegistrarConsumoMutation,
  useRegistrarMovimientoMutation,
  useObtenerMovimientosQuery,
  useObtenerCierreHoyQuery,
  useCerrarJornadaMutation,
} = movementsApi;