import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const itemsApi = createApi({
  reducerPath: 'items',

  baseQuery: fetchBaseQuery({
    baseUrl: '/items/',
  }),

  tagTypes: ['Consumable', 'Reagent', 'Equipment'],

  endpoints: (builder) => ({
    // ================================
    // OBTENER PRODUCTOS
    // ================================

    getConsumables: builder.query({
      query: () => 'consumables',
      providesTags: ['Consumable'],
    }),

    getReagents: builder.query({
      query: () => 'reagents',
      providesTags: ['Reagent'],
    }),

    getEquipment: builder.query({
      query: () => 'equipment',
      providesTags: ['Equipment'],
    }),

    // ================================
    // BUSCAR PRODUCTO EXISTENTE
    // ================================

    lookupItem: builder.query({
      query: (params) => ({
        url: 'lookup',
        params,
      }),
    }),

    // ================================
    // AGREGAR PRODUCTO
    // ================================

    addItem: builder.mutation({
      query({ categoria, ...body }) {
        return {
          url: categoria,
          method: 'POST',
          body,
        };
      },

      invalidatesTags: [
        'Consumable',
        'Reagent',
        'Equipment',
      ],
    }),

    // ================================
    // AGREGAR INGRESO / PALLET A PRODUCTO EXISTENTE
    // ================================

    addStock: builder.mutation({
      query: ({ categoria, id, ...body }) => ({
        url: `${categoria}/${id}/stock`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Consumable', 'Reagent', 'Equipment'],
    }),

    // ================================
    // ACTUALIZAR UBICACIÓN DE PALLET
    // ================================

    updatePalletLocation: builder.mutation({
      query: ({ categoria, id, palletId, ubicacion }) => ({
        url: `${categoria}/${id}/pallet/${palletId}/location`,
        method: 'PUT',
        body: { ubicacion },
      }),
      invalidatesTags: ['Consumable', 'Reagent', 'Equipment'],
    }),

    // ================================
    // ELIMINAR PRODUCTO
    // ================================

    deleteItem: builder.mutation({
      query({ id, categoria }) {
        return {
          url: `${categoria}/${id}`,
          method: 'DELETE',
        };
      },

      invalidatesTags: [
        'Consumable',
        'Reagent',
        'Equipment',
      ],
    }),

    // ================================
    // ACTUALIZAR PRODUCTO
    // ================================

    updateItem: builder.mutation({
      query({ id, categoria, ...body }) {
        return {
          url: `${categoria}/${id}`,
          method: 'PUT',
          body,
        };
      },

      invalidatesTags: [
        'Consumable',
        'Reagent',
        'Equipment',
      ],
    }),
        // ================================
    // RESTABLECER MIRÚ
    // ================================

    resetSystem: builder.mutation({
      query: () => ({
        url: 'reset-system',
        method: 'DELETE',
      }),

      invalidatesTags: [
        'Consumable',
        'Reagent',
        'Equipment',
      ],
    }),
  }),
});

// ================================
// EXPORTAR HOOKS
// ================================

export const {
  useGetConsumablesQuery,
  useGetReagentsQuery,
  useGetEquipmentQuery,
  useAddItemMutation,
  useAddStockMutation,
  useLazyLookupItemQuery,
  useUpdatePalletLocationMutation,
  useDeleteItemMutation,
  useUpdateItemMutation,
  useResetSystemMutation,
} = itemsApi;