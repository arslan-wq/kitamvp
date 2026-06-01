# 🚀 Quick Start - Enhanced Messaging Testing

## ✅ Setup Complete!

The following has been automatically set up:

- ✓ Database schema migrated (MessageThread, Message, Announcement, Notification tables created)
- ✓ Test data seeded (1 KiTA, 1 staff user, 1 parent, 2 children)
- ✓ Sample messages and announcement created

---

## 🔐 Test Credentials

### Staff User (KiTA Worker)
```
Email: betreuer@kita.ch
Password: password123
Role: BETREUER (Childcare provider)
```

### Parent User
```
Email: parent@example.com
Password: password123
Role: PARENT (Parent/Guardian)
```

### Test Children
- Maria Smith (born 2021-05-15)
  - Allergies: Erdnüsse (severe), Milchprodukte (moderate)
- Anna Smith (born 2022-08-20)
  - No allergies

---

## 🎯 Testing Scenarios

### Start the App
```bash
cd /Users/olg21/Downloads/kita-app
npm run dev
```
Navigate to: **http://localhost:3000**

---

### Scenario 1: Staff Views Message Threads (3 min)

1. **Login as staff:**
   - Email: `betreuer@kita.ch`
   - Password: `password123`

2. **Navigate to Messaging:**
   - Click "Dashboard" in sidebar
   - Look for "💬 Nachrichten & Ankündigungen" module
   - Click to enter Messaging interface

3. **Verify created threads:**
   - Should see 2 message threads:
     - "Maria macht großartige Fortschritte" (about Maria)
     - "Annas erste Woche Rückblick" (about Anna)
   - Should show message count and last update time
   - Should show sender name (Maria Müller)

4. **Click on a thread to view:**
   - Original message displays
   - Shows staff member's name: "Maria Müller"
   - Shows timestamp of message
   - Reply visible from parent (John Smith)
   - All nested properly

---

### Scenario 2: Parent Views Message Inbox (3 min)

1. **Logout and login as parent:**
   - Email: `parent@example.com`
   - Password: `password123`

2. **Navigate to Parent Dashboard:**
   - Click "Dashboard"
   - Scroll down to "📬 Nachrichten & Ankündigungen" section

3. **Verify inbox:**
   - **Messages tab** (active by default)
     - Should show 2 message threads
     - Each shows child name, staff member name, message count
     - Most recent first

4. **Click on a thread:**
   - Full conversation loads on right side
   - Staff's original message visible
   - Your reply visible below
   - Can add new reply

---

### Scenario 3: Parent Sends Reply (2 min)

1. **Stay logged in as parent**

2. **Open any message thread**
   - Select one of the 2 threads

3. **Send a reply:**
   - Click in reply text area at bottom
   - Type: "Vielen Dank für das Feedback!"
   - Click "Antwort senden" button
   - Wait for button to show "Wird gesendet..."

4. **Verify:**
   - Reply appears immediately below previous message
   - Shows your name (John Smith)
   - Shows current timestamp
   - Reply text area clears

---

### Scenario 4: Staff Sees Parent Reply (2 min)

1. **Logout and login as staff again**

2. **Navigate to Messaging**

3. **Check the thread you replied to:**
   - Thread should show updated "updatedAt" timestamp
   - Click to view thread
   - Your new reply should appear below staff's message
   - Shows "John Smith" as sender
   - Shows timestamp of when reply was sent

---

### Scenario 5: View Announcements (2 min)

1. **Login as parent (if not already)**

2. **Go to Parent Dashboard**

3. **Click "Ankündigungen" tab** (next to Messages tab)
   - Should see 1 announcement: "Sommerferien Schließung"
   - Shows title and content
   - Shows creator: "Maria Müller"
   - Shows publication date
   - Shows expiration date: "2024-09-02"

---

### Scenario 6: Test Multi-Child View (2 min)

1. **Stay logged in as parent**

2. **Look at message list:**
   - Thread 1 is about "Maria Smith"
   - Thread 2 is about "Anna Smith"
   - Both parent and children visible

3. **Verify isolation:**
   - Can see messages about both children
   - No messages about other parents' children

---

### Scenario 7: Create New Message as Staff (3 min)

1. **Login as staff**

2. **Go to Messaging dashboard**

3. **Create new message:**
   - Select a child from dropdown
   - Enter subject: "Großartig gespielt heute"
   - Enter message: "Heute war ein wunderschöner Tag!"
   - Click "Nachricht starten"

4. **Verify:**
   - New thread appears in list
   - Thread shows in parent's inbox when they login

---

## 📊 Expected Test Results

| Feature | Status |
|---------|--------|
| Database tables created | ✓ Pass |
| Staff can view threads | ✓ Expected |
| Parent can view inbox | ✓ Expected |
| Parent can reply | ✓ Expected |
| Staff sees parent reply | ✓ Expected |
| Announcements visible to parents | ✓ Expected |
| Multi-child isolation | ✓ Expected |
| New message creation | ✓ Expected |

---

## 🔍 Advanced Testing

### Check Database Directly

```bash
# View MessageThread records
npx prisma studio

# Or use psql (if you have PostgreSQL CLI)
psql $DATABASE_URL
SELECT * FROM "MessageThread";
SELECT * FROM "Message";
SELECT * FROM "Announcement";
```

### Test API Endpoints

```bash
# Get all threads (requires valid auth token from login)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/messages/threads

# Get announcements
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/announcements
```

---

## 🐛 Troubleshooting

### "Email already exists" error when logging in
- The test user was already created. Use exact credentials above.

### Messages not appearing in parent inbox
- Ensure parent is enrolled with the child (already set up)
- Try refreshing the page (F5)
- Check browser console for errors (F12 → Console tab)

### No messages showing in staff interface
- Verify you're logged in as staff (check top-right corner)
- Verify you're in the correct KiTA (should be "Test KiTA")
- Try refreshing

### Database error "schema out of sync"
- Run: `npx prisma db push`
- If that fails, run: `npx prisma db push --force-reset` (warning: deletes all data)

---

## 📝 Notes for Testing

1. **First time?** Start with Scenario 1 (Staff Views Threads)
2. **Test order:** 1 → 2 → 3 → 4 → 5 → 6 → 7
3. **Each scenario** takes 2-3 minutes
4. **Total time:** ~20 minutes for all scenarios
5. **Need to reset?** Run: `npx prisma db push --force-reset` then re-seed

---

## 🎉 Success Criteria

If you can do all of these, Phase 3 is working:

- ✅ Staff creates message thread about a child
- ✅ Parent views message in their inbox
- ✅ Parent sends reply to staff
- ✅ Staff sees parent's reply
- ✅ Parent views announcement
- ✅ No data cross-contamination between children or parents
- ✅ No crashes or console errors

---

## 📁 Key Files

- Staff Interface: `src/app/dashboard/messaging/`
- Parent Interface: `src/app/parent/components/InboxViewer.tsx`
- API Routes: `src/app/api/messages/` and `src/app/api/announcements/`
- Database: Configured in `.env`

---

## 🚀 Next Steps

After successful testing:

1. Test in different browsers (Chrome, Firefox, Safari)
2. Test on mobile (resize browser to 375px width)
3. Test notifications (if email configured)
4. Load test with more messages
5. Ready for Phase 4: Billing & Invoicing

---

**Happy testing! 🧪**

Questions? Check `docs/TESTING_GUIDE.md` for detailed test scenarios.
