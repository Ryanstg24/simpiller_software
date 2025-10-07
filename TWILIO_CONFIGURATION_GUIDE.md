# 📱 Twilio Configuration Guide

## 🚨 **CRITICAL: Fix Your Twilio Settings**

Your Twilio phone number is currently pointing to **demo URLs** instead of your actual application!

---

## ✅ **Step 1: Update Phone Number Configuration**

Go to: **Twilio Console → Phone Numbers → Active Numbers → [Your Number]**

### **Configure "Messaging":**

| Setting | Current (WRONG) | Should Be (CORRECT) |
|---------|----------------|---------------------|
| **A message comes in** | `https://demo.twilio.com/welcome/sms/reply` ❌ | `https://app.simpiller.com/api/sms/inbound` ✅ |
| **Primary handler fails** | Empty | `https://app.simpiller.com/api/sms/inbound` ✅ |

**IMPORTANT:** Keep the "Low Volume Mixed A2P Messaging Service" - DO NOT remove it!

---

## ✅ **Step 2: Add Status Callback to Messaging Service**

Go to: **Twilio Console → Messaging → Services → Low Volume Mixed A2P Messaging Service**

Scroll to **"Integration" section:**

| Setting | Value |
|---------|-------|
| **Status Callback URL** | `https://app.simpiller.com/api/sms/status-callback` |
| **Callback Events** | Check all boxes: ✅ Queued ✅ Sent ✅ Delivered ✅ Failed ✅ Undelivered |

---

## ✅ **Step 3: Run Database Migration**

**Open Supabase SQL Editor and run:**
```sql
-- Copy and paste contents of CREATE_SMS_DELIVERY_LOGS_TABLE.sql
```

This creates the `sms_delivery_logs` table to track message delivery status.

---

## 🔍 **What Each Endpoint Does**

### **1. `/api/sms/inbound` - Incoming Messages**
Handles patient replies:
- `STOP` → Sets patient inactive
- `START` → Sets patient active
- Other messages → Logged

### **2. `/api/sms/status-callback` - Delivery Tracking**
Receives updates from Twilio:
- ✅ `delivered` - Message successfully received
- ❌ `failed` - Message failed to send
- ⚠️ `undelivered` - Message sent but not delivered

**This is KEY for debugging Spectrum issues!**

---

## 🚨 **Why This Fixes Spectrum Problems**

With status callbacks, you'll now see:

**Error Code 30007** - Carrier violation (Spectrum blocked it)
```
Status: failed
Error: 30007
Message: Carrier violation
```

**Error Code 30034** - A2P 10DLC registration issue
```
Status: undelivered
Error: 30034
Message: Message blocked - registration required
```

---

## 📊 **After Configuration: How to Debug**

### **Query Failed Deliveries:**
```sql
SELECT 
  to_number,
  status,
  error_code,
  error_message,
  to_city,
  to_state,
  received_at
FROM sms_delivery_logs
WHERE status IN ('failed', 'undelivered')
ORDER BY received_at DESC;
```

### **Find Spectrum-Specific Issues:**
```sql
SELECT 
  to_number,
  error_code,
  error_message,
  COUNT(*) as failure_count
FROM sms_delivery_logs
WHERE status IN ('failed', 'undelivered')
  AND error_code = '30007' -- Carrier blocking
GROUP BY to_number, error_code, error_message
ORDER BY failure_count DESC;
```

---

## ✅ **Verification Steps**

1. **Update Twilio phone number** → Use your actual URLs
2. **Update Messaging Service** → Add status callback
3. **Run SQL migration** → Create delivery logs table
4. **Send test SMS** to a Spectrum number
5. **Check logs table** → See delivery status
6. **If failed** → Check error_code for reason

---

## 🎯 **Expected Results**

### **Before (Current State):**
- ❌ Inbound replies go to demo URL (never reach your app)
- ❌ No delivery tracking
- ❌ Can't see why Spectrum fails
- ❌ No visibility into carrier issues

### **After (Fixed State):**
- ✅ Inbound replies handled by your app
- ✅ Delivery status tracked in database
- ✅ Spectrum failures logged with error codes
- ✅ Alerts created for failed deliveries
- ✅ Full visibility into carrier blocking

---

## 📋 **Quick Checklist**

- [ ] Update phone number "A message comes in" URL
- [ ] Update phone number "Primary handler fails" URL
- [ ] Add status callback to Messaging Service
- [ ] Enable all callback events (queued, sent, delivered, failed, undelivered)
- [ ] Run CREATE_SMS_DELIVERY_LOGS_TABLE.sql in Supabase
- [ ] Deploy code changes (already done!)
- [ ] Send test SMS to Spectrum number
- [ ] Check sms_delivery_logs table for results

---

## 🆘 **Common Twilio Error Codes**

| Code | Meaning | Action |
|------|---------|--------|
| 30007 | Carrier violation | Check message content, may need A2P brand registration |
| 30008 | Unknown destination | Phone number invalid or disconnected |
| 30034 | Message blocked | A2P 10DLC registration required |
| 30005 | Unknown destination | Invalid phone number format |
| 21610 | Message attempt failed | Temporary issue, retry |

---

**Last Updated:** October 7, 2025  
**Endpoints Created:** 
- ✅ `/api/sms/status-callback`
- ✅ Status callback added to twilio.ts
- ✅ Database migration ready
