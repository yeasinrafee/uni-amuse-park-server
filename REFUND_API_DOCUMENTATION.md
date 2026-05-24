# Refund API Documentation

## Overview

The Refund API system allows customers and administrators to process refunds for bookings. By default, it calculates **80% of the paid amount** as the refund, though this percentage can be customized. The system supports multiple payment methods including:

- **bKash**
- **Nagad**
- **Rocket**
- **UPay**
- **Bank Transfer**
- **Cash**

---

## Key Features

✅ **80% Refund Calculation** - Default refund is 80% of the paid amount  
✅ **Multiple Payment Methods** - Support for all major payment gateways in Bangladesh  
✅ **Transaction Tracking** - Every refund is tracked with unique transaction IDs  
✅ **Status Management** - PENDING → PROCESSING → COMPLETED/FAILED workflow  
✅ **User-Friendly** - Clear error messages and validation  
✅ **Audit Trail** - Timestamps for when refunds are created, processed, and completed  
✅ **Best Practices** - Clean code with proper error handling and logging  

---

## Database Schema

### Refund Model

```
- id (UUID): Unique refund identifier
- unifiedBookingId (UUID): Reference to the booking being refunded
- originalAmount (Float): The original paid amount
- refundAmount (Float): The actual amount to be refunded (usually 80%)
- refundPercentage (Float): Percentage of refund (default: 80)
- paymentMethod (Enum): BKASH, NAGAD, ROCKET, UPAY, BANK, CASH
- status (Enum): PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED
- refundTransactionId (String): Transaction ID from payment gateway
- notes (String): Additional information or error messages
- processedAt (DateTime): When refund processing started
- completedAt (DateTime): When refund was completed
- createdAt (DateTime): When refund was created
- updatedAt (DateTime): Last update timestamp
```

### RefundStatus Enum

- `PENDING` - Refund initiated, waiting to be processed
- `PROCESSING` - Refund is being processed through payment gateway
- `COMPLETED` - Refund successfully completed
- `FAILED` - Refund processing failed
- `CANCELLED` - Refund was cancelled by user/admin

---

## API Endpoints

### 1. Initiate a Refund

**Endpoint:** `POST /refund/initiate`

**Description:** Create a new refund request for a booking. This validates the booking, calculates the refund amount, and creates a PENDING refund record.

**Request Body:**
```json
{
  "unifiedBookingId": "550e8400-e29b-41d4-a716-446655440000",
  "paymentMethod": "BKASH",
  "refundPercentage": 80,
  "notes": "Customer requested refund due to schedule change"
}
```

**Request Parameters:**
- `unifiedBookingId` (required): UUID of the booking to refund
- `paymentMethod` (required): Payment method for refund (BKASH, NAGAD, ROCKET, UPAY, BANK, CASH)
- `refundPercentage` (optional): Percentage to refund (1-100, default: 80)
- `notes` (optional): Reason or additional information about the refund

