# Simple Refund API - Quick Guide

## What It Does

✅ Calculates **80% refund** of the paid amount  
✅ Tracks which **payment method** was used (bKash, Nagad, Rocket, UPay, Bank, Cash)  
✅ **24-hour refund window** for CUSTOMER bookings (from creation time)  
✅ Immediately processes refund and updates booking  
✅ **No actual payment gateway** integration - just tracking & recording  

---

## ⏰ **24-Hour Refund Window**

### **For CUSTOMER Bookings:**
- Refund request must be made **within 24 hours** of booking creation
- After 24 hours, refund request will be **REJECTED**
- Example:
  - Booking created: May 24, 2:00 PM
  - Refund allowed until: May 25, 2:00 PM
  - Refund denied after: May 25, 2:00 PM

### **For STAFF/ADMIN Bookings:**
- No 24-hour restriction
- Can be refunded anytime

---

## Quick Example

### 1. Create a Refund (Within 24h for CUSTOMER)

```bash
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "unifiedBookingId": "booking-uuid",
    "paymentMethod": "BKASH"
  }'
```

**Success Response (Within 24h):**
```json
{
  "success": true,
  "message": "Refund of 1600 BDT (80% of 2000 BDT) processed successfully via BKASH",
  "data": {
    "id": "refund-uuid",
    "unifiedBookingId": "booking-uuid",
    "originalAmount": 2000,
    "refundAmount": 1600,
    "refundPercentage": 80,
    "paymentMethod": "BKASH",
    "status": "COMPLETED",
    "refundTransactionId": "BKS-1716539024000-a7b9c2",
    "createdAt": "2026-05-24T04:03:44Z"
  }
}
```

**Error Response (After 24h):**
```json
{
  "statusCode": 400,
  "message": "Refund window has expired. Bookings can only be refunded within 24 hours of creation. This booking was created 28 hours ago (4 hours past the refund window).",
  "error": "Bad Request"
}
```

---

### 2. With Custom Percentage

```bash
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "unifiedBookingId": "booking-uuid",
    "paymentMethod": "NAGAD",
    "refundPercentage": 50
  }'
```

---

### 3. Check Refund Status

```bash
curl -X GET http://localhost:5000/refund/refund-uuid
```

---

### 4. Get All Refunds for a Booking

```bash
curl -X GET http://localhost:5000/refund/booking/booking-uuid
```

---

### 5. Cancel a Refund

```bash
curl -X PATCH http://localhost:5000/refund/refund-uuid/cancel
```

---

## Payment Methods Supported

Just enter the name - system only tracks which method was used:

- **BKASH** - bKash
- **NAGAD** - Nagad
- **ROCKET** - Rocket
- **UPAY** - UPay
- **BANK** - Bank Transfer
- **CASH** - Physical Cash

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| **POST** | `/refund/initiate` | Create & process refund |
| **GET** | `/refund/:id` | Get refund details |
| **GET** | `/refund/booking/:id` | All refunds for booking |
| **GET** | `/refund/status/:status` | Refunds by status |
| **PATCH** | `/refund/:id/cancel` | Cancel refund |

---

## How It Works

1. **User/Admin calls** `/refund/initiate` with booking ID and payment method
2. **System validates:**
   - Booking exists
   - Booking is PAID
   - **If CUSTOMER: booking created within last 24 hours** ✨
3. **System calculates** 80% refund amount (or custom percentage)
4. **Creates refund record** with payment method name as tracking
5. **Updates booking** - deducts refund amount from paid balance
6. **Returns refund details** with transaction tracking ID

---

## Status Flow

```
COMPLETED ✅
(Immediately after initiate)
```

All refunds are completed instantly. No separate processing step needed.

---

## Example Scenarios

### Scenario 1: Booking 2000 BDT → 80% Refund Within 24h ✅

