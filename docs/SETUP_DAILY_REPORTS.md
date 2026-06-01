# Daily Reports - Setup & Configuration Guide

## Installation Steps

### 1. Database Migration

The DailyReport schema should already be defined in your `prisma/schema.prisma`. Run the migration:

```bash
npx prisma migrate dev --name add_daily_reports
# or if updating:
npx prisma db push
```

This creates the `DailyReport` table in PostgreSQL with all required fields.

### 2. API Endpoints

#### Verify API Route Exists

Check `src/app/api/daily-reports/route.ts` contains:

**GET Handler:**
- Filters by childId (required)
- Supports date, startDate/endDate filtering
- Parent access verification
- Returns ordered by date descending

**POST Handler:**
- Validates childId and date
- Checks child belongs to same KiTA
- Implements upsert logic (creates or updates)
- Stores arrays as JSON strings

If file is missing, create with this structure:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // See DAILY_REPORTS.md API section
}

export async function POST(request: NextRequest) {
  // See DAILY_REPORTS.md API section
}
```

### 3. Staff Interface

#### Create Page

Verify `src/app/dashboard/daily-reports/page.tsx` exists:

```typescript
export default async function DailyReportsPage() {
  // Server-side auth check
  // Fetch children in KiTA
  // Render DailyReportForm
}
```

#### Create Form Component

Verify `src/app/dashboard/daily-reports/components/DailyReportForm.tsx` exists with:

- Child selection dropdown
- Date picker (defaults to today)
- 7 form sections (meals, sleep, toileting, activities, health, notes)
- Dynamic add/remove for activities and incidents
- POST submission to `/api/daily-reports`
- Success/error messaging
- Form reset on successful submission

### 4. Parent Viewer Component

Verify `src/app/parent/components/DailyReportViewer.tsx` exists:

- Date picker for report selection
- Meals section with consumption status
- Sleep information display
- Toileting statistics
- Activities & mood display
- Health & incidents section
- General notes display
- Fetch from `/api/daily-reports` with childId and date

### 5. Integration with Parent Dashboard

Update `src/app/parent/dashboard/components/ParentDashboardClient.tsx`:

```typescript
import DailyReportViewer from '../../components/DailyReportViewer';

// In JSX, add section:
<div className="space-y-4">
  <h3 className="text-2xl font-bold text-gray-900">📋 Tagesberichte</h3>
  <DailyReportViewer
    childId={selectedChild.id}
    childName={`${selectedChild.firstName} ${selectedChild.lastName}`}
  />
</div>
```

## Configuration

### Default Values

Modify in `DailyReportForm.tsx`:

```typescript
// Default date (currently today)
const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

// Default meal types
const [meals, setMeals] = useState([
  { type: 'breakfast', consumed: false, notes: '' },
  { type: 'lunch', consumed: false, notes: '' },
  { type: 'snack', consumed: false, notes: '' },
]);

// Default mood options
const moodOptions = ['Glücklich', 'Zufrieden', 'Müde', 'Mürrisch'];

// Default incident types (customize as needed)
const incidentTypes = [
  'Fall',
  'Scratch',
  'Bite',
  'Conflict',
  'Illness',
  'Allergy Reaction',
  'Other'
];
```

### Customization

#### Add Custom Incident Types

Edit `DailyReportForm.tsx`:

```typescript
const incidentTypes = [
  'Fall',
  'Scratch',
  'Bite',
  'Conflict',
  'Illness',
  'Allergy Reaction',
  'Custom Type 1',
  'Custom Type 2',
];
```

#### Change Mood Options

Edit `DailyReportForm.tsx`:

```typescript
const moodOptions = [
  'Sehr Glücklich',
  'Glücklich',
  'Neutral',
  'Betrübt',
];
```

#### Adjust Time Format

Default is HH:MM format. To change:

```typescript
// In DailyReportForm
const [sleepTime, setSleepTime] = useState('');
// Input type="time" outputs HH:MM format

