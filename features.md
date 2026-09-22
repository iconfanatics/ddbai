# VisaSync - Product Features & Options

VisaSync will be a multi-portal visa service management platform with a central administration layer, agent workspaces, customer self-service, and controlled slot-booking operations.

## 1. Portals & User Roles

### Main Admin Portal
- Complete control over the entire platform
- Create, enable, disable, and configure Agent Portal workspaces
- Organization, branch, agent, staff, and customer management
- Global dashboard, revenue, application, and slot-booking overview
- Assign clients, routes, visa centers, and workloads to agents
- Approve, reject, reassign, or escalate applications
- Configure pricing, commissions, payment rules, and notifications
- View all agent activity and financial ledgers
- Manage system settings, integrations, security, and audit logs

### Agent Portal (Provisioned by Super Admin)
- Agent-specific dashboard and workload queue
- Create and manage only assigned or permitted clients
- Create applications, upload documents, and track statuses
- Request face verification and document review
- View available routes, centers, and slot-monitoring results
- Submit booking requests for approval or execution
- Communicate with assigned customers
- View invoices, payments, commissions, and wallet balance where enabled
- Cannot access other agents' data unless explicitly delegated

### Staff / Operator Portal
- Verification and document-review queue
- Manual review of face-verification and document results
- Prepare application data and booking requests
- Execute human-assisted or approved booking workflows
- Add internal notes and exception reasons
- Limited access based on assigned branch, route, or workload

### Customer Portal
- Registration, login, password reset, and optional two-factor authentication
- Personal and passport profile management
- Face verification and liveness check
- Document upload and application-status tracking
- Select visa route, destination, center, and preferred date range
- Receive slot alerts and booking confirmations
- Make payments and download invoices/receipts
- View consent, privacy, and service terms

### Planned Roles
- Super Admin
- Organization Admin
- Branch Admin
- Agent
- Staff / Operator
- Accountant
- Customer
- Read-only Viewer / Auditor

## 2. Authentication, Authorization & Organization Management

- Email/password, OTP, and social-login options
- Two-factor authentication for admins, agents, and staff
- Role-based access control (RBAC)
- Permission-level access control for every module
- Multi-organization and multi-branch support
- Super Admin can create, enable, disable, and configure an Agent Portal for any approved agent or organization
- Agent invitation, approval, suspension, and removal
- Agent-to-customer and agent-to-route assignment
- Session management, device history, and forced logout
- Account lockout and suspicious-login alerts
- Password and security-policy configuration

## 3. Dashboard & Analytics

### Main Admin Dashboard
- Total customers, applications, agents, branches, and revenue
- New, pending, approved, booked, cancelled, failed, and rejected applications
- Slot availability and booking-success trends
- Agent performance, conversion rate, and pending workload
- Revenue by route, center, agent, branch, and service package
- Payment, refund, and outstanding-balance summary
- Recent activity, exceptions, and system alerts

### Agent Dashboard
- Assigned applications and customer count
- Pending verification, document, payment, and booking tasks
- Upcoming appointments and recent notifications
- Agent revenue, commission, and wallet summary
- Route-wise slot availability and alerts

### Customer Dashboard
- Current application status
- Required actions and missing documents
- Face-verification status
- Slot alerts and appointment details
- Payment status and invoice history

## 4. Client / Customer Management

- Customer profile and contact details
- Passport, nationality, residence, and travel-history fields
- Family/group application support
- Customer tags, source, agent, branch, and referral tracking
- Duplicate-customer detection
- Customer notes, communication history, and document checklist
- Customer import/export with permission controls
- Customer consent and data-retention records

## 5. Application & Workflow Management

- Create one or multiple applications per customer
- Configurable workflow:
  `Draft → Documents Pending → Verification Pending → Ready → Submitted → Processing → Booked → Completed`
- Exception states:
  `Cancelled`, `Failed`, `Rejected`, `On Hold`, `Manual Review Required`
- Route-specific and visa-type-specific checklists
- Assign application to an agent, staff member, or branch
- Reassign work with reason and history
- Internal notes and customer-visible status updates
- SLA/deadline tracking and overdue alerts
- Bulk status updates where permitted
- Full application timeline and version history

## 6. Route, Visa Center & Service Configuration

- Country, destination, visa category, subcategory, and service configuration
- Visa center and appointment-location management
- Route-wise required documents and eligibility rules
- Preferred date range, applicant count, and center preferences
- Route-specific pricing and service packages
- Center-wise holiday, capacity, and operating-hour configuration
- Route activation/deactivation by admin
- Agent-specific route permissions
- Configuration history and change approval

## 7. Face Verification & Identity Validation

- Customer consent before capturing face data
- Live face capture from camera or mobile browser
- Liveness/spoof detection
- Face-to-passport photo matching
- Optional document-number / passport-data cross-check
- Verification statuses:
  `Pending`, `Passed`, `Failed`, `Manual Review`, `Expired`
- Retry limit and re-verification workflow
- Manual review queue for uncertain results
- Face-verification provider abstraction:
  - AWS Rekognition
  - Azure AI Vision
  - Google Cloud Vision
  - Local/self-hosted model option
- Provider-level configuration and fallback rules
- Store verification result, score, timestamp, consent, and audit event
- Do not expose raw biometric data to agents
- Configurable retention and deletion policy

## 8. Document Management

- Secure upload for passport, photograph, ID, supporting documents, and forms
- Customer, agent, and staff upload permissions
- File-type, size, page-count, and image-quality validation
- OCR-assisted passport/data extraction where enabled
- Document checklist by visa route
- Document approval, rejection, replacement, and expiry alerts
- Encrypted storage and signed download links
- Version history and document audit trail
- Watermarking and access-control options
- Secure deletion and retention policy

