# User locCode Update Scripts

These scripts help you update the `locCode` field in the `users` collection based on matching `workingBranch` names with the `branches` collection.

## Problem
Currently, users in the `users` collection have their `empno` stored in the `locCode` field, but they should have the actual location code from the `branches` collection based on their `workingBranch`.

## Solution
The scripts match users by their `workingBranch` field with the `workingBranch` field in the `branches` collection, then update the user's `locCode` to the corresponding `locCode` from the branches collection.

## Files

### 1. `update-user-loccode-dryrun.js` (RECOMMENDED TO RUN FIRST)
- **Purpose**: Shows what changes would be made without actually updating the database
- **Use**: Run this first to review the changes before applying them
- **Output**: Detailed analysis of what would be updated

### 2. `update-user-loccode.js`
- **Purpose**: Actually performs the database updates
- **Use**: Run this after reviewing the dry run output
- **Output**: Updates the database and shows results

## Usage

### Step 1: Run the Dry Run (Recommended)
```bash
cd backend
node scripts/update-user-loccode-dryrun.js
```

This will show you:
- How many users would be updated
- What the current vs. new locCode values would be
- Any users with mismatched branch names
- A summary of all changes

### Step 2: Review the Output
Check the dry run output for:
- ✅ Users that would be updated correctly
- ⚠️ Users with no matching branch names
- 📊 Total count of changes

### Step 3: Fix Any Issues (if needed)
If you see users with "NO MATCH" status, you may need to:
- Check for typos in branch names
- Ensure branch names are consistent between collections
- Update branch names if needed

### Step 4: Run the Actual Update
```bash
cd backend
node scripts/update-user-loccode.js
```

## What the Scripts Do

1. **Connect to MongoDB** using your environment variables
2. **Fetch all branches** and create a mapping of `workingBranch` → `locCode`
3. **Fetch all users** and analyze their current `locCode` vs. what it should be
4. **Update users** where the `locCode` doesn't match the expected value
5. **Provide detailed logging** of all changes made

## Safety Features

- **Dry run option** to preview changes
- **Detailed logging** of all operations
- **Error handling** for individual user updates
- **Summary statistics** at the end
- **No partial updates** - each user is processed individually

## Example Output

```
🔍 DRY RUN: Analyzing user locCode update process...
⚠️  No actual changes will be made to the database

Found 25 branches

=== BRANCH MAPPING ===
"Main Store" → "MS001"
"Downtown Branch" → "DT002"
"Westside Location" → "WS003"

Found 150 users

=== USER ANALYSIS ===
🔄 WOULD UPDATE: User EMP001 (Main Store)
   Current locCode: "EMP001" → New locCode: "MS001"

✓ NO CHANGE: User EMP002 already has correct locCode: "DT002"

=== DRY RUN SUMMARY ===
Total users analyzed: 150
Users that WOULD be updated: 45
Users with no changes needed: 100
Users with no matching branch: 5
```

## Requirements

- Node.js installed
- MongoDB connection string in your `.env` file
- Access to both `users` and `branches` collections

## Environment Variables

Make sure your `.env` file contains:
```
MONGODB_URI=mongodb://your-connection-string
```

## Troubleshooting

### Connection Issues
- Check your MongoDB connection string
- Ensure MongoDB is running
- Verify network access

### No Users Updated
- Check if branch names match exactly between collections
- Verify the `workingBranch` field values
- Look for case sensitivity issues

### Permission Errors
- Ensure your MongoDB user has read/write permissions
- Check if you're connecting to the correct database

## Backup Recommendation

Before running the actual update script, consider backing up your database:
```bash
mongodump --db your-database-name --out backup-folder
```