// In DailyReportViewer
<p className="text-2xl font-bold">{report.sleepTime}</p>
```

## Usage Instructions

### For KiTA Staff (Creating Reports)

1. **Navigate to Tagesberichte**
   - Click "Dashboard" in sidebar
   - Select "Tagesbericht" or Daily Reports section

2. **Select Child**
   - Use dropdown to choose child
   - Required field

3. **Verify/Change Date**
   - Date defaults to today
   - Use date picker to change
   - Required field

4. **Fill Meals Section**
   - Three meals (breakfast, lunch, snack)
   - For each: check "Gegessen" if child ate
   - Add notes if relevant
   - Track extra bottles if applicable

5. **Enter Sleep Information**
   - Sleep time: use HH:MM format (e.g., "12:30")
   - Duration: minutes (e.g., "45")
   - Optional fields - leave blank if not applicable

6. **Record Toileting**
   - WC visits: count throughout day
   - Diaper changes: count throughout day
   - Numeric fields

7. **Log Activities**
   - Click "Activity hinzufügen" to add
   - Enter activity name (e.g., "Playground", "Art")
   - Add optional notes
   - Remove with "X" button if needed

8. **Select Mood**
   - Choose emoji representing overall mood
   - 4 options available
   - Single selection

9. **Record Health & Incidents**
   - Click "Incident hinzufügen" to add
   - Select incident type
   - Describe what happened
   - Note any treatment applied
   - Record medications given (comma-separated)

10. **Add General Notes**
    - Final textarea for any additional observations
    - Not required

11. **Submit Report**
    - Click "Bericht erstellen"
    - Success message confirms creation/update
    - Form resets for next report

### For Parents (Viewing Reports)

1. **Navigate to Parent Dashboard**
   - Log in as parent
   - Click "Dashboard"

2. **Select Child**
   - Use child selector if multiple children enrolled
   - Scroll down past activities

3. **Find Tagesberichte Section**
   - Located below "Wochenplan" (Meal Plan)
   - Shows "📋 Tagesberichte" heading

4. **Pick a Date**
   - Use date picker at top
   - Defaults to today
   - Can browse past dates (30-day history available)

5. **Review Report Sections**
   - Meals: Consumption status with checkmarks
   - Sleep: Time and duration
   - Toileting: Statistics in grid
   - Activities: List with notes
   - Mood: Emoji with text
   - Health: Incidents highlighted
   - Medications: Listed if applicable
   - Notes: Staff comments

6. **No Report Message**
   - If no report for selected date
   - States when report will be created
   - No action needed

## API Reference

### Using cURL

#### Get Today's Report
```bash
curl -H "Authorization: Bearer TOKEN" \
  'http://localhost:3000/api/daily-reports?childId=rec123&startDate=2026-05-31&endDate=2026-05-31'
```

#### Get Last 30 Days
```bash
curl -H "Authorization: Bearer TOKEN" \
  'http://localhost:3000/api/daily-reports?childId=rec123'
```

#### Create New Report
```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "rec123",
    "date": "2026-05-31",
    "meals": [
      {"type":"breakfast","consumed":true,"notes":"Porridge"},
      {"type":"lunch","consumed":true,"notes":"Chicken & rice"},
      {"type":"snack","consumed":false,"notes":""}
    ],
    "extraBottles": 1,
    "sleepTime": "12:30",
    "sleepDuration": 45,
    "toiletVisits": 3,
    "diaperChanges": 2,
    "activities": [
      {"name":"Playground","notes":"Very active"}
    ],
    "mood": "Glücklich",
    "incidents": [],
    "medications": ["Vitamin D"],
    "notes": "Great day!"
  }' \
  http://localhost:3000/api/daily-reports
