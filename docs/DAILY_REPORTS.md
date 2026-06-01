# Daily Reports (Tagesberichte) Feature

## Overview

The Daily Reports feature enables KiTA staff (Betreuer, Kita Leiter) to document detailed daily information about each child's activities, health, behavior, and development. Parents can access these reports to stay informed about their child's day.

## Key Features

- **Comprehensive Daily Logging**: Record meals, sleep, toileting, activities, mood, incidents, and medications
- **Dynamic Form Fields**: Add/remove activities and incidents as needed
- **Date-based Organization**: One report per child per day with update capability
- **Multi-section Recording**: Organized into logical sections (meals, health, activities, etc.)
- **Parent Access**: Parents can view daily reports for their enrolled children
- **Role-based Access Control**: Only staff with ADMIN, KITA_LEITER, or BETREUER roles can create/edit

## Architecture

### Database Schema

The `DailyReport` model stores daily documentation:

```prisma
model DailyReport {
  id              String    @id @default(cuid())
  childId         String
  child           Child     @relation(fields: [childId], references: [id])
  kitaId          String
  kita            KiTA      @relation(fields: [kitaId], references: [id])
  createdBy       String    // User ID
  
  // Date for the report (set to 00:00:00)
  date            DateTime  @index([childId, date])
  
  // Meal tracking (stored as JSON array)
  meals           String    // Array of { type: 'breakfast'|'lunch'|'snack', consumed: boolean, notes?: string }
  extraBottles    Int       @default(0)
  extraBottleNotes String?
  
  // Sleep tracking
  sleepTime       String?   // HH:MM format
  sleepDuration   Int?      // minutes
  
  // Toileting
  toiletVisits    Int       @default(0)
  diaperChanges   Int       @default(0)
  
  // Activities & mood (stored as JSON)
  activities      String    // Array of { name: string, notes?: string }
  mood            String?   // 'Glücklich', 'Zufrieden', 'Müde', 'Mürrisch'
  
  // Health & incidents (stored as JSON)
  incidents       String    // Array of { type: string, description?: string, treatment?: string }
  medications     String[]  // Array of medication names
  
  // General notes
  notes           String?
  
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### API Endpoints

#### GET /api/daily-reports

Fetch daily reports with optional filtering.

**Query Parameters:**
- `childId` (required): Child ID to fetch reports for
- `date` (optional): Single date (YYYY-MM-DD) to fetch exact day
- `startDate` and `endDate` (optional): Date range filtering (both required)
- Default: Last 30 days if no date range specified

**Response:**
```json
[
  {
    "id": "rec...",
    "date": "2026-05-31T00:00:00Z",
    "meals": "[{\"type\":\"breakfast\",\"consumed\":true,\"notes\":\"Porridge\"}]",
    "extraBottles": 1,
    "extraBottleNotes": "Formula milk",
    "sleepTime": "12:30",
    "sleepDuration": 45,
    "toiletVisits": 3,
    "diaperChanges": 2,
    "activities": "[{\"name\":\"Playground\",\"notes\":\"Very active\"}]",
    "mood": "Glücklich",
    "incidents": "[{\"type\":\"Fall\",\"description\":\"Minor\",\"treatment\":\"No treatment needed\"}]",
    "medications": ["Vitamin D"],
    "notes": "Great day!",
    "child": { "firstName": "Anna", "lastName": "Mueller" }
  }
]
```

#### POST /api/daily-reports

Create or update a daily report (upsert).

**Request Body:**
```json
{
  "childId": "rec...",
  "date": "2026-05-31",
  "meals": [
    { "type": "breakfast", "consumed": true, "notes": "Porridge" },
    { "type": "lunch", "consumed": true, "notes": "Chicken & rice" },
    { "type": "snack", "consumed": false, "notes": "" }
  ],
  "extraBottles": 1,
  "extraBottleNotes": "Formula milk",
  "sleepTime": "12:30",
  "sleepDuration": 45,
  "toiletVisits": 3,
  "diaperChanges": 2,
  "activities": [
    { "name": "Playground", "notes": "Very active" },
    { "name": "Story time", "notes": "Enjoyed the book" }
  ],
  "mood": "Glücklich",
  "incidents": [
    { "type": "Fall", "description": "Minor", "treatment": "No treatment needed" }
  ],
  "medications": ["Vitamin D"],
  "notes": "Great day!"
}
```

**Response:**
- 201 Created: New report created
- 200 OK: Existing report updated
- 400 Bad Request: Missing required fields (childId, date)
- 403 Forbidden: Unauthorized user or child not in same KiTA

## Form Structure

### DailyReportForm Component

Located at: `src/app/dashboard/daily-reports/components/DailyReportForm.tsx`

#### Form Sections

1. **Child & Date Selection**
   - Required: Child dropdown and date picker
   - Ensures all reports are linked to a specific child and date

2. **Meals Section**
   - Three meal fields (breakfast, lunch, snack)
   - Each meal has: type, consumed (checkbox), notes
   - Extra bottles tracking: quantity and notes

3. **Sleep & Rest**
   - Sleep time (HH:MM format)
   - Sleep duration (minutes)

4. **Toileting**
   - Number of WC visits
   - Number of diaper changes

5. **Activities & Mood**
   - Dynamic activity list (add/remove)
   - Mood selection (4 emoji options): Glücklich, Zufrieden, Müde, Mürrisch

6. **Health & Incidents**
   - Dynamic incident list with: type, description, treatment
   - Medication administration tracking

7. **General Notes**
   - Free-form textarea for additional observations

### Form State Management

Uses multiple `useState` hooks:

```typescript
const [selectedChildId, setSelectedChildId] = useState('');
const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
const [meals, setMeals] = useState([...]);
const [activities, setActivities] = useState([...]);
const [incidents, setIncidents] = useState([...]);
// ... more state
```

Dynamic arrays (activities, incidents) use:
- `add` functions that push new items
- `remove` functions that filter by index
- Items with empty fields are filtered before submission

## Parent Viewing Component

Located at: `src/app/parent/components/DailyReportViewer.tsx`

### Features

- **Date Picker**: Select which date's report to view
- **Meals Display**: Shows consumed status with emoji indicators
- **Sleep Information**: Formatted sleep time and duration
- **Toileting Stats**: WC visits and diaper changes in grid layout
- **Activities & Mood**: Visual display with mood emoji
- **Health Section**: Highlights incidents with red background
- **Medications**: Listed separately for quick reference
- **General Notes**: Full text display

### Data Fetching

- Fetches from `/api/daily-reports?childId={childId}&startDate={date}&endDate={date}`
- Parses JSON strings (meals, activities, incidents) back to objects
- Shows loading skeleton while fetching
- Displays informative message if no report exists

## Integration with Parent Dashboard

The DailyReportViewer is integrated into the parent dashboard (`src/app/parent/dashboard/components/ParentDashboardClient.tsx`):

```typescript
<DailyReportViewer
  childId={selectedChild.id}
  childName={`${selectedChild.firstName} ${selectedChild.lastName}`}
