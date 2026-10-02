"""
Device Authentication and Encryption Module

Implements:
- Asymmetric keypair generation for devices
- Payload signing and verification
- Device registry management

PRODUCTION_TODO: Real PUF-based hardware attestation is a separate hardware-security
project. This software prototype uses asymmetric keypairs as a realistic equivalent.
For production, integrate with actual TPM/PUF hardware attestation.
"""

import nacl.signing
import nacl.encoding
import nacl.exceptions
import json
from typing import Dict, Optional, Tuple
from datetime import datetime
import hashlib


class DeviceKeyPair:
    """Device asymmetric keypair for authentication."""
    
    def __init__(self, device_id: str):
        self.device_id = device_id
        self.signing_key = nacl.signing.SigningKey.generate()
        self.verify_key = self.signing_key.verify_key
        self.created_at = datetime.utcnow()
    
    def get_public_key_hex(self) -> str:
        """Get public key as hex string."""
        return self.verify_key.encode(encoder=nacl.encoding.HexEncoder).decode('ascii')
    
    def sign(self, message: str) -> str:
        """Sign a message."""
        signed = self.signing_key.sign(message.encode('utf-8'))
        return signed.hex()
    
    def export(self) -> Dict:
        """Export keypair (for secure storage)."""
        return {
            'device_id': self.device_id,
            'private_key': self.signing_key.encode(encoder=nacl.encoding.HexEncoder).decode('ascii'),
            'public_key': self.get_public_key_hex(),
            'created_at': self.created_at.isoformat()
        }
    
    @staticmethod
    def import_keypair(data: Dict) -> 'DeviceKeyPair':
        """Import keypair from exported data."""
        keypair = DeviceKeyPair(data['device_id'])
        keypair.signing_key = nacl.signing.SigningKey(
            data['private_key'],
            encoder=nacl.encoding.HexEncoder
        )
        keypair.verify_key = keypair.signing_key.verify_key
        keypair.created_at = datetime.fromisoformat(data['created_at'])
        return keypair


class DeviceRegistry:
    """Registry of authorized devices with their public keys."""
    
    def __init__(self):
        self.devices: Dict[str, Dict] = {}  # device_id -> device_info
    
    def register_device(self, device_id: str, public_key: str, metadata: Dict = None) -> bool:
        """
        Register a device with its public key.
        
        PRODUCTION_TODO: In production, this should be done during device provisioning
        with secure key generation and storage.
        """
        if device_id in self.devices:
            return False  # Device already registered
        
        self.devices[device_id] = {
            'public_key': public_key,
            'registered_at': datetime.utcnow().isoformat(),
            'metadata': metadata or {}
        }
        return True
    
    def get_device(self, device_id: str) -> Optional[Dict]:
        """Get device information."""
        return self.devices.get(device_id)
    
    def is_registered(self, device_id: str) -> bool:
        """Check if device is registered."""
        return device_id in self.devices
    
    def verify_signature(self, device_id: str, message: str, signature: str) -> bool:
        """
        Verify a signature from a device.
        
        Args:
            device_id: ID of the signing device
            message: Original message
            signature: Hex-encoded signature
            
        Returns:
            True if signature is valid
        """
        device = self.get_device(device_id)
        if not device:
            return False
        
        try:
            verify_key = nacl.signing.VerifyKey(
                device['public_key'],
                encoder=nacl.encoding.HexEncoder
            )
            verify_key.verify(
                bytes.fromhex(signature),
                message.encode('utf-8')
            )
            return True
        except (nacl.exceptions.BadSignatureError, ValueError):
            return False
    
    def revoke_device(self, device_id: str) -> bool:
        """Revoke a device (remove from registry)."""
        if device_id in self.devices:
            del self.devices[device_id]
            return True
        return False
    
    def list_devices(self) -> Dict[str, Dict]:
        """List all registered devices."""
        return self.devices.copy()


