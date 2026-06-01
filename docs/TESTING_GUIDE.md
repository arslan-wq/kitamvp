# Enhanced Messaging (Phase 3) - Testing Guide

## Pre-Testing Setup

### 1. Database Migration

```bash
cd /Users/olg21/Downloads/kita-app
npx prisma migrate dev --name add_enhanced_messaging
```

This creates:
- MessageThread table
- Message table
- Announcement table
- Notification table

**Verify migration succeeded:**
```bash
npx prisma db push
# Should show "✓ Your database is now in sync with your schema"
```

### 2. Seed Test Data (Optional)

Create `prisma/seed-messaging.ts`:

```typescript
import { prisma } from '@/lib/db';

async function seedMessaging() {
  // Get first KiTA
  const kita = await prisma.kiTA.findFirst();
  if (!kita) {
    console.log('No KiTA found. Create a KiTA first.');
    return;
  }

  // Get first child and parents
  const child = await prisma.child.findFirst({ where: { kitaId: kita.id } });
  const parent = await prisma.parent.findFirst();

  if (!child || !parent) {
    console.log('No child or parent found. Create test data first.');
    return;
  }

  // Get staff user
  const staff = await prisma.user.findFirst({
    where: { kitaId: kita.id, role: { in: ['BETREUER', 'KITA_LEITER'] } }
  });

  if (!staff) {
    console.log('No staff user found. Create a staff account first.');
    return;
  }

  // Create test thread
  const thread = await prisma.messageThread.create({
    data: {
      kitaId: kita.id,
      childId: child.id,
      title: 'Test Message Thread',
      startedBy: staff.id,
      startedByName: staff.name,
      startedByRole: staff.role,
      messages: {
        create: {
          senderId: staff.id,
          senderName: staff.name,
          senderEmail: staff.email,
          senderRole: staff.role,
          content: 'This is a test message from staff.',
        }
      }
    }
  });

  console.log('✓ Created test thread:', thread.id);

  // Create test announcement
  const announcement = await prisma.announcement.create({
    data: {
      kitaId: kita.id,
      title: 'Test Announcement',
      content: 'This is a test announcement for all parents.',
      createdBy: staff.id,
      createdByName: staff.name,
      targetAudience: 'ALL',
    }
  });

  console.log('✓ Created test announcement:', announcement.id);
}

seedMessaging().catch(e => {
  console.error(e);
  process.exit(1);
});
```

Run with:
```bash
npx ts-node prisma/seed-messaging.ts
```

---

## Test Scenarios

### Scenario 1: Staff Creates Message Thread

**Preconditions:**
- Staff user logged in
- At least one child in the KiTA
- At least one parent enrolled with the child

**Steps:**
1. Navigate to Dashboard
2. Click "Nachrichten & Ankündigungen" module
3. Should see Messaging interface
4. Select child from dropdown (or leave empty)
5. Fill in subject: "How is Maria doing?"
6. Fill in message: "Maria has been doing great in group activities today!"
7. Click "Nachricht starten"

**Expected Results:**
- ✓ Message thread created in database
- ✓ Thread appears in staff thread list
- ✓ Initial message shows in thread view
- ✓ Sender name and timestamp visible
- ✓ Thread shows as "active" (not resolved)

**URL:** `/dashboard/messaging`

---

### Scenario 2: Parent Receives & Views Message

**Preconditions:**
- Message thread created for parent's child
- Parent user logged in

**Steps:**
1. Navigate to Parent Dashboard
2. Scroll to "📬 Nachrichten & Ankündigungen" section
3. Click on "Nachrichten" tab
4. Should see thread list
5. Click on thread about their child
6. Should see full message conversation

**Expected Results:**
- ✓ Thread appears in parent's message list
- ✓ Thread shows child name and sender name
- ✓ Thread shows message count
- ✓ Full thread loads with all messages
- ✓ Timestamps display correctly
- ✓ No other children's messages visible

**URL:** `/parent/dashboard`

---

### Scenario 3: Parent Replies to Message

**Preconditions:**
- Parent viewing message thread
- Reply form visible at bottom

**Steps:**
1. Click in reply text area
2. Type: "Thank you for the update! We are very happy."
3. Click "Antwort senden"
4. Wait for request to complete

**Expected Results:**
- ✓ Reply appears immediately in thread
- ✓ Reply shows parent name as sender
- ✓ Reply shows correct timestamp
- ✓ Reply appears below original message
- ✓ Text area clears after sending
- ✓ Button state returns to normal

---

### Scenario 4: Staff Views Parent Reply

**Preconditions:**
- Staff user logged in
- Parent has replied to message

