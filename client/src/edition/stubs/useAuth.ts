interface User {
  id: number;
  email: string;
  hasPassword: boolean;
  createdAt: Date;
}

export function useAuth(): {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => Promise<void>;
  isLoggingOut: boolean;
} {
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    logout: async () => {},
    isLoggingOut: false,
  };
}
