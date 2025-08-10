# Account Recovery Flow Testing Guide

## Overview
The account recovery feature has been successfully integrated into the OneClick DeFi application. This allows users to access their accounts from new devices by verifying their email ownership.

## How the Recovery Flow Works

### 1. From Login Screen
- When a user clicks "Sign In" but doesn't have a passkey on the current device
- They can click "Can't access your account?" link
- This opens the AccountRecovery component

### 2. Email Verification
- User enters their registered email address
- System sends a 6-digit OTP code to their email
- User enters the OTP to verify ownership

### 3. Passkey Creation
- After successful OTP verification, user is redirected to signup flow
- The email is pre-filled and pre-verified (no need to verify again)
- User creates a new passkey for the current device
- The passkey is linked to their existing smart account

### 4. Access Restored
- User can now access their account from the new device
- All their assets and transaction history remain intact
- The same smart contract wallet address is maintained

## Technical Implementation

### Components Modified:
1. **LoginForm.tsx**: Added "Can't access your account?" link
2. **AccountRecovery.tsx**: Handles email verification for recovery
3. **EmailSignup.tsx**: Modified to accept pre-verified emails from recovery flow
4. **page.tsx**: Added recovery email state management

### Key Features:
- Seamless transition from recovery to signup flow
- No duplicate email verification for recovery users
- Visual indicators showing recovery mode
- Maintains account consistency across devices

## Testing Steps

1. **Setup Initial Account**:
   - Sign up with an email
   - Create a passkey
   - Note the wallet address

2. **Simulate New Device**:
   - Clear browser data or use incognito mode
   - Try to sign in
   - Click "Can't access your account?"

3. **Recovery Process**:
   - Enter the same email
   - Get OTP code (in dev mode, shown on screen)
   - Verify OTP
   - Create new passkey
   - Confirm same wallet address

## Security Considerations

- Email verification ensures only the email owner can recover
- Each device has its own unique passkey
- Smart contract address remains deterministic based on email
- No private keys are transmitted or stored on servers

## Next Steps

The recovery flow is now fully functional. Users can:
- Access their accounts from multiple devices
- Recover access if they lose their device
- Maintain consistent wallet addresses across all devices