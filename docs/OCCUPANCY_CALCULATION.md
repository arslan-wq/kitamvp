# Occupancy % & Billing Calculation — Developer Spec

> How the **occupancy percentage** (Belegungsprozent) and the resulting
> **monthly invoice amount** are calculated from a child's desired care days
> (Monday–Friday, morning / lunch / afternoon, with or without lunch).
>
> **Source of truth:** [`src/lib/occupancy.ts`](../src/lib/occupancy.ts). This
> document describes exactly what that file does — keep them in sync.

---

## 1. Building blocks: the three day parts

A single weekday is described by a set of **parts**:

| Part key | Meaning | Weight |
|---|---|---|
| `VORMITTAG` | Morning | **50** |
| `MITTAGESSEN` | Lunch | **20** |
| `NACHMITTAG` | Afternoon | **30** |

A full day (all three) = 50 + 20 + 30 = **100 %**.

---

## 2. Day percentage (`dayPercent`)

The percentage for **one** day is the **sum of the weights** of its parts,
**capped at 100** — with **one special case**:

> **Special case:** if the day contains **only lunch** (`MITTAGESSEN` alone),
> the day is **14 %**, not 20 %.

### All combinations

| Parts selected | Calculation | Day % |
|---|---|---|
| _(none)_ | — | **0 %** |
| Morning only | 50 | **50 %** |
| Lunch only ⚠️ | special case | **14 %** |
| Afternoon only | 30 | **30 %** |
| Morning + Lunch | 50 + 20 | **70 %** |
| Morning + Afternoon | 50 + 30 | **80 %** |
| Lunch + Afternoon | 20 + 30 | **50 %** |
| Morning + Lunch + Afternoon (full day) | 50 + 20 + 30 | **100 %** |

> The three canonical cases from the business rules are: Morning = 50 %,
> Morning + Lunch = 70 %, Full day = 100 %, and Lunch-alone = 14 %. All other
> combinations fall out additively from the weights and can be adjusted in
> `PART_WEIGHTS` if the business wants different numbers.

---

## 3. Weekly occupancy % (`weekOccupancyPercent`)

Sum the day percentages for **Monday–Friday** (5 days) and divide by 5:

```
weekOccupancy% = (dayMon + dayTue + dayWed + dayThu + dayFri) / 5
```

Equivalently: `(100 / 500) × sum of day%`. The result is rounded to **one
decimal place**. Weekends are not counted (a 5-day week is 100 %).

---

## 4. Worked examples

**Example A — full week, full days**
```
Mon–Fri each = full day = 100
sum = 500  →  500 / 5 = 100.0 %
```

**Example B — 3 mornings with lunch, Tue/Thu off**
```
Mon 70, Tue 0, Wed 70, Thu 0, Fri 70
sum = 210  →  210 / 5 = 42.0 %
```

**Example C — every morning only**
```
Mon–Fri each = 50
sum = 250  →  250 / 5 = 50.0 %
```

**Example D — mixed week**
```
Mon full day        = 100
Tue morning + lunch = 70
Wed morning only    = 50
Thu afternoon only  = 30
Fri lunch only ⚠️   = 14
sum = 264  →  264 / 5 = 52.8 %
```

---

## 5. Monthly rate (100 % tariff) by location & age

The 100 % monthly tariff depends on the **location** and the **child's age**
(< 18 months vs ≥ 18 months at the reference date):

| Location group | Locations | < 18 months | ≥ 18 months |
|---|---|---|---|
| **Aesch** | Kita Luna Aesch | **CHF 2600** | **CHF 2400** |
| **Basel-Stadt** | St. Johann, Breite | **CHF 3970** | **CHF 3020** |

Age in months = full months between birth date and the reference date
(`ageInMonths`). If the location can't be mapped to a group, the amount is
`null` (unknown tariff).

---

## 6. Monthly amount (`monthlyAmount`)

```
monthlyAmount = round( fullMonthRate × weekOccupancy% / 100 )
```

Rounded to the nearest whole franc.

**Examples**

| Location | Age | Occupancy % | 100 % rate | Monthly amount |
|---|---|---|---|---|
| Aesch | ≥ 18 mo | 100.0 % | 2400 | `2400 × 100 / 100` = **2400** |
| Basel-Stadt | ≥ 18 mo | 42.0 % | 3020 | `3020 × 42 / 100` = 1268.4 → **1268** |
| Aesch | < 18 mo | 50.0 % | 2600 | `2600 × 50 / 100` = **1300** |
| Basel-Stadt | < 18 mo | 80.0 % | 3970 | `3970 × 80 / 100` = **3176** |

---

## 7. Extra days (`extraDayCost`) — separate flat pricing

Extra/one-off days are **not** billed via the percentage. They use a flat
per-day price, **independent of location**:

| Extra day type | Condition | Price |
|---|---|---|
| Full day | Morning **and** lunch **and** afternoon | **CHF 115** |
| Half day **with** lunch | contains lunch (but not a full day) | **CHF 65** |
| Half day **without** lunch | no lunch (morning only or afternoon only) | **CHF 50** |

> Note: because "with lunch" only checks for the presence of `MITTAGESSEN`,
> `Morning + Lunch`, `Lunch + Afternoon`, and `Lunch only` all price at **65**.
> `Morning only`, `Afternoon only`, and `Morning + Afternoon` price at **50**.

---

## 8. Reference algorithm (pseudocode)

```
WEIGHTS = { VORMITTAG: 50, MITTAGESSEN: 20, NACHMITTAG: 30 }

function dayPercent(parts):
    if parts is empty: return 0
    if parts == [MITTAGESSEN]: return 14          # special case
    return min(100, sum(WEIGHTS[p] for p in parts))

function weekOccupancyPercent(week):               # week = {1:parts, ... 5:parts}
    sum = 0
    for d in 1..5: sum += dayPercent(week[d])
    return round(sum / 5, 1)                        # 1 decimal

function fullMonthRate(location, birthDate, ref):
    group = mapLocationToGroup(location)            # AESCH | BASELSTADT | null
    if group is null: return null
    under18 = ageInMonths(birthDate, ref) < 18
    return RATES[group][under18 ? 'under18' : 'over18']

function monthlyAmount(occupancy%, location, birthDate, ref):
    rate = fullMonthRate(location, birthDate, ref)
    if rate is null: return null
    return round(rate * occupancy% / 100)

function extraDayCost(parts):
    if parts is empty: return 0
    if has(VORMITTAG) and has(MITTAGESSEN) and has(NACHMITTAG): return 115
    if has(MITTAGESSEN): return 65
    return 50
```

---

## 9. Data model note

Desired care days are stored per weekday as a list of part keys, e.g.:

```json
{
  "1": ["VORMITTAG", "MITTAGESSEN", "NACHMITTAG"],
  "2": ["VORMITTAG", "MITTAGESSEN"],
  "3": ["VORMITTAG"],
  "4": ["NACHMITTAG"],
  "5": ["MITTAGESSEN"]
}
```
Keys `1`–`5` = Monday–Friday. This is the input to `weekOccupancyPercent`.
