# PROJECT: FLAME University — Digital Sports Equipment Room

## 1. Your role and objective

Act as a senior full-stack engineer, product designer, database architect, and security engineer. Build a complete, production-ready web application for digitising the sports equipment room at FLAME University, Pune, India.

The application must allow students to issue and return sports equipment through a QR-code-accessible website. Sports Department administrators must have a separate, secure dashboard to manage inventory, monitor outstanding issues, confirm physical returns, track overdue equipment, report damage, and maintain accountability records.

This must be a fully functional application, not a visual prototype. Implement the frontend, backend, authentication, database, image storage, automated email notifications, scheduled jobs, access controls, audit logs, testing, and deployment configuration.

Use Google Antigravity to develop the project and prepare it for deployment on Vercel.

## 2. Required technology stack

Use the following stack unless a genuine technical limitation requires an alternative:

- Framework: Next.js with App Router and TypeScript.
- Styling: Tailwind CSS and reusable UI components.
- Hosting: Vercel.
- Database: Supabase PostgreSQL.
- Authentication: Google OAuth through Supabase Auth or an equally secure compatible implementation.
- Image storage: Private Supabase Storage buckets.
- Email delivery: Resend, using verified sender credentials.
- Scheduled automation: Vercel Cron Jobs or a reliable compatible alternative.
- Time zone: Asia/Kolkata (IST).
- Version control: Git and a GitHub-ready project structure.

Use server-side operations for all security-sensitive actions. Never expose database service-role keys, OAuth secrets, email API keys, cron secrets, or other private credentials in client-side code.

Provide database migrations, seed scripts, environment-variable documentation, setup instructions, and a deployment README.

If credentials or external service configuration are unavailable, build the integration and document the exact configuration required. Do not falsely claim that an integration is operational before it has been configured and tested.

## 3. Design and user experience

The application must be extremely simple for students. They should not need training, lengthy onboarding, or complicated navigation.

The primary workflow is:

Scan QR code → Open website → Sign in with FLAME Google account → Issue or return equipment.

Design requirements:

- Mobile-first and fully responsive.
- Fast loading, including on ordinary campus Wi-Fi.
- Premium, institutional FLAME University aesthetic.
- Restrained use of deep red, deep blue, and white.
- Clear typography, generous spacing, accessible contrast, and large touch targets.
- Minimal, uncluttered interface.
- Clear success messages, confirmation dialogs, and understandable error states.
- No unnecessary charts, gamification, complex navigation, or excessive animations.

Create two separate experiences:

1. A minimal student interface.
2. A more detailed administrator dashboard optimised for laptop and tablet use.

## 4. Authentication and access control

### 4.1 Student login

The landing page should contain the application title, a short explanation, and one primary action:

“Login with your FLAME Email ID”

Implement Google Single Sign-On.

Only accounts whose verified Google email belongs to the `@flame.edu.in` domain may access the application.

Requirements:

1. Initiate Google OAuth.
2. Verify the authenticated identity and verified email on the server.
3. Validate that the email ends with the exact domain `@flame.edu.in`, case-insensitively.
4. Reject personal Gmail accounts and all other unauthorised accounts.
5. Never trust an email supplied through a form, URL parameter, or client-side state.
6. Create or update the user’s database record after successful authentication.
7. Maintain secure sessions and implement logout.
8. Protect all application routes and database operations against unauthenticated access.
9. Display a clear error when an unauthorised user attempts to sign in.

Use the authenticated user’s verified email as the unique identity for issue and return records.

### 4.2 Administrator access

The sole initial administrator email is:

`asmi.malushte@flame.edu.in`

After authentication, if the verified email exactly matches this address, grant administrator access and redirect the user to the administrator dashboard.

All other authorised FLAME accounts must receive student access only.

Security requirements:

- Store roles in a protected database table or another server-controlled access-control mechanism.
- Enforce administrator permissions in server-side route handlers and database policies.
- Never rely on hiding administrator buttons in the frontend.
- Students must not be able to grant themselves administrator roles or modify other students’ records.
- Protect against identity spoofing and unauthorised database access.
- Use Supabase Row Level Security (RLS) wherever applicable.
- Restrict the initial administrator account to the exact specified email.

## 5. Student interface

### 5.1 Initial dashboard

