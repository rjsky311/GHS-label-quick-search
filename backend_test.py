#!/usr/bin/env python3
"""
GHS Label Quick Search Backend API Testing
Tests all backend endpoints for the chemical hazard label search application
"""

import requests
import sys
import json
from datetime import datetime

class GHSAPITester:
    def __init__(self, base_url="https://chemtag-enhance.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details="", response_data=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def test_root_endpoint(self):
        """Test GET /api/ - Welcome message"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "GHS" in data["message"]:
                    self.log_test("Root Endpoint", True, f"Status: {response.status_code}", data)
                    return True
                else:
                    self.log_test("Root Endpoint", False, f"Unexpected response format: {data}")
            else:
                self.log_test("Root Endpoint", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Root Endpoint", False, f"Exception: {str(e)}")
        return False

    def test_single_search(self, cas_number, expected_name=None):
        """Test GET /api/search/{cas_number} - Single CAS search"""
        try:
            response = requests.get(f"{self.api_url}/search/{cas_number}", timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Check required fields
                required_fields = ["cas_number", "found", "cid", "name_en"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test(f"Single Search ({cas_number})", False, 
                                f"Missing fields: {missing_fields}")
                    return False
                
                if data["found"]:
                    # Verify expected name if provided
                    if expected_name and expected_name.lower() not in data.get("name_en", "").lower():
                        self.log_test(f"Single Search ({cas_number})", False, 
                                    f"Expected '{expected_name}' but got '{data.get('name_en')}'")
                        return False
                    
                    # Check GHS data structure
                    ghs_fields = ["ghs_pictograms", "hazard_statements", "signal_word"]
                    for field in ghs_fields:
                        if field not in data:
                            self.log_test(f"Single Search ({cas_number})", False, 
                                        f"Missing GHS field: {field}")
                            return False
                    
                    self.log_test(f"Single Search ({cas_number})", True, 
                                f"Found: {data.get('name_en')}, GHS pictograms: {len(data.get('ghs_pictograms', []))}", 
                                data)
                else:
                    # Check error message for not found
                    if "error" in data:
                        self.log_test(f"Single Search ({cas_number})", True, 
                                    f"Not found (expected): {data['error']}", data)
                    else:
                        self.log_test(f"Single Search ({cas_number})", False, 
                                    "Not found but no error message")
                        return False
                
                return True
            else:
                self.log_test(f"Single Search ({cas_number})", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test(f"Single Search ({cas_number})", False, f"Exception: {str(e)}")
        return False

    def test_batch_search(self):
        """Test POST /api/search - Batch search"""
        test_cas_numbers = ["64-17-5", "67-56-1", "7732-18-5"]
        
        try:
            payload = {"cas_numbers": test_cas_numbers}
            response = requests.post(f"{self.api_url}/search", 
                                   json=payload, 
                                   headers={'Content-Type': 'application/json'},
                                   timeout=45)
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, list):
                    self.log_test("Batch Search", False, "Response is not a list")
                    return False
                
                if len(data) != len(test_cas_numbers):
                    self.log_test("Batch Search", False, 
                                f"Expected {len(test_cas_numbers)} results, got {len(data)}")
                    return False
                
                # Check each result
                found_count = 0
                for i, result in enumerate(data):
                    if not isinstance(result, dict):
                        self.log_test("Batch Search", False, f"Result {i} is not a dict")
                        return False
                    
                    if result.get("found"):
                        found_count += 1
                
                self.log_test("Batch Search", True, 
                            f"Processed {len(data)} CAS numbers, found {found_count}", data)
                return True
            else:
                self.log_test("Batch Search", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Batch Search", False, f"Exception: {str(e)}")
        return False

    def test_ghs_pictograms(self):
        """Test GET /api/ghs-pictograms - Get GHS pictogram info"""
        try:
            response = requests.get(f"{self.api_url}/ghs-pictograms", timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if not isinstance(data, dict):
                    self.log_test("GHS Pictograms", False, "Response is not a dict")
                    return False
                
                # Check for expected GHS codes
                expected_codes = ["GHS01", "GHS02", "GHS03", "GHS04", "GHS05", 
                                "GHS06", "GHS07", "GHS08", "GHS09"]
                
                missing_codes = [code for code in expected_codes if code not in data]
                if missing_codes:
                    self.log_test("GHS Pictograms", False, f"Missing GHS codes: {missing_codes}")
                    return False
                
                # Check structure of each pictogram
                for code, info in data.items():
                    required_fields = ["name", "name_zh", "icon", "image"]
                    missing_fields = [field for field in required_fields if field not in info]
                    if missing_fields:
                        self.log_test("GHS Pictograms", False, 
                                    f"Missing fields in {code}: {missing_fields}")
                        return False
                
                self.log_test("GHS Pictograms", True, f"Found {len(data)} pictograms", data)
                return True
            else:
                self.log_test("GHS Pictograms", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("GHS Pictograms", False, f"Exception: {str(e)}")
        return False

    def test_export_endpoints(self):
        """Test export endpoints with sample data"""
        # Sample result data for export testing
        sample_results = [
            {
                "cas_number": "64-17-5",
                "name_en": "Ethanol",
                "name_zh": "乙醇",
                "ghs_pictograms": [
                    {"code": "GHS02", "name_zh": "易燃物"}
                ],
                "signal_word": "Danger",
                "signal_word_zh": "危險",
                "hazard_statements": [
                    {"code": "H225", "text_zh": "高度易燃液體和蒸氣"}
                ]
            }
        ]
        
        # Test Excel export
        try:
            payload = {"results": sample_results, "format": "xlsx"}
            response = requests.post(f"{self.api_url}/export/xlsx", 
                                   json=payload,
                                   headers={'Content-Type': 'application/json'},
                                   timeout=15)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'spreadsheet' in content_type or 'excel' in content_type:
                    self.log_test("Excel Export", True, f"Content-Type: {content_type}")
                else:
                    self.log_test("Excel Export", False, f"Unexpected content-type: {content_type}")
            else:
                self.log_test("Excel Export", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("Excel Export", False, f"Exception: {str(e)}")
        
        # Test CSV export
        try:
            payload = {"results": sample_results, "format": "csv"}
            response = requests.post(f"{self.api_url}/export/csv", 
                                   json=payload,
                                   headers={'Content-Type': 'application/json'},
                                   timeout=15)
            
            if response.status_code == 200:
                content_type = response.headers.get('content-type', '')
                if 'csv' in content_type or 'text' in content_type:
                    self.log_test("CSV Export", True, f"Content-Type: {content_type}")
                else:
                    self.log_test("CSV Export", False, f"Unexpected content-type: {content_type}")
            else:
                self.log_test("CSV Export", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_test("CSV Export", False, f"Exception: {str(e)}")

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🧪 Starting GHS Label Quick Search Backend API Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test basic connectivity
        self.test_root_endpoint()
        
        # Test GHS pictograms endpoint
        self.test_ghs_pictograms()
        
        # Test single searches with known chemicals
        print("\n📋 Testing Single CAS Searches:")
        self.test_single_search("64-17-5", "Ethanol")  # Ethanol - should have GHS02
        self.test_single_search("67-56-1", "Methanol")  # Methanol - should have multiple GHS
        self.test_single_search("7732-18-5", "Water")   # Water - should have no hazards
        self.test_single_search("invalid-cas")          # Invalid CAS - should fail gracefully
        
        # Test batch search
        print("\n📦 Testing Batch Search:")
        self.test_batch_search()
        
        # Test export endpoints
        print("\n📊 Testing Export Endpoints:")
        self.test_export_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All backend tests PASSED!")
            return 0
        else:
            print("❌ Some backend tests FAILED!")
            failed_tests = [t for t in self.test_results if not t["success"]]
            print("\nFailed Tests:")
            for test in failed_tests:
                print(f"  - {test['name']}: {test['details']}")
            return 1

def main():
    tester = GHSAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())