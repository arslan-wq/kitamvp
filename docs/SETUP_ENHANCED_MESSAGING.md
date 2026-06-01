# Enhanced Messaging (Phase 3) - Setup & Configuration Guide

## Installation Steps

### 1. Database Migration

The MessageThread, Message, Announcement, and Notification models should already be defined in `prisma/schema.prisma`. Run the migration:

```bash
npx prisma migrate dev --name add_enhanced_messaging
# or if updating:
npx prisma db push
```

This creates four tables: MessageThread, Message, Announcement, and Notification.

### 2. API Endpoints

Verify these files exist:

**`src/app/api/messages/threads/route.ts`**
- GET handler: List message threads for a KiTA
- POST handler: Create new thread with initial message

**`src/app/api/messages/threads/[id]/route.ts`**
- GET handler: Fetch specific thread with all messages
- PUT handler: Update thread (resolve status, title)

**`src/app/api/messages/threads/[id]/replies/route.ts`**
- POST handler: Add reply to a message in thread

**`src/app/api/announcements/route.ts`**
- GET handler: List published announcements
- POST handler: Create new announcement

**`src/app/api/notifications/send/route.ts`**
- POST handler: Queue notifications for email sending
- GET handler: List pending notifications (staff only)

All endpoints include:
- Authentication/authorization checks
- KiTA isolation verification
- Role-based access control
- Proper error handling

### 3. Staff Interface

Verify these components exist:

**`src/app/dashboard/messaging/components/MessagingClient.tsx`**
- Thread list with child filter
- Thread view with nested messages
- Reply composition form
- Create new thread interface
- Resolve/mark threads as complete

**`src/app/dashboard/messaging/page.tsx`**
- Server-side authentication and authorization
- Fetches children list from current KiTA
- Renders MessagingClient component

### 4. Parent Inbox Component

Verify `src/app/parent/components/InboxViewer.tsx` exists:
- Thread list with message previews
- Thread detail view with replies
- Reply composition form
- Announcements tab
- Separate announcement viewing

### 5. Dashboard Integration

Update `src/app/parent/dashboard/components/ParentDashboardClient.tsx`:

```typescript
import InboxViewer from '../../components/InboxViewer';

// In the JSX, after Medical Records section:
<div className="space-y-4">
  <h3 className="text-2xl font-bold text-gray-900">📬 Nachrichten & Ankündigungen</h3>
  <InboxViewer kitaId={selectedChild.kitaId} />
</div>
```

### 6. Email Configuration

Set up email notifications in `.env.local`:

```bash
# Email service (choose one)
NEXT_PUBLIC_EMAIL_FROM=noreply@kita-app.ch
RESEND_API_KEY=re_...        # For Resend
SENDGRID_API_KEY=SG...        # For SendGrid

# Notification preferences
NOTIFICATION_EMAIL_ON_NEW_MESSAGE=true
NOTIFICATION_EMAIL_ON_ANNOUNCEMENT=true
NOTIFICATION_EMAIL_ON_REPLY=true

# File uploads
MAX_ATTACHMENT_SIZE=10485760  # 10MB
ALLOWED_ATTACHMENT_TYPES=pdf,jpg,jpeg,png,docx,doc
```

## Configuration

### Email Notification Triggers

Edit notification logic in API endpoints to control when emails are sent:

```typescript
// In POST /api/messages/threads - when staff creates message
if (NOTIFICATION_EMAIL_ON_NEW_MESSAGE) {
  await sendEmailNotification(parentIds, `New message about ${childName}`);
}

// In POST /api/announcements - when staff creates announcement
if (NOTIFICATION_EMAIL_ON_ANNOUNCEMENT) {
  await sendEmailNotification(parentIds, `New announcement: ${title}`);
}
```

### Customization

#### Change Attachment Size Limit

Edit `.env.local`:

```bash
MAX_ATTACHMENT_SIZE=20971520  # 20MB instead of 10MB
```

#### Modify Allowed File Types

Create new environment variable or edit form validation in MessagingClient:

