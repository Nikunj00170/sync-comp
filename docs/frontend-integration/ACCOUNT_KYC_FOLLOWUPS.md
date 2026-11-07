# Account and KYC follow-ups — 7 November 2026

Branch: `feature/frontend-account-kyc-followups`. Each of the six requested fixes has its own commit.

1. **Connection check:** the explicit account check reports success or the actual request failure after refreshing account records. Shared background refreshes retain their recoverable error behavior.
2. **Signed-out guidance:** neutral guidance appears in the main profile area; the live-account panel keeps the Cognito action without a duplicate red sign-in box. Actual errors still have an error state.
3. **Profile spacing:** consistent panel padding and form row gaps, with a full-width GST row and clear separation before business priorities. Desktop and mobile layout checks cover control size, spacing and overflow.
4. **Notifications:** three-second display, a light-red fill from left to right, then a 240ms exit to the right. Manual dismissal uses the same exit; timers clean up on unmount. Reduced-motion settings disable animation while retaining dismissal and expiry.
5. **Review gate:** unsuccessful document assessment disables verification until the document set changes. Toggling consent does not clear a failed assessment. The backend continues to validate every submitted verification.
6. **DigiLocker:** step two explains the planned consent-based retrieval and shows a disabled demo connection action. It does not offer manual upload or permit completing verification. Digio retains the manual document-upload demo; switching paths preserves uploaded documents.

Validation uses the local demo and React with the real local Spring backend/test JWTs. Coverage includes explicit account check success/failure, signed-out placement, toast timing/reduced motion, persistent review gating, DigiLocker unavailability, and Digio onboarding through checkout. No live DigiLocker connection or AWS configuration change is included.

Final checks: production build passed; 31 unit tests, 36 desktop/mobile browser tests, and 14 React–Spring integration tests passed.
