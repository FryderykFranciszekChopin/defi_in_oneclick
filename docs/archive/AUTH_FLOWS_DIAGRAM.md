# OneClick DeFi Authentication Flows

## Complete Authentication System Overview

### 1. Initial Signup Flow
```
User → Enter Email → Send OTP → Verify OTP → Create Passkey → Account Created
         ↓             ↓           ↓            ↓               ↓
      [Email]     [Email API]  [6-digit]   [Biometric]    [Smart Wallet]
                                            (Touch/Face ID)
```

### 2. Regular Login Flow (Same Device)
```
User → Click Sign In → Biometric Auth → Access Dashboard
         ↓                ↓                  ↓
    [Stored Passkey]  [Touch/Face ID]   [Wallet Loaded]
```

### 3. Account Recovery Flow (New Device)
```
User → Sign In → Can't Access? → Enter Email → Verify OTP → Create New Passkey
         ↓           ↓              ↓             ↓              ↓
    [No Passkey]  [Recovery]    [Email API]   [6-digit]    [Link to Existing Wallet]
```

## Implementation Details

### LocalStorage Data Structure
```javascript
{
  "oneclick-passkey": {
    "id": "passkey-credential-id",
    "email": "user@example.com",
    "publicKey": "0x...", // Hex encoded public key
    "accountIndex": 0,    // For multiple wallets
    "createdAt": "2025-01-15T..."
  }
}
```

### Smart Contract Address Calculation
```javascript
// Deterministic address generation
address = CREATE2(
  factory: FACTORY_ADDRESS,
  salt: keccak256(email + publicKey + accountIndex),
  initCode: AccountImplementation
)
```

### Security Features
1. **Email Verification**: OTP sent to email (5 min expiry)
2. **Biometric Authentication**: Device-level security
3. **No Password Storage**: Only public keys stored
4. **Device-Specific Keys**: Each device has unique passkey
5. **Deterministic Addresses**: Same wallet across devices

## User Experience Benefits

1. **Seamless Onboarding**: Email + biometrics only
2. **No Seed Phrases**: Nothing to write down or lose
3. **Multi-Device Access**: Use from phone, laptop, tablet
4. **Account Recovery**: Never lose access to funds
5. **Familiar Flow**: Like traditional web apps

## Technical Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│   Next.js    │────▶│  Smart      │
│  (Browser)  │     │   API Routes │     │  Contracts  │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                     │
       ▼                    ▼                     ▼
  WebAuthn API         Email Service         XLayer Chain
  (Passkeys)           (OTP Codes)           (ERC-4337)
```

## Recovery Flow State Machine

```
[No Account] ──signup──▶ [Email Verified] ──passkey──▶ [Account Active]
                              ▲                              │
                              │                              │
                         verify OTP                     lost device
                              │                              │
                              │                              ▼
                    [Recovery Mode] ◀──────────────── [Can't Login]
```

This complete authentication system provides:
- **Security**: Multi-factor authentication
- **Convenience**: No passwords or seed phrases
- **Reliability**: Always recoverable
- **Familiarity**: Email-based like Web2