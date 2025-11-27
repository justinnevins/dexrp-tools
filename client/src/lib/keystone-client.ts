import KeystoneSDK from '@keystonehq/keystone-sdk';
import { URDecoder, UR } from '@ngraveio/bc-ur';
import { Buffer } from 'buffer';

interface XrpTransaction {
  TransactionType: string;
  Account: string;
  Fee: string | number;
  Sequence: number;
  LastLedgerSequence: number;
  Flags?: number;
  Amount?: string | { currency: string; value: string; issuer: string };
  Destination?: string;
  DestinationTag?: number;
  LimitAmount?: { currency: string; value: string; issuer: string };
  TakerGets?: string | { currency: string; value: string; issuer: string };
  TakerPays?: string | { currency: string; value: string; issuer: string };
  OfferSequence?: number;
  SigningPubKey?: string;
}

interface SignRequestResult {
  type: string;
  cbor: string;
  requestId: string;
}

interface SignatureResult {
  signature: string;
  requestId: string;
}

export function prepareXrpSignRequest(transaction: XrpTransaction): SignRequestResult {
  console.log('Client: Creating Keystone sign request for:', transaction);
  
  const keystoneSDK = new KeystoneSDK();
  
  const xrpTransaction: any = {
    ...transaction,
    Fee: String(transaction.Fee),
    Sequence: Number(transaction.Sequence),
    LastLedgerSequence: Number(transaction.LastLedgerSequence)
  };

  if (transaction.Flags !== undefined && transaction.Flags !== null) {
    xrpTransaction.Flags = Number(transaction.Flags);
  }

  if (transaction.TransactionType === 'Payment' && transaction.Amount) {
    if (typeof transaction.Amount === 'object') {
      xrpTransaction.Amount = transaction.Amount;
    } else {
      xrpTransaction.Amount = String(transaction.Amount);
    }
  }
  
  console.log('Client: Formatted transaction:', xrpTransaction);
  
  const ur = keystoneSDK.xrp.generateSignRequest(xrpTransaction);
  
  console.log('Client: SDK generated UR type:', ur.type);
  console.log('Client: CBOR buffer length:', ur.cbor.length);
  
  return {
    type: ur.type,
    cbor: ur.cbor.toString('hex'),
    requestId: crypto.randomUUID()
  };
}

