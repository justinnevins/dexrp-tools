export function useAuth() {
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    logout: async () => {},
    isLoggingOut: false,
  };
}