**Response (Success):**
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
    "notes": "Customer requested refund due to schedule change",
    "processedAt": null,
    "completedAt": null,
    "createdAt": "2026-05-24T04:03:44.000Z",
    "updatedAt": "2026-05-24T04:03:44.000Z"
  }
}
```

**Response (Error):**
```json
{
  "statusCode": 400,
  "message": "Booking payment status is UNPAID. Only PAID bookings can be refunded.",
  "error": "Bad Request"
}
```

**Error Scenarios:**
- Booking not found (404)
- Booking not paid (400)
- No paid amount to refund (400)
- Refund already in progress (409)
- Invalid refund percentage (400)

---

### 2. Process a Refund

**Endpoint:** `POST /refund/:id/process`

**Description:** Process a PENDING refund through the payment gateway. This updates the booking balance and generates a transaction ID.

**URL Parameters:**
- `id` (required): Refund ID

**Request Body:** (Empty)

**Response (Success):**
```json
{
  "success": true,
  "message": "Refund processed successfully. Transaction ID: BKS-1716539024000-a7b9c2",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "unifiedBookingId": "550e8400-e29b-41d4-a716-446655440000",
    "originalAmount": 2000,
    "refundAmount": 1600,
    "refundPercentage": 80,
    "paymentMethod": "BKASH",
    "status": "COMPLETED",
    "refundTransactionId": "BKS-1716539024000-a7b9c2",
    "notes": "Customer requested refund due to schedule change",
    "processedAt": "2026-05-24T04:03:50.000Z",
    "completedAt": "2026-05-24T04:03:51.000Z",
    "createdAt": "2026-05-24T04:03:44.000Z",
    "updatedAt": "2026-05-24T04:03:51.000Z"
  }
}
```

**Error Scenarios:**
- Refund not found (404)
- Refund not in PENDING status (400)
- Payment gateway error (400)

---

### 3. Get Refund Details

**Endpoint:** `GET /refund/:id`

**Description:** Retrieve details of a specific refund by ID.

**URL Parameters:**
- `id` (required): Refund ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "unifiedBookingId": "550e8400-e29b-41d4-a716-446655440000",
    "originalAmount": 2000,
    "refundAmount": 1600,
    "refundPercentage": 80,
    "paymentMethod": "BKASH",
    "status": "COMPLETED",
    "refundTransactionId": "BKS-1716539024000-a7b9c2",
    "notes": "Customer requested refund due to schedule change",
    "processedAt": "2026-05-24T04:03:50.000Z",
    "completedAt": "2026-05-24T04:03:51.000Z",
    "createdAt": "2026-05-24T04:03:44.000Z",
    "updatedAt": "2026-05-24T04:03:51.000Z"
  }
}
```

---

### 4. Get Refunds for a Booking

**Endpoint:** `GET /refund/booking/:unifiedBookingId`

**Description:** Get all refunds associated with a specific booking.

**URL Parameters:**
- `unifiedBookingId` (required): Booking ID

**Response:**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "unifiedBookingId": "550e8400-e29b-41d4-a716-446655440000",
      "originalAmount": 2000,
      "refundAmount": 1600,
      "refundPercentage": 80,
      "paymentMethod": "BKASH",
      "status": "COMPLETED",
      ...
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440002",
      "unifiedBookingId": "550e8400-e29b-41d4-a716-446655440000",
      "originalAmount": 2000,
      "refundAmount": 400,
      "refundPercentage": 20,
      "paymentMethod": "NAGAD",
      "status": "PENDING",
      ...
    }
  ]
}
```

---

### 5. Get Refunds by Status

**Endpoint:** `GET /refund/status/:status`

**Description:** Get all refunds with a specific status.

**URL Parameters:**
- `status` (required): Refund status (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "data": [
    { /* refund objects */ },
    { /* refund objects */ },
    ...
  ]
}
```

---

### 6. Cancel a Refund

**Endpoint:** `PATCH /refund/:id/cancel`

**Description:** Cancel a PENDING refund. Only PENDING refunds can be cancelled.

**URL Parameters:**
- `id` (required): Refund ID

**Response:**
```json
{
  "success": true,
  "message": "Refund cancelled successfully",
  "data": {
    "id": "660e8400-e29b-41d4-a716-446655440001",
    "status": "CANCELLED",
    ...
  }
}
```

---

## Usage Examples

### Example 1: Complete Refund Flow

```bash
# 1. Initiate a refund
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "unifiedBookingId": "550e8400-e29b-41d4-a716-446655440000",
    "paymentMethod": "BKASH",
    "refundPercentage": 80,
    "notes": "Customer cancelled booking"
  }'

# Response contains refund ID: 660e8400-e29b-41d4-a716-446655440001

# 2. Process the refund
curl -X POST http://localhost:5000/refund/660e8400-e29b-41d4-a716-446655440001/process \
  -H "Content-Type: application/json"

# 3. Check refund status
curl -X GET http://localhost:5000/refund/660e8400-e29b-41d4-a716-446655440001 \
  -H "Content-Type: application/json"
```

### Example 2: 80% Refund (Default)

```bash
# Original booking: 2000 BDT
# Refund without specifying percentage (defaults to 80%)
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "unifiedBookingId": "booking-uuid",
    "paymentMethod": "NAGAD"
  }'

# Result: Refund of 1600 BDT (80% of 2000 BDT)
```

### Example 3: Custom Refund Percentage

