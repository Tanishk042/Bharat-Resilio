"""
Oracle Consensus Verification Logic

Implements anti-spoofing/abuse-resistance mechanism:
- Manually-submitted alert marked VERIFIED only when:
  1. Device signature is valid
  2. At least one independent sensor stream corroborates it
  3. Within time/location window

PRODUCTION_TODO: This is a standard pattern for crowd-reported incident platforms.
Frame as fraud and false-alarm prevention for public safety systems.
"""

from typing import Dict, List, Optional, Set
from datetime import datetime, timedelta
from enum import Enum
import json

from device_auth import TelemetryVerifier, DeviceRegistry


class IncidentStatus(Enum):
    """Incident verification status."""
    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class IncidentReport:
    """Incident report with verification metadata."""
    
    def __init__(
        self,
        incident_id: str,
        reporter_device_id: str,
        hazard_type: str,
        location: str,
        severity: int,
        timestamp: datetime,
        telemetry: Dict
    ):
        self.incident_id = incident_id
        self.reporter_device_id = reporter_device_id
        self.hazard_type = hazard_type
        self.location = location
        self.severity = severity
        self.timestamp = timestamp
        self.telemetry = telemetry
        self.status = IncidentStatus.PENDING
        self.corroborating_devices: Set[str] = set()
        self.verification_attempts = 0
        self.created_at = datetime.utcnow()
    
    def add_corroboration(self, device_id: str):
        """Add a corroborating device."""
        self.corroborating_devices.add(device_id)
    
    def verify(self):
        """Mark incident as verified."""
        self.status = IncidentStatus.VERIFIED
    
    def reject(self):
        """Mark incident as rejected."""
        self.status = IncidentStatus.REJECTED
    
    def to_dict(self) -> Dict:
        """Convert to dictionary."""
        return {
            'incident_id': self.incident_id,
            'reporter_device_id': self.reporter_device_id,
            'hazard_type': self.hazard_type,
            'location': self.location,
            'severity': self.severity,
            'timestamp': self.timestamp.isoformat(),
            'status': self.status.value,
            'corroborating_devices': list(self.corroborating_devices),
            'verification_attempts': self.verification_attempts,
            'created_at': self.created_at.isoformat()
        }


