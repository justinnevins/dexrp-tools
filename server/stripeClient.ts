export async function getStripePublishableKey(): Promise<string | null> {
  return null;
}

export function getUncachableStripeClient(): any {
  return {
    webhooks: {
      constructEvent: () => ({ type: 'none', data: { object: {} } }),
    },
  };
}