```bash
# Booking created 5 hours ago
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "unifiedBookingId": "550e8400-e29b-41d4",
    "paymentMethod": "BKASH"
  }'
```

**Result:** ✅ 1600 BDT refunded via BKASH

---

### Scenario 2: Refund Request After 24h ❌

```bash
# Booking created 30 hours ago
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "unifiedBookingId": "550e8400-e29b-41d4",
    "paymentMethod": "BKASH"
  }'
```

**Result:** ❌ Error - "Refund window has expired"

---

### Scenario 3: Custom 50% Refund (Within 24h)

```bash
# Booking created 12 hours ago
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "unifiedBookingId": "550e8400-e29b-41d4",
    "paymentMethod": "NAGAD",
    "refundPercentage": 50
  }'
```

**Result:** ✅ 1000 BDT refunded via NAGAD

---

### Scenario 4: Multiple Refunds (One at a time)

First refund gets 80% (within 24h):
```bash
POST /refund/initiate
- originalAmount: 2000
- refundPercentage: 80
- Result: Refund 1600, Remaining: 400
```

Then later (still within 24h), another 50% of remaining:
```bash
POST /refund/initiate
- originalAmount: 400 (current paid amount)
- refundPercentage: 50
- Result: Refund 200, Remaining: 200
```

---

## Frontend Integration (React)

```javascript
async function processRefund(bookingId, paymentMethod) {
  try {
    const response = await fetch('/refund/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        unifiedBookingId: bookingId,
        paymentMethod: paymentMethod,
        refundPercentage: 80 // optional
      })
    });

    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Refund processed!');
      console.log('Amount refunded:', result.data.refundAmount);
      console.log('Tracking ID:', result.data.refundTransactionId);
      return result.data;
    } else {
      // Handle error - likely refund window expired
      console.error('❌ Refund failed:', result.message);
      alert(result.message);
      return null;
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Usage
processRefund('booking-uuid', 'BKASH');
```

---

## Error Cases

### Booking Not Found
```json
{ "message": "Unified booking with ID xxx not found" }
```

### Booking Not Paid
```json
{ "message": "Booking payment status is UNPAID. Only PAID bookings can be refunded." }
```

### ⏰ Refund Window Expired (After 24h for CUSTOMER)
```json
{
  "message": "Refund window has expired. Bookings can only be refunded within 24 hours of creation. This booking was created 28 hours ago (4 hours past the refund window)."
}
```

### Refund Already Exists
```json
{ "message": "A refund is already in progress for this booking. Current status: COMPLETED" }
```

### Try to Cancel Completed Refund
```json
{ "message": "Only COMPLETED refunds can be cancelled" }
```

---

## Database

Simple record stored in `Refund` table:

```sql
SELECT * FROM "Refund";

-- Columns:
-- id, unifiedBookingId, originalAmount, refundAmount, 
-- refundPercentage, paymentMethod, status, refundTransactionId, 
-- notes, createdAt, updatedAt

-- Check booking creation time for 24h window
SELECT "createdAt" FROM "UnifiedBooking" WHERE id = 'booking-uuid';
```

---

## Summary

| Feature | Details |
|---------|---------|
| **Refund Logic** | 80% default, customizable |
| **Processing** | Immediate (no waiting) |
| **Payment Methods** | 6 options (just names tracked) |
| **APIs** | 5 endpoints, simple to use |
| **24h Refund Window** | ✅ For CUSTOMER bookings only |
| **Database** | Automatically updated |
| **No Integration** | No actual payment gateway calls |
| **Status** | All refunds are COMPLETED |

---

## Important Notes

- ⏰ **24-hour timer starts** from when booking is created (not when payment is made)
- 👥 **Only affects CUSTOMER bookings** (those linked to a user account)
- 🚫 **After 24h, no refund allowed** - return clear error message to user
- 💰 **Multiple refunds allowed** within the 24-hour window
- 📱 **No payment gateway needed** - just tracks the method name for reference

Done! 🎉