After login, display the student’s name or email and a simple action area.

The application must enforce the following rule at all times:

**One student may have no more than one active equipment issue at a time.**

If the student has no active issue, display only:

- Issue Equipment

If the student has an active issue, display only:

- Return Equipment

Do not allow a student to issue another item until the previous issue has been resolved through the application’s return process.

Enforce this restriction in the database and server-side transaction logic, not just the user interface. Multiple tabs, repeated clicks, multiple devices, and simultaneous requests must not bypass the rule.

### 5.2 Issue equipment

When the student clicks Issue Equipment, implement the following sequence.

**Step 1: Select a sport**

Display a clean list or searchable grid of sports.

Include these initial sports:
- Badminton
- Cricket
- Football
- Volleyball
- Basketball
- Tennis
- Pickleball
- Padel
- Squash
- Table Tennis
- Throwball
- Other sports, configurable by the administrator

The sports list must be editable through the database or administrator configuration without requiring code changes.

**Step 2: Select equipment**

After a sport is selected, show only the equipment configured for that sport.

Examples:
- Badminton → Racket
- Cricket → Bat, Ball, Stumps, and other configured equipment
- Basketball → Basketball
- Volleyball → Volleyball
- Tennis → Racket and Balls
- Pickleball → Paddle and Balls
- Padel → Racket and Balls
- Squash → Racket and Balls

These are examples, not assumptions about the university’s actual inventory. Allow administrators to configure the actual sports, equipment types, item quantities, and inventory numbers.

For badminton, racket must be an available equipment type.

**Step 3: Select a specific physical item**

Display only items currently available for issue.

Every individually tracked item must have:
- A unique inventory ID.
- A sport.
- An equipment type.
- A human-readable equipment number.
- An availability status.

Allow the student to select the number from a dropdown or searchable list. Manual entry may be supported, but it must be validated against the actual inventory.

Never allow two students to issue the same physical item simultaneously.

An item that is issued, overdue, damaged, missing, retired, or awaiting inspection must not be available for selection.

**Step 4: Display the liability disclaimer**

Before the final issue action, display this disclaimer prominently:

> “I acknowledge that I am responsible for the equipment issued under my name. If the equipment is damaged or is not returned to the sports equipment room by 11:00 PM IST on {DATE}, I may be liable for a fine or other action as deemed appropriate by the Department of Sports, FLAME University.”

Replace `{DATE}` dynamically with the correct local calendar date of issue, formatted clearly (for example, 25 October 2026).

Use the actual current date in Asia/Kolkata, not the UTC date or a date calculated from the student’s device clock.

Require the student to acknowledge the disclaimer before proceeding.

**Step 5: Confirm issue**

Display a final button:
**Issue Equipment**

When clicked:
1. Validate the authenticated student’s identity.
2. Confirm that the student has no active issue.
3. Confirm that the selected inventory item is available.
4. Atomically create the issue record and update the item’s status.
5. Record the issue timestamp in UTC and display it in IST.
6. Record the student’s verified email, sport, equipment type, equipment number, due date, and issue status.
7. Save an audit event.
8. Queue an issue confirmation email.
9. Display a success screen.

Prevent duplicate submissions and race conditions.
The issue record must remain in the historical database after the equipment has been returned.

## 6. Issue confirmation email

Send an automated email immediately after a successful issue.

**Subject:** Equipment Issued — FLAME Sports Equipment Room

**Include:**
- Student’s name, if available.
- Student’s verified FLAME email.
- Sport.
- Equipment type.
- Equipment number.
- Issue date.
- Issue time in IST.
- Return deadline: 11:00 PM IST on the issue date.
- Liability disclaimer.
- Instructions to return the equipment before the deadline.

Use a clean, professional, mobile-friendly email template.

Only send the email after the issue transaction succeeds. If email delivery fails, retain the issue record and log the failure for retry. Do not incorrectly tell the student that issuance failed because the email could not be delivered.

## 7. Student return workflow

When a student with an active issue clicks Return Equipment, automatically retrieve their current active issue from the database.

Display the specific equipment currently recorded against their account.

Example:
**Return Badminton Racket #9**

Show:
- Sport.
- Equipment type.
- Equipment number.
- Issue date and time.
- Return deadline.

Students must not be able to return equipment belonging to another student.

