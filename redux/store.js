import { configureStore } from '@reduxjs/toolkit';
import userInfoReducer from './userInfo'; // Dosya adını userInfoSlice yap

export const store = configureStore({
  reducer: {
    userInfo: userInfoReducer, // reducer'ı kullan
  },
});
