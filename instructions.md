# VisaSync - AI Implementation Instructions

## Purpose

Build VisaSync as a secure, multi-portal visa service management platform. Work must be delivered in independent phases. Every phase must be runnable, tested, documented, and safe to deploy before the next phase starts.

The system must support a central **Main Admin / Super Admin** area and an **Agent Portal** that the Super Admin can create, enable, disable, and configure. The Agent Portal is a role-based workspace in the same application, not a separate unmanaged system.

## Recommended Technology Stack

### Frontend
- React with TypeScript
- Vite
- React Router
- Tailwind CSS
- A shared component library such as Radix UI or shadcn/ui
- One responsive application with route groups for Admin, Agent, Staff, and Customer portals

### Backend
- NestJS with TypeScript
- PostgreSQL
- Prisma ORM
- Redis with BullMQ for queues and scheduled workers
- S3-compatible object storage for documents and images
- Docker and Docker Compose for local development
- Playwright workers for permitted, monitored browser-assisted workflows
- Provider adapters for face verification (AWS Rekognition, Azure AI Vision, Google Cloud Vision, or a self-hosted model)
- Sentry, structured logs, health checks, and uptime monitoring

### Portal Routing

Use one frontend and enforce access on both the frontend and backend:

- `/admin/*` — Main Admin and Super Admin
- `/agent/*` — Agent Portal
- `/staff/*` — Staff / Operator Portal
- `/customer/*` — Customer Portal
- `/api/*` — authenticated backend APIs

The Super Admin can create an agent account, assign an organization/branch, assign routes and customers, enable or disable the Agent Portal, and revoke access at any time.

## Global Development Rules

1. Inspect the existing code and database before changing a module.
2. Keep all sensitive values in environment variables or a secrets manager.
3. Enforce authorization in backend services, not only in UI buttons.
4. Add audit events for authentication, data access, configuration changes, approvals, payments, and bookings.
5. Use idempotency keys for booking, payment, and notification jobs.
6. Never expose raw biometric images or face embeddings to agents or customers.
7. Do not implement CAPTCHA bypass, credential sharing, proxy evasion, or anti-bot circumvention.
8. External-site automation must be limited to lawful, contractually permitted, human-supervised workflows. Use mock providers and recorded fixtures for tests.
9. Add unit, integration, and role-access tests for every phase.
10. Run lint, typecheck, tests, and a production build before marking a phase complete.
11. Update the relevant documentation and migration files with each phase.
12. Keep the UI mobile-friendly because customers and agents may use phones.

## Phase 0 - Repository, Standards, and Infrastructure

### Build
- Create the React/Vite/NestJS project structure.
- Configure TypeScript strict mode, ESLint, Prettier, environment loading, and path aliases.
- Add PostgreSQL, Redis, and S3-compatible storage through Docker Compose.
- Add development, test, staging, and production environment examples.
- Add health-check endpoints and basic API documentation.
- Add CI checks for lint, typecheck, tests, and production build.

### Acceptance Criteria
- A fresh developer can run the application with documented commands.
- Frontend and backend start successfully.
- Database migrations run successfully.
- Lint, typecheck, tests, and production build pass.

## Phase 1 - Authentication, RBAC, and Audit Foundation

### Build
- User registration, login, logout, password reset, and optional OTP/social login.
- Two-factor authentication for privileged roles.
- Super Admin seed account for local development only.
- Organization, branch, role, permission, and user-organization membership models.
- Role-based and permission-based route guards.
- Session/device management, account lockout, and suspicious-login alerts.
- Append-only audit-log foundation.

### Acceptance Criteria
- Super Admin can access all admin routes.
- Agent can access only assigned organization/branch data.
- Customer can access only their own profile and applications.
- Unauthorized API requests return a consistent error response.
- Login, role changes, and permission changes create audit events.

## Phase 2 - Main Admin and Agent Portal Provisioning

### Build
- Main Admin dashboard shell, navigation, and organization management.
- Super Admin screens to create, invite, approve, suspend, and remove agents.
- Assign agents to organizations, branches, routes, service packages, and customer groups.
- Enable, disable, or restrict the Agent Portal per agent or organization.
- Agent dashboard with assigned workload, customers, applications, and notifications.
- Agent profile and security settings.
- Customer portal shell with registration and profile pages.

### Acceptance Criteria
- The Super Admin can create an Agent Portal workspace without code changes.
- A newly invited agent can accept an invitation and log in.
- Disabling an agent immediately prevents access to protected APIs.
- Agents cannot view or search another agent's customers or applications.
- The Super Admin can reassign customers and routes with an audit trail.

## Phase 3 - Customer, Application, and Document Workflows

### Build
- Customer profile, passport details, contact details, and family/group support.
- Application creation and configurable status workflow.
- Route-specific document checklists.
- Secure document upload, validation, versioning, approval, rejection, and replacement.
- Agent assignment, reassignment, internal notes, and customer-visible updates.
- SLA/deadline tracking and missing-action alerts.

### Acceptance Criteria
- A complete application cannot advance without required documents.
- Agents can work only on assigned applications.
- Customers can see required actions and current status.
- Document access is authorized, time-limited, and audited.
- Reassignment and status changes preserve a complete timeline.

