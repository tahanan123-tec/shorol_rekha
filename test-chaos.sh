#!/bin/bash

# Chaos Engineering Quick Test Script
# This script runs basic chaos experiments to verify the implementation

set -e

CHAOS_API="http://localhost:3006"
ADMIN_DASHBOARD="http://localhost:3100"

echo "🔥 Chaos Engineering Test Suite"
echo "================================"
echo ""

# Check if chaos-monkey is running
echo "📋 Checking Chaos Monkey service..."
if curl -s -f "${CHAOS_API}/health" > /dev/null 2>&1; then
    echo "✅ Chaos Monkey is running"
else
    echo "❌ Chaos Monkey is not running"
    echo "   Start it with: docker-compose up -d chaos-monkey"
    exit 1
fi

echo ""
echo "📋 Available services:"
curl -s "${CHAOS_API}/services" | jq -r '.data[] | "   - \(.service) (\(.status))"'

echo ""
echo "================================"
echo "Test 1: Service Kill & Recovery"
echo "================================"
echo ""
echo "Killing order-gateway for 20 seconds..."
curl -s -X POST "${CHAOS_API}/chaos/kill-service" \
    -H "Content-Type: application/json" \
    -d '{"serviceName": "order-gateway", "duration": 20000}' | jq '.'

echo ""
echo "⏳ Waiting 5 seconds..."
sleep 5

echo ""
echo "📊 Chaos status:"
curl -s "${CHAOS_API}/chaos/status" | jq '.'

echo ""
echo "⏳ Waiting 20 seconds for auto-recovery..."
sleep 20

echo ""
echo "✅ Test 1 complete - service should have recovered"

echo ""
echo "================================"
echo "Test 2: Latency Injection"
echo "================================"
echo ""
echo "Injecting 1000ms latency to stock-service for 30 seconds..."
curl -s -X POST "${CHAOS_API}/chaos/inject-latency" \
    -H "Content-Type: application/json" \
    -d '{"serviceName": "stock-service", "latencyMs": 1000, "duration": 30000}' | jq '.'

echo ""
echo "⏳ Waiting 5 seconds..."
sleep 5

echo ""
echo "📊 Chaos status:"
curl -s "${CHAOS_API}/chaos/status" | jq '.'

echo ""
echo "⏳ Waiting 30 seconds for latency to clear..."
sleep 30

echo ""
echo "✅ Test 2 complete - latency should be removed"

echo ""
echo "================================"
echo "Test 3: Broker Failure"
echo "================================"
echo ""
echo "Simulating message broker failure for 15 seconds..."
curl -s -X POST "${CHAOS_API}/chaos/simulate-broker-failure" \
    -H "Content-Type: application/json" \
    -d '{"duration": 15000}' | jq '.'

echo ""
echo "⏳ Waiting 5 seconds..."
sleep 5

echo ""
echo "📊 Chaos status:"
curl -s "${CHAOS_API}/chaos/status" | jq '.'

echo ""
echo "⏳ Waiting 15 seconds for broker to recover..."
sleep 15

echo ""
echo "✅ Test 3 complete - broker should have recovered"

echo ""
echo "================================"
echo "Test 4: Stop All Chaos"
echo "================================"
echo ""
echo "Starting multiple experiments..."

curl -s -X POST "${CHAOS_API}/chaos/inject-latency" \
    -H "Content-Type: application/json" \
    -d '{"serviceName": "kitchen-queue", "latencyMs": 500, "duration": 60000}' > /dev/null

curl -s -X POST "${CHAOS_API}/chaos/inject-latency" \
    -H "Content-Type: application/json" \
    -d '{"serviceName": "notification-hub", "latencyMs": 300, "duration": 60000}' > /dev/null

echo ""
echo "📊 Active experiments:"
curl -s "${CHAOS_API}/chaos/status" | jq '.'

echo ""
echo "Stopping all chaos experiments..."
curl -s -X POST "${CHAOS_API}/chaos/stop-all" | jq '.'

echo ""
echo "📊 Chaos status after stop:"
curl -s "${CHAOS_API}/chaos/status" | jq '.'

echo ""
echo "✅ Test 4 complete - all experiments stopped"

echo ""
echo "================================"
echo "🎉 All Tests Complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. Open Admin Dashboard: ${ADMIN_DASHBOARD}"
echo "2. Enable Chaos Mode toggle"
echo "3. Try the UI controls"
echo "4. Monitor in Grafana: http://localhost:3200"
echo ""
echo "For more tests, see: CHAOS_TESTING_GUIDE.md"