/>
```

Appears after meal plan and activities timeline sections.

## User Flows

### Staff Creating Daily Report

1. Navigate to Dashboard → Tagesbericht (Daily Reports)
2. Select a child from dropdown
3. Date auto-fills with today's date (changeable)
4. Fill in each section as needed
5. Click "Bericht erstellen" (Create Report)
6. Form resets after successful submission
7. Can immediately start next report

### Staff Updating Existing Report

1. Select same child and date
2. Form shows existing data
3. Make changes
4. Submit - system updates instead of creating new
5. Success message confirms update

### Parents Viewing Reports

1. Go to Parent Dashboard
2. Select child (if multiple)
3. Scroll to "Tagesberichte" section
4. Use date picker to view different days
5. Review all documented information
6. Read staff notes at bottom

## Data Validation

### Frontend Validation

- Date field is required
- Child selection is required
- Empty items filtered from dynamic arrays
- Numbers default to 0
- JSON stringification handles complex objects

### Backend Validation

- `childId` and `date` required
- Child must belong to same KiTA as user
- Parent GET access verified via child enrollment
- Data stored as JSON strings (flexible schema)
- Arrays converted to JSON during storage

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Missing required fields" | childId or date not provided | Ensure both fields filled |
| "Child not found or access denied" | Child not in same KiTA | Contact admin to verify enrollment |
| "Unauthorized" | User not staff member | Only ADMIN, KITA_LEITER, BETREUER can create |
| Parse errors in viewer | Malformed JSON in database | Contact admin for data correction |

### Parent-facing Messages

- No report: "Für diesen Tag gibt es noch keinen Tagesbericht. Die Betreuer werden einen hinzufügen, wenn Sie verfügbar sind."
- Error loading: Displays error message with red background
- Loading: Shows skeleton placeholders

## Data Types & Structures

### Meal Object
```json
{
  "type": "breakfast|lunch|snack",
  "consumed": true|false,
  "notes": "optional string"
}
```

### Activity Object
```json
{
  "name": "activity name",
  "notes": "optional details"
}
```

### Incident Object
```json
{
  "type": "incident type",
  "description": "what happened",
  "treatment": "treatment applied"
}
```

### Medications Array
```json
["Vitamin D", "Aspirin"]
```

## Security & Privacy

- **Role-based Access**: Only staff with appropriate roles can create reports
- **Data Isolation**: Reports linked to KiTA; users can only access their KiTA's data
- **Parent Verification**: GET endpoint verifies parents have access to requested child
- **Data Persistence**: All changes tracked via database timestamps
- **No Deletion**: Reports are updated, never hard-deleted (audit trail)

## Testing Checklist

- [ ] Staff can create daily report with full data
- [ ] Form resets after successful submission
- [ ] Updating existing report preserves child & date
- [ ] Dynamic fields (activities, incidents) add/remove correctly
- [ ] Empty items filtered before submission
- [ ] Date format consistent (YYYY-MM-DD)
- [ ] Parents see correct reports for their children
- [ ] Date picker allows browsing historical reports
- [ ] JSON parsing handles special characters correctly
- [ ] Mood emojis display correctly
- [ ] Extra bottles section shows only when > 0
- [ ] Incident section highlighted with warning colors
- [ ] Medications listed as bullet points
- [ ] General notes textarea preserves formatting
- [ ] Loading skeleton shows while fetching
- [ ] Error messages display appropriately

## Future Enhancements

- Templates for common reports
- Bulk reporting for multiple children
- Export to PDF for parents
- Email notifications when new report created
- Analytics dashboard (progress tracking)
- Photo uploads for activities
- Compliance reporting (government documentation)
- Multi-language support for incident types
- Integration with meal plans for meal consistency checks
