# Meal Plan Management Setup Guide

## Overview
This guide walks you through setting up and using the Meal Plan Management (Speiseplan-Verwaltung) feature in your KiTA Management Software.

## Prerequisites
- KiTA Management Software version 1.2+
- PostgreSQL database with Prisma ORM
- User with ADMIN or KITA_LEITER role
- Parent accounts with associated children and allergies

## Installation Steps

### Step 1: Database Migration
The MealPlan model is already defined in `prisma/schema.prisma`. Run the migration:

```bash
# Create and apply migration
npx prisma migrate dev --name add_meal_plans

# Or if migrations are auto-applied:
npx prisma db push
```

**What this does:**
- Creates `meal_plan` table in PostgreSQL
- Adds indexes on `kita_id` and `week_start` for performance
- Creates relationship with KiTA table

### Step 2: Verify Database Schema

```bash
# Check the schema is correct
npx prisma studio

# Navigate to "MealPlan" model and verify:
# - id (String, primary key)
# - kitaId (String, foreign key to KiTA)
# - weekStart (DateTime)
# - weekEnd (DateTime)
# - meals (String - JSON)
# - allergenInfo (String - JSON, nullable)
# - uploadedBy (String - User ID)
# - fileName (String, nullable)
# - fileUrl (String, nullable)
# - createdAt, updatedAt (DateTime)
```

### Step 3: Frontend Components
The following components are already created:

1. **Staff Upload Interface**
   - Path: `src/app/dashboard/meal-plans/`
   - Components:
     - `page.tsx` - Server component with auth check
     - `components/MealPlanManager.tsx` - Upload form
     - `components/MealDay.tsx` - Daily meal input

2. **Parent View Interface**
   - Path: `src/app/parent/dashboard/`
   - Components:
     - `components/MealPlanViewer.tsx` - Display with allergen highlighting

### Step 4: API Endpoints
The API route is already created at:
- **Path**: `src/app/api/meal-plans/route.ts`
- **Methods**: GET (fetch), POST (create/update)
- **Auth**: Required for both
- **Role Check**: ADMIN/KITA_LEITER for POST

### Step 5: Navigation Setup
Add navigation link for staff in your dashboard navigation:

```tsx
// In your sidebar/navigation component
<NavLink href="/dashboard/meal-plans">
  🍽️ Speiseplan
</NavLink>
```

Add navigation link for parent portal (already included in ParentDashboardClient).

## Configuration

### Allergen List
To customize the list of common allergens, edit `src/app/dashboard/meal-plans/components/MealPlanManager.tsx`:

```typescript
const COMMON_ALLERGENS = [
  'Milch',           // Milk
  'Eier',           // Eggs
  'Erdnüsse',       // Peanuts
  'Baumnüsse',      // Tree nuts
  'Fisch',          // Fish
  'Krebstiere',     // Shellfish
  'Soja',           // Soy
  'Gluten',         // Gluten
  'Sesam',          // Sesame
  // Add more as needed
];
```

### Date Format
The system uses ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ) for all date storage. Week calculations are automatic:
- **Week Start**: Monday 00:00
- **Week End**: Sunday 23:59

## Usage Instructions

### For Staff (KiTA Leaders/Admins)

#### Uploading a Meal Plan
1. Log in with ADMIN or KITA_LEITER account
2. Navigate to Dashboard → Speiseplan
3. Fill in each day (Monday through Friday):
   - Frühstück (Breakfast)
   - Mittagessen (Lunch)
   - Nachmittags-Snack (Afternoon Snack)
   - Optional notes
4. Add allergen information:
   - Click "+ Allergen hinzufügen"
   - Select allergen from dropdown
   - Add details (e.g., "Contains traces of...")
5. Click "✅ Speiseplan hochladen"
6. Success message shows week dates

#### Updating a Meal Plan
- Upload a new meal plan for the same week
- System automatically updates existing plan
- Previous version is overwritten (not archived)

### For Parents

