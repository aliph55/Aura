import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
};

export const userInfoSlice = createSlice({
  name: 'userInfo',
  initialState,
  reducers: {
    resetUserInfo: state => {
      state.user = null;
    },
    setUserInfo: (state, action) => {
      state.user = action.payload;
    },
  },
});

export const { resetUserInfo, setUserInfo } = userInfoSlice.actions;
export default userInfoSlice.reducer;
