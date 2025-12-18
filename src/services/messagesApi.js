import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const messagesApi = createApi({
  reducerPath: 'messagesApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL + '/api',
  }),
  tagTypes: ['Message'],
  endpoints: (builder) => ({
    getChats: builder.query({
      query: () => '/messages',
      providesTags: ['Message'],
    }),
    getMessages: builder.query({
      query: (chatId) => `/messages/${chatId}`,
      providesTags: ['Message'],
    }),
    createMessage: builder.mutation({
      query: ({ chatId, ...body }) => ({
        url: `/messages/${chatId}`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Message'],
    }),
  }),
});

export const { useGetChatsQuery, useGetMessagesQuery, useCreateMessageMutation } = messagesApi;