# Debt / Accounts Receivable Brand System

## Product Positioning

Debt / Accounts Receivable Management is a financial operations module inside Customer CRM. It helps Admin, Accountant, Manager, and Sales teams track customer debt, partial payments, payment promises, reminders, cash flow impact, and customer credit risk.

This module must feel precise, trustworthy, and operational. It is not a marketing page. It should help users answer three questions quickly:

- Who owes money?
- How much is due or overdue?
- What action should happen next?

## Design Principles

- Data first: tables, filters, totals, and statuses are more important than decorative visuals.
- Fast scanning: important amounts, dates, status, sales person, customer, and risk level must be visible without opening many screens.
- Financial safety: risky actions must require confirmation, reason, permission, and audit logs.
- Role clarity: Admin sees all controls, Accountant sees finance controls, Sales sees assigned collection workflows, Manager sees review and approval summaries.
- Consistent workflow: debt, payment, cash flow, daily sales, and customer CRM must stay connected.

## Visual Language

Use a calm operational dashboard style:

- White and light-gray surfaces.
- Blue primary actions.
- Green for paid and collected money.
- Amber/orange for due soon and due today.
- Red for overdue, blocked, cancelled, failed, and write-off actions.
- Compact cards and dense but readable tables.
- No landing-page hero.
- No decorative gradient blobs.
- No nested cards.
- No oversized text inside dashboard panels.

## Color Tokens

```css
:root {
  --debt-bg: #f8fafc;
  --debt-surface: #ffffff;
  --debt-surface-muted: #f1f5f9;
  --debt-border: #e2e8f0;
  --debt-text: #0f172a;
  --debt-text-muted: #64748b;

  --debt-primary: #2563eb;
  --debt-primary-soft: #eff6ff;

  --debt-success: #16a34a;
  --debt-success-soft: #ecfdf5;

  --debt-warning: #f59e0b;
  --debt-warning-soft: #fffbeb;

  --debt-danger: #dc2626;
  --debt-danger-soft: #fef2f2;

  --debt-neutral: #475569;
  --debt-neutral-soft: #f1f5f9;
}
```

## Status Colors

| Status | Color | Use |
| --- | --- | --- |
| Active | Blue | Normal active debt |
| Due Soon | Amber | Due in the next 3 days |
| Due Today | Orange | Must collect today |
| Overdue | Red | Past due and unpaid |
| Fully Paid | Green | No remaining balance |
| Cancelled | Gray | Cancelled record |
| Written Off | Muted red | Financial loss/write-off |
| Promise Pending | Amber | Waiting for promised date |
| Promise Kept | Green | Customer paid as promised |
| Promise Broken | Red | Promised date passed without payment |
| Credit Allowed | Green | Can sell on credit |
| Credit Warning | Amber | Near credit limit |
| Credit Blocked | Red | Requires Admin approval |

## Typography

Use a Khmer-readable font stack:

```css
font-family: "Kantumruy Pro", "Noto Sans Khmer", Inter, system-ui, sans-serif;
```

Recommended sizes:

- Page title: 28-34px
- Section title: 18-22px
- Card value: 24-32px
- Table text: 13-15px
- Form label: 13-14px
- Helper text: 12-13px

Rules:

- Do not use negative letter spacing.
- Do not scale font size with viewport width.
- Keep dashboard text compact and readable.
- Long Khmer labels must wrap cleanly on mobile.

## Layout System

### Debt Dashboard

Top area:

- Page title
- Short subtitle
- Primary action: Add Debt or Record Payment
- Secondary actions: Export, Print, Refresh

Below:

- Summary cards
- Filters
- Main table
- Charts and reports

### Debt Detail

Desktop layout:

- Left column: customer, invoice, debt amount, payment history, promise history, follow-up timeline.
- Right column: status, next action, risk, buttons, audit summary.

Mobile layout:

- Stack sections vertically.
- Keep primary action buttons sticky near bottom when recording payment.

### Reports

