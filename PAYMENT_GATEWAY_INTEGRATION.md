# Payment Gateway Integration Guide

This guide provides step-by-step instructions for integrating real payment gateway APIs into the refund system.

## bKash Integration

### Setup

1. **Register and get credentials** from [bKash Developer Portal](https://developer.bkash.com/)
2. **Store credentials in `.env`**:
```env
BKASH_APP_KEY=your_app_key
BKASH_APP_SECRET=your_app_secret
BKASH_USERNAME=your_username
BKASH_PASSWORD=your_password
BKASH_API_URL=https://api.bkash.com (production) or https://sandbox.bkash.com (sandbox)
```

### Implementation

```typescript
private async processBKashRefund(refund: any): Promise<{ transactionId: string; notes?: string }> {
  try {
    // 1. Get authentication token
    const tokenResponse = await fetch(`${process.env.BKASH_API_URL}/v1.2.0/tokenized/checkout/token/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        app_key: process.env.BKASH_APP_KEY,
        app_secret: process.env.BKASH_APP_SECRET,
      }),
    });

    const { token } = await tokenResponse.json();

    // 2. Create refund request
    const refundResponse = await fetch(`${process.env.BKASH_API_URL}/v1.2.0/tokenized/checkout/refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': token,
        'X-APP-Key': process.env.BKASH_APP_KEY,
      },
      body: JSON.stringify({
        paymentID: refund.refundTransactionId, // Original payment ID
        amount: refund.refundAmount,
      }),
    });

    const data = await refundResponse.json();

    if (!data.transactionStatus || data.transactionStatus !== 'Completed') {
      throw new Error(data.statusMessage || 'bKash refund failed');
    }

    return {
      transactionId: data.trxID,
      notes: 'bKash refund processed successfully',
    };
  } catch (error) {
    this.logger.error('bKash refund error:', error);
    throw error;
  }
}
```

---

## Nagad Integration

### Setup

1. **Register** at [Nagad Developer Portal](https://nagad.com.bd/)
2. **Store credentials in `.env`**:
```env
NAGAD_MERCHANT_ID=your_merchant_id
NAGAD_MERCHANT_KEY=your_merchant_key
NAGAD_API_URL=https://api.nagad.com.bd/
NAGAD_CALLBACK_URL=https://yoursite.com/webhook/nagad
```

### Implementation

```typescript
private async processNagadRefund(refund: any): Promise<{ transactionId: string; notes?: string }> {
  try {
    const orderNo = `REF-${Date.now()}`;
    const amount = refund.refundAmount.toString();
    
    // Create signature
    const signatureString = `${process.env.NAGAD_MERCHANT_ID}${refund.refundTransactionId}${amount}${process.env.NAGAD_MERCHANT_KEY}`;
    const signature = crypto.createHash('md5').update(signatureString).digest('hex');

    const refundResponse = await fetch(`${process.env.NAGAD_API_URL}refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        merchant_id: process.env.NAGAD_MERCHANT_ID,
        original_ref_id: refund.refundTransactionId,
        refund_amount: amount,
        order_id: orderNo,
        signature,
      }),
    });

    const data = await refundResponse.json();

    if (data.status !== '200') {
      throw new Error(data.reason || 'Nagad refund failed');
    }

    return {
      transactionId: data.refund_id,
      notes: 'Nagad refund processed successfully',
    };
  } catch (error) {
    this.logger.error('Nagad refund error:', error);
    throw error;
  }
}
```

---

## Rocket Integration

### Setup

1. **Contact Rocket Support** or register at [Rocket Portal](https://www.rocket.com.bd/)
2. **Store credentials in `.env`**:
```env
ROCKET_API_KEY=your_api_key
ROCKET_API_SECRET=your_api_secret
ROCKET_API_URL=https://api.rocket.com.bd/
ROCKET_MERCHANT_ID=your_merchant_id
```

### Implementation

```typescript
private async processRocketRefund(refund: any): Promise<{ transactionId: string; notes?: string }> {
  try {
    const signature = crypto
      .createHmac('sha256', process.env.ROCKET_API_SECRET)
      .update(`${refund.refundTransactionId}${refund.refundAmount}`)
      .digest('hex');

    const refundResponse = await fetch(`${process.env.ROCKET_API_URL}refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ROCKET_API_KEY}`,
        'X-Signature': signature,
      },
      body: JSON.stringify({
        merchant_id: process.env.ROCKET_MERCHANT_ID,
        original_transaction_id: refund.refundTransactionId,
        refund_amount: refund.refundAmount,
        remarks: refund.notes || 'Refund request',
      }),
    });

    const data = await refundResponse.json();

    if (!data.success) {
      throw new Error(data.message || 'Rocket refund failed');
    }

    return {
      transactionId: data.refund_transaction_id,
      notes: 'Rocket refund processed successfully',
    };
  } catch (error) {
    this.logger.error('Rocket refund error:', error);
    throw error;
  }
}
```

---

## UPay Integration

### Setup

1. **Register** at [UPay Developer Portal](https://www.upay.com.bd/)
2. **Store credentials in `.env`**:
```env
UPAY_MERCHANT_ID=your_merchant_id
UPAY_API_KEY=your_api_key
UPAY_API_URL=https://api.upay.com.bd/
UPAY_CALLBACK_URL=https://yoursite.com/webhook/upay
```

### Implementation

```typescript
private async processUpayRefund(refund: any): Promise<{ transactionId: string; notes?: string }> {
  try {
    const requestBody = {
      merchant_id: process.env.UPAY_MERCHANT_ID,
      original_transaction_id: refund.refundTransactionId,
      refund_amount: refund.refundAmount,
      refund_reason: refund.notes || 'Customer refund request',
      timestamp: Date.now(),
    };

    // Create checksum
    const checksumString = Object.keys(requestBody)
      .sort()
      .map(key => `${key}=${requestBody[key]}`)
      .join('&') + process.env.UPAY_API_KEY;
    
    const checksum = crypto.createHash('sha256').update(checksumString).digest('hex');

    const refundResponse = await fetch(`${process.env.UPAY_API_URL}refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.UPAY_API_KEY}`,
        'X-Checksum': checksum,
      },
      body: JSON.stringify(requestBody),
    });

    const data = await refundResponse.json();

    if (data.status !== 'SUCCESS') {
      throw new Error(data.error || 'UPay refund failed');
    }

    return {
      transactionId: data.refund_id,
      notes: 'UPay refund processed successfully',
    };
  } catch (error) {
    this.logger.error('UPay refund error:', error);
    throw error;
  }
}
```

---

## Bank Transfer Integration

For bank transfers, you may integrate with:

### Option 1: Bank API (e.g., Bangladesh Bank Portal)
```typescript
private async processBankRefund(refund: any): Promise<{ transactionId: string; notes?: string }> {
  // If your bank provides an API for transfers
  try {
    const bankResponse = await fetch(`${process.env.BANK_API_URL}/transfer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BANK_API_KEY}`,
      },
      body: JSON.stringify({
        account_number: refund.customerBankAccount,
        amount: refund.refundAmount,
        reference: `REF-${refund.id}`,
        remarks: refund.notes,
      }),
    });

    const data = await bankResponse.json();
    return {
      transactionId: data.transfer_reference_id,
      notes: 'Bank transfer initiated successfully',
    };
  } catch (error) {
    this.logger.error('Bank transfer error:', error);
    throw error;
  }
}
```

### Option 2: Manual Processing (Current Implementation)
- Generates reference number
- Marks for manual processing
- Admin processes manually

---

## Webhook Handling

Add webhook endpoints to handle payment gateway callbacks:

```typescript
@Post('webhook/bkash')
async handleBKashWebhook(@Body() payload: any) {
  // Verify signature
  const isValid = await this.verifyBKashSignature(payload);
  if (!isValid) throw new BadRequestException('Invalid signature');

  // Update refund status based on payload
  const refund = await this.prisma.refund.findUnique({
    where: { refundTransactionId: payload.transactionId },
  });

  if (refund) {
    await this.prisma.refund.update({
      where: { id: refund.id },
      data: { status: payload.status === 'Completed' ? RefundStatus.COMPLETED : RefundStatus.FAILED },
    });
  }
}
```

---

## Testing Sandbox Environments

1. **bKash**: Sandbox API at https://sandbox.bkash.com
2. **Nagad**: Sandbox testing credentials provided
3. **Rocket**: Sandbox available upon request
4. **UPay**: Test mode available in dashboard

---

## Error Handling Best Practices

```typescript
try {
  // API call
} catch (error) {
  // Log detailed error
  this.logger.error('Gateway error:', error);

  // Update refund status to FAILED
  await this.prisma.refund.update({
    where: { id: refundId },
    data: {
      status: RefundStatus.FAILED,
      notes: error.message,
    },
  });

  // Throw user-friendly error
  throw new BadRequestException('Refund processing failed. Please contact support.');
}
```

---

## Security Considerations

✅ Store all API credentials in `.env` (never in code)  
✅ Verify signatures from payment gateways  
✅ Use HTTPS for all API calls  
✅ Implement rate limiting for refund API  
✅ Log all refund transactions for audit trail  
✅ Validate amount before processing  
✅ Use transaction tokens instead of storing payment IDs  

---

## Next Steps

1. Choose your payment provider
2. Get API credentials
3. Create a `.env` file with credentials
4. Update the corresponding refund method
5. Test in sandbox environment
6. Deploy to production with live credentials