## Phase 4 - Face Verification and Manual Review

### Build
- Customer consent screen before camera capture.
- Live face capture, liveness check, and face-to-passport matching through a provider adapter.
- Verification states, retry limits, expiry, and re-verification.
- Manual-review queue for uncertain or failed results.
- Store only verification metadata, result, score, consent, and audit references; restrict raw biometric data.
- Admin-configurable provider and fallback rules.

### Acceptance Criteria
- Verification can be tested with a mock provider.
- Failed or expired verification blocks booking eligibility.
- Agents see only the verification result, not raw biometric data.
- Manual reviewers can approve or reject with a reason.
- Every verification event is auditable and retention rules are configurable.

## Phase 5 - Routes, Centers, and Slot Monitoring

### Build
- Country, visa category, route, visa center, service package, pricing, and checklist configuration.
- Preferred date range, applicant count, and center preferences.
- Controlled slot-monitoring jobs with route-specific schedules and rate limits.
- Availability dashboard and historical availability records.
- Duplicate detection, pause/resume controls, and alert rules.
- Monitoring status and worker-health views for admins.

### Acceptance Criteria
- Admins can configure routes without code changes.
- Agents see only routes assigned to them.
- Monitoring jobs are idempotent and do not create duplicate availability records.
- Jobs can be paused globally or per route.
- Alerts include delivery status and retry history.

## Phase 6 - Booking Requests, Queue, and Human-Supervised Execution

### Build
- Eligibility validation for documents, payment, consent, and face verification.
- Booking-request creation with priority, date range, center, and applicant group.
- Agent-requested and admin-approved booking modes.
- BullMQ booking queue, retries, dead-letter queue, and operator assignment.
- Appointment confirmation, reference number, status, and failure reasons.
- Duplicate-booking prevention and idempotency keys.
- Human-supervised or browser-assisted execution only where permitted.

### Acceptance Criteria
- Ineligible applications cannot enter the booking queue.
- Duplicate requests for the same applicant/date window are rejected or merged safely.
- Failed jobs can be inspected, retried, reassigned, or cancelled by authorized staff.
- Every booking attempt and outcome has an audit record.
- No automation feature bypasses CAPTCHA, login controls, or site security.

## Phase 7 - Finance, Payments, and Communications

### Build
- Service packages, invoices, payment links, partial payments, balances, and due dates.
- Payment gateway adapter and manual-payment reconciliation.
- Agent wallet, deposits, commissions, deductions, and revenue ledger.
- Refund request, approval, and refund audit trail.
- Email, SMS, WhatsApp, and Telegram provider adapters.
- Template management, notification center, delivery status, and opt-out handling.

### Acceptance Criteria
- Payment webhooks are verified and idempotent.
- Customer, agent, and admin ledgers reconcile without duplicate transactions.
- Only authorized finance users can approve refunds or change commissions.
- Failed notifications are retried and visible in the audit trail.
- Invoices and receipts can be downloaded securely.

## Phase 8 - Reports, Compliance, and Security Hardening

### Build
- Admin, agent, branch, route, center, application, slot, revenue, commission, and SLA reports.
- CSV/Excel export with permission checks.
- Field masking for passport and financial data.
- Data retention, export, deletion, backup, and restore procedures.
- Security review for authentication, authorization, file uploads, webhooks, and background jobs.
- Maintenance mode and emergency-stop controls.

### Acceptance Criteria
- Reports return only data permitted for the current role and organization.
- Sensitive fields are masked in logs, exports, and support views.
- Backup and restore procedures are documented and tested.
- Security-critical actions require appropriate approval and audit logging.
- The application has a documented incident-response path.

## Phase 9 - Production Deployment and Scale

### Build
- Docker images, environment-specific configuration, database migrations, and zero-downtime deployment process.
- Separate web, API, worker, Redis, PostgreSQL, and object-storage configuration.
- Horizontal scaling for API and workers.
- Rate limits, circuit breakers, timeouts, and back-pressure for external providers.
- Monitoring dashboards, alerting, log correlation, and runbooks.
- Staging environment with realistic anonymized data.

### Acceptance Criteria
- Production deployment can be repeated from CI/CD.
- Worker failures do not corrupt application or booking state.
- Health checks and alerts identify web, API, queue, database, and provider failures.
- Rollback and disaster-recovery steps are tested.
- Load testing covers expected admin, agent, customer, and worker traffic.

## Phase 10 - Final QA and Handover

### Build
- End-to-end tests for Super Admin, Agent, Staff, and Customer journeys.
- Accessibility, responsive-layout, browser, and mobile-camera checks.
- Data migration and seed-data documentation.
- Admin and agent user guides.
- Security, privacy, retention, and legal/compliance review.
- Final backlog of optional enhancements.

### Acceptance Criteria
- All critical journeys pass end to end.
- Lint, typecheck, unit tests, integration tests, and production build pass.
- No critical or high-severity security issue remains open.
- The Super Admin can provision and operate an Agent Portal without developer assistance.
- The system is ready for controlled pilot deployment.
