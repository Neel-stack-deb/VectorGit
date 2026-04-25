# VectorGit Bug Fixes & Improvements

This document tracks the critical architectural fixes made to the VectorGit MVP to ensure it accurately and consistently catches semantic regressions in JavaScript codebases.

## 1. Fixed the Content Hashing Bug (`parser.js`)

**Issue:** 
VectorGit relies on generating unique IDs for each file to track them across commits. The original implementation generated this ID by hashing the file's **content** (`fs.readFileSync(filePath, 'utf8')`). Because the content changes whenever a bug is introduced, the file hash changed. This resulted in the CLI treating the modified file as a brand new file, completely severing its linkage to the baseline embedding.

**Fix:** 
Updated the `hashFile` function to hash the **`filePath`** instead of the file content. 
* This ensures that a file maintains a permanent, stable ID regardless of its internal content changes.
* `text-embedding-3-small` can now successfully pull the correct baseline ID for comparison.

## 2. Fixed the Positional Tracking Bug (`cli.js`)

**Issue:** 
Once a file was identified, VectorGit assigned a unique key to each extracted function based on its name and its **line number** (e.g., `auth.js::processOrder@24`). If code was added or removed above a function, the function was pushed to a new line (e.g., `processOrder@28`). Because the line number changed, the CLI failed to locate the function's baseline key, treating it as a new function and ignoring any semantic regressions.

**Fix:** 
Removed the `@${func.line}` suffix from the key generation logic in both `analyzeRepo` and `checkChanges`. 
* Functions are now tracked dynamically by their name within a file (`${fileHash}::${func.name}`).
* This makes the tracking system robust against line shifts, code refactoring, and general dynamism.

## 3. Calibrated Embedding Thresholds (`cli.js` & `comparator.js`)

**Issue:** 
The MVP had a hardcoded `0.3` distance threshold to flag regressions. However, OpenRouter's `text-embedding-3-small` model heavily weights the structure, syntax, and variable names of code. Even when massive logical bugs are introduced (e.g., changing `+` to `-`, removing a `throw new Error`), the resulting vectors remain geometrically very close (often resulting in distances like `0.02` to `0.07`). The `0.3` threshold was fundamentally blind to empirical reality.

**Fix:** 
* Lowered the trigger threshold in `cli.js` from `0.3` to **`0.02`**.
* Rescaled the severity brackets in `comparator.js` to match the realistic output ranges of the AI model:
  * `> 0.08`: CRITICAL
  * `> 0.05`: HIGH
  * `> 0.03`: MEDIUM
  * Otherwise: LOW

By aligning the thresholds with the actual vector math, the system now successfully catches and flags subtle, critical logic regressions.
