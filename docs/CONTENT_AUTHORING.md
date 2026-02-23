# Content Authoring Guide

This guide describes how to add new gameplay content without rewriting core systems.

## 1) Career Definitions

Path: `src/content/careers/*.json`

Each file should export a JSON array of career objects.

```json
[
  {
    "id": "example_role",
    "title": "Example Role",
    "field": "Engineering",
    "specialization": "Software",
    "requiredEducation": "Bachelor",
    "minAge": 21,
    "minSmarts": 60,
    "minWillpower": 45,
    "startSalary": 90000,
    "annualRaise": 0.07,
    "difficulty": 0.55,
    "promotionTitles": ["Role I", "Role II", "Senior Role"],
    "requiredMajors": ["Engineering"],
    "requiredFlagsAll": ["license_bar"],
    "requiredLicensedLawYears": 8
  }
]
```

### Required fields

- `id` (unique string)
- `title`
- `field`
- `specialization`
- `requiredEducation` (`None|Primary|Secondary|High School|Bachelor|Master|Doctorate`)
- `minAge`
- `minSmarts`
- `minWillpower`
- `startSalary`
- `annualRaise` (0-1)
- `difficulty` (0-1)

### Optional gates

- `promotionTitles`
- `requiredMajors`
- `requiredFlagsAll`
- `requiredLicensedLawYears`

## 2) Shadow Contracts

Path: `src/content/shadow/serial_contracts.json`

```json
[
  {
    "id": "contract_id",
    "codename": "Operation Name",
    "minAge": 24,
    "minNotoriety": 20,
    "payout": 50000,
    "heatGain": 14,
    "notorietyGain": 12,
    "risk": 0.3
  }
]
```

### Notes

- Higher payout should generally imply higher `risk` and `heatGain`.
- `minNotoriety` is your progression gate.
- Keep values balanced so heat management remains meaningful.

## 3) Event Cards

Path: `src/content/events/*.json`

Event arrays are loaded into `EventRegistry` and use condition/effect schemas.

```json
[
  {
    "id": "event_id",
    "title": "Event Title",
    "description": "What happened...",
    "icon": "❔",
    "category": "childhood",
    "minAge": 5,
    "maxAge": 12,
    "weight": 40,
    "choices": [
      {
        "text": "Choice A",
        "effects": [
          { "type": "stat", "target": "happiness", "operation": "add", "value": 5 }
        ]
      }
    ]
  }
]
```

## 4) Validation Workflow

Always run:

```bash
npm test
npm run build
```

If either fails, fix content shape or rules before merging.

## 5) Authoring Guidelines

- Keep IDs unique and stable.
- Prefer many small JSON files over one giant file.
- Avoid impossible requirement combinations.
- Add progression ladders (entry -> mid -> senior) for major career tracks.
- For high-risk content, include downside paths (risk/failure/heat).