class TelemetrySigner:
    """Signs telemetry payloads for authentication."""
    
    def __init__(self, keypair: DeviceKeyPair):
        self.keypair = keypair
    
    def sign_telemetry(self, telemetry: Dict) -> Dict:
        """
        Sign telemetry data.
        
        Args:
            telemetry: Telemetry data dictionary
            
        Returns:
            Telemetry with signature and device_id
        """
        # Create canonical representation
        canonical = json.dumps(telemetry, sort_keys=True)
        
        # Sign
        signature = self.keypair.sign(canonical)
        
        # Add authentication info
        signed_telemetry = telemetry.copy()
        signed_telemetry['_auth'] = {
            'device_id': self.keypair.device_id,
            'signature': signature,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return signed_telemetry


class TelemetryVerifier:
    """Verifies telemetry payloads."""
    
    def __init__(self, registry: DeviceRegistry):
        self.registry = registry
    
    def verify_telemetry(self, telemetry: Dict) -> Tuple[bool, Optional[str]]:
        """
        Verify telemetry signature.
        
        Args:
            telemetry: Telemetry data with _auth field
            
        Returns:
            (is_valid, error_message)
        """
        if '_auth' not in telemetry:
            return False, "Missing _auth field"
        
        auth = telemetry['_auth']
        device_id = auth.get('device_id')
        signature = auth.get('signature')
        
        if not device_id or not signature:
            return False, "Missing device_id or signature"
        
        # Check if device is registered
        if not self.registry.is_registered(device_id):
            return False, f"Device {device_id} not registered"
        
        # Remove _auth for canonical representation
        telemetry_copy = telemetry.copy()
        del telemetry_copy['_auth']
        canonical = json.dumps(telemetry_copy, sort_keys=True)
        
        # Verify signature
        if not self.registry.verify_signature(device_id, canonical, signature):
            return False, "Invalid signature"
        
        return True, None
    
    def extract_device_id(self, telemetry: Dict) -> Optional[str]:
        """Extract device ID from telemetry."""
        return telemetry.get('_auth', {}).get('device_id')


if __name__ == "__main__":
    # Test device authentication
    print("Testing Device Authentication\n")
    
    # Create device registry
    registry = DeviceRegistry()
    
    # Provision device
    print("1. Provisioning device...")
    device_keypair = DeviceKeyPair("sensor-001")
    public_key = device_keypair.get_public_key_hex()
    registry.register_device("sensor-001", public_key, {"location": "Zone A"})
    print(f"   Device registered: sensor-001")
    print(f"   Public key: {public_key[:32]}...")
    
    # Sign telemetry
    print("\n2. Signing telemetry...")
    signer = TelemetrySigner(device_keypair)
    telemetry = {
        "sensor_type": "seismic",
        "magnitude": 5.2,
        "timestamp": datetime.utcnow().isoformat()
    }
    signed_telemetry = signer.sign_telemetry(telemetry)
    print(f"   Original: {telemetry}")
    print(f"   Signed: device_id={signed_telemetry['_auth']['device_id']}")
    
    # Verify telemetry
    print("\n3. Verifying telemetry...")
    verifier = TelemetryVerifier(registry)
    is_valid, error = verifier.verify_telemetry(signed_telemetry)
    print(f"   Valid: {is_valid}")
    if error:
        print(f"   Error: {error}")
    
    # Test invalid signature
    print("\n4. Testing invalid signature...")
    tampered_telemetry = signed_telemetry.copy()
    tampered_telemetry["magnitude"] = 9.9  # Tamper with data
    is_valid, error = verifier.verify_telemetry(tampered_telemetry)
    print(f"   Valid: {is_valid}")
    print(f"   Error: {error}")
    
    # Test unregistered device
    print("\n5. Testing unregistered device...")
    unregistered_keypair = DeviceKeyPair("sensor-999")
    unregistered_signer = TelemetrySigner(unregistered_keypair)
    unregistered_telemetry = unregistered_signer.sign_telemetry(telemetry)
    is_valid, error = verifier.verify_telemetry(unregistered_telemetry)
    print(f"   Valid: {is_valid}")
    print(f"   Error: {error}")
    
    print("\nAll tests completed!")