**Steps:**
1. Navigate to Messaging dashboard
2. Look for thread in list
3. Click on thread
4. Scroll through messages

**Expected Results:**
- ✓ Thread updates with parent's reply
- ✓ Reply shows parent name
- ✓ Reply shows correct timestamp
- ✓ Thread "updatedAt" reflects latest message time
- ✓ Nested replies display correctly

---

### Scenario 5: Staff Creates Announcement

**Preconditions:**
- Staff user logged in

**Steps:**
1. Navigate to Messaging dashboard
2. Leave child dropdown empty (no child = announcement)
3. Fill in subject: "KiTA Closure"
4. Fill in message: "The KiTA will be closed from Dec 24-26 for holidays."
5. Check "isAnnouncement" checkbox (if present)
6. Select targetAudience: "ALL"
7. Optionally set expiration: "2025-12-27"
8. Click "Senden"

**Expected Results:**
- ✓ Announcement created in database
- ✓ Corresponding MessageThread created with isAnnouncement=true
- ✓ Staff can see announcement in thread list
- ✓ Announcement shows as "announcement" type

---

### Scenario 6: Parent Views Announcement

**Preconditions:**
- Staff created announcement
- Parent logged in

**Steps:**
1. Navigate to Parent Dashboard
2. Scroll to "📬 Nachrichten & Ankündigungen"
3. Click "Ankündigungen" tab
4. Should see announcement list

**Expected Results:**
- ✓ Announcement appears in list
- ✓ Title and content visible
- ✓ Creator name shown
- ✓ Publication date shown
- ✓ Expiration date shown (if set)
- ✓ No individual child context (announcement is global)

---

### Scenario 7: Mark Thread as Resolved

**Preconditions:**
- Staff user viewing thread
- Thread has conversation

**Steps:**
1. Look for "Mark as Resolved" or similar button
2. Click it
3. Thread should update

**Expected Results:**
- ✓ isResolved flag set to true
- ✓ Thread shows resolved indicator (checkmark icon)
- ✓ Thread may move to different section in list
- ✓ Reply form may be disabled (discussion complete)

---

### Scenario 8: Multi-Child Parent Sees Only Own Messages

**Preconditions:**
- Parent has 2+ children enrolled
- Messages sent about different children

**Steps:**
1. Navigate to Parent Dashboard
2. View Message list
3. Switch child dropdown to different child
4. View messages for new child

**Expected Results:**
- ✓ Only messages for selected child appear
- ✓ Other children's messages hidden
- ✓ Message count updates for each child
- ✓ No cross-contamination of messages

---

### Scenario 9: Multi-KiTA Isolation

**Preconditions:**
- Two KiTAs in database
- User is staff in KiTA A
- Messages exist in both KiTAs

**Steps:**
1. Staff user from KiTA A logs in
2. Navigate to Messaging
3. Should see only KiTA A's children and threads

**Expected Results:**
- ✓ Child dropdown shows only KiTA A's children
- ✓ Thread list shows only KiTA A's threads
- ✓ Cannot access KiTA B's messages
- ✓ API prevents cross-KiTA access (403 error if tried)

**Test via API:**
```bash
# As staff in KiTA A, try to GET threads from KiTA B
curl -H "Authorization: Bearer TOKEN" \
  /api/messages/threads?kitaId=kita-b-id
# Should return 403 or empty
```

---

### Scenario 10: Read Tracking

**Preconditions:**
- Message sent to parent
- Parent hasn't viewed thread yet

**Steps:**
1. Staff views thread (message marked as read by staff)
2. Parent views thread (message marked as read by parent)
3. Check database

**Expected Results:**
- ✓ readBy array includes staff user ID
- ✓ readBy array includes parent user ID
- ✓ Read status persists across sessions
- ✓ Staff can see "read" indicator for messages

---

## API Testing (via curl/Postman)

### Test 1: Create Thread

```bash
curl -X POST http://localhost:3000/api/messages/threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Weekly Update",
    "content": "Great week!",
    "childId": "rec123...",
    "attachments": []
  }'

# Expected: 200 with thread object
```

### Test 2: List Threads

```bash
curl http://localhost:3000/api/messages/threads \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 with array of threads
```

### Test 3: Get Thread Details

```bash
curl http://localhost:3000/api/messages/threads/rec456... \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 with full thread including messages
```

### Test 4: Send Reply

```bash
curl -X POST http://localhost:3000/api/messages/threads/rec456.../replies \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Thank you for the update!",
    "parentMessageId": null
  }'

# Expected: 200 with new message
```

### Test 5: Create Announcement

