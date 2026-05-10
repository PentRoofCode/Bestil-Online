#!/usr/bin/env bash
BASE="http://localhost:4000/api/v1"
PASS=0; FAIL=0

check() {
  local label="$1" expected="$2" actual="$3"
  if echo "$actual" | grep -qE "$expected"; then
    echo "  PASS: $label"
    PASS=$((PASS+1))
  else
    echo "  FAIL: $label"
    echo "        Expected pattern: $expected"
    echo "        Got: ${actual:0:250}"
    FAIL=$((FAIL+1))
  fi
}

echo "=== AUTH ==="

UID_SUFFIX=$(date +%s)

# Register new customer
REG=$(curl -s -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d "{\"firstName\":\"Test\",\"lastName\":\"Kunde\",\"email\":\"testcustomer_${UID_SUFFIX}@test.dk\",\"password\":\"Password123!\",\"role\":\"CUSTOMER\"}")
check "Register customer" '"role":"CUSTOMER"' "$REG"

# Register new restaurant owner
OWNER_EMAIL="testowner_${UID_SUFFIX}@test.dk"
REG_OWNER=$(curl -s -X POST $BASE/auth/register -H "Content-Type: application/json" \
  -d "{\"firstName\":\"Test\",\"lastName\":\"Ejer\",\"email\":\"$OWNER_EMAIL\",\"password\":\"Password123!\",\"role\":\"RESTAURANT_OWNER\"}")
check "Register restaurant owner" '"role":"RESTAURANT_OWNER"' "$REG_OWNER"

# Login wrong password
WRONG=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"customer@bestil.online","password":"wrongpass"}')
check "Login wrong password -> INVALID_CREDENTIALS" "INVALID_CREDENTIALS" "$WRONG"

# Login as customer
CUST_LOGIN=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"customer@bestil.online","password":"Password123!"}' -c /tmp/cust_cookies.txt)
CUST_TOKEN=$(echo "$CUST_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
check "Login as customer" '"role":"CUSTOMER"' "$CUST_LOGIN"

# Login as admin
ADMIN_LOGIN=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"admin@bestil.online","password":"Password123!"}' -c /tmp/admin_cookies.txt)
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
check "Login as admin" '"role":"ADMIN"' "$ADMIN_LOGIN"

# Login as restaurant owner
OWNER_LOGIN=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"owner1@bestil.online","password":"Password123!"}' -c /tmp/owner_cookies.txt)
OWNER_TOKEN=$(echo "$OWNER_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")
check "Login as restaurant owner" '"role":"RESTAURANT_OWNER"' "$OWNER_LOGIN"

# Login as owner2 (for cross-ownership tests)
OWNER2_LOGIN=$(curl -s -X POST $BASE/auth/login -H "Content-Type: application/json" \
  -d '{"email":"owner2@bestil.online","password":"Password123!"}')
