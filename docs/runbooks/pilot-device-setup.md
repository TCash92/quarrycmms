# Pilot Device Setup Guide

> **Purpose**: Step-by-step instructions for setting up pilot devices with QuarryCMMS via TestFlight (iOS) or Internal Track (Android).

---

## Overview

This guide covers the complete process of preparing devices for the QuarryCMMS pilot program. Each device needs to be:

1. Registered with Apple/Google for beta testing
2. Configured to receive app updates
3. Logged into QuarryCMMS
4. Verified for sync connectivity

---

## Device Requirements

### Minimum Specifications

| Requirement | iOS | Android |
|-------------|-----|---------|
| **OS Version** | iOS 14.0+ | Android 10 (API 29)+ |
| **Storage** | 500 MB free | 500 MB free |
| **RAM** | 2 GB | 3 GB |
| **Camera** | Required | Required |
| **Microphone** | Required | Required |

### Recommended Devices

| Type | iOS | Android |
|------|-----|---------|
| **Budget** | iPhone SE (2020+) | Samsung Galaxy A-series |
| **Mid-range** | iPhone 12/13 | Google Pixel 6/7 |
| **Rugged** | iPhone in OtterBox | CAT phones, Samsung XCover |

### Environmental Considerations

- **Temperature**: Devices should operate in -20C to 45C
- **Dust/Water**: IP67+ rating recommended for quarry use
- **Protection**: Rugged case required for field devices
- **Screen Protector**: Glass protector for glove interaction

---

## Part A: iOS Setup (TestFlight)

### A1. Prerequisites (IT Admin)

Before device setup:

1. **Register Device UDID** (for internal builds only):
   ```bash
   # On Mac with device connected
   instruments -s devices

   # Or view in Settings > General > About > UDID
   ```

2. **Add UDID to Apple Developer Account**:
   - Go to developer.apple.com > Devices
   - Click "+" to register new device
   - Enter device name and UDID

3. **Add Tester Email to TestFlight**:
   - Go to App Store Connect > TestFlight
   - Add tester email under External Testers

### A2. Device Setup Steps

**Step 1: Install TestFlight App**

1. Open App Store on device
2. Search for "TestFlight"
3. Install TestFlight (free, by Apple)

**Step 2: Accept TestFlight Invitation**

1. Check email for TestFlight invitation
2. Open invitation email on device
3. Tap "View in TestFlight"
4. Tap "Accept" to join beta

**Step 3: Install QuarryCMMS**

1. Open TestFlight app
2. Find QuarryCMMS in app list
3. Tap "Install"
4. Wait for download and installation

**Step 4: Trust Developer Certificate** (if prompted)

1. Go to Settings > General > VPN & Device Management
2. Find developer certificate
3. Tap "Trust"

### A3. Verify iOS Installation

- [ ] TestFlight installed and opens
- [ ] QuarryCMMS appears in TestFlight
- [ ] App installs without errors
- [ ] App opens to login screen
- [ ] Version number matches expected (check Settings screen)

---

## Part B: Android Setup (Internal Track)

### B1. Prerequisites (IT Admin)

Before device setup:

1. **Add Tester Email to Internal Track**:
   - Go to Google Play Console
   - Select QuarryCMMS app
   - Go to Testing > Internal testing
   - Add tester email to testers list

2. **Share Opt-In Link**:
   - Copy the internal testing opt-in URL
   - Send to device user

### B2. Device Setup Steps

**Step 1: Opt-In to Internal Testing**

1. Open the opt-in link in Chrome on device
2. Sign in with Google account (same email as registered)
3. Tap "Become a tester"
4. Confirmation page appears

**Step 2: Install QuarryCMMS**

1. Wait 5-10 minutes after opting in
2. Open Google Play Store
3. Search for "QuarryCMMS" (or use direct install link)
4. Tap "Install"

**Step 3: Enable Auto-Updates** (Recommended)

1. In Play Store, go to app page
2. Tap three-dot menu
3. Enable "Auto-update"

### B3. Verify Android Installation

- [ ] Opted into internal testing
- [ ] App appears in Play Store
- [ ] App installs without errors
- [ ] App opens to login screen
- [ ] Version number matches expected (check Settings screen)

---

## Part C: First Launch Configuration

### C1. User Login

**Step 1: Launch App**

1. Open QuarryCMMS app
2. Wait for app to fully load

**Step 2: Enter Credentials**

1. Enter email address provided by supervisor
2. Enter temporary password
3. Tap "Sign In"

**Step 3: Change Password** (if prompted)

1. Enter new password (minimum 8 characters)
2. Confirm new password
3. Tap "Update Password"

**Step 4: Verify Login**

- [ ] Login completes without errors
- [ ] Home screen displays with user name
- [ ] Correct site name appears

### C2. Initial Sync

**Step 1: Connect to Network**

1. Ensure device has WiFi or cellular connection
2. Verify internet access (open browser if needed)

**Step 2: Wait for Initial Sync**

1. Observe sync status on Home screen
2. Wait for "Synced" status
3. Initial sync may take 1-5 minutes depending on data volume