```bash
curl -X POST http://localhost:3000/api/announcements \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Holiday Closure",
    "content": "Closed Dec 24-26",
    "targetAudience": "ALL",
    "expiresAt": "2025-12-27T00:00:00Z"
  }'

# Expected: 200 with announcement + thread
```

### Test 6: List Announcements

```bash
curl http://localhost:3000/api/announcements \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 with array of announcements (filtered by role)
```

---

## Authorization Testing

### Test: Parent Cannot Access Staff API

```bash
# As parent, try to create thread (should fail)
curl -X POST http://localhost:3000/api/messages/threads \
  -H "Authorization: Bearer $PARENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Hack", "content": "x", "childId": "rec123"}'

# Expected: 403 Forbidden
```

### Test: Parent Can Only See Own Child's Threads

```bash
# As parent, try to see thread for different child
curl "http://localhost:3000/api/messages/threads/rec-thread-other-child" \
  -H "Authorization: Bearer $PARENT_TOKEN"

# Expected: 403 Forbidden or empty
```

---

## Performance Testing

### Load Test: Large Thread with Many Replies

**Setup:**
1. Create thread with 100+ messages/replies
2. Measure load time

**Steps:**
```bash
# GET thread with many messages
time curl http://localhost:3000/api/messages/threads/rec... \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- ✓ Load time < 2 seconds
- ✓ All messages load correctly
- ✓ Nested replies render properly

### Load Test: Large Thread List

**Setup:**
1. Create 100+ threads in a KiTA
2. Measure list load time

**Steps:**
```bash
# GET all threads
time curl http://localhost:3000/api/messages/threads \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:**
- ✓ Load time < 1 second
- ✓ Pagination works (if implemented)
- ✓ List shows recent threads first

---

## Edge Cases

### Test: Empty Thread List

**Steps:**
1. Log in as staff with no threads
2. Navigate to messaging

**Expected:**
- ✓ Empty state message shown
- ✓ No errors
- ✓ Can create new thread

### Test: Thread with No Replies

**Steps:**
1. Create thread
2. View as parent
3. Don't reply

**Expected:**
- ✓ Single message visible
- ✓ Reply form accessible
- ✓ No errors from missing replies

### Test: Very Long Message Content

**Steps:**
1. Create message with 5000+ characters
2. Send and view

**Expected:**
- ✓ Content stores correctly
- ✓ Displays without truncation
- ✓ Formatting preserved

### Test: Expired Announcement

**Steps:**
1. Create announcement with past expiration date
2. View as parent

**Expected:**
- ✓ Announcement doesn't appear in list
- ✓ No errors
- ✓ Record still exists in database

---

## Browser Testing

### Desktop (Chrome, Firefox, Safari)
- [ ] Thread list loads
- [ ] Thread view readable
- [ ] Reply form works
- [ ] Buttons responsive
- [ ] Timestamps display correctly

### Mobile (iOS, Android)
- [ ] Layout responsive
- [ ] Thread list scrollable
- [ ] Reply form doesn't cut off
- [ ] Buttons tappable
- [ ] Keyboard behavior normal

### Tablet (iPad, Android Tablet)
- [ ] Two-column layout renders correctly
- [ ] Thread list visible alongside content
- [ ] Reply form accessible
- [ ] No horizontal scrolling needed

---

## Troubleshooting Tests

### Test: Connection Error Handling

**Steps:**
1. Simulate network error (DevTools → offline)
2. Try to send reply
3. Go back online
4. Retry

**Expected:**
- ✓ Error message shown
- ✓ Retry button available
- ✓ No data loss

### Test: Session Expiry

**Steps:**
1. Login as parent
2. Let session expire (log out in another tab)
3. Try to send reply

**Expected:**
- ✓ Redirected to login
- ✓ Clear error message
- ✓ Can log back in

### Test: Database Connection Loss

**Steps:**
1. Stop database (or simulate)
2. Try to load threads

**Expected:**
- ✓ Error message shown
- ✓ No server crash
- ✓ Graceful degradation

---

## Regression Testing

After any code changes, re-run:
- Scenario 1 (staff creates thread)
- Scenario 2 (parent views message)
- Scenario 3 (parent replies)
- Scenario 9 (multi-KiTA isolation)
- API Test 1-5

---

## Sign-Off Checklist

- [ ] All 10 scenarios pass
- [ ] API tests pass
- [ ] Authorization tests pass
- [ ] Performance tests pass
- [ ] Edge cases handled
- [ ] Desktop browser tested
- [ ] Mobile browser tested
- [ ] Error handling verified
- [ ] No console errors
- [ ] Database consistent
- [ ] Ready for UAT

---

## Known Issues / Limitations

(Document any issues found during testing)

- Issue 1: [Description]
- Issue 2: [Description]