#### Viewing Meal Plans
1. Log in to parent portal
2. Go to Dashboard
3. Scroll down to "🍽️ Wochenplan" section
4. View meals for the current/upcoming week

#### Understanding Allergen Highlighting
- **Red highlighting**: Ingredients that match your child's allergies
- **Yellow highlighting**: Other allergens in the meal plan
- **Hover**: Mouse over to see allergen details
- **Multiple children**: Combined allergens from all enrolled children

### Data Entry Best Practices

#### Meal Descriptions
Write clear, descriptive meals:
- ✅ "Pasta with tomato sauce, spinach, and mozzarella"
- ❌ "Pasta"
- ✅ "Scrambled eggs with milk and butter"
- ❌ "Eggs"

#### Allergen Details
Be specific about allergen presence:
- ✅ "Contains milk in sauce and cheese"
- ✅ "May contain traces of nuts from production facility"
- ❌ "Allergen info"

#### Special Notes
Use the daily notes field for:
- Dietary information: "Vegetarian", "Vegan"
- Source: "Bio-Produkte" (Organic)
- Preparation: "Gluten-free options available"
- Special events: "Birthday celebration menu"

## API Reference

### GET /api/meal-plans

**Purpose**: Fetch meal plans for the authenticated KiTA

**Query Parameters:**
```bash
# Get current and future meal plans (default)
GET /api/meal-plans

# Get meal plan for specific week
GET /api/meal-plans?weekStart=2024-05-20T00:00:00Z
```

**Response (200 OK):**
```json
[
  {
    "id": "recXXXXXXXXXXXXX",
    "kitaId": "kitaXXXXXXXXXXXXX",
    "weekStart": "2024-05-20T00:00:00Z",
    "weekEnd": "2024-05-26T00:00:00Z",
    "meals": "[{\"day\":\"Montag\",\"breakfast\":\"Porridge...\"}]",
    "allergenInfo": "[{\"allergen\":\"Milch\",\"details\":\"...\"}]",
    "uploadedBy": "userXXXXXXXXXXXXX",
    "fileName": "speiseplan-2024-05-20.json",
    "kita": { "name": "KiTA Luna" },
    "createdAt": "2024-05-19T10:00:00Z",
    "updatedAt": "2024-05-19T10:00:00Z"
  }
]
```

**Error Responses:**
- `401 Unauthorized`: No valid session
- `400 Bad Request`: Invalid query parameters

### POST /api/meal-plans

**Purpose**: Create or update meal plan

**Required Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "weekStart": "2024-05-20T00:00:00Z",
  "weekEnd": "2024-05-26T00:00:00Z",
  "meals": [
    {
      "day": "Montag",
      "breakfast": "Porridge with milk and berries",
      "lunch": "Pasta with tomato sauce",
      "snack": "Yogurt and granola",
      "notes": "Organic ingredients"
    },
    // ... more days
  ],
  "allergenInfo": [
    {
      "allergen": "Milch",
      "details": "In Porridge and yogurt"
    },
    // ... more allergens
  ],
  "fileName": "speiseplan-2024-05-20.json"
}
```

**Success Responses:**
- `201 Created`: New meal plan created
- `200 OK`: Existing meal plan updated

**Error Responses:**
- `401 Unauthorized`: No valid session
- `403 Forbidden`: User is not ADMIN or KITA_LEITER
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Database error

## Testing

### Manual Testing Checklist

#### Staff Features
- [ ] Log in as ADMIN/KITA_LEITER
- [ ] Access /dashboard/meal-plans (shows page)
- [ ] Fill in all 5 days with meals
- [ ] Add 2-3 allergens
- [ ] Submit form (shows success message)
- [ ] Refresh page (meal plan still shows)
- [ ] Update existing meal plan (form prepopulated)
- [ ] Verify week dates auto-calculated correctly

#### Parent Features
- [ ] Log in as parent
- [ ] Go to dashboard
- [ ] See meal plan from staff upload
- [ ] Add child with allergy (e.g., "Milch")
- [ ] Check allergen highlighting (red for milk products)
- [ ] Check other allergens (yellow highlighting)
- [ ] Hover over allergen (shows detail tooltip)
- [ ] Verify no other parents' meal plans visible

#### API Testing
```bash
# Using curl to test endpoints
# Get meal plans
curl -H "Cookie: [your-session-cookie]" \
  http://localhost:3000/api/meal-plans

