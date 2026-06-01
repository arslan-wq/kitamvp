# Meal Plan Management (Speiseplan-Verwaltung)

## Overview

The Meal Plan Management feature allows KiTA staff (administrators and KiTA leaders) to upload and manage weekly meal plans. Parents can view the meal plans in their portal with automatic allergen highlighting based on their child's allergies.

## Key Features

### Staff Features
- **Weekly Meal Plan Upload** 📤
  - Upload meal plans for the current week (Monday-Friday)
  - Support for breakfast, lunch, and afternoon snack per day
  - Optional notes for each day
  
- **Allergen Management** ⚠️
  - Add allergen information to meal plans
  - Select from common allergens (Milk, Eggs, Peanuts, Tree Nuts, Fish, Shellfish, Soy, Gluten, Sesame)
  - Add custom allergen details

- **Multi-tenancy Support** 🏢
  - Each KiTA has its own meal plans
  - Meal plans scoped by `kitaId`
  - Automatic week calculation (Monday = week start)

### Parent Features
- **Meal Plan Viewing** 👀
  - See weekly meal plans for their child
  - View meals by day and meal type
  - Access allergen information

- **Allergen Highlighting** 🎨
  - Allergenic ingredients automatically highlighted in meal descriptions
  - **Red highlighting**: Allergens that match their child's registered allergies
  - **Yellow highlighting**: Other allergens in the meal plan
  - **Hover tooltips**: View allergen details

- **Multi-child Support** 👨‍👩‍👧
  - See combined allergies from all children
  - Single unified allergen view

## Architecture

### Database Schema

```prisma
model MealPlan {
  id              String    @id @default(cuid())
  kitaId          String
  kita            KiTA      @relation("KiTAMealPlans", fields: [kitaId], references: [id])
  weekStart       DateTime  // Start of week (Monday)
  weekEnd         DateTime  // End of week (Sunday)
  meals           String    // JSON: [{day: "Monday", breakfast: "...", lunch: "...", snack: "..."}]
  allergenInfo    String?   // JSON: [{allergen: "Peanuts", details: "..."}]
  uploadedBy      String    // User ID
  fileName        String?   // Original filename
  fileUrl         String?   // URL to uploaded file
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  @@index([kitaId])
  @@index([weekStart])
}
```

### API Endpoints

#### GET /api/meal-plans
Fetches meal plans for the authenticated KiTA.

**Query Parameters:**
- `weekStart` (optional): ISO date string to filter by specific week

**Response:**
```json
[
  {
    "id": "recXXXXXXXXXXXXX",
    "kitaId": "kitaXXXXXXXXXXXXX",
    "weekStart": "2024-05-20T00:00:00Z",
    "weekEnd": "2024-05-26T00:00:00Z",
    "meals": "[{\"day\":\"Montag\",\"breakfast\":\"...\",\"lunch\":\"...\",\"snack\":\"...\"}]",
    "allergenInfo": "[{\"allergen\":\"Milch\",\"details\":\"...\"}]",
    "uploadedBy": "userXXXXXXXXXXXXX",
    "fileName": "speiseplan-2024-05-20.json",
    "createdAt": "2024-05-19T10:00:00Z",
    "updatedAt": "2024-05-19T10:00:00Z"
  }
]
```

#### POST /api/meal-plans
Creates or updates a meal plan for the current/specified week.

**Required Role:** `ADMIN` or `KITA_LEITER`

**Request Body:**
```json
{
  "weekStart": "2024-05-20T00:00:00Z",
  "weekEnd": "2024-05-26T00:00:00Z",
  "meals": [
    {
      "day": "Montag",
      "breakfast": "Porridge mit Milch und Obst",
      "lunch": "Pasta mit Tomatensauce und Brokkoli",
      "snack": "Joghurt mit Nüssen",
      "notes": "Bio-Produkte"
    }
  ],
  "allergenInfo": [
    {
      "allergen": "Milch",
      "details": "In Porridge und Joghurt enthalten"
    },
    {
      "allergen": "Erdnüsse",
      "details": "In Nüssen und Dessert enthalten"
    }
  ],
  "fileName": "speiseplan-2024-05-20.json"
}
```

**Response:** Created/updated MealPlan object with status 201 (created) or 200 (updated)

## User Flows

### Staff: Upload Meal Plan

1. **Access the admin dashboard**
   - Navigate to `/dashboard/meal-plans`
   - Only ADMIN and KITA_LEITER roles can access

2. **Fill in the meal plan**
   - Enter breakfast, lunch, and snack for each day (Mon-Fri)
   - Add optional daily notes

3. **Add allergen information**
   - Click "Allergen hinzufügen"
   - Select allergen from dropdown
   - Add details (e.g., "Contains traces of...")
   - Repeat for multiple allergens

