# Finora savings & expense tracker

A React + Vite finance dashboard backed by Firebase Authentication and Cloud Firestore.

## Run locally

The project uses the supplied Firebase web-app config in the ignored `.env` file. Vite reads the `VITE_FIREBASE_*` variables at startup.

```sh
npm install
npm run dev
```

If you change `.env`, restart the Vite server. `.env` is intentionally ignored by Git; `.env.example` lists the variable names needed on another machine.

Firebase web config values (including the API key) are delivered to the browser and are not server secrets. Secure data with Firebase Authentication, Firestore Security Rules, and API-key restrictions. Never put a Firebase Admin/service-account key or a privileged Gemini key in a `VITE_*` variable.

## Firebase Console setup

The app does not require anonymous authentication. To enable account creation/sign-in and Firestore sync:

1. In **Firebase Console → Authentication → Sign-in method**, enable **Email/Password**.
2. In **Authentication → Settings → Authorized domains**, add the production hostname used by your deployment.
3. In **Firestore Database**, create the database in the Firebase project if it does not exist.
4. Publish owner-scoped rules. The app writes `userId` on its documents and queries each collection by that field:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{collection}/{documentId} {
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
      allow read, delete: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow update: if request.auth != null
        && resource.data.userId == request.auth.uid
        && request.resource.data.userId == resource.data.userId;
    }
  }
}
```

The app's profile/account control lets users create an email/password account or sign in. The Firebase config can initialize even when Auth is not enabled; until a user signs in, the dashboard displays a sign-in prompt and cannot read or write user data. `auth/operation-not-allowed` means the email/password provider is disabled. `permission-denied` means Firestore rules need to be published or corrected.

## Deployment environment

Copy the variables from `.env.example` into the deployment platform's environment-variable settings, using the same values currently in local `.env`. Set them for the production build because Vite embeds `VITE_*` values into the generated client bundle.

Required:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`

Optional:

- `VITE_FIREBASE_DATABASE_URL` (Realtime Database URL; this app currently uses Firestore)
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

## Firestore collections and features

- Public landing page with feature overview, plus a built-in five-step usage tutorial.
- Installable Android-friendly PWA with a home-screen install prompt, offline app-shell fallback, and Add to Home Screen instructions.
- Android APK release link and version loaded from Firebase Remote Config (`update_url`, `latest_version_code`).
- `transactions`, `savings_accounts`, `debts`, and `bills`, scoped by `userId`.
- Monthly 70/20/10 targets and actuals.
- Savings allocation calculator (40/20/20/20), target dates, and daily/weekly/monthly deposit plans.
- Debt schedules starting one month after the start date; payments and collections write the debt update and transaction atomically.
- Bill creation and payment recording.
- Optional Gemini advice. The API key entered on the advisor page stays in page state and is sent from the browser; restrict the key and do not use a privileged server key there.

Run `npm run lint` and `npm run build` to validate the app.

## Install on Android

Deploy the app to an HTTPS origin. Open it in Chrome on Android and choose **Install app** on the landing page. If Chrome does not offer a one-tap install prompt, use the button's instructions, then choose **⋮ → Install app** or **Add to Home screen**. The service worker and web app manifest are included in production builds; the local Vite development server does not register the service worker.

The Android APK download link/version are fetched from Firebase Remote Config keys `update_url` and `latest_version_code`. Publish those parameters in Firebase Console → Remote Config for the same Firebase project used by this app. `update_url` must be an HTTPS APK link under `github.com/Kamiko2021/expenses_debt_saving_tracker/releases/download/`; other hosts, paths, query strings, and fragments are rejected. Remote Config uses a one-hour minimum fetch interval in normal use. If the link is not shown, check that the Remote Config template is published, the parameters match those exact keys, and the Firebase API key has no restrictions blocking Remote Config/Installations requests.
