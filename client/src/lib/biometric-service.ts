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
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userId = crypto.getRandomValues(new Uint8Array(16));

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { 
          name: "XRPL Wallet",
          id: location.hostname
        },
        user: {
          id: userId,
          name: "user",
          displayName: "Wallet User",
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "preferred"
        },
        timeout: 60000,
        attestation: "none",
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      }) as PublicKeyCredential;

      if (credential) {
        // Store the credential ID as base64
        this.credentialId = credential.id;
        this.isEnabled = true;
        localStorage.setItem('biometric_enabled', 'true');
        localStorage.setItem('biometric_credential_id', this.credentialId);
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
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials: [
          {
            id: new TextEncoder().encode(this.credentialId),
            type: "public-key",
          },
        ],
        userVerification: "preferred",
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