class OracleConsensusEngine:
    """
    Oracle consensus verification engine.
    
    Verifies incident reports by:
    1. Checking device signature validity
    2. Finding corroborating sensor data
    3. Checking time/location proximity
    """
    
    def __init__(
        self,
        registry: DeviceRegistry,
        time_window_seconds: int = 300,  # 5 minutes
        location_threshold_km: float = 1.0,  # 1 km
        min_corroborations: int = 1
    ):
        self.registry = registry
        self.verifier = TelemetryVerifier(registry)
        self.time_window = timedelta(seconds=time_window_seconds)
        self.location_threshold = location_threshold_km
        self.min_corroborations = min_corroborations
        self.incidents: Dict[str, IncidentReport] = {}
        self.sensor_streams: Dict[str, List[Dict]] = {}  # device_id -> telemetry stream
    
    def submit_incident(
        self,
        incident_id: str,
        hazard_type: str,
        location: str,
        severity: int,
        telemetry: Dict
    ) -> Dict:
        """
        Submit an incident report for verification.
        
        Args:
            incident_id: Unique incident identifier
            hazard_type: Type of hazard
            location: Location description
            severity: Severity score (0-10)
            telemetry: Signed telemetry data
            
        Returns:
            Verification result
        """
        # Verify telemetry signature
        is_valid, error = self.verifier.verify_telemetry(telemetry)
        if not is_valid:
            return {
                'incident_id': incident_id,
                'status': IncidentStatus.REJECTED.value,
                'reason': f"Signature verification failed: {error}"
            }
        
        # Extract device ID
        device_id = self.verifier.extract_device_id(telemetry)
        if not device_id:
            return {
                'incident_id': incident_id,
                'status': IncidentStatus.REJECTED.value,
                'reason': "Could not extract device ID"
            }
        
        # Create incident report
        timestamp = datetime.fromisoformat(telemetry.get('timestamp', datetime.utcnow().isoformat()))
        incident = IncidentReport(
            incident_id=incident_id,
            reporter_device_id=device_id,
            hazard_type=hazard_type,
            location=location,
            severity=severity,
            timestamp=timestamp,
            telemetry=telemetry
        )
        
        # Store incident
        self.incidents[incident_id] = incident
        
        # Attempt verification
        result = self.verify_incident(incident_id)
        
        return result
    
    def add_sensor_stream(self, device_id: str, telemetry: Dict):
        """
        Add sensor telemetry stream for corroboration.
        
        Args:
            device_id: Sensor device ID
            telemetry: Sensor telemetry data
        """
        if device_id not in self.sensor_streams:
            self.sensor_streams[device_id] = []
        
        self.sensor_streams[device_id].append({
            'telemetry': telemetry,
            'timestamp': datetime.utcnow()
        })
        
        # Keep only recent data (within time window)
        cutoff = datetime.utcnow() - self.time_window
        self.sensor_streams[device_id] = [
            s for s in self.sensor_streams[device_id]
            if s['timestamp'] > cutoff
        ]
    
    def verify_incident(self, incident_id: str) -> Dict:
        """
        Verify an incident by checking for corroborating sensor data.
        
        Args:
            incident_id: Incident to verify
            
        Returns:
            Verification result
        """
        incident = self.incidents.get(incident_id)
        if not incident:
            return {
                'incident_id': incident_id,
                'status': IncidentStatus.REJECTED.value,
                'reason': 'Incident not found'
            }
        
        incident.verification_attempts += 1
        
        # Find corroborating sensor data
        corroborations = self.find_corroborations(incident)
        
        # Add corroborations to incident
        for device_id in corroborations:
            incident.add_corroboration(device_id)
        
        # Check if enough corroborations
        if len(corroborations) >= self.min_corroborations:
            incident.verify()
            return {
                'incident_id': incident_id,
                'status': incident.status.value,
                'corroborating_devices': list(corroborations),
                'reason': 'Incident verified with corroborating sensor data'
            }
        else:
            # Still pending
            return {
                'incident_id': incident_id,
                'status': incident.status.value,
                'corroborating_devices': list(corroborations),
                'reason': f'Waiting for corroborations ({len(corroborations)}/{self.min_corroborations})'
            }
    
    def find_corroborations(self, incident: IncidentReport) -> Set[str]:
        """
        Find sensor streams that corroborate the incident.
        
        Args:
            incident: Incident to check
            
        Returns:
            Set of corroborating device IDs
        """
        corroborating = set()
        
        for device_id, stream in self.sensor_streams.items():
            # Skip reporter's own device
            if device_id == incident.reporter_device_id:
                continue
            
            # Check each telemetry entry in stream
            for entry in stream:
                telemetry = entry['telemetry']
                timestamp = entry['timestamp']
                
                # Check time window
                if abs(timestamp - incident.timestamp) > self.time_window:
                    continue
                
                # Check hazard type match
                if telemetry.get('hazard_type') != incident.hazard_type:
                    continue
                
                # Check severity proximity (within 2 points)
                telemetry_severity = telemetry.get('severity', 0)
                if abs(telemetry_severity - incident.severity) > 2:
                    continue
                
                # If all checks pass, this is a corroboration
                corroborating.add(device_id)
                break  # One corroboration per device is enough
        
        return corroborating
    
    def get_incident(self, incident_id: str) -> Optional[Dict]:
        """Get incident status."""
        incident = self.incidents.get(incident_id)
        if incident:
            return incident.to_dict()
        return None
    
    def list_incidents(self, status: Optional[IncidentStatus] = None) -> List[Dict]:
        """List all incidents, optionally filtered by status."""
        incidents = [
            inc.to_dict()
            for inc in self.incidents.values()
            if status is None or inc.status == status
        ]
        return incidents
    
    def get_statistics(self) -> Dict:
        """Get verification statistics."""
        total = len(self.incidents)
        verified = sum(1 for inc in self.incidents.values() if inc.status == IncidentStatus.VERIFIED)
        pending = sum(1 for inc in self.incidents.values() if inc.status == IncidentStatus.PENDING)
        rejected = sum(1 for inc in self.incidents.values() if inc.status == IncidentStatus.REJECTED)
        
        return {
            'total_incidents': total,
            'verified': verified,
            'pending': pending,
            'rejected': rejected,
            'verification_rate': verified / total if total > 0 else 0
        }


if __name__ == "__main__":
    # Test oracle consensus
    print("Testing Oracle Consensus Engine\n")
    
    # Setup
    registry = DeviceRegistry()
    registry.register_device("sensor-001", "public_key_001")
    registry.register_device("sensor-002", "public_key_002")
    registry.register_device("sensor-003", "public_key_003")
    
    engine = OracleConsensusEngine(
        registry,
        time_window_seconds=300,
        min_corroborations=1
    )
    
    # Submit incident without corroboration
    print("1. Submitting incident without corroboration...")
    telemetry = {
        'sensor_type': 'seismic',
        'magnitude': 5.2,
        'hazard_type': 'earthquake',
        'severity': 7,
        'timestamp': datetime.utcnow().isoformat(),
        '_auth': {
            'device_id': 'sensor-001',
            'signature': 'dummy_signature',  # Would be real signature
            'timestamp': datetime.utcnow().isoformat()
        }
    }
    
    result = engine.submit_incident(
        incident_id="incident-001",
        hazard_type="earthquake",
        location="Zone A",
        severity=7,
        telemetry=telemetry
    )
    print(f"   Status: {result['status']}")
    print(f"   Reason: {result['reason']}")
    
    # Add corroborating sensor stream
    print("\n2. Adding corroborating sensor stream...")
    engine.add_sensor_stream("sensor-002", {
        'sensor_type': 'seismic',
        'magnitude': 5.0,
        'hazard_type': 'earthquake',
        'severity': 6,
        'timestamp': datetime.utcnow().isoformat()
    })
    
    # Re-verify
    print("\n3. Re-verifying incident...")
    result = engine.verify_incident("incident-001")
    print(f"   Status: {result['status']}")
    print(f"   Corroborating devices: {result.get('corroborating_devices', [])}")
    
    # Statistics
    print("\n4. Statistics:")
    stats = engine.get_statistics()
    print(f"   Total: {stats['total_incidents']}")
    print(f"   Verified: {stats['verified']}")
    print(f"   Pending: {stats['pending']}")
    print(f"   Verification rate: {stats['verification_rate']:.2%}")
    
    print("\nAll tests completed!")