**Step 3: Verify Sync Completed**

- [ ] Sync status shows "Synced" (green)
- [ ] Quick Stats populate with numbers
- [ ] Assets are visible in Assets tab
- [ ] Work Orders are visible in Work Orders tab

### C3. Permission Grants

On first use, grant these permissions when prompted:

| Permission | Purpose | Required? |
|------------|---------|-----------|
| **Camera** | Work order photos | Yes |
| **Microphone** | Voice notes | Yes |
| **Photos/Storage** | Save/access photos | Yes |
| **Notifications** | Sync alerts (future) | Optional |

**iOS**: Tap "Allow" when prompted
**Android**: Tap "Allow" or "While using app"

---

## Part D: Verify Full Functionality

### D1. Connectivity Test

```
Test: Create test work order while online
Expected: Work order syncs immediately
Pass: [ ] Yes [ ] No
```

### D2. Offline Test

```
Test: Enable Airplane Mode, create work order
Expected: Work order saves locally with "pending" status
Pass: [ ] Yes [ ] No

Test: Disable Airplane Mode
Expected: Work order syncs within 30 seconds
Pass: [ ] Yes [ ] No
```

### D3. Camera Test

```
Test: Open asset, add photo
Expected: Camera opens, photo saves
Pass: [ ] Yes [ ] No
```

### D4. Voice Note Test

```
Test: Create Quick Log with voice note
Expected: Recording plays back correctly
Pass: [ ] Yes [ ] No
```

### D5. Timer Test

```
Test: Start work order, run timer for 1 minute
Expected: Timer counts up, pauses on background
Pass: [ ] Yes [ ] No
```

---

## Part E: Common Setup Issues

### E1. TestFlight Issues

**Issue**: "Unable to Install" error

Solutions:
1. Free up device storage (500MB+ required)
2. Restart device and try again
3. Delete and reinstall TestFlight
4. Verify device UDID is registered (IT Admin)

**Issue**: App doesn't appear in TestFlight

Solutions:
1. Check invitation email wasn't filtered to spam
2. Verify Apple ID matches invitation email
3. Ask IT Admin to resend invitation

**Issue**: "Untrusted Developer" message

Solution:
1. Go to Settings > General > VPN & Device Management
2. Find the developer profile
3. Tap "Trust"

### E2. Play Store Issues

**Issue**: App not found in Play Store

Solutions:
1. Wait 10+ minutes after opting in
2. Verify correct Google account is signed in
3. Clear Play Store cache: Settings > Apps > Play Store > Clear Cache
4. Use direct install link instead of search

**Issue**: "Item not available in your country"

Solutions:
1. Verify opt-in completed successfully
2. Check Google account region settings
3. Contact IT Admin to verify tester email

**Issue**: Installation stuck at "Pending"

Solutions:
1. Cancel and restart installation
2. Check internet connection
3. Free up device storage
4. Restart device

### E3. Login Issues

**Issue**: "Invalid credentials" error

Solutions:
1. Verify email is exactly as provided (case-sensitive)
2. Reset password via "Forgot Password"
3. Contact supervisor to verify account created

**Issue**: Login succeeds but app shows blank

Solutions:
1. Wait for initial sync to complete
2. Check network connection
3. Pull down to refresh
4. Force close and reopen app

### E4. Sync Issues

**Issue**: Sync stuck on "Syncing..."

Solutions:
1. Check network connection
2. Wait up to 5 minutes for initial sync
3. Force close and reopen app
4. Log out and log back in

**Issue**: "Sync Error" displayed

Solutions:
1. Tap "View Details" to see error
2. Check network connection
3. Contact IT support with error details

---

## Part F: Device Registration Checklist

Complete this checklist for each pilot device:

```
DEVICE REGISTRATION

Device ID: ____________________
User Name: ____________________
User Email: ____________________

SETUP VERIFICATION

[ ] Device meets minimum specs
[ ] Rugged case installed
[ ] Screen protector applied
[ ] TestFlight/Play Store opt-in complete
[ ] QuarryCMMS installed
[ ] User logged in successfully
[ ] Initial sync completed
[ ] Connectivity test passed
[ ] Offline test passed
[ ] Camera test passed
[ ] Voice note test passed

Setup Date: ____/____/________
Setup By: ____________________

Notes:
_________________________________
_________________________________
```

---

## Part G: Support Information

### For End Users

- **In-app help**: Settings > Help & Support
- **Export logs**: Settings > Export Diagnostic Logs
- **Site champion**: [Name and contact]

### For IT Support

- **EAS Dashboard**: expo.dev
- **Supabase Dashboard**: supabase.com
- **Sentry Dashboard**: sentry.io
- **IT Support Runbook**: `docs/runbooks/it-support-runbook.md`

### Escalation Path

1. **User** reports issue to Site Champion
2. **Site Champion** checks Help screen for solution
3. **Site Champion** exports logs and contacts IT Support
4. **IT Support** reviews logs, checks dashboards
5. **IT Support** escalates to Development if needed

---

*QuarryCMMS Pilot Device Setup Guide - Week 24*