## 9. Slot Monitoring & Booking Operations

### Slot Monitoring
- Route, visa type, center, and date-range configuration
- Availability checking with controlled scheduling
- Center-wise and date-wise availability dashboard
- Duplicate-check and reservation-conflict prevention
- Historical availability trends
- Configurable polling frequency and rate limits
- Pause/resume monitoring per route or customer
- Alert rules for new slots, preferred dates, and capacity changes

### Booking Request
- Create booking request from an eligible application
- Select customer/group, route, center, date range, and priority
- Validate documents, payment, face verification, and consent before submission
- Agent-requested and admin-approved booking modes
- Booking queue with priority, retry, and failure handling
- Operator assignment for human-assisted execution
- Capture appointment date, time, center, reference number, and confirmation
- Mark booking as confirmed, failed, cancelled, or manually completed
- Prevent duplicate bookings for the same applicant and date window

### Execution Options
- **Monitoring only:** show availability and notify the user
- **Alert + manual booking:** customer or staff completes booking manually
- **Staff-assisted booking:** authorized operator performs the permitted action
- **Browser-assisted workflow:** optional connector for lawful, contractually permitted use
- **Automated execution:** only where external-site terms, local law, and written approval allow it
- No CAPTCHA bypass, credential sharing, proxy evasion, or anti-bot circumvention features

## 10. Automation & Queue Management

- Background workers for slot checks, reminders, document expiry, and reports
- Priority queues for urgent booking requests
- Retry with exponential backoff and maximum-attempt limits
- Idempotency keys to prevent duplicate actions
- Dead-letter queue and operator recovery screen
- Worker health, last-run time, latency, and failure metrics
- Pause all automation during maintenance or policy changes
- Environment-specific worker configuration

## 11. Finance, Billing & Commission

- Service packages and route-wise pricing
- Customer invoice and payment-link generation
- Partial payment, advance, balance, and due-date tracking
- Payment gateway integration options:
  - Stripe
  - Razorpay
  - SSLCommerz
  - ShurjoPay
  - Bank transfer / manual payment
- Agent wallet, deposit, commission, and deduction management
- Branch-wise and agent-wise revenue ledger
- Refund request, approval, and refund audit trail
- Tax/VAT fields where applicable
- Exportable transaction and reconciliation reports
- Payment-status webhook handling and reconciliation queue

## 12. Communication & Notifications

- In-app notification center
- Email, SMS, WhatsApp, and Telegram notification options
- Customer-facing status and action-required alerts
- Agent assignment, SLA, and booking alerts
- Admin alerts for failures, payment issues, and suspicious activity
- Notification templates by language, route, and event
- Delivery status, retry history, and opt-out management
- Internal comments and customer communication timeline

## 13. Audit, Compliance & Security

- Immutable audit log for login, data access, changes, approvals, payments, and bookings
- Before/after values for sensitive configuration changes
- User, role, IP, device, and timestamp tracking
- Data encryption in transit and at rest
- Secrets stored in environment variables or a secrets manager
- Field-level masking for passport and financial data
- Configurable data retention and deletion
- Consent and privacy-policy version tracking
- Backup, restore, and disaster-recovery configuration
- Security incident and access-review reports

## 14. Reports & Exports

- Application funnel and conversion reports
- Agent, branch, route, and center performance reports
- Slot availability and booking-success reports
- Revenue, invoice, payment, refund, and commission reports
- Face-verification and document-review reports
- Customer source and campaign reports
- SLA, pending-work, and exception reports
- CSV/Excel export with role-based permissions
- Scheduled report delivery by email

## 15. Settings & System Options

- Branding, logo, timezone, language, and currency
- Email/SMS/WhatsApp/Telegram provider configuration
- Face-verification provider configuration
- Payment-gateway configuration
- Object-storage configuration
- Notification and reminder schedules
- Workflow, checklist, SLA, and status customization
- Feature flags for modules and execution modes
- Maintenance mode and emergency stop controls
- API keys and webhook management for approved integrations

## 16. Recommended Technical Options

### Fastest Delivery Stack
- **Frontend:** React + Vite + React Router, with one responsive application for Admin, Agent, Staff, and Customer portals
- **Backend:** NestJS or Fastify with TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma or Drizzle
- **Queue:** Redis + BullMQ
- **File storage:** S3-compatible object storage
- **Browser automation:** Playwright workers, isolated per task and route
- **Face verification:** Provider adapter with manual-review fallback
- **Deployment:** Docker, CI/CD, staging and production environments
- **Monitoring:** Sentry, structured logs, health checks, and uptime monitoring

### Alternative Frontend Options
- Remix / React Router for server-rendered forms and nested role layouts
- Astro + React islands for a content-heavy, lightweight frontend
- Hono + React for a smaller full-stack TypeScript application
- Wasp for rapid generation of auth, admin, and CRUD features

## 17. Suggested Delivery Phases

### Phase 1 - MVP
- Authentication and RBAC
- Main Admin, Agent, Staff, and Customer portals
- Customer and application management
- Document upload and checklist
- Face verification with manual review
- Route/center configuration
- Slot monitoring and alerts
- Basic booking request and status tracking
- Notifications and audit logs

### Phase 2 - Operations
- Finance, invoices, payments, refunds, and agent commissions
- Advanced workflows, SLA, bulk actions, and reporting
- Multi-branch and multi-agent permissions
- Provider fallbacks, worker monitoring, and reconciliation

### Phase 3 - Scale & Compliance
- Advanced analytics
- OCR and document-data extraction
- Mobile-optimized customer experience
- High-availability workers and disaster recovery
- Formal security review, retention controls, and legal/compliance review

