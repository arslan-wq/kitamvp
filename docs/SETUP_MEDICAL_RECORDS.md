# Medical Records Enhancement - Setup & Configuration Guide

## Installation Steps

### 1. Database Migration

The MedicalRecord, Vaccination, and HealthHistory models should already be defined in `prisma/schema.prisma`. Run the migration:

```bash
npx prisma migrate dev --name add_medical_records_enhancement
# or if updating:
npx prisma db push
```

This creates three tables: MedicalRecord, Vaccination, and HealthHistory.

### 2. API Endpoints

Verify these files exist:

**`src/app/api/medical-records/route.ts`**
- GET handler: Fetches medical record for a child
- POST handler: Creates or updates medical record (upsert)

**`src/app/api/medical-records/vaccinations/route.ts`**
- GET handler: Lists vaccinations for a child
- POST handler: Adds new vaccination record

**`src/app/api/medical-records/health-history/route.ts`**
- GET handler: Lists health history for a child
- POST handler: Adds new health history entry

All endpoints include:
- Authentication/authorization checks
- KiTA isolation verification
- Proper error handling with meaningful messages

### 3. Staff Interface

Verify these components exist:

**`src/app/dashboard/medical-records/components/MedicalRecordsForm.tsx`**
- Comprehensive form with 5 sections
- Doctor information input
- Health metrics (blood type, height, weight)
- Dynamic vaccination list (add/remove)
- Dynamic health history list (add/remove)
- Success/error messaging

**`src/app/dashboard/medical-records/page.tsx`**
- Server-side authentication and authorization
- Fetches children list from current KiTA
- Renders MedicalRecordsForm

### 4. Parent Viewer Component

Verify `src/app/parent/components/MedicalRecordsViewer.tsx` exists:
- Displays doctor information
- Shows health metrics
- Lists vaccinations chronologically
- Lists health history events
- Handles loading and error states
- Parent-only access verification

### 5. Dashboard Integration

Update `src/app/parent/dashboard/components/ParentDashboardClient.tsx`:

```typescript
import MedicalRecordsViewer from '../../components/MedicalRecordsViewer';

// In the JSX, after Daily Reports section:
<div className="space-y-4">
  <h3 className="text-2xl font-bold text-gray-900">🏥 Medizinische Informationen</h3>
  <MedicalRecordsViewer
    childId={selectedChild.id}
    childName={`${selectedChild.firstName} ${selectedChild.lastName}`}
    kitaId={selectedChild.kitaId}
  />
</div>
```

Also ensure Child interface includes `kitaId` field.

## Configuration

### Default Values

All fields are optional except:
- **For Vaccinations**: vaccineName, vaccinationDate
- **For Health History**: eventType, condition, date

Modify defaults in `MedicalRecordsForm.tsx` if needed.

### Customization

#### Add Doctor Types

Edit `MedicalRecordsForm.tsx` to add fields for other doctor types:

```typescript
// Example: adding allergist
const [allergistName, setAllergistName] = useState('');
const [allergistPhone, setAllergistPhone] = useState('');
// ... then in form
```

#### Modify Event Types

Edit EVENT_TYPES in `MedicalRecordsForm.tsx`:

```typescript
const EVENT_TYPES = [
  'Illness',
  'Injury',
  'Allergy Reaction',
  'Surgery',
  'Hospital Visit',
  'Dental',
  'Vaccination',
  'Custom Event 1',
  'Custom Event 2'
];
```

#### Change Severity Levels

Edit SEVERITY_OPTIONS in `MedicalRecordsForm.tsx`:

```typescript
const SEVERITY_OPTIONS = ['Mild', 'Moderate', 'Severe', 'Critical'];
```

#### Customize Blood Type Options

Update blood type select in form:

```typescript
<option value="">-- Auswählen --</option>
<option value="O+">O+</option>
<option value="O-">O-</option>
// Add or remove as needed
```

## Usage Instructions

### For KiTA Staff (Entering Medical Information)

1. **Navigate to Medical Records**
   - Click "Dashboard" in sidebar
   - Select "Medizinische Informationen" from modules grid
   - Or navigate to `/dashboard/medical-records`