### 7.1 Return acknowledgement

Before submitting a return, require the student to tick this checkbox:

> “I confirm that I am returning the same equipment issued under my name and that I have checked its condition. I acknowledge that any damage or discrepancy may be reviewed by the Department of Sports.”

The acknowledgement must be mandatory.

Provide a separate damage-disclosure path so students are not forced to certify that equipment is undamaged when they know damage exists.

### 7.2 Return photograph

Implement direct camera capture using the device camera where supported.

Display:
**“Take a Photo of the Equipment in the Return Area”**

Requirements:
- Request camera permission when the student chooses to take a photograph.
- Open the camera, preferably the rear-facing camera on mobile devices.
- Allow the student to capture a new image and preview it.
- Allow retaking the photograph.
- Do not make the normal workflow depend on uploading an existing image from the photo gallery.
- Upload the captured image to a private Supabase Storage bucket.
- Associate the image with the issue record, authenticated student, and return event.
- Store the capture or submission timestamp and relevant metadata.
- Restrict access to authorised administrators and the relevant student according to the access policy.
- Use signed URLs or another secure mechanism to display private images.
- Validate image size and type and handle upload failures gracefully.
- Never expose private evidence through public storage URLs.

If camera access is unavailable, provide a clear fallback message and an administrator-configurable exception policy. Do not claim that a photograph has been verified when no photograph exists.

*Important:* A photograph documents the return process but cannot independently prove that the equipment was physically placed back on its designated shelf.

### 7.3 Complete the student return submission

Display the final button:
**Return Equipment**

When clicked:
1. Verify that the student has an active issue.
2. Verify the mandatory acknowledgement.
3. Validate and upload the return photograph according to the configured policy.
4. Record the student’s return submission.
5. Record the return-submission timestamp in UTC and display it in IST.
6. Store the acknowledgement and photograph reference.
7. Record an audit event.
8. Send a return-submission confirmation email.
9. Display a success message.

The system must distinguish a student’s return submission from the equipment room handler’s physical confirmation.

After a return submission, the student should not be able to issue another item while physical verification is still pending. The application must make the pending status clear.

Once an administrator confirms the physical return, the student’s active issue is cleared and the Issue Equipment option becomes available again.

Handle duplicate clicks safely. A completed return must never be processed twice.

### 7.4 Return confirmation email

**Subject:** Return Submitted — FLAME Sports Equipment Room

Include the sport, equipment type, equipment number, issue timestamp, student return-submission timestamp, and confirmation that the submission has been recorded.

Clearly state that physical verification by the equipment room handler may still be pending.
If the equipment is reported damaged, state that the item is pending administrator review.

## 8. Administrator dashboard

Create a separate, secure administrator dashboard for `asmi.malushte@flame.edu.in`.

The dashboard must be easy for equipment room handlers to use during busy periods.

### 8.1 Dashboard overview

Show summary cards for:
- Total inventory items.
- Available items.
- Currently issued items.
- Pending physical return confirmations.
- Overdue items.
- Items reported damaged.
- Items marked missing or awaiting inspection.

Calculate all figures from actual database records.

### 8.2 Equipment issue table

Display all current and historical issues, with the most recently issued items at the top by default.

Include these columns:
- Student name, where available.
- Student FLAME email.
- Sport.
- Equipment type.
- Equipment number.
- Issue date.
- Issue time.
- Return deadline.
- Student return-submission status.
- Physical verification status.
- Current issue status.
- Administrative actions.

Provide filters for:
- Sport.
- Equipment type.
- Equipment number.
- Student email.
- Issue date or date range.
- Status: issued, return submitted, awaiting confirmation, returned, overdue, damaged, or other relevant states.

Include a search bar, sortable columns, pagination, and clear empty states.
Use server-side filtering and pagination where appropriate.

### 8.3 Three mandatory administrative actions for every equipment issue

For every currently outstanding equipment issue, display these three clearly visible actions directly in the issue table:

1. Confirm Return
2. Not Returned
3. Report Damage

These actions must be available against the specific equipment issue so handlers can manage equipment without navigating through multiple pages.

All three actions must be protected by server-side administrator permissions.

**Action 1: Confirm Return**

Use this action when the equipment room handler physically verifies that the equipment has been returned.