# Create meal plan
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{"weekStart":"2024-05-20T00:00:00Z","weekEnd":"2024-05-26T00:00:00Z","meals":[...],"allergenInfo":[...]}' \
  http://localhost:3000/api/meal-plans
```

## Troubleshooting

### Problem: "Access Denied" when uploading

**Cause**: User doesn't have ADMIN or KITA_LEITER role

**Solution**:
```bash
# Check user role in database
npx prisma studio
# Go to User table
# Verify role field is "ADMIN" or "KITA_LEITER"
```

### Problem: Meal plan not showing for parents

**Cause**: Meal plan not created yet, or created for wrong week

**Solution**:
1. Upload a new meal plan
2. Ensure weekStart date is current or future
3. Check that parent's child is in correct KiTA

### Problem: Allergen highlighting not working

**Cause**: Allergen name doesn't match meal description text

**Solution**:
1. Check spelling matches (case-insensitive)
2. Allergen name must be word in meal description
3. Example: "Milch" will match "Porridge mit Milch" but not "Milchprodukte" (word boundary required)

### Problem: Database migration fails

**Cause**: PostgreSQL connection or existing schema conflicts

**Solution**:
```bash
# Check database connection
npx prisma db execute --stdin < /dev/null

# If schema conflict, check:
npx prisma db pull

# Then try migration again
npx prisma migrate dev
```

## Performance Considerations

### Indexes
The following indexes are created for performance:
- `MealPlan.kitaId` - Fast filtering by KiTA
- `MealPlan.weekStart` - Fast lookup by week

For large deployments, consider:
- Archiving old meal plans (before 6 months)
- Pagination in meal plan list view

### JSON Storage
- Meals and allergenInfo stored as JSON strings
- Parsing happens in component (minimal impact)
- For very large meal descriptions, consider file storage

## Integration Points

### With Parent Portal
- MealPlanViewer imports from `/api/meal-plans`
- Compares allergens with Child.allergies array
- No changes needed if already integrated

### With Notification System
Future integration possible:
- Notify parents when new meal plan uploaded
- Check parent notification preferences
- Use existing SendHealthAlertPush pattern

### With Activity System
Meal plans are independent from activities but related:
- Activities log what child actually ate
- Meal plans show planned meals
- Could compare in future reporting

## Maintenance

### Weekly Maintenance
- [ ] Upload new meal plan every week
- [ ] Verify allergen information is accurate
- [ ] Check parents can view meals

### Monthly Maintenance
- [ ] Review which allergens are most common
- [ ] Update COMMON_ALLERGENS list if needed
- [ ] Archive old meal plans if not auto-purged

### Quarterly Maintenance
- [ ] Review allergen highlighting accuracy
- [ ] Verify no meal plan upload errors
- [ ] Performance check on meal plan queries

## Security Notes

- All meal plan access requires authentication
- Parents only see meal plans for their KiTA
- Upload limited to ADMIN/KITA_LEITER roles
- No personal information stored in meal plans
- Allergen data linked to child profiles, not directly exposed

## Next Steps

1. ✅ Database migration (`npx prisma migrate dev`)
2. ✅ Test staff upload at `/dashboard/meal-plans`
3. ✅ Test parent viewing in parent portal
4. ✅ Add navigation links
5. Consider future enhancements (file uploads, templates, etc.)

## Support

For issues or feature requests, refer to:
- `MEAL_PLANS.md` - Feature documentation
- `src/app/api/meal-plans/route.ts` - API implementation
- `src/app/dashboard/meal-plans/components/MealPlanManager.tsx` - Staff UI
- `src/app/parent/components/MealPlanViewer.tsx` - Parent UI
