class BiometricService {
  private isEnabled: boolean = false;
  private credentialId: string | null = null;

  constructor() {
    this.isEnabled = localStorage.getItem('biometric_enabled') === 'true';
    this.credentialId = localStorage.getItem('biometric_credential_id');
  }

  async isAvailable(): Promise<boolean> {
    if (!('PublicKeyCredential' in window)) {
      return false;
    }

    try {
      const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch {
      return false;
    }
  }

  async register(): Promise<boolean> {
    if (!(await this.isAvailable())) {
      throw new Error('Biometric authentication not available');
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "XRPL Wallet",
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode("user-id"),
          name: "wallet-user",
          displayName: "Wallet User",
        },
        pubKeyCredParams: [
          {
            alg: -7, // ES256
            type: "public-key",
          },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "direct",
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (credential) {
        this.credentialId = credential.id;
        this.isEnabled = true;
        localStorage.setItem('biometric_enabled', 'true');
        localStorage.setItem('biometric_credential_id', credential.id);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Biometric registration failed:', error);
      throw new Error('Failed to register biometric authentication');
    }
  }

  async authenticate(): Promise<boolean> {
    if (!this.isEnabled || !this.credentialId) {
      throw new Error('Biometric authentication not set up');
    }

    if (!(await this.isAvailable())) {
      throw new Error('Biometric authentication not available');
    }

    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [
          {
            id: new TextEncoder().encode(this.credentialId),
            type: "public-key",
          },
        ],
        userVerification: "required",
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      return assertion !== null;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  enable() {
    this.isEnabled = true;
    localStorage.setItem('biometric_enabled', 'true');
  }

  disable() {
    this.isEnabled = false;
    this.credentialId = null;
    localStorage.setItem('biometric_enabled', 'false');
    localStorage.removeItem('biometric_credential_id');
  }

  isSetup(): boolean {
    return this.isEnabled && this.credentialId !== null;
  }

  getBiometricStatus(): 'available' | 'not-supported' | 'not-setup' | 'enabled' {
    if (!('PublicKeyCredential' in window)) {
      return 'not-supported';
    }
    
    if (!this.isEnabled || !this.credentialId) {
      return 'not-setup';
    }
    
    return 'enabled';
  }
}

export const biometricService = new BiometricService();