When clicked:
1. Open a confirmation panel or modal.
2. Display the student name/email, sport, equipment type, equipment number, original issue timestamp, student return-submission timestamp if available, and any student-submitted return photograph.
3. Ask the administrator to confirm physical receipt.
4. Record the administrator’s identity and exact confirmation timestamp.
5. Mark the issue as physically confirmed returned.
6. Clear the student’s active issue.
7. Update the inventory item to available only if it is not damaged, missing, retired, or awaiting inspection.
8. Record the action in the audit log.
9. Update the dashboard immediately.

The system must support two situations:
*   **Situation A: Student submitted a return online**
    The administrator reviews the submission and confirms that the equipment has physically been received. Preserve both the original student-submission timestamp and the administrator-confirmation timestamp.
*   **Situation B: Student did not submit a return online**
    Allow the administrator to record a physically verified, manually confirmed return. Preserve the original issue record and record that the return was entered by an administrator.

Do not fabricate a student-submission timestamp if no student submission occurred.
If the item has been returned but appears damaged, the administrator must not make it available automatically. Record the return and flag the item for inspection or damage reporting.
Once a return is confirmed, do not allow the same return to be confirmed repeatedly. Show the completed status and relevant history instead.

**Action 2: Not Returned**

Use this action when the administrator checks the equipment room and the equipment has not physically been received.

When clicked:
1. Open a confirmation panel or modal.
2. Display the relevant issue and student details.
3. Ask the administrator to confirm that the equipment has not been received.
4. Provide an optional notes field.
5. Record the administrator’s identity, confirmation timestamp, and notes.
6. Keep the issue active and the item unavailable.
7. Preserve or update the overdue status as appropriate.
8. Record the action in the audit log.

This action must not:
- Mark the equipment as returned.
- Release the student’s active issue.
- Make the inventory item available.
- Delete or overwrite a student return submission.
- Send duplicate overdue emails when the relevant notification has already been sent.

If the student previously submitted a return online but the administrator confirms that the equipment has not physically been received, display a prominent discrepancy warning.

Preserve the original student return submission and its associated evidence. Flag the case for follow-up rather than silently overwriting the record.
The administrator must be able to view the history of repeated verification attempts.

**Action 3: Report Damage**

Use this action when the administrator identifies damage to an item.

When clicked:
1. Open a damage-report form.
2. Display the equipment details and last recorded student issuer.
3. Show the original issue date and time.
4. Show the date and time the damage was identified.
5. Require a damage description.
6. Allow an optional supporting photograph.
7. Require administrator confirmation before submission.

On confirmation:
- Create a damage report linked to the specific physical inventory item.
- Link the report to the relevant issue record.
- Record the last issuer, where applicable.
- Record the reporting administrator.
- Record the report timestamp.
- Change the inventory status to damaged or pending inspection.
- Prevent the item from being issued again until an authorised administrator explicitly clears it.
- Queue a damage-report email to the last recorded student issuer, where applicable.
- Add an audit event.
- Display the report in the damage history.

Do not automatically conclude that the last issuer caused the damage. The notification must inform the student of the reported damage and request follow-up with the Department of Sports.

If the item has already been physically returned, retain the return record and link the damage report to it. If the item has not been returned, keep the issue outstanding and record the damage report without incorrectly marking the item as received.

If no previous issuer exists, allow the administrator to record the damage but do not invent an email recipient.

### 8.4 Administrative status and action rules

The three actions must appear for every currently outstanding issue, including overdue items.

Use clear labels or status indicators to distinguish:
- Issued — not yet returned.
- Return submitted — awaiting physical verification.
- Not returned — physically checked and not received.
- Overdue — return deadline missed.
- Returned — physically confirmed.
- Damaged — unavailable pending inspection.
- Missing — not located.
- Retired — permanently removed from circulation.

A status may have more than one relevant attribute. For example, an overdue item can also have a pending return submission or damage report.
Use a consistent status model that does not allow contradictory states.

Every administrative action must:
- Require a confirmation step.
- Be validated on the server.
- Be safe against repeated clicks and concurrent requests.
- Preserve the original issue and return history.
- Record the actor and timestamp.
- Update the inventory and issue records consistently.
- Provide clear success or failure feedback.

### 8.5 Inventory management