2. **Select a Child**
   - Use dropdown at top of form
   - Required field

3. **Enter Doctor Information**
   - **Primary Doctor**: Name, phone, email, specialty
   - **Pediatrician**: Name, phone, email
   - **Emergency Doctor**: Name, phone
   - All optional

4. **Enter Health Metrics**
   - Blood type (A+, A-, B+, etc.)
   - Height in cm
   - Weight in kg
   - All optional

5. **Add Vaccinations** (optional)
   - Click "+ Impfung hinzufügen"
   - Enter vaccine name (required)
   - Fill optional fields: type, dates, location, batch number, notes
   - Add multiple by clicking again
   - Remove with "Entfernen" button

6. **Add Health History** (optional)
   - Click "+ Eintrag hinzufügen"
   - Select event type from dropdown
   - Enter condition (required)
   - Enter date event occurred (required)
   - Fill optional fields: resolution date, treatment, doctor, notes, severity
   - Check boxes for hospital admission and follow-up needed
   - Add multiple events
   - Remove with "Entfernen" button

7. **Save**
   - Click "Medizinische Informationen speichern"
   - Success message confirms save
   - Form resets for next entry

### For Parents (Viewing Medical Information)

1. **Navigate to Parent Dashboard**
   - Log in as parent
   - Click "Dashboard"

2. **Select Child** (if multiple children)
   - Use child selector dropdown

3. **Find Medical Information Section**
   - Located in parent dashboard after Daily Reports
   - Heading: "🏥 Medizinische Informationen"

4. **Review Information**
   - **Doctor Contacts**: Primary, pediatrician, emergency
   - **Health Metrics**: Blood type, height, weight
   - **Vaccinations**: List with dates and next due dates
   - **Health History**: Events with details, treatments, follow-up info

5. **Contact Information**
   - Click phone numbers to call
   - Click emails to compose message
   - All contacts readily available

## API Reference

### Get Medical Record

```bash
curl -H "Authorization: Bearer TOKEN" \
  'http://localhost:3000/api/medical-records?childId=rec123&kitaId=rec456'
```

### Add Medical Information

```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "rec123",
    "kitaId": "rec456",
    "primaryDoctor": "Dr. Mueller",
    "primaryDoctorPhone": "+41 44 123 4567",
    "bloodType": "O+",
    "height": 105,
    "weight": 18.5
  }' \
  http://localhost:3000/api/medical-records
```

### Add Vaccination

```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "rec123",
    "kitaId": "rec456",
    "vaccineName": "MMR",
    "vaccinationDate": "2025-01-15",
    "nextDueDate": "2027-01-15",
    "givenBy": "Dr. Mueller",
    "location": "Clinic A"
  }' \
  http://localhost:3000/api/medical-records/vaccinations
```

### Add Health History Entry

```bash
curl -X POST \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "childId": "rec123",
    "kitaId": "rec456",
    "eventType": "Illness",
    "condition": "Measles",
    "date": "2024-06-01",
    "resolvedDate": "2024-06-15",
    "treatment": "Rest and hydration",
    "severity": "Moderate"
  }' \
  http://localhost:3000/api/medical-records/health-history
```

## Data Entry Best Practices

### Vaccination Recording

**Format Examples:**
- Vaccine names: "MMR", "DPT", "Polio", "Varicella"
- Types: "Live attenuated", "Inactivated", "mRNA"
- Locations: "Clinic A", "Hospital", "Pharmacy", "Home visit"
- Batch numbers: "BATCH20250115", "LOT-2025-01"

**Tips:**
- Record immediately after vaccination
- Include batch number for safety recalls
- Note any side effects in notes field
- Set next due date based on vaccination schedule

### Health History Recording

**Event Types:**
- Illness: Fever, cold, measles, chickenpox, etc.
- Injury: Falls, cuts, sprains, fractures
- Allergy Reaction: To food, medicine, insect sting
- Surgery: Procedures requiring anesthesia
- Hospital Visit: Overnight stays
- Dental: Tooth-related issues