Reports should be table-first:

- Filter bar
- Report summary cards
- Report table
- Export controls

## Core Components

### Summary Card

Use for:

- Total Outstanding Debt
- Overdue Amount
- Due Today
- Due This Week
- Collected Today
- Collected This Month
- Fully Paid Invoices
- Unpaid Invoices
- Collection Rate

Required content:

- Icon
- Label
- Value
- Optional small trend or helper text

### Debt Table

Recommended columns:

- Customer
- Phone
- Invoice Number
- Invoice Date
- Due Date
- Total Amount
- Paid Amount
- Remaining Balance
- Days Overdue
- Assigned Sales
- Payment Status
- Debt Status
- Actions

Actions:

- View
- Record Payment
- Call Customer
- Add Promise
- Print Statement
- Edit
- More menu for risky actions

### Payment Modal

Title: `កត់ត្រាការបង់ប្រាក់`

Fields:

- Payment Date
- Amount Paid
- Payment Method
- Cash Account
- Reference Number
- Collected By
- Receipt Image
- Notes

Behavior:

- Show remaining balance before save.
- Prevent amount greater than remaining balance unless Admin override is enabled.
- Create receipt number automatically.
- Create income transaction in Cash Flow.
- Update cash account balance.
- Update debt status and payment status.
- Create audit log.

### Promise to Pay Modal

Title: `កត់ត្រាសន្យាបង់ប្រាក់`

Fields:

- Customer
- Debt
- Promised Amount
- Promised Payment Date
- Contacted By
- Contact Date
- Notes
- Status

Behavior:

- If promised date passes and no payment is recorded, mark as Broken.
- Allow reschedule with reason.

### Confirmation Dialog

Required for:

- Cancel Payment
- Write Off Debt
- Cancel Debt
- Delete Draft
- Admin override payment amount
- Change Credit Limit

Every risky confirmation must require:

- Reason
- Current user
- Timestamp
- Audit log

## Product Behavior Rules

### Remaining Balance

```text
Remaining Balance = Total Amount - Paid Amount
```

### Payment Status

- Remaining Balance = 0: Paid
- Paid Amount > 0 and Remaining Balance > 0: Partially Paid
- Paid Amount = 0: Unpaid

### Debt Status

- Remaining Balance = 0: Fully Paid
- Due Date is today: Due Today
- Due Date is past and Remaining Balance > 0: Overdue
- Due Date is within next 3 days: Due Soon
- Cancelled debt must not count in outstanding totals.
- Written-off debt must appear separately in reports.

### Cash Flow Integration

Every debt payment must:

- Create income transaction.
- Create cash transaction.
- Update cash account balance.
- Link to customer.
- Link to debt payment.
- Link to sale or invoice.
- Appear in daily and monthly cash reports.

Do not create duplicate income for the same payment.

### Customer Credit Risk

Customer detail must show:

- Credit Limit
- Current Outstanding
- Credit Status
- Debt Risk Level
- Overdue Amount
- Next Due Date
- Last Payment Date
- Last Payment Amount

Credit status:

- Allowed
- Warning
- Blocked

If Current Outstanding is greater than Credit Limit:

- Show warning.
- Block new credit sale.
- Allow override only by Admin with reason.

## Role-Based UX

### Admin

Admin can:

- View all debts
- Create and edit debts
- Record payments
- Cancel payments
- Approve adjustments
- Write off debt
- Change credit limit
- Export all reports
- View audit logs

Admin UI should expose all actions but group risky actions inside a More menu.

### Accountant

Accountant can:

- View all financial data
- Record and confirm payments
- Manage cash accounts
- Reconcile payments
- Export financial reports

Accountant cannot delete confirmed transactions.

### Sales

Sales can:

- View assigned customer debts
- Record collection calls
- Create payment promises
- Record payments only if permission allows
- View own collection performance

Sales cannot:

- Cancel confirmed payment
- Write off debt
- Change credit limit

### Manager