Create an inventory section that lets the administrator:
- View all physical equipment items.
- Filter by sport and equipment type.
- View unique item numbers and current statuses.
- Add new equipment.
- Edit equipment metadata.
- Retire equipment from circulation.
- Mark equipment as missing.
- Mark equipment as damaged.
- Restore equipment to available status after authorised inspection.
- View the current or most recent issue record.
- View complete issue, return, verification, and damage history.

Every physical item must have a unique inventory identifier.
Prevent duplicate inventory numbers within the relevant inventory namespace.
Do not permanently delete historical issue records when equipment is edited or retired.

### 8.6 Damage-report email

**Subject:** Action Required: Equipment Damage Report — FLAME Sports

Use this template:

> “Dear Student,
>
> The Department of Sports has recorded a damage report concerning the following equipment previously issued under your FLAME email account.
> 
> Sport: {SPORT}
> Equipment: {EQUIPMENT}
> Equipment Number: {EQUIPMENT_NUMBER}
> Original Issue Date and Time: {ISSUE_TIMESTAMP}
> Damage Reported On: {REPORT_TIMESTAMP}
> 
> You are requested to contact or visit the FLAME University sports equipment room and coordinate with the Department of Sports regarding this matter.
> 
> The report will be reviewed by the Department of Sports, which will determine any further action in accordance with applicable university policies.
> 
> Regards,
> 
> Department of Sports
> FLAME University”

Do not automatically impose a fine or claim that the student caused the damage solely because they were the last recorded issuer.

### 8.7 Administrative audit trail

Record important events, including:
- Successful issue.
- Student return submission.
- Physical return confirmation.
- Not Returned confirmation.
- Damage report creation.
- Inventory status changes.
- Missing equipment reports.
- Administrative changes.
- Email delivery failures.
- Relevant manual overrides.

Each audit event must include the actor, event type, associated equipment or issue ID, timestamp, and relevant structured metadata.
Audit records must be protected against student modification and ordinary administrator deletion.

## 9. Automated email reminders and overdue handling

Implement genuine server-side scheduled jobs. They must run without requiring the student or administrator to open the application.

All deadlines use Asia/Kolkata (IST), not the user’s browser time zone.

### 9.1 Reminder at 10:00 PM IST

Every day at 10:00 PM IST, find all issues that:
- Are still outstanding.
- Have a return deadline on the current IST calendar date.
- Have not already received the applicable reminder.

An issue remains outstanding until physical return is confirmed, even if the student has submitted a return that is awaiting verification.
Send the reminder only when the equipment has not already been physically confirmed returned.

**Subject:** Reminder: Please Return Your Sports Equipment by 11 PM

**Email:**
> “Dear Student,
> 
> This is a reminder that the following sports equipment is currently recorded as outstanding under your name and must be returned to the FLAME University sports equipment room by 11:00 PM IST tonight.
> 
> Sport: {SPORT}
> Equipment: {EQUIPMENT}
> Equipment Number: {EQUIPMENT_NUMBER}
> Issue Date: {ISSUE_DATE}
> Return Deadline: 11:00 PM IST today
> 
> Please return the equipment before the deadline. If you have already submitted a return through the website, please ensure the equipment has been physically received and confirmed by the equipment room handler.
> 
> Regards,
> 
> Department of Sports
> FLAME University”

Record the notification attempt and delivery status.

### 9.2 Overdue notification at 11:00 PM IST

Every day at 11:00 PM IST, find all issues that:
- Have a return deadline at or before the current time.
- Have not been physically confirmed returned.
- Have not already received the applicable overdue notification.

Send the following email.

**Subject:** Overdue Equipment: Return Deadline Missed — FLAME Sports

**Email:**
> “Dear Student,
> 
> Our records indicate that the following sports equipment has not been recorded as physically returned by the 11:00 PM IST deadline.
> 
> Sport: {SPORT}
> Equipment: {EQUIPMENT}
> Equipment Number: {EQUIPMENT_NUMBER}
> Issue Date: {ISSUE_DATE}
> Return Deadline: 11:00 PM IST today
> 
> The matter will be referred to the Department of Sports for review. You may be liable for a fine or other action as deemed appropriate under applicable university policies. You will receive further communication from the Department of Sports or Sports Committee regarding any applicable action.
> 
> If you have already returned the equipment but the return has not been recorded correctly, please contact the equipment room immediately.
> 
> Regards,
> 
> Department of Sports
> FLAME University”

