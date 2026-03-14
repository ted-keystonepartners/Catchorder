# Report Contents API Implementation

## Overview
Implemented report contents save/retrieve API in Lambda with DynamoDB for monthly report management.

## DynamoDB Table
- **Table Name**: `sms-report-contents-dev`
- **Partition Key**: `section_id` (String)
- **Sort Key**: `month` (String, format: YYYY-MM)
- **Billing Mode**: PAY_PER_REQUEST
- **Status**: ACTIVE

### Schema
```json
{
  "section_id": "kpi_summary | active_store_trend | cohort_forecast | funnel",
  "month": "YYYY-MM",
  "content": "string",
  "updated_at": "ISO 8601 timestamp",
  "updated_by": "email address",
  "history": [
    {
      "content": "previous content",
      "updated_at": "ISO 8601 timestamp",
      "updated_by": "email address"
    }
  ]
}
```

## API Endpoints

### 1. GET - Retrieve Report Content

#### Get Specific Section
```
GET /api/report-contents?section_id=kpi_summary&month=2026-03
```

**Response:**
```json
{
  "success": true,
  "data": {
    "section_id": "kpi_summary",
    "month": "2026-03",
    "content": "March KPI Summary",
    "updated_at": "2026-03-07T14:19:25.165Z",
    "updated_by": "test@example.com",
    "history": []
  }
}
```

#### Get All Sections for a Month
```
GET /api/report-contents?month=2026-03
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "section_id": "kpi_summary",
      "month": "2026-03",
      "content": "...",
      ...
    },
    {
      "section_id": "active_store_trend",
      "month": "2026-03",
      "content": "...",
      ...
    }
  ]
}
```

### 2. PUT - Save/Update Report Content

```
PUT /api/report-contents
Content-Type: application/json

{
  "section_id": "kpi_summary",
  "month": "2026-03",
  "content": "Report content here",
  "updated_by": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "section_id": "kpi_summary",
    "month": "2026-03",
    "content": "Report content here",
    "updated_at": "2026-03-07T14:19:25.165Z",
    "updated_by": "user@example.com",
    "history": [
      {
        "content": "Previous content",
        "updated_at": "2026-03-07T10:00:00.000Z",
        "updated_by": "previous@example.com"
      }
    ]
  }
}
```

## Features

### History Tracking
- When updating existing content, the previous version is automatically saved to the `history` array
- Each history entry includes: `content`, `updated_at`, `updated_by`
- Complete audit trail of all changes

### Error Handling
- 400: Missing required parameters
- 405: Method not allowed
- 500: Server error

## Lambda Function
- **Function Name**: `sms-stats-get`
- **Region**: `ap-northeast-2`
- **Runtime**: Node.js
- **File**: `/Users/sungminbang/Dev/Catchorder/lambda-fix/index.mjs`

## Testing Results

### Test 1: Save New Content ✅
- Created new report content for `kpi_summary` section
- Content saved successfully with empty history

### Test 2: Retrieve Content ✅
- Retrieved saved content by section_id and month
- All fields returned correctly

### Test 3: Update with History ✅
- Updated existing content
- Previous content saved to history array
- History count: 1

### Test 4: Verify DynamoDB ✅
- Data persisted correctly in DynamoDB
- Schema matches specification

### Test 5: Multiple Sections ✅
- Added `active_store_trend` section
- Multiple sections can coexist for same month

## Usage Example

```javascript
// Save report content
const saveResponse = await fetch('https://api.example.com/api/report-contents', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    section_id: 'kpi_summary',
    month: '2026-03',
    content: 'KPI summary content',
    updated_by: 'user@example.com'
  })
});

// Retrieve report content
const getResponse = await fetch(
  'https://api.example.com/api/report-contents?section_id=kpi_summary&month=2026-03'
);
const data = await getResponse.json();
```

## Deployment
```bash
cd /Users/sungminbang/Dev/Catchorder/lambda-fix
zip -r function.zip index.mjs
aws lambda update-function-code \
  --function-name sms-stats-get \
  --zip-file fileb://function.zip \
  --region ap-northeast-2
```

## Next Steps
1. Add GSI (Global Secondary Index) on `month` for efficient "all sections by month" queries
2. Add pagination for large result sets
3. Add delete endpoint if needed
4. Add batch operations for multiple sections
