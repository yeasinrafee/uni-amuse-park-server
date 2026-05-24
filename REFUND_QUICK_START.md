# Refund API - Quick Start Guide

## Installation & Setup

✅ **Already Done:**
- Prisma schema updated with `Refund` model
- Refund service created with business logic
- Refund controller created with API endpoints
- Refund module created and integrated
- Database migration applied successfully

## API Base URL

```
http://localhost:5000/refund
```

---

## Quick Examples

### 1. Initiate a Refund (80% Default)

**Command:**
```bash
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "unifiedBookingId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentMethod": "BKASH"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Refund initiated successfully. Refund Amount: 1600 BDT (80% of 2000 BDT)",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "unifiedBookingId": "550e8400-e29b-41d4-a716-446655440000",
    "originalAmount": 2000,
    "refundAmount": 1600,
    "refundPercentage": 80,
    "paymentMethod": "BKASH",
    "status": "PENDING",
    "refundTransactionId": null,
    "createdAt": "2026-05-24T04:03:44.000Z"
  }
}
```

---

### 2. With Custom Refund Percentage

```bash
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "unifiedBookingId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentMethod": "NAGAD",
    "refundPercentage": 50,
    "notes": "Partial refund for schedule change"
  }'
```

---

### 3. Process a Refund

After initiating, process the refund (replace `refund-id` with actual ID):

```bash
curl -X POST http://localhost:5000/refund/660e8400-e29b-41d4-a716-446655440001/process \
  -H "Content-Type: application/json"
```

---

### 4. Check Refund Status

```bash
curl -X GET http://localhost:5000/refund/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json"
```

---

### 5. Get All Refunds for a Booking

```bash
curl -X GET http://localhost:5000/refund/booking/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json"
```

---

### 6. Get All PENDING Refunds

```bash
curl -X GET http://localhost:5000/refund/status/PENDING \
  -H "Content-Type: application/json"
```

---

### 7. Cancel a Pending Refund

```bash
curl -X PATCH http://localhost:5000/refund/660e8400-e29b-41d4-a716-446655440001/cancel \
  -H "Content-Type: application/json"
```

---

## Supported Payment Methods

- **BKASH** - bKash mobile money
- **NAGAD** - Nagad payment system
- **ROCKET** - Rocket payment service
- **UPAY** - UPay wallet
- **BANK** - Direct bank transfer
- **CASH** - Physical cash refund

---

## Refund Status Flow

```
PENDING
  ↓ (when processing)
PROCESSING
  ↓ (on success)
COMPLETED ✅

  ↓ (on error)
FAILED ❌

OR

PENDING
  ↓ (when cancelled)
CANCELLED 🚫
```

---

## Integration with Frontend

### React Example:

```javascript
// Initiate refund
async function initiateRefund(bookingId, paymentMethod) {
  const response = await fetch('/refund/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      unifiedBookingId: bookingId,
      paymentMethod: paymentMethod,
      refundPercentage: 80, // optional
      notes: 'Customer requested refund'
    })
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('Refund initiated:', data.data.id);
    return data.data.id;
  } else {
    alert('Error: ' + data.message);
  }
}

// Process refund
async function processRefund(refundId) {
  const response = await fetch(`/refund/${refundId}/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const data = await response.json();
  
  if (data.success) {
    console.log('Refund processed successfully!');
    console.log('Transaction ID:', data.data.refundTransactionId);
  }
}

// Check status
async function checkRefundStatus(refundId) {
  const response = await fetch(`/refund/${refundId}`);
  const data = await response.json();
  
  console.log('Refund status:', data.data.status);
  return data.data;
}
```

---

## Common Scenarios

### Scenario 1: Customer Wants 80% Refund (Default)
```bash
# Booking: 2000 BDT → Refund: 1600 BDT (80%)
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{"unifiedBookingId": "booking-uuid", "paymentMethod": "BKASH"}'
```

### Scenario 2: Partial Refund (50%)
```bash
# Booking: 2000 BDT → Refund: 1000 BDT (50%)
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "unifiedBookingId": "booking-uuid",
    "paymentMethod": "NAGAD",
    "refundPercentage": 50,
    "notes": "50% refund for partial cancellation"
  }'