Update the issue status to overdue when appropriate, without losing the fact that the item remains outstanding.
Do not automatically mark equipment as returned because an email has been sent.

### 9.3 Scheduling requirements

Vercel Cron schedules must account for UTC scheduling.
For IST-based daily deadlines:
- 10:00 PM IST = 16:30 UTC.
- 11:00 PM IST = 17:30 UTC.

Configure the scheduled jobs accordingly and document the schedules in the README.
If the selected Vercel plan or deployment configuration does not support the required scheduling frequency or reliability, implement a compatible alternative and explain the operational trade-offs.
Scheduled handlers must be protected against unauthorised invocation.

Ensure:
- Jobs are idempotent.
- Emails are not repeatedly sent for the same event.
- Reminder and overdue notifications are tracked separately.
- Failed deliveries can be retried.
- Queries use server-side timestamps and explicit IST date boundaries.
- The system works when no user is logged in.
- Failures are logged and observable.
- Manual re-execution does not corrupt records or send duplicate emails.

Use a durable notification log or outbox pattern to improve reliability.

## 10. Database design

Design and implement a relational schema with foreign keys, indexes, uniqueness constraints, timestamps, and Row Level Security.

At minimum, implement these entities:

**Users**
- ID.
- Verified email.
- Display name, where available.
- Role.
- Creation timestamp.
- Last login timestamp.

**Sports**
- ID.
- Name.
- Active/inactive status.

**Equipment types**
- ID.
- Sport ID.
- Name.
- Active/inactive status.

**Inventory items**
- ID.
- Sport ID.
- Equipment type ID.
- Equipment number.
- Current inventory status.
- Creation timestamp.
- Last updated timestamp.

**Equipment issues**
- ID.
- User ID.
- Inventory item ID.
- Issue timestamp.
- Due timestamp.
- Student return-submission timestamp, where applicable.
- Physical return-confirmation timestamp, where applicable.
- Return-confirming administrator ID, where applicable.
- Return acknowledgement.
- Return photograph reference.
- Current lifecycle status.
- Created and updated timestamps.

**Return verification events**
Maintain a history of physical verification attempts.
Fields should include:
- ID.
- Associated issue ID.
- Administrator ID.
- Verification outcome: confirmed returned or not returned.
- Verification timestamp.
- Optional notes.
- Related photograph or evidence reference, where applicable.

Preserve previous verification attempts rather than overwriting them.

**Damage reports**
- ID.
- Inventory item ID.
- Associated issue ID, where applicable.
- Last issuer reference, where applicable.
- Reporting administrator ID.
- Description.
- Supporting photograph reference, where applicable.
- Report timestamp.
- Resolution status.
- Resolution notes.

**Notification log**
- ID.
- Related issue ID.
- Recipient.
- Notification type.
- Scheduled time.
- Attempt time.
- Delivery status.
- Provider message ID, where available.
- Retry metadata.

**Audit log**
- ID.
- Actor ID.
- Event type.
- Associated record identifiers.
- Timestamp.
- Structured event metadata.

Additional tables may be introduced where needed.

Implement:
- One active issue per student.
- One active issue per physical inventory item.
- Database-level constraints using partial unique indexes or equivalent mechanisms where appropriate.
- Transactions to keep issue, inventory, return, and verification records consistent.
- Secure storage policies for private photographs.
- Explicit lifecycle rules preventing unavailable items from being reissued.

An item must not become available while it is still outstanding, damaged, missing, retired, or awaiting inspection.
Define a clear status model that distinguishes student submissions from administrator-confirmed physical returns.

## 11. QR-code entry point

Prepare the application for a permanent QR code to be placed inside the sports equipment room.
The QR code should point to the production Vercel URL.

The student experience should be:
1. Scan the QR code.
2. Open the website on a phone.
3. Sign in with a FLAME Google account.
4. See the correct action based on the student’s current issue and return status.
5. Complete the issue or return process.

Use a stable production URL configurable through environment variables.
Document how to generate and print the QR code after deployment. Students must not need to install a separate app.

## 12. Testing and acceptance criteria

Write and run unit, integration, and end-to-end tests where feasible.