export function parseKeystoneSignature(urString: string): SignatureResult {
  console.log('Client: Decoding Keystone signature from UR:', urString.substring(0, 50) + '...');
  
  try {
    const keystoneSDK = new KeystoneSDK();
    
    const isSinglePart = !urString.match(/ur:[^/]+\/\d+-\d+\//i);
    
    let decodedUR: any;
    
    if (isSinglePart) {
      console.log('Client: Decoding single-part UR');
      
      const match = urString.toLowerCase().match(/^ur:([^/]+)\/(.+)$/);
      if (!match) {
        throw new Error('Invalid UR format');
      }
      
      const [, type, payload] = match;
      
      // Check if payload is pure hex (only 0-9, a-f characters)
      const isHex = /^[0-9a-f]+$/i.test(payload);
      
      if (isHex) {
        console.log('Client: Detected hex-encoded UR (minimal encoding)');
        // Convert hex payload to Uint8Array for CBOR
        const cborBytes = new Uint8Array(payload.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        decodedUR = {
          type: type,
          cbor: cborBytes
        };
      } else {
        console.log('Client: Detected Bytewords-encoded UR');
        // Use URDecoder for Bytewords-encoded URs
        const decoder = new URDecoder();
        decoder.receivePart(urString.toUpperCase()); // URDecoder expects uppercase
        
        if (!decoder.isComplete()) {
          throw new Error('UR decoding incomplete');
        }
        
        decodedUR = decoder.resultUR();
      }
    } else {
      console.log('Client: Decoding multi-part UR');
      const decoder = new URDecoder();
      decoder.receivePart(urString.toUpperCase());
      
      if (!decoder.isComplete()) {
        throw new Error('UR decoding incomplete - multi-part UR requires all fragments');
      }
      
      decodedUR = decoder.resultUR();
    }
    
    // Get type as string
    let typeString: string;
    if (typeof decodedUR.type === 'string') {
      typeString = decodedUR.type;
    } else if (decodedUR.type instanceof Uint8Array || ArrayBuffer.isView(decodedUR.type)) {
      typeString = new TextDecoder().decode(decodedUR.type);
    } else {
      typeString = String(decodedUR.type);
    }
    
    // Get CBOR as Uint8Array
    let cborBytes: Uint8Array;
    if (decodedUR.cbor instanceof Uint8Array) {
      cborBytes = decodedUR.cbor;
    } else if (ArrayBuffer.isView(decodedUR.cbor)) {
      cborBytes = new Uint8Array(decodedUR.cbor.buffer, decodedUR.cbor.byteOffset, decodedUR.cbor.byteLength);
    } else {
      cborBytes = new Uint8Array(decodedUR.cbor);
    }
    
    console.log('Client: Decoded UR type:', typeString);
    console.log('Client: Decoded CBOR length:', cborBytes.length);
    
    // Convert to hex string for UR construction
    const cborHex = Array.from(cborBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('Client: CBOR hex (first 50 chars):', cborHex.substring(0, 50));
    
    // Create UR object - Keystone SDK expects Buffer
    const cborBuffer = Buffer.from(cborHex, 'hex');
    const ur = new UR(cborBuffer, typeString);
    
    console.log('Client: Created UR object for parseSignature');
    console.log('Client: UR type:', ur.type);
    console.log('Client: UR cbor type:', typeof ur.cbor, ur.cbor?.constructor?.name);
    console.log('Client: UR cbor length:', ur.cbor?.length);
    
    try {
      console.log('Client: Calling keystoneSDK.xrp.parseSignature...');
      const signature = keystoneSDK.xrp.parseSignature(ur);
      
      console.log('Client: Parsed signature result:', JSON.stringify(signature));
      
      const parsedSignature: any = signature;
      return {
        signature: typeof parsedSignature === 'string' ? parsedSignature : parsedSignature.signature,
        requestId: typeof parsedSignature === 'object' && parsedSignature.requestId ? parsedSignature.requestId : crypto.randomUUID()
      };
    } catch (parseError: any) {
      const errorMsg = parseError?.message || String(parseError) || 'Unknown error';
      const errorStack = parseError?.stack || 'No stack trace';
      console.error('Client: SDK parseSignature error message:', errorMsg);
      console.error('Client: SDK parseSignature error stack:', errorStack);
      console.error('Client: SDK parseSignature error object:', JSON.stringify(parseError, Object.getOwnPropertyNames(parseError)));
      
      // Keystone returns the signed transaction blob in CBOR format
      // The CBOR contains the full signed binary transaction
      // Try to extract it directly
      console.log('Client: Attempting direct extraction from CBOR...');
      console.log('Client: Full CBOR hex:', cborHex);
      
      // Check if this is a CBOR byte string (starts with 58 or 59 for length prefix)
      if (cborHex.startsWith('58') || cborHex.startsWith('59')) {
        // CBOR byte string - extract the payload
        // 58 xx = byte string with 1-byte length
        // 59 xx xx = byte string with 2-byte length
        let signedTxBlob: string;
        if (cborHex.startsWith('58')) {
          // 1-byte length
          const length = parseInt(cborHex.substring(2, 4), 16);
          signedTxBlob = cborHex.substring(4, 4 + length * 2);
          console.log('Client: Extracted signed tx blob (1-byte length):', signedTxBlob.substring(0, 50) + '...');
        } else {
          // 2-byte length
          const length = parseInt(cborHex.substring(2, 6), 16);
          signedTxBlob = cborHex.substring(6, 6 + length * 2);
          console.log('Client: Extracted signed tx blob (2-byte length):', signedTxBlob.substring(0, 50) + '...');
        }
        
        // The signed tx blob is the full XRPL serialized signed transaction
        // We need to return this as the signature for the caller to handle
        return {
          signature: signedTxBlob,
          requestId: crypto.randomUUID()
        };
      }
      
      // Fallback - return raw CBOR hex
      return {
        signature: cborHex,
        requestId: crypto.randomUUID()
      };
    }
  } catch (error: any) {
    console.error('Client: parseKeystoneSignature error:', error?.message || error);
    console.error('Client: Error stack:', error?.stack);
    throw error;
  }
}