**Format Examples:**
- Condition: "Chickenpox", "Broken arm", "Peanut allergy reaction"
- Treatment: "Rest and hydration", "Immobilization", "Epinephrine injection"
- Doctor: "Dr. Mueller, Pediatrician"
- Severity: "Mild" (home care), "Moderate" (office visit), "Severe" (ER/hospital)

**Important Notes:**
- Use consistent naming for conditions
- Include resolution date if applicable
- Note any prescriptions or ongoing treatment
- Mark if hospital admission was required
- Check follow-up box if return visit needed

## Troubleshooting

### Form Not Saving

**Symptom:** Click "Speichern" but nothing happens

**Solutions:**
1. Check browser console (F12) for error messages
2. Verify all required fields are filled (childId, vaccination names, health event types/conditions/dates)
3. Verify user role is ADMIN, KITA_LEITER, or BETREUER
4. Check network tab to see if API request succeeded
5. Refresh page and try again

### Parent Can't See Medical Information

**Symptom:** Parent sees "Noch keine medizinischen Informationen verfügbar"

**Solutions:**
1. Verify staff has entered medical information for the child
2. Confirm parent is enrolled as guardian for the child
3. Check that childId and kitaId match
4. Refresh page
5. Try different child (if multiple) to rule out data issue

### Medical Information Shows But Partially

**Symptom:** Some fields missing (e.g., no vaccinations but doctor info shows)

**Solutions:**
1. Staff hasn't entered that information yet
2. Refresh page to ensure latest data loaded
3. Check that all sections were saved (not just partial form submission)

### Error: "Child not found or access denied"

**Symptom:** API returns 403 error

**Solutions:**
1. Verify childId is correct
2. Verify kitaId matches the child's KiTA
3. User is attempting to access child from different KiTA
4. Child was deleted from database

### Performance Issues

**If Medical Records page loads slowly:**
1. Check database indexes on childId
2. Verify vaccinations and health history don't have excessive records (archive old entries if needed)
3. Check network tab to see which API call is slow

## Database Maintenance

### Check Data Integrity

```sql
-- Count records per child
SELECT childId, COUNT(*) as record_count
FROM "MedicalRecord"
GROUP BY childId;

-- Find orphaned vaccinations
SELECT v.id, v.medicalRecordId
FROM "Vaccination" v
LEFT JOIN "MedicalRecord" m ON v.medicalRecordId = m.id
WHERE m.id IS NULL;

-- Find orphaned health history
SELECT h.id, h.medicalRecordId
FROM "HealthHistory" h
LEFT JOIN "MedicalRecord" m ON h.medicalRecordId = m.id
WHERE m.id IS NULL;
```

### Backup Considerations

- Medical records contain critical health information
- Include in regular database backups
- Consider separate backup for compliance/regulatory reasons
- Implement point-in-time recovery if possible
- Test restore procedures regularly

## Performance Optimization

### Index Strategy

Current indexes:
- MedicalRecord: childId (unique)
- Vaccination: medicalRecordId, vaccinationDate
- HealthHistory: medicalRecordId, date, eventType

No changes needed for MVP.

### Query Optimization

Parent viewer fetches all records with relations:
- Typical load: < 500ms for single child
- Scales well to thousands of medical records per child

## Next Phase Enhancements

1. **PDF Export**: Generate vaccination certificates for parents
2. **Vaccination Scheduler**: Automated reminders for upcoming vaccines
3. **Medical Alerts**: Highlight critical health conditions
4. **Doctor Integration**: Sync with pediatrician's office
5. **Emergency Access**: Quick pull-up during incidents
6. **Regulatory Reports**: Export for health department compliance
7. **Multi-language**: French/Italian translations
8. **Mobile Optimization**: Better mobile UX for staff forms

## Deployment Checklist

- [ ] Database migration runs without errors
- [ ] All API endpoints accessible
- [ ] Staff can create medical records
- [ ] Staff can add vaccinations
- [ ] Staff can add health history
- [ ] Parents can view medical information
- [ ] Form validation works correctly
- [ ] Error messages display appropriately
- [ ] Loading states show while fetching
- [ ] No console errors in browser
- [ ] Responsive design on mobile/tablet
- [ ] Access control enforced (role-based)
- [ ] Data isolation by KiTA verified