**Authentication**
- A verified `@flame.edu.in` account can sign in.
- An external Gmail account is rejected.
- A student cannot impersonate another student.
- Only the configured administrator receives admin permissions.
- Students cannot invoke administrator actions directly through API requests.

**Issuing equipment**
- A student can issue an available racket.
- Two students cannot issue the same racket simultaneously.
- A student cannot issue a second item while a previous issue remains active.
- A failed transaction does not leave inventory in an inconsistent state.
- The issue email is queued only after successful issuance.

**Student return submission**
- The student sees their actual outstanding item.
- Another student’s equipment cannot be returned by manipulating a request.
- The acknowledgement is mandatory.
- Photograph capture and upload work according to the configured policy.
- A successful submission records the correct timestamps.
- A student cannot issue another item while physical return confirmation remains pending.
- Duplicate return requests are safe.

**Administrator actions**
- All three actions appear for every outstanding issue.
- Confirm Return records the administrator and timestamp.
- Confirm Return clears the active issue only after successful verification.
- Not Returned preserves the outstanding issue and inventory unavailability.
- A Not Returned action does not erase student-submitted evidence.
- Report Damage creates a linked damage record and sends the appropriate notification.
- Damaged items cannot be reissued until cleared.
- Every action is recorded in the audit trail.
- Duplicate actions do not create contradictory states.

**Automated notifications**
- The 10 PM reminder targets eligible outstanding issues.
- The 11 PM email targets eligible overdue issues.
- Physically confirmed returns do not receive inappropriate overdue emails.
- Repeated cron invocations do not send duplicate notifications.
- Email failures are logged and retried.
- Notifications do not depend on a user having the application open.

**Administration**
- Inventory filters work.
- Newest issues appear first by default.
- The dashboard distinguishes student submissions from physical confirmations.
- Damage reports are sent to the correct last issuer where applicable.
- Students cannot access administrative data or actions.

Use mocked services for automated tests when real external credentials are unavailable. Clearly distinguish passing automated tests from integrations that still require live credentials.

## 13. Deployment and project completion

Create a complete, organised project with reusable components, clean naming, sensible error handling, and maintainable code.

Include:
- Complete frontend and backend.
- Supabase SQL migrations.
- Database indexes and access policies.
- Sample inventory seed data.
- Google OAuth configuration instructions.
- Resend setup instructions.
- Private storage bucket configuration.
- Vercel Cron configuration.
- Environment-variable example file without real secrets.
- README with local development instructions.
- Vercel deployment instructions.
- Production security checklist.
- Test instructions.
- Troubleshooting guidance.
- Instructions for adding sports, equipment types, and numbered inventory items.
- Instructions for securely changing the administrator account.

Before completion, run the available build, lint, type-checking, and automated tests. Fix all errors that can be resolved within the project.

Deploy to Vercel if the necessary account access and credentials are available. Otherwise, leave the project deployment-ready and provide the exact steps needed to complete deployment.

Do not claim that Google OAuth, emails, scheduled jobs, storage, or production deployment are operational unless the relevant integrations have actually been configured and tested.

## 14. Implementation priorities

Build in the following order:
1. Authentication and secure role-based access.
2. Database schema, inventory management, and status model.
3. Student issue workflow.
4. Student return submission and camera capture.
5. Administrator dashboard.
6. The three administrative actions: Confirm Return, Not Returned, and Report Damage.
7. Physical return verification and audit trail.
8. Issue, return, and damage confirmation emails.
9. Scheduled 10 PM reminders and 11 PM overdue emails.
10. Edge cases, concurrency protection, and tests.
11. Responsive design polish and production deployment.

## 15. Final instructions

Start by inspecting the project workspace and identifying the required setup. Then implement the actual application.

Do not stop after generating a plan, wireframe, landing page, or mock dashboard.
If a required service needs credentials, continue building everything else and clearly identify the remaining configuration steps.
Prioritise correctness, security, reliability, and simplicity over unnecessary features.

The final application must function as a genuine digital sports equipment room for FLAME University, accessible through a QR code, with a minimal student interface and a secure administrative backend.

**The most important operational principle:** The student records their return submission; the administrator verifies physical receipt. The three administrator actions — Confirm Return, Not Returned, and Report Damage — must maintain a reliable, auditable record of what actually happened to each piece of equipment.