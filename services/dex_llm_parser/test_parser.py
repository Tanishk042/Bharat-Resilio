"""
Unit tests for DeX-LLM Parser.

Tests adversarial and ambiguous inputs to ensure robustness.
This is the most safety-relevant text-processing step in the pipeline.
"""

import pytest
from parser import DexLLMParser, RedactionFilter, ParsedIncident, HazardType


class TestRedactionFilter:
    """Test redaction filter for sensitive information."""
    
    def test_gps_redaction(self):
        """Test GPS coordinate redaction."""
        filter = RedactionFilter()
        
        text = "Incident at coordinates 40.7128, -74.0060"
        redacted, log = filter.redact(text)
        
        assert "REDACTED_GPS_COORDINATES" in redacted
        assert "40.7128" not in redacted
        assert "gps_coordinates" in log
    
    def test_phone_redaction(self):
        """Test phone number redaction."""
        filter = RedactionFilter()
        
        text = "Call me at 555-123-4567 for help"
        redacted, log = filter.redact(text)
        
        assert "REDACTED_PHONE_NUMBERS" in redacted
        assert "555-123-4567" not in redacted
    
    def test_email_redaction(self):
        """Test email address redaction."""
        filter = RedactionFilter()
        
        text = "Contact responder@emergency.org"
        redacted, log = filter.redact(text)
        
        assert "REDACTED_EMAIL_ADDRESSES" in redacted
        assert "responder@emergency.org" not in redacted
    
    def test_operational_code_redaction(self):
        """Test operational codename redaction."""
        filter = RedactionFilter()
        
        text = "This is operation OP-ALPHA23"
        redacted, log = filter.redact(text)
        
        assert "REDACTED_OPERATIONAL_CODES" in redacted
        assert "OP-ALPHA23" not in redacted
    
    def test_multiple_redactions(self):
        """Test multiple sensitive info types in one text."""
        filter = RedactionFilter()
        
        text = "At 40.7128, -74.0060 call 555-1234 or email test@test.com for OP-DELTA"
        redacted, log = filter.redact(text)
        
        assert len(log) >= 2  # At least 2 types redacted
        assert "40.7128" not in redacted
        assert "555-1234" not in redacted
    
    def test_no_sensitive_info(self):
        """Test text without sensitive information."""
        filter = RedactionFilter()
        
        text = "There is a flood on Main Street near the library"
        redacted, log = filter.redact(text)
        
        assert redacted == text
        assert len(log) == 0
    
    def test_has_sensitive_info(self):
        """Test sensitive info detection."""
        filter = RedactionFilter()
        
        assert filter.has_sensitive_info("At 40.7128, -74.0060") is True
        assert filter.has_sensitive_info("No sensitive info here") is False


class TestDexLLMParser:
    """Test DeX-LLM parser functionality."""
    
    @pytest.fixture
    def parser(self):
        """Create parser instance."""
        # Use fallback mode (no actual LLM call for tests)
        parser = DexLLMParser(ollama_host="http://localhost:11434")
        return parser
    
    def test_parse_with_coordinates(self, parser):
        """Test parsing with GPS coordinates."""
        text = "Flood at 40.7128, -74.0060 near library"
        result = parser.parse(text)
        
        assert 'redaction_log' in result
        assert 'gps_coordinates' in result['redaction_log']
        assert 'REDACTED_GPS_COORDINATES' in result['redacted_text']
    
    def test_parse_with_phone(self, parser):
        """Test parsing with phone number."""
        text = "Emergency at 555-123-4567"
        result = parser.parse(text)
        
        assert 'phone_numbers' in result['redaction_log']
    
    def test_parse_with_email(self, parser):
        """Test parsing with email."""
        text = "Contact responder@emergency.org"
        result = parser.parse(text)
        
        assert 'email_addresses' in result['redaction_log']
    
    def test_fallback_extraction(self, parser):
        """Test fallback extraction when LLM fails."""
        text = "Flood on Main Street"
        result = parser._fallback_extraction(text)
        
        assert 'hazard_classification' in result
        assert 'criticality_index' in result
        assert 'description_summary' in result
    
    def test_hazard_keyword_detection(self, parser):
        """Test hazard detection via keywords in fallback."""
        assert parser._fallback_extraction("flood water rising")['hazard_classification'] == 'flood'
        assert parser._fallback_extraction("earthquake shaking")['hazard_classification'] == 'earthquake'
        assert parser._fallback_extraction("fire burning")['hazard_classification'] == 'fire'
    
    def test_criticality_estimation(self, parser):
        """Test criticality estimation in fallback."""
        result = parser._fallback_extraction("emergency critical situation")
        assert result['criticality_index'] >= 8
    
    def test_ambiguous_input(self, parser):
        """Test ambiguous input handling."""
        text = "Something is happening somewhere"
        result = parser.parse(text)
        
        # Should still return a valid structure
        assert 'hazard_classification' in result or 'error' in result
    
    def test_empty_input(self, parser):
        """Test empty input handling."""
        text = ""
        result = parser.parse(text)
        
        # Should handle gracefully
        assert result is not None
    
    def test_very_long_input(self, parser):
        """Test very long input handling."""
        text = "flood " * 1000
        result = parser.parse(text)
        
        # Should handle without crashing
        assert result is not None