4. **Submit**
   - Click "Speiseplan hochladen"
   - Shows success message with week dates
   - Form resets for next week

### Parent: View Meal Plans

1. **Go to parent dashboard**
   - Navigate to `/parent/dashboard`
   - Automatically loads current meal plan

2. **Review the week's meals**
   - Scroll through daily meal information
   - See breakfast, lunch, and snack for each day

3. **Check allergens**
   - Red highlights = child's allergies
   - Yellow highlights = other allergens
   - Hover for tooltip details

4. **See combined allergies**
   - If multiple children enrolled, see all allergens together
   - Easier to identify potential conflicts

## Data Flow

```
Staff (ADMIN/KITA_LEITER)
    ↓
MealPlanManager Component
    ↓
POST /api/meal-plans
    ↓
Prisma → MealPlan table (JSON storage)
    ↓
        ↓
GET /api/meal-plans
    ↓
Parent Portal (MealPlanViewer)
    ↓
Allergen Highlighting (compare with Child.allergies)
    ↓
Parent sees color-coded meals
```

## JSON Structure

### Meals Storage
```json
[
  {
    "day": "Montag",
    "breakfast": "Porridge mit Milch",
    "lunch": "Pasta mit Tomatensoße",
    "snack": "Apfel und Joghurt",
    "notes": "Bio-Produkte"
  },
  // ... more days
]
```

### Allergen Storage
```json
[
  {
    "allergen": "Milch",
    "details": "In Porridge und Joghurt enthalten. Kann Spuren von Nüssen enthalten."
  },
  {
    "allergen": "Gluten",
    "details": "In Pasta und Brot"
  },
  // ... more allergens
]
```

## Technical Details

### Component Hierarchy
```
/app/dashboard/meal-plans/page.tsx (Server)
  └─ MealPlanManager (Client)
       ├─ MealDay (Client, x5)
       └─ Allergen inputs

/app/parent/dashboard/page.tsx (Server)
  └─ ParentDashboardClient (Client)
       └─ MealPlanViewer (Client)
           └─ Allergen highlighting logic
```

### Allergen Matching Algorithm
1. Parse allergen information from meal plan
2. Get child's allergies from database
3. For each meal, find allergen matches (case-insensitive)
4. Apply regex highlighting for found allergens
5. Use different colors:
   - Red (bg-red-200) = matched to child's allergy
   - Yellow (bg-yellow-100) = other allergens

### Week Calculation
- **Week Start**: Monday 00:00 UTC
- **Week End**: Sunday 23:59 UTC
- Automatically calculated from current date
- Can be overridden when fetching specific weeks

## Error Handling

### Staff Upload Errors
- Missing required fields → 400 Bad Request
- Unauthorized role → 403 Forbidden
- Database error → 500 Internal Server Error
- Form validation → Client-side error message

### Parent Viewing Errors
- No meal plan available → Blue info message
- Fetch failed → Red error message
- Loading state → Skeleton placeholders

## Allergen Reference

### Common Allergens (in dropdown)
1. Milch (Milk)
2. Eier (Eggs)
3. Erdnüsse (Peanuts)
4. Baumnüsse (Tree Nuts)
5. Fisch (Fish)
6. Krebstiere (Shellfish)
7. Soja (Soy)
8. Gluten (Gluten)
9. Sesam (Sesame)

Custom allergens can be typed in the details field.

## Security & Privacy

- **Role-based access control**: Only ADMIN/KITA_LEITER can upload
- **Multi-tenancy**: Each parent only sees meal plans for their KiTA
- **Allergy data**: Only shown to parents of matching children
- **No PII**: Meal plans don't contain personally identifiable information beyond allergens

## Future Enhancements

- [ ] File upload support (PDF meal plans)
- [ ] Meal plan templates/recurring patterns
- [ ] Dietary restriction marking (vegetarian, vegan, halal)
- [ ] Nutritional information display
- [ ] Parent notification when new meal plan uploaded
- [ ] Archive past meal plans
- [ ] Meal plan approval workflow
- [ ] Menu substitution requests from parents
- [ ] Allergen analytics (most common allergens)
- [ ] Integration with nutrition management systems

## Testing

### Staff Testing
- Upload meal plan with all fields
- Update existing meal plan
- Verify allergen highlighting works
- Test with multiple allergens
- Check week calculation

### Parent Testing
- View meal plan after upload
- Verify allergen highlighting matches child allergies
- Test with multiple children and combined allergies
- Verify no other parents can see your meal plans

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Meal plan not loading | Check if meal plan exists for current week |
| Allergens not highlighting | Verify allergen name matches in meal text |
| Access denied when uploading | Ensure you have ADMIN or KITA_LEITER role |
| JSON parse error | Check allergenInfo is valid JSON in database |
