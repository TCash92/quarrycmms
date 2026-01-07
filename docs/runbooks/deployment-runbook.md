# Deployment Runbook

> **Purpose**: Step-by-step procedures for building and deploying QuarryCMMS to TestFlight (iOS) and Internal Track (Android).

---

## Overview

This runbook covers the complete deployment process using Expo Application Services (EAS). Deployments follow a three-environment model:

| Environment | Purpose | Distribution |
|-------------|---------|--------------|
| **Development** | Daily development builds | Internal (dev team) |
| **Staging** | Pre-production testing | Internal (QA + pilot testers) |
| **Production** | Pilot deployment | TestFlight / Internal Track |

---

## Prerequisites

### Accounts Required

| Service | Account Type | Responsibility |
|---------|-------------|----------------|
| **Expo** | Organization account | IT Admin |
| **Apple Developer** | Organization ($99/year) | IT Admin |
| **Google Play Console** | Organization ($25 one-time) | IT Admin |
| **Supabase** | Project access | Developer |

### Developer Machine Setup

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Verify installation
eas --version  # Should be >= 7.0.0

# Login to Expo
eas login

# Verify authentication
eas whoami
```

### Required Credentials

| Credential | Location | Notes |
|------------|----------|-------|
| Apple ID (for builds) | EAS Secrets | App Store Connect login |
| Apple App-Specific Password | EAS Secrets | For automated uploads |
| Google Service Account JSON | `./google-services.json` | For Play Store uploads |
| Supabase credentials | `.env.*` files | Per-environment |

---

## 1. Environment Setup

### 1.1 Verify Environment Files

Ensure environment files exist and are correctly configured:

```bash
# Development
cat .env.development

# Staging
cat .env.staging

# Production
cat .env.production
```

Required variables in each:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_SUPABASE_STORAGE_BUCKET=quarry-cmms-{env}
EXPO_PUBLIC_APP_ENV={development|staging|production}
```

### 1.2 Verify EAS Configuration

```bash
# Check eas.json exists and is valid
cat eas.json

# Verify project is linked
eas project:info
```

### 1.3 Verify app.json

Ensure `app.json` has:
- Valid `expo.extra.eas.projectId`
- Correct bundle identifier (`com.quarrycmms.app`)
- Correct Android package name

---

## 2. Building for Development

Development builds include the Expo dev client for hot reloading.

### 2.1 Build Development Client

```bash
# Build for both platforms
npm run build:dev

# Or build for specific platform
eas build --profile development --platform ios
eas build --profile development --platform android
```

### 2.2 Install on Development Device

1. Wait for build to complete (check status at expo.dev)
2. Scan QR code from EAS dashboard
3. Or download and install manually

### 2.3 Verify Development Build

- [ ] App launches without crash
- [ ] Expo dev tools accessible (shake device)
- [ ] Hot reload working
- [ ] Environment shows "development"

---

## 3. Building for Staging

Staging builds are production-like but use staging backend.

### 3.1 Build Staging

```bash
# Build for both platforms
npm run build:staging

# Or build for specific platform
eas build --profile staging --platform ios
eas build --profile staging --platform android
```

### 3.2 Distribute Staging Build

Staging uses internal distribution:

**iOS**:
- Requires device UDIDs registered in Apple Developer account
- Install via expo.dev dashboard or direct link

**Android**:
- APK can be installed directly
- Or use Firebase App Distribution

### 3.3 Verify Staging Build

- [ ] App launches in release mode (no dev tools)
- [ ] Connects to staging Supabase
- [ ] Environment shows "staging"
- [ ] All features functional
- [ ] Sync works correctly

---

## 4. Building for Production

Production builds are submitted to app stores for TestFlight/Internal Track.

### 4.1 Pre-Build Checklist

Before building for production:

- [ ] All staging tests passed
- [ ] Version number updated in `src/screens/SettingsScreen.tsx`
- [ ] `app.json` version incremented
- [ ] Changelog updated
- [ ] `.env.production` verified

### 4.2 Build Production

```bash
# Build for both platforms
npm run build:prod

# Or build for specific platform
eas build --profile production --platform ios
eas build --profile production --platform android
```

### 4.3 Monitor Build Progress

```bash
# View build logs
eas build:list

# View specific build
eas build:view {build-id}
```

---

## 5. TestFlight Submission (iOS)

### 5.1 Prerequisites

- Apple Developer account with App Store Connect access
- App created in App Store Connect
- App-specific password generated

### 5.2 Configure EAS Submit

Ensure `eas.json` has submit configuration:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your-apple-id@company.com",
      "ascAppId": "1234567890"
    }
  }
}
```

### 5.3 Submit to TestFlight

```bash
# Submit latest production build
npm run submit:ios

# Or specify build
eas submit --platform ios --id {build-id}
```

### 5.4 TestFlight Processing

1. Build uploads to App Store Connect (~10 minutes)
2. Apple processes build (~30 minutes)
3. Build appears in TestFlight
4. Add external testers (if needed) and submit for review

### 5.5 Verify TestFlight Distribution

- [ ] Build appears in App Store Connect
- [ ] Processing completed without errors
- [ ] Test users can install via TestFlight app
- [ ] App launches and connects to production backend

---

## 6. Internal Track Submission (Android)

### 6.1 Prerequisites

- Google Play Console access
- App created in Google Play Console
- Service account JSON with API access

### 6.2 Configure EAS Submit

Ensure `eas.json` has Android submit configuration:

```json
"submit": {
  "production": {
    "android": {
      "serviceAccountKeyPath": "./google-services.json",
      "track": "internal"
    }
  }
}
```

### 6.3 Submit to Internal Track

```bash
# Submit latest production build
npm run submit:android

