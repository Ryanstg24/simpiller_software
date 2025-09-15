import twilio from 'twilio';

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const isTestMode = process.env.SMS_TEST_MODE === 'true';

if (!accountSid || !authToken || !messagingServiceSid) {
  throw new Error('Missing Twilio configuration. Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_MESSAGING_SERVICE_SID environment variables.');
}

const client = twilio(accountSid, authToken);

export interface SMSMessage {
  to: string;
  body: string;
  from?: string;
}

export interface MedicationReminder {
  patientName: string;
  medicationNames: string[];
  scheduledTime: string;
  scanLink: string;
  patientPhone: string;
  patientTimezone?: string;
}

export class TwilioService {
  /**
   * Send a single SMS message
   */
  static async sendSMS(message: SMSMessage): Promise<boolean> {
    try {
      console.log('🔍 SMS Debug Info:');
      console.log(`   Test Mode: ${isTestMode}`);
      console.log(`   To: ${message.to}`);
      console.log(`   From: ${message.from || messagingServiceSid}`);
      console.log(`   Body: ${message.body}`);
      console.log(`   Account SID: ${accountSid ? 'Set' : 'Missing'}`);
      console.log(`   Auth Token: ${authToken ? 'Set' : 'Missing'}`);
      console.log(`   Messaging Service SID: ${messagingServiceSid ? 'Set' : 'Missing'}`);
      
      if (isTestMode) {
        // Log the SMS instead of sending it
        console.log('📱 [TEST MODE] SMS would be sent:');
        console.log(`   To: ${message.to}`);
        console.log(`   From: ${message.from || messagingServiceSid}`);
        console.log(`   Body: ${message.body}`);
        console.log('   ──────────────────────────────────────');
        return true;
      }

      console.log('📱 [REAL MODE] Sending SMS via Twilio...');
      const result = await client.messages.create({
        body: message.body,
        messagingServiceSid: message.from || messagingServiceSid,
        to: message.to,
      });

      console.log(`✅ SMS sent successfully to ${message.to}. SID: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('❌ Error sending SMS:', error);
      return false;
    }
  }

  /**
   * Send medication reminder SMS with scan link
   */
  static async sendMedicationReminder(reminder: MedicationReminder): Promise<boolean> {
    const time = new Date(reminder.scheduledTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: reminder.patientTimezone || 'America/New_York' // 👈 use patient's timezone
    });

    // Format patient name as first name + last initial for HIPAA compliance
    const nameParts = reminder.patientName.split(' ');
    const firstName = nameParts[0];
    const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) + '.' : '';
    const displayName = `${firstName} ${lastInitial}`;

    const message = {
      to: reminder.patientPhone,
      body: `Hi ${displayName}! It's time to take your ${time} medication. Please scan your medication label to confirm: ${reminder.scanLink}`,
    };

    return this.sendSMS(message);
  }

  /**
   * Send follow-up reminder if medication not scanned
   */
  static async sendFollowUpReminder(reminder: MedicationReminder): Promise<boolean> {
    const time = new Date(reminder.scheduledTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: reminder.patientTimezone || 'America/New_York' // 👈 use patient's timezone
    });

    // Format patient name as first name + last initial for HIPAA compliance
    const nameParts = reminder.patientName.split(' ');
    const firstName = nameParts[0];
    const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) + '.' : '';
    const displayName = `${firstName} ${lastInitial}`;

    const message = {
      to: reminder.patientPhone,
      body: `Reminder: ${displayName}, please don't forget to take your ${time} medication. Scan here: ${reminder.scanLink}`,
    };

    return this.sendSMS(message);
  }

  /**
   * Send compliance summary
   */
  static async sendComplianceSummary(
    patientName: string,
    patientPhone: string,
    complianceRate: number,
    month: string
  ): Promise<boolean> {
    const message = {
      to: patientPhone,
      body: `Hi ${patientName}! Your medication compliance rate for ${month} was ${complianceRate}%. Keep up the great work!`,
    };

    return this.sendSMS(message);
  }

  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phone: string): boolean {
    // Basic US phone number validation
    const phoneRegex = /^\+1\d{10}$/;
    return phoneRegex.test(phone);
  }

  /**
   * Format phone number for Twilio
   */
  static formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // If it's a 10-digit number, add +1
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // If it already has country code, add + if missing
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    return phone; // Return as-is if we can't format it
  }

  /**
   * Check if we're in test mode
   */
  static isTestMode(): boolean {
    return isTestMode;
  }
}

export default TwilioService; 