# 📱 Twilio SMS Integration Setup Guide

## **🔧 Prerequisites**

1. **Twilio Account**: Sign up at [twilio.com](https://www.twilio.com)
2. **Phone Number**: Purchase a Twilio phone number for sending SMS
3. **Environment Variables**: Configure your `.env.local` file

## **🚀 Step-by-Step Setup**

### **1. Twilio Account Setup**

1. **Create Twilio Account**:
   - Go to [twilio.com](https://www.twilio.com)
   - Sign up for a free account
   - Verify your email and phone number

2. **Get Your Credentials**:
   - Go to Twilio Console → Dashboard
   - Copy your **Account SID** and **Auth Token**
   - These are found in the "Account Info" section

3. **Purchase a Phone Number**:
   - Go to Twilio Console → Phone Numbers → Manage → Buy a number
   - Select a number with SMS capabilities
   - Note down the phone number (e.g., +1234567890)

### **2. Environment Variables**

Create a `.env.local` file in your project root with:

```bash
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890

# Application Configuration
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Cron Job Security
CRON_SECRET_TOKEN=your_random_secret_token_here

# SMS Test Mode (for development)
SMS_TEST_MODE=true
```

### **3. Local Testing Setup**

1. **Enable Test Mode**:
   ```bash
   # Add to your .env.local file
   SMS_TEST_MODE=true
   ```

2. **Test SMS Functionality**:
   - Start your development server: `npm run dev`
   - Navigate to `/sms-test` page
   - Fill out the test form and send a test SMS
   - Check the browser console for logged messages

3. **Test SMS Alerts Dashboard**:
   - Navigate to `/sms-alerts` page
   - View alert history and statistics
   - Test the resend functionality

### **4. Database Setup**

Run the medication scanning schema to create required tables:

```sql
-- Run the medication_scanning_schema.sql file
-- This creates tables for medication alerts, scan sessions, etc.
```

### **5. Testing the Integration**

1. **Test SMS Sending**:
   ```bash
   # Start your development server
   npm run dev
   
   # Navigate to /sms-test page
   # Try sending a test reminder
   ```

2. **Test Cron Job**:
   ```bash
   # Test the cron endpoint manually
   curl -X POST http://localhost:3000/api/cron/send-medication-alerts \
     -H "Authorization: Bearer your_cron_secret_token_here"
   ```

## **📋 Cron Job Setup**

### **Option 1: Vercel Cron Jobs (Recommended)**

Add to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-medication-alerts",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### **Option 2: External Cron Service**

Use services like:
- **Cron-job.org**: Free cron job service
- **EasyCron**: Simple cron job management
- **SetCronJob**: Reliable cron service

Configure to call: `https://your-domain.com/api/cron/send-medication-alerts`

## **🔒 Security Considerations**

1. **Environment Variables**: Never commit `.env.local` to version control
2. **Cron Secret**: Use a strong, random token for cron job authentication
3. **Phone Validation**: Always validate phone numbers before sending SMS
4. **Rate Limiting**: Implement rate limiting to prevent abuse

## **📊 Monitoring & Analytics**

### **Twilio Console**
- Monitor SMS delivery status
- View usage and costs
- Check error logs

### **Application Dashboard**
- View SMS alert history at `/sms-alerts`
- Monitor success/failure rates
- Track patient compliance

## **💰 Cost Considerations**

### **Twilio Pricing (US)**
- **SMS**: ~$0.0079 per message (US numbers)
- **Phone Number**: ~$1/month per number
- **Free Tier**: 15 SMS/day for trial accounts

### **Cost Optimization**
1. **Batch Alerts**: Send multiple medications in one SMS
2. **Smart Scheduling**: Avoid duplicate alerts
3. **Follow-up Logic**: Limit follow-up messages

## **🚨 Troubleshooting**

### **Common Issues**

1. **"Invalid Phone Number"**:
   - Ensure phone numbers are in E.164 format (+1234567890)
   - Verify phone numbers are verified in Twilio

2. **"Authentication Failed"**:
   - Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN
   - Ensure credentials are correct

3. **"SMS Not Delivered"**:
   - Check Twilio Console for delivery status
   - Verify phone number has SMS capabilities
   - Check for carrier restrictions

4. **"Cron Job Not Working"**:
   - Verify CRON_SECRET_TOKEN is set correctly
   - Check Vercel logs for errors
   - Ensure endpoint is accessible

5. **"Test Mode Not Working"**:
   - Ensure SMS_TEST_MODE=true is in .env.local
   - Check browser console for logged messages
   - Verify the test endpoint is accessible

### **Debug Commands**

```bash
# Test Twilio credentials
curl -X GET "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \
  -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN"

# Test SMS sending
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json" \
  -u "YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN" \
  -d "From=+1234567890" \
  -d "To=+1234567890" \
  -d "Body=Test message"

# Test local SMS endpoint
curl -X POST http://localhost:3000/api/sms/test-send \
  -H "Content-Type: application/json" \
  -d '{"patientName":"Test User","patientPhone":"+1234567890","medicationNames":["Test Med"],"scheduledTime":"2024-01-01T08:00"}'
```

## **📈 Next Steps**

1. **Implement OCR**: Add medication label scanning
2. **Compliance Tracking**: Calculate and report compliance rates
3. **Patient Portal**: Allow patients to manage their own reminders
4. **Analytics Dashboard**: Advanced reporting and insights
5. **Multi-language Support**: Support for different languages
6. **Voice Calls**: Add voice reminder options

## **📞 Support**

- **Twilio Support**: [support.twilio.com](https://support.twilio.com)
- **Documentation**: [twilio.com/docs](https://www.twilio.com/docs)
- **Community**: [twilio.com/community](https://www.twilio.com/community) 