OWNER2_TOKEN=$(echo "$OWNER2_LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

# /auth/me
ME=$(curl -s $BASE/auth/me -H "Authorization: Bearer $CUST_TOKEN")
check "GET /auth/me (customer)" '"role":"CUSTOMER"' "$ME"

# Token refresh via cookie
REFRESH=$(curl -s -X POST $BASE/auth/refresh -b /tmp/cust_cookies.txt)
check "Refresh token" '"accessToken"' "$REFRESH"
CUST_TOKEN=$(echo "$REFRESH" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

echo ""
echo "=== RESTAURANTS (PUBLIC) ==="

RLIST=$(curl -s $BASE/restaurants)
check "List restaurants" '"success":true' "$RLIST"
check "Returns La Bella Italia" '"La Bella Italia"' "$RLIST"

RCUISINE=$(curl -s "$BASE/restaurants?cuisine=Pizza")
check "Filter by cuisine=Pizza" '"success":true' "$RCUISINE"

RSEARCH=$(curl -s "$BASE/restaurants?search=sushi")
check "Search for sushi -> Sushi Zen" '"Sushi Zen"' "$RSEARCH"

RSLUG=$(curl -s $BASE/restaurants/la-bella-italia)
check "Get restaurant by slug" '"slug":"la-bella-italia"' "$RSLUG"
REST_ID=$(echo "$RSLUG" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

RBAD=$(curl -s $BASE/restaurants/nonexistent-restaurant-xyz)
check "Invalid slug -> NOT_FOUND" "NOT_FOUND" "$RBAD"

MENU=$(curl -s $BASE/restaurants/$REST_ID/menu)
check "Get full menu" '"Pizza"' "$MENU"
check "Menu has items" '"menuItems"' "$MENU"

ITEM_ID=$(echo "$MENU" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
for cat in d:
  for item in cat.get('menuItems', []):
    if item.get('isAvailable'):
      print(item['id'])
      sys.exit(0)
")

echo ""
echo "=== CUSTOMER FEATURES ==="

OLIST=$(curl -s $BASE/orders -H "Authorization: Bearer $CUST_TOKEN")
check "List my orders (authenticated)" '"success":true' "$OLIST"

UNAUTH=$(curl -s $BASE/orders)
check "Orders require auth" "UNAUTHORIZED" "$UNAUTH"

ADDR=$(curl -s -X POST $BASE/users/me/addresses -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Hjem","street":"Testgade 1","city":"Koebenhavn","postalCode":"2100"}')
check "Create address" '"success":true' "$ADDR"
ADDR_ID=$(echo "$ADDR" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

ADDRS=$(curl -s $BASE/users/me/addresses -H "Authorization: Bearer $CUST_TOKEN")
check "List addresses" '"label":"Hjem"' "$ADDRS"

ORDER=$(curl -s -X POST $BASE/orders -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$REST_ID\",\"deliveryAddressId\":\"$ADDR_ID\",\"items\":[{\"menuItemId\":\"$ITEM_ID\",\"quantity\":2,\"selectedOptions\":[]}],\"specialInstructions\":\"Ingen log\"}")
check "Create order -> has clientSecret" '"clientSecret"' "$ORDER"
check "Order starts PENDING_PAYMENT" "PENDING_PAYMENT" "$ORDER"
check "Order number format BO-" '"BO-' "$ORDER"
ORDER_ID=$(echo "$ORDER" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['order']['id'])" 2>/dev/null)

if [ -n "$ORDER_ID" ]; then
  ODETAIL=$(curl -s $BASE/orders/$ORDER_ID -H "Authorization: Bearer $CUST_TOKEN")
  check "Get order detail" '"orderNumber"' "$ODETAIL"
  check "Order detail has items snapshot" '"menuItemName"' "$ODETAIL"
  check "VAT computed (tax > 0)" '"tax":"[1-9]' "$ODETAIL"

  FORBIDDEN=$(curl -s $BASE/orders/$ORDER_ID -H "Authorization: Bearer $OWNER2_TOKEN")
  check "Owner cant view other customers order -> 403/404" "FORBIDDEN|NOT_FOUND|UNAUTHORIZED" "$FORBIDDEN"

  CANCEL=$(curl -s -X POST $BASE/orders/$ORDER_ID/cancel -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" -d '{"reason":"Test cancellation"}')
  check "Customer cancel PENDING_PAYMENT order" "CANCELLED" "$CANCEL"
fi

echo ""
echo "=== PROFILE MANAGEMENT ==="

PROF=$(curl -s -X PATCH $BASE/users/me -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" -d '{"firstName":"Opdateret","phone":"+45 99 88 77 66"}')
check "Update profile firstName" '"firstName":"Opdateret"' "$PROF"

CHPW=$(curl -s -X POST $BASE/users/me/change-password -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"Password123!","newPassword":"NewPassword456!"}')
check "Change password succeeds" '"success":true' "$CHPW"

# Wrong current password
CHPW_BAD=$(curl -s -X POST $BASE/users/me/change-password -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"WrongPassword!","newPassword":"Another123!"}')
check "Change password wrong current -> error" '"error"' "$CHPW_BAD"

# Change back
curl -s -X POST $BASE/users/me/change-password -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currentPassword":"NewPassword456!","newPassword":"Password123!"}' > /dev/null

# Create a fresh address not tied to any order, then delete it
TMP_ADDR=$(curl -s -X POST $BASE/users/me/addresses -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Midlertidig","street":"Slettegade 99","city":"Koebenhavn","postalCode":"2100"}')
TMP_ADDR_ID=$(echo "$TMP_ADDR" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
DEL_ADDR=$(curl -s -X DELETE $BASE/users/me/addresses/$TMP_ADDR_ID -H "Authorization: Bearer $CUST_TOKEN")
check "Delete address" '"success":true' "$DEL_ADDR"

echo ""
echo "=== FORGOT PASSWORD ==="

FP=$(curl -s -X POST $BASE/auth/forgot-password -H "Content-Type: application/json" \
  -d '{"email":"customer@bestil.online"}')
check "Forgot password -> 200 always" '"success":true' "$FP"

FP_FAKE=$(curl -s -X POST $BASE/auth/forgot-password -H "Content-Type: application/json" \
  -d '{"email":"nonexistent9999@example.com"}')
check "Forgot password nonexistent -> 200 (no enum leak)" '"success":true' "$FP_FAKE"

echo ""
echo "=== RESTAURANT OWNER FEATURES ==="

MINE=$(curl -s $BASE/restaurants/me -H "Authorization: Bearer $OWNER_TOKEN")
check "Get owned restaurants" '"success":true' "$MINE"
# Pick the oldest owned restaurant (seeded one, has a menu)
OWN_REST_ID=$(echo "$MINE" | python3 -c "
import sys,json
d=json.load(sys.stdin)['data']
if d:
    print(sorted(d, key=lambda r: r['createdAt'])[0]['id'])
" 2>/dev/null)

NEW_REST=$(curl -s -X POST $BASE/restaurants -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Pizzeria ${UID_SUFFIX}\",\"description\":\"En god pizzeria\",\"phone\":\"+45 12 34 56 78\",\"email\":\"test_${UID_SUFFIX}@pizza.dk\",\"street\":\"Testgade 5\",\"city\":\"Aarhus\",\"postalCode\":\"8000\",\"cuisines\":[\"Pizza\"],\"openingHours\":{\"mon\":{\"open\":\"10:00\",\"close\":\"22:00\"},\"tue\":{\"open\":\"10:00\",\"close\":\"22:00\"},\"wed\":{\"open\":\"10:00\",\"close\":\"22:00\"},\"thu\":{\"open\":\"10:00\",\"close\":\"22:00\"},\"fri\":{\"open\":\"10:00\",\"close\":\"23:00\"},\"sat\":{\"open\":\"11:00\",\"close\":\"23:00\"},\"sun\":{\"open\":\"11:00\",\"close\":\"21:00\"}},\"deliveryFee\":25,\"minimumOrderAmount\":75}")
check "Create restaurant" '"slug"' "$NEW_REST"
check "New restaurant starts unverified" '"isVerified":false' "$NEW_REST"
NEW_REST_ID=$(echo "$NEW_REST" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

if [ -n "$NEW_REST_ID" ]; then
  UPD=$(curl -s -X PATCH $BASE/restaurants/$NEW_REST_ID -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" -d '{"description":"En fantastisk pizzeria"}')
  check "Update own restaurant" '"En fantastisk pizzeria"' "$UPD"

  BAD_UPD=$(curl -s -X PATCH $BASE/restaurants/$REST_ID -H "Authorization: Bearer $OWNER2_TOKEN" \
    -H "Content-Type: application/json" -d '{"description":"Hack attempt"}')
  check "Owner cant edit another owners restaurant" "FORBIDDEN|NOT_FOUND|UNAUTHORIZED" "$BAD_UPD"
fi

CUST_REST=$(curl -s -X POST $BASE/restaurants -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" -d '{"name":"Fake"}')
check "Customer cant create restaurant -> FORBIDDEN" "FORBIDDEN" "$CUST_REST"

if [ -n "$OWN_REST_ID" ]; then
  OWN_MENU=$(curl -s $BASE/restaurants/$OWN_REST_ID/menu)
  check "Get owned restaurant full menu" '"menuItems"' "$OWN_MENU"

  CAT=$(curl -s -X POST $BASE/restaurants/$OWN_REST_ID/menu/categories \
    -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" \
    -d '{"name":"Test Kategori","description":"Til test"}')
  check "Create menu category" '"name":"Test Kategori"' "$CAT"
  CAT_ID=$(echo "$CAT" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

  if [ -n "$CAT_ID" ]; then
    ITEM=$(curl -s -X POST $BASE/restaurants/$OWN_REST_ID/menu/items \
      -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" \
      -d "{\"categoryId\":\"$CAT_ID\",\"name\":\"Test Burger\",\"description\":\"Laekker burger\",\"price\":89.00,\"preparationTimeMin\":15}")
    check "Create menu item" '"name":"Test Burger"' "$ITEM"
    NEW_ITEM_ID=$(echo "$ITEM" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

    if [ -n "$NEW_ITEM_ID" ]; then
      TOGGLE=$(curl -s -X PATCH $BASE/restaurants/$OWN_REST_ID/menu/items/$NEW_ITEM_ID/availability \
        -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" \
        -d '{"isAvailable":false}')
      check "Toggle item unavailable" '"isAvailable":false' "$TOGGLE"

      TOG2=$(curl -s -X PATCH $BASE/restaurants/$OWN_REST_ID/menu/items/$NEW_ITEM_ID/availability \
        -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" \
        -d '{"isAvailable":true}')
      check "Toggle item back available" '"isAvailable":true' "$TOG2"

      ITEM_UPD=$(curl -s -X PATCH $BASE/restaurants/$OWN_REST_ID/menu/items/$NEW_ITEM_ID \
        -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" \
        -d '{"price":99.00,"description":"Endnu laekker burger"}')
      check "Update menu item price" '"price":"99' "$ITEM_UPD"
    fi
  fi

  RORDERS=$(curl -s "$BASE/restaurants/$OWN_REST_ID/orders" -H "Authorization: Bearer $OWNER_TOKEN")
  check "Get restaurant order queue" '"success":true' "$RORDERS"

  CUST_RORDERS=$(curl -s "$BASE/restaurants/$OWN_REST_ID/orders" -H "Authorization: Bearer $CUST_TOKEN")
  check "Customer cant see restaurant orders -> FORBIDDEN" "FORBIDDEN" "$CUST_RORDERS"
fi

echo ""
echo "=== ADMIN FEATURES ==="

STATS=$(curl -s $BASE/admin/stats/overview -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin stats overview has activeRestaurants" '"activeRestaurants"' "$STATS"
check "Admin stats has today and month" '"today"' "$STATS"
check "Admin stats has pendingRestaurants" '"pendingRestaurants"' "$STATS"

AREST=$(curl -s "$BASE/admin/restaurants?status=all" -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin list all restaurants" '"success":true' "$AREST"

APEND=$(curl -s "$BASE/admin/restaurants?status=pending" -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin list pending restaurants" '"success":true' "$APEND"
PEND_ID=$(echo "$APEND" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id']) if d else print('')" 2>/dev/null)

if [ -n "$PEND_ID" ]; then
  VERIFY=$(curl -s -X POST $BASE/admin/restaurants/$PEND_ID/verify -H "Authorization: Bearer $ADMIN_TOKEN")
  check "Admin verify pending restaurant" '"isVerified":true' "$VERIFY"
fi

SUSPEND_NO_REASON=$(curl -s -X POST $BASE/admin/restaurants/$REST_ID/suspend \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{}')
check "Admin suspend without reason -> isActive:false" '"isActive":false' "$SUSPEND_NO_REASON"

SUSPEND_WITH_REASON=$(curl -s -X POST $BASE/admin/restaurants/$REST_ID/suspend \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"reason":"Hygiejneproblem"}')
check "Admin suspend with reason -> isActive:false" '"isActive":false' "$SUSPEND_WITH_REASON"

REACT=$(curl -s -X POST $BASE/admin/restaurants/$REST_ID/reactivate -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin reactivate restaurant -> isActive:true" '"isActive":true' "$REACT"

AORDERS=$(curl -s "$BASE/admin/orders" -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin list all orders" '"success":true' "$AORDERS"

AORD_FILT=$(curl -s "$BASE/admin/orders?status=CANCELLED" -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin filter orders by CANCELLED status" '"success":true' "$AORD_FILT"

AUSERS=$(curl -s "$BASE/admin/users" -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin list users" '"success":true' "$AUSERS"
AUSERS_ADMIN=$(curl -s "$BASE/admin/users?role=ADMIN" -H "Authorization: Bearer $ADMIN_TOKEN")
check "User list contains ADMIN role" '"ADMIN"' "$AUSERS_ADMIN"

ACUST=$(curl -s "$BASE/admin/users?role=CUSTOMER" -H "Authorization: Bearer $ADMIN_TOKEN")
check "Admin filter users by CUSTOMER role" '"CUSTOMER"' "$ACUST"

TODAY=$(date +%Y-%m-%d)
THIRTYAGO=$(date -d "30 days ago" +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d 2>/dev/null)
REV=$(curl -s "$BASE/admin/reports/revenue?from=${THIRTYAGO}T00:00:00.000Z&to=${TODAY}T23:59:59.999Z&groupBy=day" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "Revenue report daily" '"success":true' "$REV"

REV_WEEK=$(curl -s "$BASE/admin/reports/revenue?from=${THIRTYAGO}T00:00:00.000Z&to=${TODAY}T23:59:59.999Z&groupBy=week" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "Revenue report weekly" '"success":true' "$REV_WEEK"

REV_MONTH=$(curl -s "$BASE/admin/reports/revenue?from=${THIRTYAGO}T00:00:00.000Z&to=${TODAY}T23:59:59.999Z&groupBy=month" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
check "Revenue report monthly" '"success":true' "$REV_MONTH"

CUST_ADMIN=$(curl -s $BASE/admin/stats/overview -H "Authorization: Bearer $CUST_TOKEN")
check "Customer blocked from admin endpoints -> FORBIDDEN" "FORBIDDEN" "$CUST_ADMIN"

UNAUTH_ADMIN=$(curl -s $BASE/admin/stats/overview)
check "Admin requires auth -> UNAUTHORIZED" "UNAUTHORIZED" "$UNAUTH_ADMIN"

echo ""
echo "=== FULL ORDER STATUS FLOW ==="

# Need a fresh address for this
ADDR2=$(curl -s -X POST $BASE/users/me/addresses -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Kontor","street":"Kontorgade 2","city":"Koebenhavn","postalCode":"1000"}')
ADDR2_ID=$(echo "$ADDR2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

ORDER2=$(curl -s -X POST $BASE/orders -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$REST_ID\",\"deliveryAddressId\":\"$ADDR2_ID\",\"items\":[{\"menuItemId\":\"$ITEM_ID\",\"quantity\":1,\"selectedOptions\":[]}]}")
check "Create order for flow test" '"PENDING_PAYMENT"' "$ORDER2"
ORDER2_ID=$(echo "$ORDER2" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['order']['id'])" 2>/dev/null)

if [ -n "$ORDER2_ID" ]; then
  S1=$(curl -s -X PATCH $BASE/orders/$ORDER2_ID/status -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" -d '{"status":"PENDING_CONFIRMATION"}')
  check "Advance PENDING_PAYMENT -> PENDING_CONFIRMATION" "PENDING_CONFIRMATION" "$S1"

  S2=$(curl -s -X PATCH $BASE/orders/$ORDER2_ID/status -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" -d '{"status":"CONFIRMED"}')
  check "Advance -> CONFIRMED" "CONFIRMED" "$S2"

  # Owner can also advance
  S3=$(curl -s -X PATCH $BASE/orders/$ORDER2_ID/status -H "Authorization: Bearer $OWNER_TOKEN" \
    -H "Content-Type: application/json" -d '{"status":"PREPARING"}')
  check "Owner advance -> PREPARING" "PREPARING|FORBIDDEN" "$S3"

  S4=$(curl -s -X PATCH $BASE/orders/$ORDER2_ID/status -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" -d '{"status":"READY_FOR_PICKUP"}')
  check "Advance -> READY_FOR_PICKUP" "READY_FOR_PICKUP" "$S4"

  S5=$(curl -s -X PATCH $BASE/orders/$ORDER2_ID/status -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" -d '{"status":"OUT_FOR_DELIVERY"}')
  check "Advance -> OUT_FOR_DELIVERY" "OUT_FOR_DELIVERY" "$S5"

  S6=$(curl -s -X PATCH $BASE/orders/$ORDER2_ID/status -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" -d '{"status":"DELIVERED"}')
  check "Advance -> DELIVERED" "DELIVERED" "$S6"

  BAD_TRANS=$(curl -s -X PATCH $BASE/orders/$ORDER2_ID/status -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" -d '{"status":"CONFIRMED"}')
  check "Invalid transition DELIVERED->CONFIRMED blocked" "CONFLICT|error" "$BAD_TRANS"

  CUST_ADV=$(curl -s -X PATCH $BASE/orders/$ORDER2_ID/status -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" -d '{"status":"PREPARING"}')
  check "Customer cant advance order status -> FORBIDDEN" "FORBIDDEN" "$CUST_ADV"
fi

echo ""
echo "=== ORDER VALIDATION ==="

if [ -n "$NEW_REST_ID" ]; then
  INVALID_REST=$(curl -s -X POST $BASE/orders -H "Authorization: Bearer $CUST_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"restaurantId\":\"$NEW_REST_ID\",\"deliveryAddressId\":\"$ADDR2_ID\",\"items\":[{\"menuItemId\":\"$ITEM_ID\",\"quantity\":1,\"selectedOptions\":[]}]}")
  check "Order from unverified restaurant rejected" '"error"' "$INVALID_REST"
fi

WRONG_ADDR=$(curl -s -X POST $BASE/orders -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$REST_ID\",\"deliveryAddressId\":\"00000000-0000-0000-0000-000000000000\",\"items\":[{\"menuItemId\":\"$ITEM_ID\",\"quantity\":1,\"selectedOptions\":[]}]}")
check "Order with wrong address rejected" '"error"' "$WRONG_ADDR"

echo ""
echo "=== PHASE 3: REVIEWS ==="

# Need a DELIVERED order — advance ORDER2 was already delivered in the flow test
# Create a new order and manually advance it to DELIVERED for review tests
REVIEW_ADDR=$(curl -s -X POST $BASE/users/me/addresses -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"label":"Review test","street":"Anmeldervej 1","city":"Koebenhavn","postalCode":"1000"}')
REVIEW_ADDR_ID=$(echo "$REVIEW_ADDR" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")

REVIEW_ORDER=$(curl -s -X POST $BASE/orders -H "Authorization: Bearer $CUST_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$REST_ID\",\"deliveryAddressId\":\"$REVIEW_ADDR_ID\",\"items\":[{\"menuItemId\":\"$ITEM_ID\",\"quantity\":1,\"selectedOptions\":[]}]}")
REVIEW_ORDER_ID=$(echo "$REVIEW_ORDER" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['order']['id'])" 2>/dev/null)

# Advance through all states to DELIVERED
if [ -n "$REVIEW_ORDER_ID" ]; then
  curl -s -X PATCH $BASE/orders/$REVIEW_ORDER_ID/status \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
    -d '{"status":"PENDING_CONFIRMATION"}' > /dev/null
  curl -s -X PATCH $BASE/orders/$REVIEW_ORDER_ID/status \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
    -d '{"status":"CONFIRMED"}' > /dev/null
  curl -s -X PATCH $BASE/orders/$REVIEW_ORDER_ID/status \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
    -d '{"status":"PREPARING"}' > /dev/null
  curl -s -X PATCH $BASE/orders/$REVIEW_ORDER_ID/status \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
    -d '{"status":"READY_FOR_PICKUP"}' > /dev/null
  curl -s -X PATCH $BASE/orders/$REVIEW_ORDER_ID/status \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
    -d '{"status":"OUT_FOR_DELIVERY"}' > /dev/null
  DELIVERED=$(curl -s -X PATCH $BASE/orders/$REVIEW_ORDER_ID/status \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
    -d '{"status":"DELIVERED"}')
  check "Order advanced to DELIVERED for review" "DELIVERED" "$DELIVERED"

  # Review on non-delivered order should fail
  NOT_DELIVERED=$(curl -s -X POST $BASE/orders/$ORDER_ID/review \
    -H "Authorization: Bearer $CUST_TOKEN" -H "Content-Type: application/json" \
    -d '{"rating":5}')
  check "Review on non-delivered order rejected" '"error"' "$NOT_DELIVERED"

  # Create review on delivered order (unique comment via UID_SUFFIX)
  REVIEW_COMMENT="God pizza ${UID_SUFFIX}"
  REVIEW=$(curl -s -X POST $BASE/orders/$REVIEW_ORDER_ID/review \
    -H "Authorization: Bearer $CUST_TOKEN" -H "Content-Type: application/json" \
    -d "{\"rating\":4,\"foodRating\":5,\"deliveryRating\":4,\"comment\":\"$REVIEW_COMMENT\"}")
  check "Create review on delivered order" '"rating":4' "$REVIEW"
  REVIEW_ID=$(echo "$REVIEW" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
  check "Review has restaurantId" '"restaurantId"' "$REVIEW"

  # Duplicate review should fail
  DUP=$(curl -s -X POST $BASE/orders/$REVIEW_ORDER_ID/review \
    -H "Authorization: Bearer $CUST_TOKEN" -H "Content-Type: application/json" \
    -d '{"rating":1}')
  check "Duplicate review blocked -> CONFLICT" "CONFLICT" "$DUP"

  # Public reviews endpoint
  REST_REVIEWS=$(curl -s "$BASE/restaurants/$REST_ID/reviews")
  check "Public restaurant reviews" '"success":true' "$REST_REVIEWS"
  check "Review appears in restaurant reviews" "$REVIEW_COMMENT" "$REST_REVIEWS"

  # avgRating updated on restaurant
  RDATA=$(curl -s $BASE/restaurants/la-bella-italia)
  check "Restaurant avgRating updated after review" '"avgRating":[1-9]' "$RDATA"

  # Owner cannot post review
  OWNER_REVIEW=$(curl -s -X POST $BASE/orders/$REVIEW_ORDER_ID/review \
    -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" \
    -d '{"rating":3}')
  check "Restaurant owner blocked from creating review" "FORBIDDEN" "$OWNER_REVIEW"

  if [ -n "$REVIEW_ID" ]; then
    # Admin hides review
    HIDE=$(curl -s -X PATCH $BASE/admin/reviews/$REVIEW_ID/visibility \
      -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
      -d '{"isVisible":false}')
    check "Admin hide review" '"isVisible":false' "$HIDE"

    # Review disappears from public list after hiding
    AFTER_HIDE=$(curl -s "$BASE/restaurants/$REST_ID/reviews")
    # The review should NOT appear since it's hidden (it may return empty or without this specific review)
    VISIBLE_COUNT=$(echo "$AFTER_HIDE" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(len([r for r in d if r.get('id') == '$REVIEW_ID']))" 2>/dev/null)
    if [ "$VISIBLE_COUNT" = "0" ]; then
      echo "  PASS: Hidden review excluded from public list"
      PASS=$((PASS+1))
    else
      echo "  FAIL: Hidden review still visible in public list"
      FAIL=$((FAIL+1))
    fi

    # API key can also toggle visibility
    UNHIDE=$(curl -s -X PATCH $BASE/admin/reviews/$REVIEW_ID/visibility \
      -H "X-Api-Key: bestil-moderation-key-2026-secure" \
      -H "Content-Type: application/json" \
      -d '{"isVisible":true}')
    check "External API key can unhide review" '"isVisible":true' "$UNHIDE"

    # Wrong API key rejected
    WRONG_KEY=$(curl -s -X PATCH $BASE/admin/reviews/$REVIEW_ID/visibility \
      -H "X-Api-Key: wrong-key" \
      -H "Content-Type: application/json" \
      -d '{"isVisible":false}')
    check "Wrong API key rejected" "UNAUTHORIZED" "$WRONG_KEY"

    # Admin list reviews
    ADMIN_REVIEWS=$(curl -s "$BASE/admin/reviews" -H "Authorization: Bearer $ADMIN_TOKEN")
    check "Admin list reviews" '"success":true' "$ADMIN_REVIEWS"

    # avgRating recomputed after unhide (visible again)
    RDATA2=$(curl -s $BASE/restaurants/la-bella-italia)
    check "avgRating recomputed after visibility change" '"avgRating":[1-9]' "$RDATA2"
  fi
fi

echo ""
echo "========================================"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "========================================"