# Or specify build
eas submit --platform android --id {build-id}
```

### 6.4 Google Play Processing

1. Build uploads to Google Play Console
2. Google processes AAB (~10 minutes)
3. Build appears in Internal testing track
4. Add testers via email list

### 6.5 Verify Internal Track Distribution

- [ ] Build appears in Google Play Console
- [ ] Internal testing enabled
- [ ] Test users received invitation email
- [ ] App installs via Play Store (internal link)
- [ ] App launches and connects to production backend

---

## 7. Version Management

### 7.1 Version Number Format

```
{major}.{minor}.{patch}

Examples:
- 0.14.0 - Pilot release
- 0.14.1 - Bug fix
- 0.15.0 - New feature
- 1.0.0  - Production release
```

### 7.2 Updating Version

Update in these locations:

1. **`src/screens/SettingsScreen.tsx`**:
   ```typescript
   const APP_VERSION = '0.14.0';
   const BUILD_NUMBER = '1';
   ```

2. **`app.json`**:
   ```json
   {
     "expo": {
       "version": "0.14.0",
       "ios": {
         "buildNumber": "1"
       },
       "android": {
         "versionCode": 14
       }
     }
   }
   ```

### 7.3 Build Numbers

- iOS: Increment `buildNumber` for each TestFlight upload
- Android: Increment `versionCode` for each Play Store upload
- Both must increase monotonically

---

## 8. Rollback Procedures

### 8.1 TestFlight Rollback

1. Go to App Store Connect > TestFlight
2. Select previous build version
3. Enable for external testing
4. Notify testers to update

### 8.2 Internal Track Rollback

1. Go to Google Play Console > Internal testing
2. Create new release with previous AAB
3. Roll out to 100% of testers
4. Notify testers to update

### 8.3 Emergency Hotfix Process

```bash
# 1. Create hotfix branch
git checkout -b hotfix/0.14.1

# 2. Make minimal fix
# ... fix code ...

# 3. Update version
# src/screens/SettingsScreen.tsx: APP_VERSION = '0.14.1'
# app.json: version, buildNumber/versionCode

# 4. Build and submit
npm run build:prod
npm run submit:ios
npm run submit:android

# 5. Merge and tag
git checkout master
git merge hotfix/0.14.1
git tag v0.14.1
git push origin master --tags
```

---

## 9. Troubleshooting

### 9.1 Build Failures

**Issue**: Build fails with credential error

```bash
# Re-authenticate with EAS
eas login

# Clear credentials cache
eas credentials
```

**Issue**: iOS build fails with provisioning profile error

```bash
# Rebuild credentials
eas build --profile production --platform ios --clear-credentials
```

**Issue**: Android build fails with keystore error

```bash
# Let EAS manage keystore
eas credentials --platform android
```

### 9.2 Submit Failures

**Issue**: TestFlight upload fails

- Check Apple ID is correct in eas.json
- Verify app-specific password is valid
- Ensure ASC App ID matches

**Issue**: Play Store upload fails

- Verify service account JSON is valid
- Check service account has release management permissions
- Ensure package name matches Play Console app

### 9.3 Installation Issues

**Issue**: iOS device can't install

- Verify device UDID is registered
- Check provisioning profile includes device
- Re-build with `--clear-credentials`

**Issue**: Android device can't install

- Enable "Install unknown apps" for the source
- Check device meets minimum SDK requirements

### 9.4 Runtime Issues Post-Deploy

**Issue**: App crashes on launch

1. Check Sentry for crash reports
2. Verify environment variables are set
3. Check Supabase connectivity
4. Review native logs via device console

**Issue**: Sync fails

1. Verify production Supabase URL
2. Check authentication token refresh
3. Review Supabase logs for errors

---

## 10. Quick Reference Commands

```bash
# Authentication
eas login
eas whoami

# Project info
eas project:info
eas build:list

# Development builds
npm run build:dev
eas build --profile development --platform all

# Staging builds
npm run build:staging
eas build --profile staging --platform all

# Production builds
npm run build:prod
eas build --profile production --platform all

# Submissions
npm run submit:ios
npm run submit:android
eas submit --platform ios
eas submit --platform android

# Credentials management
eas credentials
eas credentials --platform ios
eas credentials --platform android
```

---

## Appendix: EAS Configuration Reference

```json
{
  "cli": {
    "version": ">= 7.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": {
        "APP_ENV": "development"
      }
    },
    "staging": {
      "distribution": "internal",
      "channel": "staging",
      "env": {
        "APP_ENV": "staging"
      }
    },
    "production": {
      "channel": "production",
      "env": {
        "APP_ENV": "production"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "YOUR_APPLE_ID",
        "ascAppId": "YOUR_ASC_APP_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-services.json",
        "track": "internal"
      }
    }
  }
}
```

---

*QuarryCMMS Deployment Runbook - Week 24*