```

### Scenario 3: Multiple Refunds for Same Booking
```bash
# First refund
curl -X POST http://localhost:5000/refund/initiate \
  -d '{"unifiedBookingId": "booking-uuid", "paymentMethod": "BKASH", "refundPercentage": 30}'

# Process first refund
curl -X POST http://localhost:5000/refund/refund-id-1/process

# After first is completed, can create another
curl -X POST http://localhost:5000/refund/initiate \
  -d '{"unifiedBookingId": "booking-uuid", "paymentMethod": "BKASH", "refundPercentage": 50}'
```

---

## Error Handling

### Error: Booking Not Found
```json
{
  "statusCode": 404,
  "message": "Unified booking with ID xxx not found",
  "error": "Not Found"
}
```
**Solution:** Verify the booking ID is correct

---

### Error: Booking Not Paid
```json
{
  "statusCode": 400,
  "message": "Booking payment status is UNPAID. Only PAID bookings can be refunded.",
  "error": "Bad Request"
}
```
**Solution:** Only PAID bookings can be refunded

---

### Error: Refund Already In Progress
```json
{
  "statusCode": 409,
  "message": "A refund is already in progress for this booking. Current status: PENDING",
  "error": "Conflict"
}
```
**Solution:** Complete or cancel the existing refund first

---

### Error: Cannot Cancel Completed Refund
```json
{
  "statusCode": 400,
  "message": "Only PENDING refunds can be cancelled. Current status: COMPLETED",
  "error": "Bad Request"
}
```
**Solution:** Only PENDING refunds can be cancelled

---

## Testing Checklist

- [ ] Initiate a refund with 80% (default)
- [ ] Initiate a refund with custom percentage
- [ ] Process a pending refund
- [ ] Check refund details
- [ ] Get all refunds for a booking
- [ ] Get refunds by status (PENDING, COMPLETED, etc.)
- [ ] Cancel a pending refund
- [ ] Try to cancel a completed refund (should fail)
- [ ] Try to refund unpaid booking (should fail)
- [ ] Try to create duplicate refund (should fail)

---

## Database Inspection

View refunds in database:

```sql
-- All refunds
SELECT * FROM "Refund" ORDER BY "createdAt" DESC;

-- Refunds by status
SELECT * FROM "Refund" WHERE status = 'PENDING';

-- Refunds for specific booking
SELECT * FROM "Refund" WHERE "unifiedBookingId" = 'booking-uuid';

-- Completed refunds
SELECT * FROM "Refund" WHERE status = 'COMPLETED' AND "completedAt" IS NOT NULL;
```

---

## Performance Tips

1. **Use Status Filtering** - Instead of fetching all refunds, filter by status
2. **Pagination** - Add limit/offset parameters for large datasets
3. **Caching** - Cache completed refunds (they don't change)
4. **Indexing** - Database indexes on `unifiedBookingId`, `status`, and `createdAt` are already set

---

## Support & Next Steps

### To integrate with real payment gateways:
1. Read `PAYMENT_GATEWAY_INTEGRATION.md`
2. Choose your payment provider
3. Update the corresponding method in `refund.service.ts`
4. Add payment gateway credentials to `.env`
5. Test with sandbox API
6. Deploy to production

### Current Features:
✅ 80% refund calculation  
✅ Multiple payment methods  
✅ Transaction tracking  
✅ Status management  
✅ Error handling  
✅ Audit trail  

### Need Help?
- Check `REFUND_API_DOCUMENTATION.md` for detailed API reference
- Review `PAYMENT_GATEWAY_INTEGRATION.md` for gateway integration
- Check logs for debugging: `RefundService`, `RefundController`

---

## Key Code Files

- **Service**: `src/modules/refund/refund.service.ts` (Business logic)
- **Controller**: `src/modules/refund/refund.controller.ts` (API endpoints)
- **Module**: `src/modules/refund/refund.module.ts` (Module definition)
- **DTOs**: `src/modules/refund/dto/` (Data transfer objects)
- **Schema**: `prisma/schema.prisma` (Database model)

