import twilio from 'twilio';

class TwilioService {
  static client = null;

  static getClient() {
    if (!this.client) {
      this.client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }
    return this.client;
  }

  static async sendSMS(message) {
    try {
      const client = this.getClient();
      
      const result = await client.messages.create({
        body: message.body,
        to: message.to,
        messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID
      });

      console.log(`SMS sent successfully: ${result.sid}`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS:', error);
      return false;
    }
  }

  static async sendMedicationReminder(reminder) {
    const time = new Date(reminder.scheduledTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
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

  static async sendFollowUpReminder(reminder) {
    // Format patient name as first name + last initial for HIPAA compliance
    const nameParts = reminder.patientName.split(' ');
    const firstName = nameParts[0];
    const lastInitial = nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0) + '.' : '';
    const displayName = `${firstName} ${lastInitial}`;

    const message = {
      to: reminder.patientPhone,
      body: `Hi ${displayName}! This is a friendly reminder to take your medication. Please scan your medication label to confirm: ${reminder.scanLink}`,
    };

    return this.sendSMS(message);
  }
}

export default TwilioService;
