import KeystoneSDK from '@keystonehq/keystone-sdk';
import { URDecoder, UR } from '@ngraveio/bc-ur';

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
  
  const keystoneSDK = new KeystoneSDK();
  
  const isSinglePart = !urString.match(/ur:[^/]+\/\d+-\d+\//);
  
  let decodedType: Buffer | Uint8Array | string;
  let decodedCbor: Buffer | Uint8Array;
  
  if (isSinglePart) {
    console.log('Client: Decoding single-part UR');
    
    const match = urString.match(/^ur:([^/]+)\/(.+)$/);
    if (!match) {
      throw new Error('Invalid UR format');
    }
    
    const [, type, payload] = match;
    
    const isHex = /^[0-9a-f]+$/i.test(payload);
    
    if (isHex) {
      console.log('Client: Detected hex-encoded UR (minimal encoding)');
      decodedType = Buffer.from(type);
      decodedCbor = Buffer.from(payload, 'hex');
    } else {
      console.log('Client: Detected Bytewords-encoded UR');
      const decoder = new URDecoder();
      decoder.receivePart(urString);
      
      if (!decoder.isComplete()) {
        throw new Error('UR decoding incomplete');
      }
      
      const result = decoder.resultUR();
      decodedType = result.type;
      decodedCbor = result.cbor;
    }
  } else {
    console.log('Client: Decoding multi-part UR');
    const decoder = new URDecoder();
    decoder.receivePart(urString);
    
    if (!decoder.isComplete()) {
      throw new Error('UR decoding incomplete - multi-part UR requires all fragments');
    }
    
    const result = decoder.resultUR();
    decodedType = result.type;
    decodedCbor = result.cbor;
  }
  
  console.log('Client: Decoded UR type:', decodedType);
  console.log('Client: Decoded CBOR length:', decodedCbor.length);
  
  const cborHex = Buffer.from(decodedCbor).toString('hex');
  const typeString = typeof decodedType === 'string' ? decodedType : decodedType.toString();
  
  console.log('Client: Type string:', typeString);
  console.log('Client: CBOR hex (first 50 chars):', cborHex.substring(0, 50));
  
  const ur = new UR(Buffer.from(cborHex, 'hex'), typeString);
  
  console.log('Client: Created UR object for parseSignature');
  
  const signature = keystoneSDK.xrp.parseSignature(ur);
  
  console.log('Client: Parsed signature:', signature);
  
  const parsedSignature: any = signature;
  return {
    signature: typeof parsedSignature === 'string' ? parsedSignature : parsedSignature.signature,
    requestId: typeof parsedSignature === 'object' && parsedSignature.requestId ? parsedSignature.requestId : crypto.randomUUID()
  };
}
