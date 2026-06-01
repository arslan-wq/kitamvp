# Enhanced Messaging (Phase 3) - Feature Documentation

## Overview

The Enhanced Messaging feature provides comprehensive communication between KiTA staff and parents, including message threads with replies, file attachments, email notifications, and a broadcast announcements system. This enables efficient, organized communication about individual children and KiTA-wide information.

## Key Features

- **Message Threads**: Staff initiate conversations with parents about specific children
- **Threading & Replies**: Nested reply structure for organized discussions
- **File Attachments**: Share documents and images in messages
- **Announcements**: Broadcast messages to all parents (important updates, policy changes)
- **Email Notifications**: Parents receive notifications for new messages via email
- **Read Tracking**: Track which users have read messages
- **Thread Resolution**: Mark threads as resolved to organize completed discussions
- **Parent Inbox**: Parents view all messages and announcements in one place

## Architecture

### Database Schema

#### MessageThread Model
```prisma
model MessageThread {
  id            String   @id @default(cuid())
  kitaId        String   // Isolate by KiTA
  childId       String?  // NULL = announcement thread
  
  title         String?  // Optional thread title
  startedBy     String   // User ID
  startedByName String
  startedByRole String   // For visibility: BETREUER, KITA_LEITER, PARENT
  
  isAnnouncement Boolean @default(false) // TRUE = broadcast to all parents
  isResolved    Boolean @default(false)  // Resolved/closed
  
  messages      Message[]  // All messages in thread
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

#### Message Model
```prisma
model Message {
  id          String   @id @default(cuid())
  threadId    String   // Parent thread
  parentId    String?  // NULL = root message, otherwise reply to this message
  
  senderId    String   // User or Parent ID
  senderName  String
  senderEmail String
  senderRole  String   // For display: BETREUER, KITA_LEITER, PARENT
  
  content     String   // Message body
  attachments String[] // File URLs
  readBy      String[] // User IDs who have read
  
  replies     Message[] @relation("MessageReplies") // Nested replies
  
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

#### Announcement Model
```prisma
model Announcement {
  id           String   @id @default(cuid())
  kitaId       String
  
  title        String
  content      String
  attachments  String[]
  
  createdBy    String   // User ID
  createdByName String
  
  isPublished  Boolean @default(true)
  targetAudience String @default("ALL") // ALL, PARENTS_ONLY, STAFF_ONLY
  
  publishedAt  DateTime @default(now())
  expiresAt    DateTime? // Auto-unpublish
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

#### Notification Model
```prisma
model Notification {
  id             String   @id @default(cuid())
  kitaId         String
  
  recipientId    String   // User or Parent ID
  type           String   // NEW_MESSAGE, ANNOUNCEMENT, REPLY
  title          String
  message        String
  
  threadId       String?  // Link to source
  announcementId String?
  
  isSent         Boolean @default(false)
  sentVia        String?  // EMAIL, PUSH, BOTH
  readAt         DateTime?
  
  createdAt      DateTime @default(now())
}
```

### API Endpoints

#### Message Threads

**GET /api/messages/threads**
- Fetch all threads for a KiTA
- Query params: `childId` (filter by child), `includeAnnouncements` (default: true)
- Returns: Array of thread summaries with last message preview

**POST /api/messages/threads**
- Create new thread with initial message
- Body: `{ title, content, childId?, attachments? }`
- Returns: Full thread with initial message

**GET /api/messages/threads/[id]**
- Fetch specific thread with all messages and replies
- Returns: Full thread structure with nested messages

**PUT /api/messages/threads/[id]**
- Update thread (mark resolved, change title)
- Body: `{ isResolved?, title? }`
- Only staff can update threads

#### Message Replies

**POST /api/messages/threads/[id]/replies**
- Add reply to a message in the thread
- Body: `{ content, parentMessageId?, attachments? }`
- Returns: New message with any replies

#### Announcements

**GET /api/announcements**
- Fetch published announcements
- Query params: `limit` (default: 20)
- Parents only see announcements for them; staff sees all

**POST /api/announcements**
- Create new announcement (staff only)
- Body: `{ title, content, attachments?, isPublished?, targetAudience?, expiresAt? }`
- Creates announcement + corresponding message thread

#### Notifications

**POST /api/notifications/send**
- Queue notifications for sending
- Body: `{ type, threadId?, announcementId?, title, message, recipientIds }`
- Returns: Count of notifications created

**GET /api/notifications/send**
- Get pending notifications (staff only)
- Returns: List of unsent notifications

## Components

### Staff Interface: MessagingClient
**Location**: `src/app/dashboard/messaging/components/MessagingClient.tsx`

**Features:**
- Thread list (filterable by child)
- Thread view with all messages and replies
- Nested reply display
- Create new thread
- Send replies in thread
- Resolve/mark threads
- Thread creation form for new conversations

**UX Details:**
- Left sidebar: Thread list with child filter
- Main area: Selected thread with message history
- Reply form at bottom of thread
- Visual indicators for resolved/announcement threads
- Read status shown for messages

### Parent Interface: InboxViewer
**Location**: `src/app/parent/components/InboxViewer.tsx`

**Features:**
- Tab-based interface (Messages, Announcements)
- Thread list (child-specific conversations)
- Thread view with full message history
- Reply form to respond to staff messages
- Announcements display (separate tab)
- Read tracking for messages

**UX Details:**
- Clean, simple inbox layout
- Tab switching between messages and announcements
- Thread selection shows full conversation
- Messages show sender, timestamp, attachments
- Parents can reply to any message

### Dashboard Integration
**Location**: `src/app/parent/dashboard/components/ParentDashboardClient.tsx`

- New section: "📬 Nachrichten & Ankündigungen"
- Uses InboxViewer component
- Integrated after Medical Records section

### Staff Page
**Location**: `src/app/dashboard/messaging/page.tsx`

- Server-side auth check
- Fetches children list
- Renders MessagingClient component

## User Flows

### Staff: Send Message About Child

1. Navigate to Dashboard → Nachrichten & Ankündigungen
2. Select child from filter dropdown (optional)
3. Click on existing thread OR create new thread
4. Enter subject (optional) and message content
5. Optionally attach files
6. Click "Nachricht starten"
7. Reply area now visible in thread
8. Respond to parent replies as needed
9. Mark thread resolved when complete

### Staff: Send Announcement

1. Navigate to Nachrichten & Ankündigungen
2. Create new message (leave childId empty)
3. Enter title and content (mandatory)
4. Check "isAnnouncement" option
5. Select target audience (ALL, PARENTS_ONLY, STAFF_ONLY)
6. Optionally set expiration date
7. Click send
8. Announcement appears in parent inboxes

### Parent: View & Respond to Messages

1. Log into Parent Portal
2. Navigate to Dashboard
3. Scroll to "Nachrichten & Ankündigungen" section
4. Click "Nachrichten" tab
5. Select a thread from the list
6. Read full conversation
7. Type reply in form at bottom
8. Click "Antwort senden"
9. Reply appears in thread immediately

### Parent: View Announcements

1. Navigate to inbox section
2. Click "Ankündigungen" tab
3. View all active announcements
4. See expiration dates (if applicable)

## Data Entry Best Practices

### Message Content
- Be clear and specific: "Maria hat heute Schwierigkeiten mit dem Teilen" not "Issues"
- Use simple language parents understand
- Separate multiple topics into different messages or numbered points
- Include specific examples: "She didn't want to share the red block"

### Threading
- One child = one thread (multiple children = multiple threads)
- Use threads to keep conversations organized
- Mark resolved when issue is resolved or information is shared
- Resurrecting old threads: reply to existing thread rather than creating new one

### Attachments
- Include photos to show activities/progress
- Share documents for policies or consent forms
- Acceptable formats: PDF, JPG, PNG, DOCX
- Max file size: As configured (typically 10MB)

### Announcements
- Use for KiTA-wide information (closures, policy changes, events)
- Set expiration dates for time-sensitive information
- Target appropriate audience (parents only vs. staff only)
- Include contact info if action required

## Security & Privacy

### Access Control
- **Staff**: Can send messages to parents, create announcements
- **Parents**: Can only see messages about their enrolled children + announcements
- **Multi-tenant**: Messages isolated by KiTA; users cannot access other KiTAs

### Message Privacy
- **Role-based visibility**: Sender role shown (BETREUER, KITA_LEITER)
- **Read tracking**: Staff can see when parents have read messages
- **No deletion**: Messages are never deleted (audit trail)

### Attachment Security
- Files stored in KiTA-scoped storage (Supabase Storage)
- URLs expire after configured time period
- File type validation on upload

### Email Notifications
- Use authenticated SMTP (Resend or SendGrid)
- Unsubscribe option in email footer
- Email shows sender name (staff member) only
- No sensitive details in email body (refer to portal)

## Testing Checklist

- [ ] Staff can create message thread for specific child
- [ ] Staff can send announcement to all parents
- [ ] Staff can reply to parent messages
- [ ] Staff can mark thread as resolved
- [ ] Parent can view all messages about their child
- [ ] Parent can reply to staff message
- [ ] Parent can see announcements
- [ ] Parent cannot see messages about other children
- [ ] Message list shows unread indicator
- [ ] Thread list shows most recent conversation first
- [ ] Attachments can be uploaded and viewed
- [ ] Email notifications sent when new message arrives
- [ ] Notifications respect parent preferences
- [ ] Announcements show expiration date
- [ ] Threading nests replies correctly

## Integration Points

### With Existing Features
1. **Child Management**: Messages/announcements linked to children
2. **Parent Portal**: Inbox integrated into parent dashboard
3. **Authentication**: Role-based access control enforced
4. **Email System**: Notifications sent via configured email service

### Notification System
- New message → notification to parents
- New announcement → notification to relevant parents
- Reply to parent message → notification to parent
- Configurable email frequency (immediate or digest)

## Email Notification Flow

```
1. Staff sends message → Message created
2. Trigger: Check parent notification preferences
3. Create Notification record (isSent: false)
4. Queue for email service
5. Send email via Resend/SendGrid
6. Mark Notification as sent
7. Track open/click events
```

## Announcements Features

### Targeting
- **ALL**: All parents in KiTA
- **PARENTS_ONLY**: Non-staff users
- **STAFF_ONLY**: Internal staff communication

### Expiration
- Optional expiresAt date
- Announcements automatically hidden after expiration
- Query filters out expired announcements

### Integration with Threads
- Each announcement creates a MessageThread
- Enables tracking, comments, discussion
- Different from regular threads (isAnnouncement: true)

## Performance Considerations

### Message Queries
- Threads fetched with message count and last message preview
- Full thread load only on selection (lazy load)
- Indexes on: threadId, parentId, senderId, createdAt

### Read Tracking
- Stored as array on Message (simple approach for MVP)
- No separate ReadStatus table needed until scale
- Updated atomically with message fetch

### Pagination
- Thread list: 50 per page
- Messages in thread: All loaded (typical < 100)
- Announcements: 20 per page

## Future Enhancements

1. **Message Search**: Search messages by content, sender, date
2. **Read Receipts**: Visual indicators for message delivery status
3. **Typing Indicator**: Show when parent is typing response
4. **Message Reactions**: Emoji reactions to messages
5. **Bulk Announcements**: Template announcements for common messages
6. **Two-Way SMS**: SMS support for parents without email
7. **Message Pinning**: Pin important messages to top of thread
8. **Canned Responses**: Staff templates for quick replies
9. **Translation**: Auto-translate messages to parent's language
10. **Scheduled Messages**: Send message at specified time
11. **Message Archiving**: Archive old threads
12. **Notification Digest**: Daily/weekly email digest instead of per-message

## Compliance

- **GDPR**: Message retention policy (configurable deletion after X days)
- **Data Isolation**: Multi-tenant isolation by KiTA
- **Audit Trail**: All messages timestamped and never deleted
- **Consent**: Parent must consent to email notifications

## Troubleshooting

### Messages Not Appearing
- Verify child is enrolled with parent
- Check message childId matches parent's child
- Verify user roles allow message access

### Notifications Not Sending
- Check parent has email verified
- Verify notification preferences enabled
- Check SMTP credentials in environment
- View pending notifications via admin endpoint

### Thread Not Loading
- Verify threadId is correct
- Check user has access (same KiTA or enrolled parent)
- Check for database connection issues

## Configuration

### Environment Variables
```
# Email notifications
NEXT_PUBLIC_EMAIL_FROM=noreply@kita-app.ch
RESEND_API_KEY=re_...
SENDGRID_API_KEY=SG...

# Notifications
NOTIFICATION_EMAIL_ON_NEW_MESSAGE=true
NOTIFICATION_EMAIL_ON_ANNOUNCEMENT=true
NOTIFICATION_DIGEST_ENABLED=false
NOTIFICATION_DIGEST_FREQUENCY=daily

# Files
MAX_ATTACHMENT_SIZE=10485760  # 10MB
ALLOWED_ATTACHMENT_TYPES=pdf,jpg,jpeg,png,docx,doc

# Announcements
ANNOUNCEMENT_EXPIRATION_DAYS=30
```

## API Reference Examples

### Create Thread with Message

```bash
curl -X POST /api/messages/threads \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly Update",
    "content": "Maria is doing great in group activities!",
    "childId": "rec123...",
    "attachments": ["https://cdn.example.com/photo1.jpg"]
  }'
```

### Send Reply

```bash
curl -X POST /api/messages/threads/rec456.../replies \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Thank you for the update!",
    "parentMessageId": "rec789..."
  }'
```

### Fetch All Threads for Child

```bash
curl /api/messages/threads?childId=rec123... \
  -H "Authorization: Bearer TOKEN"
```

### Create Announcement

```bash
curl -X POST /api/announcements \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "KiTA Holiday Closure",
    "content": "The KiTA will be closed from Dec 24-26 for the holidays.",
    "targetAudience": "ALL",
    "expiresAt": "2025-12-27T00:00:00Z"
  }'
```
