export type AuthResponse = {
  token: string;
  role: 'vendor';
};

export type VerifyOtpRequest = {
  mobile: string;
  otp: string;
};