```

## Data Entry Best Practices

### Meal Notes

- Use short descriptions: "Porridge with berries", "Chicken & rice"
- Note if child had allergic reaction or refusal
- Example: "Refused dairy, offered alternative"

### Activity Descriptions

- Focus on learning/engagement: "Block play", "Story time", "Outdoor exploration"
- Note behavior: "Very engaged", "Shy today", "Excellent cooperation"
- Duration implicit (day-long tracking)

### Incident Recording

Best practice format:
- **Type**: Categorize (Fall, Scratch, Bite, etc.)
- **Description**: What happened, where, severity
  - "Small fall in sandbox area, landed on hands"
  - "Bit arm by another child during conflict"
- **Treatment**: What was done
  - "Cleaned and monitored"
  - "Ice pack applied, no visible injury"
  - "Attended to child, separated, discussed sharing"

### Medication Notes

- Record actual medications given (not just scheduled)
- Format: "Vitamin D, 2x daily" or "Aspirin 1x"
- Use clear names, avoid abbreviations
- If special dosage, note: "Vitamin D (double dose today)"

## Troubleshooting

### Report Not Creating

**Symptom:** "Bericht erstellen" button doesn't work

**Solutions:**
1. Verify all required fields: Child and Date must be filled
2. Check browser console for error messages
3. Verify user role is ADMIN, KITA_LEITER, or BETREUER
4. Check network tab - API response status

### Report Shows but Date is Wrong

**Symptom:** Report date is 1 day off

**Solutions:**
1. Database stores UTC time; check timezone handling
2. Date picker should show YYYY-MM-DD format
3. Backend sets date to 00:00:00 UTC

### Parent Can't See Report

**Symptom:** Parent dashboard shows "Noch kein Tagesbericht" even though staff created one

**Solutions:**
1. Verify parent is enrolled as guardian for the child
2. Check date matches in both staff entry and parent view
3. Verify report is for correct child (childId)
4. Refresh page (F5)
5. Check browser console for fetch errors

### JSON Parse Errors in Meals/Activities

**Symptom:** Activities or meals not displaying in parent view

**Solutions:**
1. Check backend stored valid JSON strings
2. Verify form submitted arrays correctly
3. Clear data and re-enter
4. Contact admin to inspect database record

### Extra Bottles Not Showing

**Symptom:** Entered bottles but they don't appear in parent view

**Solutions:**
1. Viewer only shows if extraBottles > 0
2. Verify number field had value
3. Ensure form submission succeeded (check console)

## Performance Considerations

### Query Optimization

- Date index on `DailyReport(childId, date)` enables fast lookups
- Default 30-day window limits data transfer
- Parent verification happens server-side (don't leak child data)

### Loading States

- Skeleton placeholders show while fetching
- Prevents layout shift
- Load time typically < 1s

### JSON Storage

- Flexible schema allows future field additions
- Arrays stored as JSON strings (indexable)
- Parse on client side (no overhead on server)

## Monitoring & Maintenance

### Check Database Health

```sql
-- Count reports per child
SELECT childId, COUNT(*) as report_count
FROM "DailyReport"
GROUP BY childId
ORDER BY report_count DESC;

-- Find recent reports
SELECT id, childId, date, createdAt
FROM "DailyReport"
ORDER BY createdAt DESC
LIMIT 10;

-- Check for orphaned reports (child deleted)
SELECT dr.id, dr.childId
FROM "DailyReport" dr
LEFT JOIN "Child" c ON dr.childId = c.id
WHERE c.id IS NULL;
```

### Backup Considerations

- Daily reports contain important documentation
- Include in regular database backups
- Implement point-in-time recovery if possible
- Never delete reports (update instead)

## Next Steps & Enhancements

### Recommended Phase 2 Features

1. **PDF Export**
   - Generate PDF of single report
   - Include child info, date, all sections
   - Email to parents

2. **Photo Integration**
   - Upload activity photos during report
   - Link photos to activities
   - Show in parent view

3. **Templates**
   - Pre-fill common activities
   - Default incident types per child
   - Speed up report creation

4. **Analytics**
   - Mood trends over time
   - Activity frequency
   - Development tracking

5. **Compliance Reporting**
   - Government documentation format
   - Bulk report generation
   - Audit trail export

6. **Multi-language**
   - German labels + English option
   - Customizable mood/incident types per KiTA
   - Parent language preference
