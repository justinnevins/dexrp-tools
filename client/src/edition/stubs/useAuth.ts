interface User {
  email: string;
  hasPassword: boolean;
}

export function useAuth() {
  return {
    user: null as User | null,
    isLoading: false,
    isAuthenticated: false,
    logout: async () => {},
    isLoggingOut: false,
  };
}
