import KeystoneSDK from '@keystonehq/keystone-sdk';
import { URDecoder, UR } from '@ngraveio/bc-ur';
import { Buffer } from 'buffer';

const DEBUG = import.meta.env.DEV;
const log = (...args: any[]) => DEBUG && console.log('[Keystone]', ...args);

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
  log('Creating sign request for:', transaction);
  
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
  
  log('Formatted transaction:', xrpTransaction);
  
  const ur = keystoneSDK.xrp.generateSignRequest(xrpTransaction);
  
  log('SDK generated UR type:', ur.type);
  log('CBOR buffer length:', ur.cbor.length);
  
  return {
    type: ur.type,
    cbor: ur.cbor.toString('hex'),
    requestId: crypto.randomUUID()
  };
}

export function parseKeystoneSignature(urString: string): SignatureResult {
  log('Decoding signature from UR:', urString.substring(0, 50) + '...');
  
  try {
    const keystoneSDK = new KeystoneSDK();
    
    const isSinglePart = !urString.match(/ur:[^/]+\/\d+-\d+\//i);
    
    let decodedUR: any;
    
    if (isSinglePart) {
      log('Decoding single-part UR');
      
      const match = urString.toLowerCase().match(/^ur:([^/]+)\/(.+)$/);
      if (!match) {
        throw new Error('Invalid UR format');
      }
      
      const [, type, payload] = match;
      
      const isHex = /^[0-9a-f]+$/i.test(payload);
      
      if (isHex) {
        log('Detected hex-encoded UR');
        const cborBytes = new Uint8Array(payload.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        decodedUR = {
          type: type,
          cbor: cborBytes
        };
      } else {
        log('Detected Bytewords-encoded UR');
        const decoder = new URDecoder();
        decoder.receivePart(urString.toUpperCase());
        
        if (!decoder.isComplete()) {
          throw new Error('UR decoding incomplete');
        }
        
        decodedUR = decoder.resultUR();
      }
    } else {
      log('Decoding multi-part UR');
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
    
    log('Decoded UR type:', typeString);
    log('Decoded CBOR length:', cborBytes.length);
    
    const cborHex = Array.from(cborBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    log('CBOR hex (first 50 chars):', cborHex.substring(0, 50));
    
    const cborBuffer = Buffer.from(cborHex, 'hex');
    const ur = new UR(cborBuffer, typeString);
    
    log('Created UR object for parseSignature');
    
    try {
      log('Calling keystoneSDK.xrp.parseSignature...');
      const signature = keystoneSDK.xrp.parseSignature(ur);
      
      log('Parsed signature result');
      
      const parsedSignature: any = signature;
      return {
        signature: typeof parsedSignature === 'string' ? parsedSignature : parsedSignature.signature,
        requestId: typeof parsedSignature === 'object' && parsedSignature.requestId ? parsedSignature.requestId : crypto.randomUUID()
      };
    } catch (parseError: any) {
      log('SDK parseSignature failed, attempting direct CBOR extraction');
      
      if (cborHex.startsWith('58') || cborHex.startsWith('59')) {
        let signedTxBlob: string;
        if (cborHex.startsWith('58')) {
          const length = parseInt(cborHex.substring(2, 4), 16);
          signedTxBlob = cborHex.substring(4, 4 + length * 2);
          log('Extracted signed tx blob (1-byte length)');
        } else {
          const length = parseInt(cborHex.substring(2, 6), 16);
          signedTxBlob = cborHex.substring(6, 6 + length * 2);
          log('Extracted signed tx blob (2-byte length)');
        }
        
        return {
          signature: signedTxBlob,
          requestId: crypto.randomUUID()
        };
      }
      
      return {
        signature: cborHex,
        requestId: crypto.randomUUID()
      };
    }
  } catch (error: any) {
    console.error('[Keystone] parseKeystoneSignature error:', error?.message || error);
    throw error;
  }
}
