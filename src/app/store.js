import { configureStore } from '@reduxjs/toolkit';
import { usersApi } from '../services/usersApi';
import { messagesApi } from '../services/messagesApi';

export const store = configureStore({
  reducer: {
    [usersApi.reducerPath]: usersApi.reducer,
    [messagesApi.reducerPath]: messagesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(usersApi.middleware, messagesApi.middleware),
});