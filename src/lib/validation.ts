import { z } from 'zod';

// Auth Schemas
export const signUpSchema = z.object({
  email: z.string().email('Ungültige E-Mail'),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein'),
  name: z.string().min(2, 'Name ist erforderlich'),
});

export const signInSchema = z.object({
  email: z.string().email('Ungültige E-Mail'),
  password: z.string().min(1, 'Passwort ist erforderlich'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name ist erforderlich'),
  email: z.string().email('Ungültige E-Mail'),
  phone: z.string().optional(),
});

// Child Schemas
export const createChildSchema = z.object({
  firstName: z.string().min(1, 'Vorname ist erforderlich'),
  lastName: z.string().min(1, 'Nachname ist erforderlich'),
  birthDate: z.date().or(z.string().pipe(z.coerce.date())),
});

export const updateChildSchema = createChildSchema.partial();

// Allergy Schemas
export const createAllergySchema = z.object({
  allergen: z.string().min(1, 'Allergen ist erforderlich'),
  severity: z.enum(['MILD', 'MODERATE', 'SEVERE']),
  notes: z.string().optional(),
});

// Schedule Schemas
export const createScheduleSchema = z.object({
  childId: z.string().min(1, 'Kind ist erforderlich'),
  date: z.date().or(z.string().pipe(z.coerce.date())),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:mm'),
  notes: z.string().optional(),
});

// Attendance Schemas
export const checkInSchema = z.object({
  childId: z.string().min(1, 'Kind ist erforderlich'),
  date: z.date().or(z.string().pipe(z.coerce.date())),
});

export const checkOutSchema = z.object({
  childId: z.string().min(1, 'Kind ist erforderlich'),
  date: z.date().or(z.string().pipe(z.coerce.date())),
  notes: z.string().optional(),
});

// Message Schemas
export const createMessageSchema = z.object({
  childId: z.string().optional(),
  content: z.string().min(1, 'Nachricht ist erforderlich'),
  attachments: z.array(z.string()).optional(),
});

// Medical Record Schemas
export const createMedicalRecordSchema = z.object({
  childId: z.string().min(1, 'Kind ist erforderlich'),
  medications: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  emergencyInfo: z.string().optional(),
  lastCheckup: z.date().or(z.string().pipe(z.coerce.date())).optional(),
  nextCheckup: z.date().or(z.string().pipe(z.coerce.date())).optional(),
});

export const updateMedicalRecordSchema = createMedicalRecordSchema.omit({ childId: true }).partial();

// Contract Schemas
export const createContractSchema = z.object({
  childId: z.string().min(1, 'Kind ist erforderlich'),
  startDate: z.date().or(z.string().pipe(z.coerce.date())),
  endDate: z.date().or(z.string().pipe(z.coerce.date())).optional(),
  monthlyRate: z.number().positive('Tarif muss positiv sein'),
  hoursPerWeek: z.number().positive('Stunden pro Woche müssen positiv sein'),
  specialTerms: z.string().optional(),
});

export const updateContractSchema = createContractSchema.partial();

// Daily Report Schemas
export const createDailyReportSchema = z.object({
  childId: z.string().min(1, 'Kind ist erforderlich'),
  date: z.date().or(z.string().pipe(z.coerce.date())),
  meals: z.array(z.string()).optional(),
  extraBottles: z.number().int().default(0),
  extraBottleNotes: z.string().optional(),
  sleepTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:mm').optional(),
  sleepDuration: z.number().int().optional(),
  toiletVisits: z.number().int().default(0),
  diaperChanges: z.number().int().default(0),
  activities: z.array(z.string()).optional(),
  mood: z.string().optional(),
  incidents: z.array(z.string()).optional(),
  medications: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

// Location Schemas
export const createLocationSchema = z.object({
  name: z.string().min(1, 'Standortname ist erforderlich'),
  capacity: z.number().int().positive('Kapazität muss positiv sein'),
  ageGroup: z.string().optional(),
  staff: z.array(z.string()).optional(),
});

export const updateLocationSchema = createLocationSchema.partial();

// Extra Day Schemas
export const createExtraDaySchema = z.object({
  childId: z.string().min(1, 'Kind ist erforderlich'),
  date: z.date().or(z.string().pipe(z.coerce.date())),
  type: z.enum(['FULL_DAY', 'MORNING_WITH_MEAL', 'MORNING_NO_MEAL', 'AFTERNOON_WITH_MEAL', 'AFTERNOON_NO_MEAL']),
  notes: z.string().optional(),
});

export const updateExtraDaySchema = createExtraDaySchema.partial();

// Cancellation Schemas
export const createCancellationSchema = z.object({
  childId: z.string().min(1, 'Kind ist erforderlich'),
  date: z.date().or(z.string().pipe(z.coerce.date())),
  reason: z.string().optional(),
});

// Booking Schemas (Anwesenheitsplanung: Zeitraum + Wochentage + Tagestyp)
export const createBookingSchema = z.object({
  childId: z.string().min(1, 'Kind ist erforderlich'),
  startDate: z.date().or(z.string().pipe(z.coerce.date())),
  endDate: z.date().or(z.string().pipe(z.coerce.date())),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Mindestens ein Wochentag'),
  dayType: z
    .enum(['FULL_DAY', 'MORNING_WITH_MEAL', 'MORNING_NO_MEAL', 'AFTERNOON_WITH_MEAL', 'AFTERNOON_NO_MEAL'])
    .default('FULL_DAY'),
  notes: z.string().optional(),
});

export const updateBookingStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;

// Types (inferred from schemas)
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type CreateChildInput = z.infer<typeof createChildSchema>;
export type UpdateChildInput = z.infer<typeof updateChildSchema>;
export type CreateAllergyInput = z.infer<typeof createAllergySchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type CreateMedicalRecordInput = z.infer<typeof createMedicalRecordSchema>;
export type UpdateMedicalRecordInput = z.infer<typeof updateMedicalRecordSchema>;
export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
export type CreateDailyReportInput = z.infer<typeof createDailyReportSchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type CreateExtraDayInput = z.infer<typeof createExtraDaySchema>;
export type UpdateExtraDayInput = z.infer<typeof updateExtraDaySchema>;
export type CreateCancellationInput = z.infer<typeof createCancellationSchema>;
