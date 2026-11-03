# Google Play Store — Data Safety Assessment & Questionnaire Guide

## 1. Executive Summary

This Data Safety Assessment provides the exact answers and architectural justifications required to complete the **Data Safety** questionnaire in Google Play Console for **Arrow Escape** (`com.arrowescape.puzzle`).

The evaluation is based on official Google Mobile Ads SDK data disclosure specifications, Capacitor Android plugin behavior, and the application's offline-first architecture.

### Primary Declarations:
- **Core App**: Collects **0 personal data** (no user accounts, no contact info, no financial data, no media, no location collected by app code).
- **Third-Party SDK (Google AdMob)**: Collects and shares device identifiers and diagnostic telemetry when the device has an active internet connection.
- **Data Encryption in Transit**: **Yes** (All network communications use TLS 1.3).
- **User Data Deletion Request**: **Yes** (Players can reset all local data in Settings; users can reset/delete Advertising ID in Android Settings).

---

## 2. Google Play Console Data Safety Questionnaire Answers

### Section 1: Data Collection and Security Overview

| Play Console Question | Response | Technical Details & Justification |
|---|---|---|
| **Does your app collect or share any of the required user data types?** | **Yes** | Yes, via the Google Mobile Ads SDK (AdMob) when connected to the internet. The app's own code does not collect data. |
| **Is all of the user data collected by your app encrypted in transit?** | **Yes** | All network requests initiated by Google Mobile Ads SDK use HTTPS with TLS 1.3. |
| **Do you provide a way for users to request that their data be deleted?** | **Yes** | Users can wipe local progress via the in-app "Reset Progress" setting and delete their Google Advertising ID in Android Settings. |

---

### Section 2: Data Types Breakdown

#### Category: Device or Other IDs
- **Data Type**: `Device or other IDs` (e.g. Google Advertising ID)
- **Collected**: **Yes**
- **Shared**: **Yes** (Shared with Google AdMob / advertising partners)
- **Processed Ephemerally**: No
- **Required or Optional**: **Optional** (Users in GDPR/UK regions can decline consent via UMP; users can delete Advertising ID in Android settings)
- **Purposes**:
  - `Advertising or marketing` (serving personalized or non-personalized ads)
  - `Analytics` (ad performance monitoring, frequency capping)
  - `Fraud prevention, security, and compliance` (click-fraud detection, bot prevention)

#### Category: Location (Approximate)
- **Data Type**: `Approximate location` (Coarse network IP-level location)
- **Collected**: **Yes** (Processed by Google Mobile Ads SDK from IP address)
- **Shared**: **Yes** (Shared with Google AdMob)
- **Processed Ephemerally**: Yes
- **Required or Optional**: Optional
- **Purposes**:
  - `Advertising or marketing` (serving geographically relevant advertising)
  - `Fraud prevention, security, and compliance`

#### Category: App Info and Performance
- **Data Type**: `Crash logs` & `Diagnostics`
- **Collected**: **Yes** (Google Mobile Ads SDK telemetry)
- **Shared**: **Yes**
- **Purposes**:
  - `Analytics`
  - `App functionality` (monitoring SDK stability and load failures)

---

### Section 3: Data Types NOT Collected

The following data categories are **NOT collected and NOT shared**:
- **Location**: Precise location is **NOT collected** (no GPS permission).
- **Personal Info**: Name, Email address, User IDs, Address, Phone number, Race/ethnicity, Political/religious beliefs, Sexual orientation are **NOT collected**.
- **Financial Info**: Credit card numbers, Bank account info, In-app purchase history are **NOT collected** (0 IAPs, 0 real-money transactions).
- **Health and Fitness**: Health or fitness info is **NOT collected**.
- **Messages**: SMS, MMS, or in-app chat are **NOT collected**.
- **Photos and Videos**: Photos or videos are **NOT collected** (no camera or storage permissions).
- **Audio Files**: Voice or sound recordings are **NOT collected** (no microphone permission).
- **Files and Docs**: User files are **NOT collected**.
- **Calendar**: Calendar events are **NOT collected**.
- **Contacts**: Contact books are **NOT collected**.

---

## 3. Play Console Submission Step-by-Step Flow

When completing the form in **Google Play Console > App Content > Data safety**:

1. Under **Data collection and security**:
   - Check **Yes** for data collection/sharing.
   - Check **Yes** that data is encrypted in transit.
   - Check **Yes** for deletion mechanism.
2. Under **Data types**:
   - Under **Location**: check **Approximate location**.
   - Under **App info and performance**: check **Crash logs** and **Diagnostics**.
   - Under **Device or other IDs**: check **Device or other IDs**.
   - Leave all other categories unchecked.
3. For each selected data type, specify:
   - Data is **Collected** and **Shared**.
   - Data is used for **Advertising or marketing**, **Analytics**, and **Fraud prevention, security, and compliance**.
   - Data collection is **Optional**.
4. Save and Submit.
