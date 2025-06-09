#!/usr/bin/env python3
"""
Decode Keystone Pro 3 UR:BYTES format to extract XRPL transaction blob.
This script handles the CBOR decoding that fails in the browser environment.
"""

import sys
import re
import base64
import json
from typing import Optional, Dict, Any

def decode_keystone_bytewords(data: str) -> bytes:
    """
    Decode Keystone's bytewords format directly.
    Keystone uses 4-character bytewords that map to bytes.
    """
    # Keystone bytewords to byte mapping (simplified approach)
    # Each 4-character sequence represents specific byte values
    bytes_result = bytearray()
    
    # Process in 4-character chunks
    i = 0
    while i < len(data) - 3:
        chunk = data[i:i+4].upper()
        
        # Convert chunk to byte using character code mapping
        byte_val = 0
        for j, char in enumerate(chunk):
            if 'A' <= char <= 'Z':
                char_val = ord(char) - ord('A')
            elif '0' <= char <= '9':
                char_val = ord(char) - ord('0') + 26
            else:
                char_val = 0
            
            byte_val = (byte_val + char_val * (36 ** (3-j))) % 256
        
        bytes_result.append(byte_val)
        i += 4
    
    return bytes(bytes_result)

def decode_base32_alphabet(data: str) -> bytes:
    """
    Decode BC-UR base32 alphabet used by Keystone.
    """
    # Try bytewords decoding first (Keystone's preferred method)
    if len(data) > 10:
        bytewords_result = decode_keystone_bytewords(data)
        if bytewords_result:
            return bytewords_result
    
    # Fallback to base32 with BC-UR alphabet
    alphabet = "023456789acdefghjklmnpqrstuvwxyz"
    standard_alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
    
    # Create translation table
    translation = str.maketrans(alphabet.upper(), standard_alphabet)
    
    try:
        translated = data.upper().translate(translation)
        # Remove padding issues by trying different padding amounts
        for padding in range(8):
            try:
                padded = translated + "=" * padding
                return base64.b32decode(padded)
            except:
                continue
        return b""
    except Exception as e:
        print(f"Base32 decode error: {e}", file=sys.stderr)
        return b""

def decode_cbor_bytes(data: bytes) -> Optional[Dict[str, Any]]:
    """
    Decode CBOR data from bytes.
    """
    try:
        import cbor2
        return cbor2.loads(data)
    except ImportError:
        print("cbor2 not available, trying manual parsing", file=sys.stderr)
        return None
    except Exception as e:
        print(f"CBOR decode error: {e}", file=sys.stderr)
        return None

def extract_xrpl_transaction(cbor_data: Dict[str, Any]) -> Optional[str]:
    """
    Extract XRPL transaction blob from decoded CBOR data.
    """
    if not isinstance(cbor_data, dict):
        return None
    
    # Common field names used by Keystone for signed transactions
    possible_fields = [
        'signedTransaction',
        'signature', 
        'txBlob',
        'blob',
        'transaction',
        'hex',
        'data'
    ]
    
    # Look for transaction blob in various locations
    for field in possible_fields:
        if field in cbor_data:
            value = cbor_data[field]
            if isinstance(value, str) and re.match(r'^[0-9A-Fa-f]+$', value):
                return value.upper()
            elif isinstance(value, bytes):
                return value.hex().upper()
    
    # Check nested structures
    for key, value in cbor_data.items():
        if isinstance(value, dict):
            result = extract_xrpl_transaction(value)
            if result:
                return result
    
    return None

def decode_keystone_ur(ur_data: str) -> Optional[str]:
    """
    Main function to decode Keystone UR format and extract XRPL transaction.
    """
    # Remove UR:BYTES/ prefix
    if ur_data.startswith('UR:BYTES/'):
        ur_content = ur_data[9:]
    else:
        ur_content = ur_data
    
    # Try different decoding approaches
    
    # Method 1: Base32 decode
    decoded_bytes = decode_base32_alphabet(ur_content)
    if decoded_bytes:
        cbor_data = decode_cbor_bytes(decoded_bytes)
        if cbor_data:
            tx_blob = extract_xrpl_transaction(cbor_data)
            if tx_blob:
                return tx_blob
    
    # Method 2: Direct hex extraction (fallback)
    hex_matches = re.findall(r'([0-9A-Fa-f]{100,})', ur_content)
    for match in hex_matches:
        # Check if this looks like an XRPL transaction
        if match.startswith(('12', '00', '01', '02', '03', '05')):
            return match.upper()
    
    return None

def main():
    if len(sys.argv) != 2:
        print("Usage: python3 decode_keystone_ur.py 'UR:BYTES/...'", file=sys.stderr)
        sys.exit(1)
    
    ur_data = sys.argv[1]
    
    try:
        result = decode_keystone_ur(ur_data)
        if result:
            print(json.dumps({
                "success": True,
                "txBlob": result,
                "message": "Successfully decoded Keystone UR format"
            }))
        else:
            print(json.dumps({
                "success": False,
                "error": "Unable to extract valid XRPL transaction from UR data"
            }))
    except Exception as e:
        print(json.dumps({
            "success": False,
            "error": f"Decoding failed: {str(e)}"
        }))

if __name__ == "__main__":
    main()