```typescript
const ALLOWED_TYPES = ['pdf', 'jpg', 'jpeg', 'png', 'docx', 'doc', 'xlsx'];
```

#### Customize Announcement Expiration

Edit API endpoint:

```typescript
// In POST /api/announcements
const expiresAt = data.expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
```

#### Change Notification Email Template

Create email template in your email service (Resend/SendGrid):

```
Subject: {{senderName}} hat eine neue Nachricht über {{childName}}
Body: {{senderName}} hat Ihnen eine Nachricht hinterlassen.
Bitte melden Sie sich bei der KiTA-App an, um zu antworten.
```

## Usage Instructions

### For KiTA Staff (Sending Messages)

1. **Navigate to Messaging**
   - Click "Dashboard" in sidebar
   - Select "Nachrichten & Ankündigungen" from modules grid
   - Or navigate to `/dashboard/messaging`

2. **Filter by Child (Optional)**
   - Use dropdown to select a specific child
   - Or leave empty to see all conversations

3. **Select or Create Thread**
   - Click existing thread from list to continue conversation
   - Or fill in subject and message to start new thread

4. **Send Message**
   - Type message content
   - Optionally attach files
   - Click "Nachricht starten" or "Antwort senden"
   - Parent receives email notification

5. **Track Conversation**
   - See all replies from parents
   - Nested replies display under each message
   - Mark thread as resolved when complete

### For Sending Announcements

1. **Create Announcement**
   - Leave child filter empty
   - Check "isAnnouncement" when creating thread

2. **Configure Target Audience**
   - ALL: All parents in KiTA (default)
   - PARENTS_ONLY: Only parent accounts
   - STAFF_ONLY: Internal staff communication

3. **Set Optional Expiration**
   - Leave empty for permanent announcement
   - Set date to auto-hide after expiration

4. **Publish**
   - Click "Senden"
   - Appears in parent inboxes immediately

### For Parents (Viewing & Responding)

1. **Navigate to Parent Dashboard**
   - Log in as parent
   - Click "Dashboard"

2. **Find Inbox Section**
   - Scroll to "📬 Nachrichten & Ankündigungen"
   - Two tabs: "Nachrichten" and "Ankündigungen"

3. **View Messages (Default Tab)**
   - List shows all conversations about your children
   - Click message to view full thread
   - Includes all replies from staff

4. **Reply to Message**
   - Click in reply box at bottom of thread
   - Type your response
   - Click "Antwort senden"
   - Staff receives email notification

5. **View Announcements**
   - Click "Ankündigungen" tab
   - See all active announcements
   - Read full content
   - Some announcements may require action

## Email Integration

### Using Resend (Recommended)

```bash
npm install resend
```

Create email sending utility:

```typescript
// lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendMessageNotification(
  parentEmail: string,
  parentName: string,
  staffName: string,
  childName: string,
  message: string
) {
  await resend.emails.send({
    from: process.env.NEXT_PUBLIC_EMAIL_FROM,
    to: parentEmail,
    subject: `Neue Nachricht über ${childName} von ${staffName}`,
    html: `
      <p>Lieber ${parentName},</p>
      <p>${staffName} hat eine neue Nachricht über ${childName} hinterlassen:</p>
      <p><em>${message.substring(0, 100)}...</em></p>
      <p><a href="${process.env.NEXTAUTH_URL}/parent/dashboard">In der KiTA-App antworten</a></p>
    `,
  });
}
```

### Using SendGrid

```bash
npm install @sendgrid/mail
```

Similar implementation using SendGrid client.

## File Upload Configuration

### Supabase Storage

