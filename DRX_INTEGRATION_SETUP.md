# DRx Integration Setup Guide

This guide explains how to configure the DRx pharmacy integration.

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# DRx API Configuration
DRX_API_ENDPOINT=https://digitalrx.io/drx-connect
DRX_API_KEY=ab746ed68d92a5b4507dd6940f02ce6f159528b8
DRX_GROUP_NAME=Simpiller
```

## API Key

Your DRx API key is: `DRXbeb4f7986e6d4fd6bb146f246c3b0cb0`

This key should be:
- Added to `.env.local` for local development
- Added to Vercel environment variables for production
- Kept secure and never committed to version control

**Note:** You've already set this correctly in both `.env.local` and Vercel environment variables.

## API Documentation

The DRX Connect API documentation is available at:
https://admin.digitalrx.io/drx-connect/documentation.htm

## Important Notes

1. **API Authentication**: The DRx API uses the `api-key` header (not `Authorization: Bearer`)
2. **Base URL**: All API requests go to `https://digitalrx.io/drx-connect`
3. **Endpoints**: The current documentation shows endpoints for:
   - Getting patient lists (`/patient/getall`)
   - Getting a patient (`/patient/getbyid`)
   - Appointment management
   
   However, endpoints for:
   - Creating/syncing patients
   - Getting medications/prescriptions
   - Managing groups
   
   May need to be confirmed with DRx support or may be available through different API paths.

## Testing

1. Ensure the API key is set in your environment variables
2. Assign a patient to "Our Partnered Pharmacy"
3. The system will automatically attempt to sync the patient to DRx
4. Check the sync status in the patient details modal

## Troubleshooting

- **401 Unauthorized**: Check that your API key is correct and active
- **404 Not Found**: The endpoint may need to be adjusted - check with DRx support
- **Sync Failures**: Check the `drx_patient_sync` table for error messages