```bash
# Refund 50% instead of 80%
curl -X POST http://localhost:5000/refund/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "unifiedBookingId": "booking-uuid",
    "paymentMethod": "ROCKET",
    "refundPercentage": 50
  }'

# Result: Refund of 1000 BDT (50% of 2000 BDT)
```

---

## Payment Method Integration Guide

The system currently has **simulated** implementations for all payment methods. To integrate real payment gateways, update the corresponding methods in `refund.service.ts`:

### For bKash Integration:
```typescript
private async processBKashRefund(refund: any): Promise<{ transactionId: string; notes?: string }> {
  // TODO: Implement bKash API integration
  // API Docs: https://developer.bkash.com/
  // Steps:
  // 1. Authenticate with bKash API
  // 2. Initiate refund request with amount
  // 3. Get transaction ID from response
  // 4. Return transaction ID
}
```

### For Nagad, Rocket, UPay Integration:
Similar approach - integrate with their respective APIs.

### For Bank Transfer:
Generates a reference number for manual processing.

### For Cash:
Generates a reference number for manual cash handling.

---

## Best Practices Implemented

✅ **Transaction Safety** - Uses Prisma transactions to ensure atomicity  
✅ **Input Validation** - DTOs with class-validator for all inputs  
✅ **Error Handling** - Proper HTTP status codes and error messages  
✅ **Logging** - Comprehensive logging for debugging and auditing  
✅ **Status Workflow** - Clear state machine (PENDING → PROCESSING → COMPLETED/FAILED)  
✅ **Conflict Detection** - Prevents multiple refunds for one booking  
✅ **Data Integrity** - Validates booking status before allowing refunds  
✅ **Audit Trail** - Tracks all timestamps and transaction details  
✅ **Type Safety** - Full TypeScript support with interfaces  
✅ **RESTful Design** - Follows REST conventions for all endpoints  

---

## Error Handling

| Status Code | Error | Meaning |
|---|---|---|
| 400 | BadRequestException | Invalid input or booking state invalid for refund |
| 404 | NotFoundException | Booking or refund not found |
| 409 | ConflictException | Refund already exists for booking |

---

## Workflow Diagram

```
User Creates Booking (2000 BDT)
        ↓
    User Pays
        ↓
Booking Status = PAID
        ↓
User Requests Refund (via /refund/initiate)
        ↓
Refund Created (Status: PENDING)
        ↓
Admin/System Processes Refund (via /refund/:id/process)
        ↓
Refund Status: PROCESSING
        ↓
Payment Gateway Processes (80% = 1600 BDT)
        ↓
Refund Status: COMPLETED
        ↓
Booking Paid Amount Updated (2000 - 1600 = 400 BDT)
        ↓
Booking Status: DUE (remaining 400 BDT owed)
```

---

## Testing the API

### Test Case 1: Happy Path
1. Create a booking with payment of 2000 BDT
2. Initiate refund with 80%
3. Process refund
4. Verify refund amount is 1600 BDT

### Test Case 2: Edge Cases
1. Try to refund unpaid booking (should fail)
2. Try to refund twice (should fail - conflict)
3. Try to process non-PENDING refund (should fail)
4. Try to cancel completed refund (should fail)

### Test Case 3: Different Payment Methods
1. Test refund with bKash, Nagad, Rocket, UPay, Bank, Cash
2. Verify transaction IDs are generated correctly

---

## Migration and Setup

The Prisma migration has already been created and applied. The migration includes:

- Creation of `Refund` table with all necessary fields
- Addition of `RefundStatus` enum
- Addition of `UPAY` to `PaymentMethod` enum
- Relationship setup between `Refund` and `UnifiedBooking`

---

## Future Enhancements

- [ ] Implement actual payment gateway APIs
- [ ] Add refund scheduling (process refund at specific time)
- [ ] Add bulk refund processing
- [ ] Add webhook support for payment gateway confirmations
- [ ] Add admin dashboard for refund management
- [ ] Add email notifications for refund status updates
- [ ] Add partial refund capabilities
- [ ] Add refund reason categorization

---

## Support

For issues or questions:
1. Check the error message for specific guidance
2. Review logs in `RefundService` and `RefundController`
3. Verify Prisma schema and migrations are up to date
4. Ensure payment gateway credentials are configured