Enable attachment support:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function uploadAttachment(file: File, threadId: string) {
  const path = `messages/${threadId}/${file.name}`;
  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(path, file);
  
  if (error) throw error;
  return supabase.storage
    .from('attachments')
    .getPublicUrl(path).data.publicUrl;
}
```

## Performance Optimization

### Query Indexes

Current indexes (in schema):
- MessageThread: kitaId, childId, startedBy, updatedAt
- Message: threadId, parentId, senderId
- Announcement: kitaId, createdBy, publishedAt

For high-traffic KiTAs, consider:
```sql
CREATE INDEX idx_message_thread_created ON "Message"(threadId, createdAt DESC);
CREATE INDEX idx_notification_recipient ON "Notification"(kitaId, recipientId, isSent);
```

### Lazy Loading

Implement pagination for large thread lists:

```typescript
// In GET /api/messages/threads
const take = 20;
const skip = (page - 1) * take;
// Add pagination params
```

## Testing Checklist

- [ ] Staff can create message thread
- [ ] Staff can reply to messages
- [ ] Parent receives email notification for new message
- [ ] Parent can reply via app
- [ ] Announcement appears in parent inbox
- [ ] Staff can mark thread as resolved
- [ ] File attachments upload and display
- [ ] Thread list shows newest conversations first
- [ ] Parent cannot see other children's messages
- [ ] Announcements show expiration date
- [ ] Multi-tenant isolation works (KiTA A can't see KiTA B messages)
- [ ] Read status tracking works
- [ ] Email unsubscribe works

## Troubleshooting

### Emails Not Sending

**Symptom:** Messages created but no emails received

**Solutions:**
1. Check `.env.local` has RESEND_API_KEY or SENDGRID_API_KEY
2. Verify NEXT_PUBLIC_EMAIL_FROM is set
3. Check Notification records have isSent = false
4. Test via admin notifications endpoint: GET /api/notifications/send
5. Check email service logs (Resend/SendGrid dashboard)

### Parents Can't See Messages

**Symptom:** Parent message list is empty

**Solutions:**
1. Verify staff sent message with correct childId
2. Verify parent is enrolled with the child (in Child.parents)
3. Check thread exists in database
4. Verify both users are in same KiTA
5. Check browser network tab for API response

### Threads Not Loading

**Symptom:** Error when opening thread detail

**Solutions:**
1. Verify thread exists (check Message count > 0)
2. Check for circular parentId references
3. Verify user has access to this thread's childId
4. Check for database connection issues

### Attachment Upload Fails

**Symptom:** "Failed to upload attachment"

**Solutions:**
1. Verify file size < MAX_ATTACHMENT_SIZE
2. Check file type is in ALLOWED_ATTACHMENT_TYPES
3. Verify Supabase credentials in .env
4. Check Supabase storage bucket "attachments" exists
5. Verify bucket has public read permissions

## Database Maintenance

### Check Notification Status

```sql
-- Find unsent notifications
SELECT COUNT(*) as pending FROM "Notification" WHERE "isSent" = false;

-- Find old sent notifications for archival
SELECT * FROM "Notification" 
WHERE "isSent" = true 
AND "createdAt" < NOW() - INTERVAL '90 days';
```

### Clean Up Old Messages

```sql
-- Archive messages older than 1 year (optional)
CREATE TABLE "MessageArchive" AS
SELECT * FROM "Message" 
WHERE "createdAt" < NOW() - INTERVAL '1 year'
  AND "threadId" IN (
    SELECT id FROM "MessageThread"
    WHERE "isResolved" = true
  );
```

## Deployment Checklist

- [ ] Database migration runs without errors
- [ ] All API endpoints accessible
- [ ] Staff can create message threads
- [ ] Parents can view and reply
- [ ] Email notifications configured and sending
- [ ] File uploads working
- [ ] Announcements visible to correct users
- [ ] Multi-tenant isolation verified
- [ ] Read tracking working
- [ ] Thread resolution working
- [ ] Responsive design on mobile/tablet
- [ ] Error messages user-friendly
- [ ] Rate limiting configured (optional)

## Next Phase Enhancements

1. **Message Search**: Full-text search across messages
2. **Message Reactions**: Emoji reactions to messages
3. **Bulk Announcements**: Templates for common announcements
4. **Message Scheduling**: Send message at future time
5. **Read Receipts**: Visual indicators for delivery status
6. **Typing Indicator**: Show when others are typing
7. **Canned Responses**: Pre-written staff templates
8. **Notification Digest**: Daily/weekly summary instead of per-message
9. **Two-Way SMS**: SMS support for non-email users
10. **Message Archiving**: Hide old resolved threads

