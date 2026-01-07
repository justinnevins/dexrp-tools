export const stripeService = {
  getPriceIds: () => ({ monthly: '', yearly: '' }),
  createCustomer: async (_email: string, _name?: string) => ({ id: 'community_edition' }),
  createCheckoutSession: async (_customerId: string, _priceId: string, _successUrl: string, _cancelUrl: string) => ({ url: '/' }),
  createCustomerPortalSession: async (_customerId: string, _returnUrl: string) => ({ url: '/' }),
  cancelSubscription: async (_subscriptionId: string) => null,
};
