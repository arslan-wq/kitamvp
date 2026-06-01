# Enhanced Messaging (Phase 3) - Quick Testing Checklist

## ⚡ Quick Start (5 minutes)

### 1. Run Database Migration
```bash
cd /Users/olg21/Downloads/kita-app
npx prisma migrate dev --name add_enhanced_messaging
```

**Expected Output:**
```
✓ Your database is now in sync with your schema.
✓ Generated Prisma Client
```

### 2. Start Development Server
```bash
npm run dev
```

**Expected Output:**
```
▲ Next.js 14.x.x
- Local: http://localhost:3000
```

---

## 📋 Testing Tasks (30-45 minutes)

### Phase A: Staff Messaging Interface (10 min)

**Login as staff user** (BETREUER or KITA_LEITER role)

1. **Navigate to Messaging**
   - [ ] Click "Dashboard" in sidebar
   - [ ] Look for "Nachrichten & Ankündigungen" module
   - [ ] Page loads without errors

2. **Create New Thread**
   - [ ] Child dropdown shows children
   - [ ] Can select a child
   - [ ] Subject field editable
   - [ ] Message content field editable
   - [ ] Can click "Nachricht starten"
   - [ ] Thread appears in list after sending

3. **View Thread Details**
   - [ ] Thread list shows recently created thread
   - [ ] Click on thread to view
   - [ ] Original message displays with sender name
   - [ ] Timestamp shows correctly (e.g., "13:45")
   - [ ] Reply form visible at bottom

---

### Phase B: Parent Inbox (10 min)

**Login as parent user** (with enrolled child matching staff's thread)

1. **Navigate to Parent Dashboard**
   - [ ] Log in as parent
   - [ ] Click "Dashboard"
   - [ ] Scroll to "📬 Nachrichten & Ankündigungen" section

2. **View Message Inbox**
   - [ ] "Nachrichten" tab visible and active
   - [ ] Thread list shows message about child
   - [ ] Thread shows: child name, staff name, message count, timestamp
   - [ ] No other children's messages visible (if parent has multiple children)

3. **Read Thread**
   - [ ] Click on thread from list
   - [ ] Full conversation loads on right side
   - [ ] Original message from staff visible
   - [ ] Shows staff member's name and timestamp
   - [ ] Message content readable

---

### Phase C: Parent Reply (10 min)

1. **Send Reply**
   - [ ] Click in reply text area at bottom
   - [ ] Type: "Thank you for the update!"
   - [ ] Click "Antwort senden" button
   - [ ] Button shows loading state (e.g., "Wird gesendet...")

2. **Verify Reply**
   - [ ] Reply appears immediately in thread
   - [ ] Shows parent name as sender
   - [ ] Timestamp updates (shows "jetzt" or current time)
   - [ ] Reply position is below original message
   - [ ] Text area clears after sending

---

### Phase D: Staff Views Parent Reply (5 min)

**Switch back to staff user**

1. **See Updated Thread**
   - [ ] Refresh messaging page (or wait for auto-update)
   - [ ] Thread shows updated timestamp
   - [ ] Thread shows increased message count
   - [ ] Click to view thread

2. **View Parent's Reply**
   - [ ] Parent's reply appears in thread
   - [ ] Shows parent name as sender
   - [ ] Correct timestamp shown
   - [ ] Reply is nested/indented under original message (if nested replies implemented)

---

### Phase E: Announcements (10 min)

**As staff user**

1. **Create Announcement**
   - [ ] Leave child dropdown empty (no child selected)
   - [ ] Subject: "KiTA Closure"
   - [ ] Message: "The KiTA will be closed from Dec 24-26"
   - [ ] Check if "isAnnouncement" checkbox available
   - [ ] Click "Senden"
   - [ ] No errors

**As parent user**

2. **View Announcement**
   - [ ] Navigate to Parent Dashboard
   - [ ] Scroll to Messaging section
   - [ ] Click "Ankündigungen" tab
   - [ ] Announcement appears in list
   - [ ] Shows title, content, and creator name
   - [ ] Can read full announcement

---

## 🔒 Authorization Testing (5 min)

### Parent Cannot Send Messages
- [ ] Parent cannot create new thread (button hidden or API blocks)
- [ ] Parent can only reply to existing messages

### Multi-KiTA Isolation (if multiple KiTAs exist)
- [ ] Staff only sees own KiTA's children
- [ ] Parent only sees own child's messages
- [ ] Messages from other KiTAs not visible

---

## 🐛 Error Handling (5 min)

1. **Empty State**
   - [ ] Staff with no threads sees friendly message
   - [ ] Parent with no messages sees friendly message

2. **Network Error**
   - [ ] Turn off internet → try to send message
   - [ ] Error message displays (not a crash)
   - [ ] Restore internet → can retry

3. **Missing Data**
   - [ ] Try to view thread that doesn't exist
   - [ ] Get 404 or friendly error (not a crash)

---

## 📱 Responsive Design (5 min)

### Desktop (1920px)
- [ ] Thread list on left, content on right
- [ ] Layout clear and readable
- [ ] No horizontal scrolling

### Tablet (768px iPad)
- [ ] Thread list visible
- [ ] Reply form not cut off
- [ ] Buttons tappable (44px+)

### Mobile (375px iPhone)
- [ ] Thread list stacked vertically or in dropdown
- [ ] Message readable without horizontal scroll
- [ ] Reply form fully accessible
- [ ] Keyboard behavior normal

---

## 🗄️ Database Verification

After testing, verify database structure:

```bash
# Check MessageThread table
npx prisma studio

# Or via SQL
psql $DATABASE_URL
\d "MessageThread"
\d "Message"
\d "Announcement"
\d "Notification"
```

**Expected:**
- [ ] MessageThread table exists with columns: id, kitaId, childId, title, startedBy, isAnnouncement, isResolved, createdAt, updatedAt
- [ ] Message table exists with columns: id, threadId, parentId, senderId, senderName, content, attachments, readBy, createdAt, updatedAt
- [ ] Announcement table exists
- [ ] Notification table exists

---

## 📊 Test Results Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Database Migration | [ ] Pass / [ ] Fail | |
| Staff Thread Creation | [ ] Pass / [ ] Fail | |
| Staff Thread View | [ ] Pass / [ ] Fail | |
| Parent Message View | [ ] Pass / [ ] Fail | |
| Parent Reply | [ ] Pass / [ ] Fail | |
| Staff Sees Reply | [ ] Pass / [ ] Fail | |
| Announcements | [ ] Pass / [ ] Fail | |
| Authorization | [ ] Pass / [ ] Fail | |
| Error Handling | [ ] Pass / [ ] Fail | |
| Mobile Responsive | [ ] Pass / [ ] Fail | |

---

## 🎯 Sign-Off Criteria

- [ ] All test tasks completed
- [ ] No critical errors (crashes, data loss)
- [ ] Staff can communicate with parents
- [ ] Parents receive and can reply to messages
- [ ] Multi-tenant isolation works
- [ ] Responsive on mobile/tablet
- [ ] Ready for Phase 4 or refinement

---

## 📝 Issues Found

(Document any bugs or unexpected behavior)

```
Issue #1: [Description]
- Severity: [ ] Critical / [ ] High / [ ] Medium / [ ] Low
- Steps to reproduce: [...]
- Expected: [...]
- Actual: [...]

Issue #2: [...]
```

---

## ✅ Testing Completed

- **Date**: [_______________]
- **Tester**: [_______________]
- **Overall Status**: [ ] PASS / [ ] FAIL
- **Notes**: [_______________]