class TestParsedIncident:
    """Test Pydantic model validation."""
    
    def test_valid_incident(self):
        """Test valid incident creation."""
        incident = ParsedIncident(
            hazard_classification=HazardType.FLOOD,
            extracted_location={
                'description': 'Main Street',
                'coordinates': None,
                'landmark': 'Library',
                'zone_id': 'Zone A'
            },
            criticality_index=7,
            description_summary="Flood on Main Street",
            confidence=0.9
        )
        
        assert incident.hazard_classification == HazardType.FLOOD
        assert incident.criticality_index == 7
    
    def test_invalid_criticality(self):
        """Test invalid criticality index."""
        with pytest.raises(ValueError):
            ParsedIncident(
                hazard_classification=HazardType.FLOOD,
                extracted_location={'description': 'Test'},
                criticality_index=15,  # Invalid: > 10
                description_summary="Test",
                confidence=0.9
            )
    
    def test_negative_criticality(self):
        """Test negative criticality index."""
        with pytest.raises(ValueError):
            ParsedIncident(
                hazard_classification=HazardType.FLOOD,
                extracted_location={'description': 'Test'},
                criticality_index=-1,  # Invalid: < 0
                description_summary="Test",
                confidence=0.9
            )


def run_tests():
    """Run all tests."""
    print("Running DeX-LLM Parser Tests\n")
    print("="*60)
    
    # Test redaction filter
    print("\nTesting RedactionFilter...")
    filter = RedactionFilter()
    
    # GPS test
    text = "Incident at 40.7128, -74.0060"
    redacted, log = filter.redact(text)
    assert "REDACTED_GPS_COORDINATES" in redacted
    print("✓ GPS redaction works")
    
    # Phone test
    text = "Call 555-123-4567"
    redacted, log = filter.redact(text)
    assert "REDACTED_PHONE_NUMBERS" in redacted
    print("✓ Phone redaction works")
    
    # Email test
    text = "Email test@test.com"
    redacted, log = filter.redact(text)
    assert "REDACTED_EMAIL_ADDRESSES" in redacted
    print("✓ Email redaction works")
    
    # No sensitive info test
    text = "Flood on Main Street"
    redacted, log = filter.redact(text)
    assert redacted == text
    print("✓ No false positives")
    
    # Test parser
    print("\nTesting DexLLMParser...")
    parser = DexLLMParser()
    
    # Test with coordinates
    text = "Flood at 40.7128, -74.0060"
    result = parser.parse(text)
    assert 'redaction_log' in result
    print("✓ Parser with coordinates works")
    
    # Test fallback
    text = "flood emergency"
    result = parser._fallback_extraction(text)
    assert result['hazard_classification'] == 'flood'
    assert result['criticality_index'] >= 8
    print("✓ Fallback extraction works")
    
    # Test Pydantic validation
    print("\nTesting ParsedIncident validation...")
    incident = ParsedIncident(
        hazard_classification=HazardType.FLOOD,
        extracted_location={'description': 'Test'},
        criticality_index=5,
        description_summary="Test",
        confidence=0.8
    )
    assert incident.criticality_index == 5
    print("✓ Valid incident creation works")
    
    try:
        ParsedIncident(
            hazard_classification=HazardType.FLOOD,
            extracted_location={'description': 'Test'},
            criticality_index=15,
            description_summary="Test",
            confidence=0.8
        )
        assert False, "Should have raised ValueError"
    except ValueError:
        print("✓ Invalid criticality rejected")
    
    print("\n" + "="*60)
    print("All tests passed!")


if __name__ == "__main__":
    run_tests()
