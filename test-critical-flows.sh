#!/bin/bash
# BOD Critical User Flow Testing Script
# Tests all critical paths and reports issues

set -e

BASE_URL="http://10.50.50.100:20786"
API_URL="http://10.50.50.100:20786/api"
REPORT_FILE="test-results-$(date +%Y%m%d-%H%M%S).md"

echo "# BOD Critical Flow Test Results" > "$REPORT_FILE"
echo "**Date:** $(date)" >> "$REPORT_FILE"
echo "**Base URL:** $BASE_URL" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
pass() {
    echo -e "${GREEN}✓ PASS${NC}: $1"
    echo "- ✅ **PASS**: $1" >> "$REPORT_FILE"
    ((PASSED++))
}

fail() {
    echo -e "${RED}✗ FAIL${NC}: $1"
    echo "- ❌ **FAIL**: $1" >> "$REPORT_FILE"
    echo "  - **Details:** $2" >> "$REPORT_FILE"
    ((FAILED++))
}

warn() {
    echo -e "${YELLOW}⚠ WARN${NC}: $1"
    echo "- ⚠️  **WARN**: $1" >> "$REPORT_FILE"
    echo "  - **Details:** $2" >> "$REPORT_FILE"
    ((WARNINGS++))
}

test_endpoint() {
    local name="$1"
    local url="$2"
    local expected_code="${3:-200}"
    
    echo ""
    echo "Testing: $name"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_code" ]; then
        pass "$name (HTTP $response)"
    else
        fail "$name" "Expected HTTP $expected_code, got $response"
    fi
}

test_api_endpoint() {
    local name="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    
    echo ""
    echo "Testing API: $name"
    
    response=$(curl -s -X "$method" "$API_URL$endpoint" -w "\n%{http_code}" 2>/dev/null || echo "000")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        pass "API: $name (HTTP $http_code)"
        
        # Check if response is valid JSON
        if echo "$body" | jq empty 2>/dev/null; then
            pass "API: $name returns valid JSON"
        else
            warn "API: $name" "Response is not valid JSON"
        fi
    elif [ "$http_code" = "401" ] || [ "$http_code" = "403" ]; then
        pass "API: $name (Protected - HTTP $http_code)"
    else
        fail "API: $name" "HTTP $http_code - $body"
    fi
}

echo ""
echo "====================================="
echo "  BOD CRITICAL FLOW TESTS"
echo "====================================="
echo ""

# Test 1: Frontend Pages Load
echo "## Test 1: Frontend Pages" >> "$REPORT_FILE"
test_endpoint "Homepage" "$BASE_URL/"
test_endpoint "Register Page" "$BASE_URL/register"
test_endpoint "Login Page" "$BASE_URL/login"
test_endpoint "Tournaments Page" "$BASE_URL/tournaments"
test_endpoint "Players Page" "$BASE_URL/players"
test_endpoint "Rules Page" "$BASE_URL/rules"
test_endpoint "FAQ Page" "$BASE_URL/faq"

# Test 2: API Endpoints
echo "" >> "$REPORT_FILE"
echo "## Test 2: API Endpoints" >> "$REPORT_FILE"
test_api_endpoint "Health Check" "/health"
test_api_endpoint "Tournaments List" "/tournaments"
test_api_endpoint "Players List" "/players"
test_api_endpoint "Rankings" "/rankings"

# Test 3: Authentication Endpoints
echo "" >> "$REPORT_FILE"
echo "## Test 3: Authentication" >> "$REPORT_FILE"
test_api_endpoint "Auth Status" "/auth/status"

# Test 4: Protected Admin Endpoints
echo "" >> "$REPORT_FILE"
echo "## Test 4: Admin Protection" >> "$REPORT_FILE"
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/admin" 2>/dev/null || echo "000")
if [ "$response" = "401" ] || [ "$response" = "403" ] || [ "$response" = "302" ]; then
    pass "Admin route is protected (HTTP $response)"
else
    warn "Admin route" "Expected 401/403/302 (redirect to login), got $response"
fi

# Test 5: Performance
echo "" >> "$REPORT_FILE"
echo "## Test 5: Performance" >> "$REPORT_FILE"
echo ""
echo "Testing performance..."

# Homepage load time
start=$(date +%s%3N)
curl -s -o /dev/null "$BASE_URL/"
end=$(date +%s%3N)
load_time=$((end - start))

if [ $load_time -lt 3000 ]; then
    pass "Homepage load time: ${load_time}ms (target: <3000ms)"
else
    warn "Homepage load time" "${load_time}ms (target: <3000ms)"
fi

# API response time
start=$(date +%s%3N)
curl -s -o /dev/null "$API_URL/tournaments"
end=$(date +%s%3N)
api_time=$((end - start))

if [ $api_time -lt 500 ]; then
    pass "API response time: ${api_time}ms (target: <500ms)"
else
    warn "API response time" "${api_time}ms (target: <500ms)"
fi

# Test 6: Security Headers
echo "" >> "$REPORT_FILE"
echo "## Test 6: Security Headers" >> "$REPORT_FILE"
echo ""
echo "Testing security headers..."

headers=$(curl -s -I "$BASE_URL/" 2>/dev/null)

if echo "$headers" | grep -qi "X-Frame-Options"; then
    pass "X-Frame-Options header present"
else
    warn "Security" "X-Frame-Options header missing (clickjacking protection)"
fi

if echo "$headers" | grep -qi "Content-Security-Policy"; then
    pass "Content-Security-Policy header present"
else
    warn "Security" "Content-Security-Policy header missing (XSS protection)"
fi

# Test 7: Database Connection
echo "" >> "$REPORT_FILE"
echo "## Test 7: Database" >> "$REPORT_FILE"
echo ""
echo "Testing database..."

# Check if tournaments endpoint returns data
tournaments_data=$(curl -s "$API_URL/tournaments" 2>/dev/null)
if echo "$tournaments_data" | jq -e '.tournaments' > /dev/null 2>&1; then
    count=$(echo "$tournaments_data" | jq '.tournaments | length')
    pass "Database connection (found $count tournaments)"
else
    fail "Database connection" "Tournaments endpoint not returning expected data"
fi

# Summary
echo "" >> "$REPORT_FILE"
echo "## Summary" >> "$REPORT_FILE"
echo ""
echo "====================================="
echo "  TEST SUMMARY"
echo "====================================="
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

echo "" >> "$REPORT_FILE"
echo "**Total Tests:** $((PASSED + FAILED + WARNINGS))" >> "$REPORT_FILE"
echo "- ✅ **Passed:** $PASSED" >> "$REPORT_FILE"
echo "- ⚠️  **Warnings:** $WARNINGS" >> "$REPORT_FILE"
echo "- ❌ **Failed:** $FAILED" >> "$REPORT_FILE"
echo "" >> "$REPORT_FILE"

if [ $FAILED -gt 0 ]; then
    echo -e "${RED}❌ CRITICAL ISSUES FOUND - NOT READY FOR LAUNCH${NC}"
    echo "**Status:** ❌ NOT READY FOR LAUNCH" >> "$REPORT_FILE"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARNINGS FOUND - REVIEW BEFORE LAUNCH${NC}"
    echo "**Status:** ⚠️  REVIEW REQUIRED" >> "$REPORT_FILE"
    exit 0
else
    echo -e "${GREEN}✅ ALL TESTS PASSED - READY FOR LAUNCH${NC}"
    echo "**Status:** ✅ READY FOR LAUNCH" >> "$REPORT_FILE"
    exit 0
fi