Manager should see:

- Pending approvals
- Overdue summary
- High-risk customers
- Collection performance
- Broken promises
- Sales person collection report

Manager review should prioritize exceptions, not every raw detail.

## Navigation

Sidebar group:

```text
Debt Management
- Dashboard
- All Debts
- Due Today
- Overdue
- Collections
- Payment Promises
- Customer Statements
- Debt Aging
```

Recommended routes:

```text
/debts
/debts/dashboard
/debts/all
/debts/due-today
/debts/overdue
/debts/collections
/debts/promises
/debts/statements
/debts/aging
/debts/:id
/debts/:id/receipt/:paymentId
```

## Report System

Required reports:

- Outstanding Debt Report
- Overdue Debt Report
- Customer Statement
- Payment Collection Report
- Debt Aging Report
- Sales Person Collection Report
- Daily Collection Report
- Monthly Collection Report
- Cancelled Payment Report
- Written-Off Debt Report

Filters:

- Date Range
- Customer
- Sales Person
- Province
- Payment Status
- Debt Status
- Payment Method
- Cash Account
- Aging Range

Export:

- CSV
- Excel
- PDF
- Print

## Debt Aging Buckets

- Not Due
- 1-7 Days Overdue
- 8-15 Days Overdue
- 16-30 Days Overdue
- 31-60 Days Overdue
- 61-90 Days Overdue
- Over 90 Days

## Khmer Copy Guidelines

Use clear Khmer business language:

- `គ្រប់គ្រងបំណុល`
- `បំណុលសរុប`
- `ប្រាក់បានបង់`
- `ប្រាក់នៅសល់`
- `ថ្ងៃត្រូវបង់`
- `បំណុលហួសកំណត់`
- `កត់ត្រាការបង់ប្រាក់`
- `សន្យាបង់ប្រាក់`
- `បោះពុម្ពបង្កាន់ដៃ`
- `របាយការណ៍អាយុកាលបំណុល`
- `ត្រូវបញ្ចូលមូលហេតុសម្រាប់សកម្មភាពនេះ`

Avoid vague text like:

- `Submit`
- `OK`
- `Process`
- `Action`

Prefer specific text:

- `រក្សាទុកការបង់ប្រាក់`
- `បញ្ជាក់ការលុបចោល`
- `បញ្ជូនទៅ Manager`
- `បោះពុម្ព Statement`

## AI Implementation Prompt

Use this prompt when asking an AI or developer to implement the module:

```markdown
Build a complete Debt / Accounts Receivable Management module for the existing Customer CRM project.

Follow the Debt / Accounts Receivable Brand System.

The UI must be an operational finance dashboard, not a landing page. Use compact summary cards, dense readable tables, status badges, modal forms, role-based actions, and confirmation dialogs for risky financial changes.

Integrate with:
- Customer CRM
- Daily Sales
- Cash Flow
- Follow Up
- Notifications
- Role permissions
- Supabase RLS

Implement:
- SQL migrations
- Tables and relationships
- RLS policies
- React pages
- Services
- Hooks
- Components
- Validation
- Dashboard
- Reports
- Receipt printing
- Customer statement
- Cash Flow integration
- Daily Sales integration
- CRM integration
- Audit logs

Do not use pseudocode.
Do not use local storage as the main database.
All important records must persist in Supabase.
All financial edits must be auditable.
```

## Quality Checklist

- Debt can be created from partially paid or unpaid sales.
- Paid sales create income directly.
- Partial payments create income for paid amount and debt for balance.
- Debt payments reduce remaining balance.
- Receipt number is generated automatically.
- Cash account balance updates correctly.
- Customer outstanding balance updates correctly.
- Credit limit rules work.
- Due soon, due today, overdue, and fully paid statuses update automatically.
- Reminders do not spam on refresh.
- Reports filter and export correctly.
- Admin, Accountant, Sales, and Manager permissions are enforced.
- Risky financial actions require reason and create audit logs.
