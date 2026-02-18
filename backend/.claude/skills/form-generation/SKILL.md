---
name: Immigration Form Generation
description: This skill should be used when the user asks to "generate DS-160", "create form JSON", "fill out I-129S", "generate G-28", "fill I-131", "fill I-485", "create DS-156E", "fill visa scheduler", or any immigration form generation.
version: 2.0.0
---

# Immigration Form Generation

This skill supports two methods for generating immigration forms:

| Method | Description | Output |
|--------|-------------|--------|
| **JSON Schema** | Generate JSON from schema, backend converts to PDF | JSON artifact |
| **Example-Based PDF** | Fill PDF directly using PyMuPDF, learning from filled examples | Filled PDF file |

---

## Form Reference Table

| Form Type | When to Use | Method | Reference |
|-----------|-------------|--------|-----------|
| **DS-160 Renewal** | Renewing SAME visa type (L-1→L-1, H-1B→H-1B) | JSON Schema | `references/ds160-renewal-schema.txt` |
| **DS-160 Visa Change** | Changing visa type (E-2→L-1, B-1→H-1B) | JSON Schema | `references/ds160-visa-change-schema.txt` |
| **DS-160 New** | First-time applicant for this visa type | JSON Schema | `references/ds160-new-schema.txt` |
| **I-129S** | L-1 Blanket petition supplement | JSON Schema | `references/i129s-schema.txt` |
| **G-28** | Attorney appearance form | JSON Schema | `references/g28-schema.txt` |
| **DS-156E Part 3** | E-1/E-2 applicant information | Example-Based PDF | `read_form_knowledge("ds156e-part3")` |
| **Visa Scheduler** | US visa appointment scheduling | JSON Schema | `references/visa-scheduler-schema.txt` |
| **Passport Return** | Passport delivery form | JSON Schema | `references/passport-return-schema.txt` |
| **I-131** | Travel Document / Reentry Permit / Advance Parole | Example-Based PDF | `read_form_knowledge("i131")` |
| **I-485** | Application to Register Permanent Residence (Adjustment of Status) | Example-Based PDF | `read_form_knowledge("i485")` |

---

## Method 1: JSON Schema

**For forms using the JSON Schema method only** (see Method column in the Form Reference Table above). Do NOT use this workflow for Example-Based PDF forms.

For forms using JSON Schema method, load the schema file using the Read tool. Each schema is self-contained with all rules, field mappings, formatting requirements, and examples.

**Workflow:**
1. Read the schema file for the requested form
2. Extract data from user's documents following schema instructions
3. **Ask for any missing required fields** (see below)
4. **SAVE JSON to workspace using Write tool:**
   `Write({ file_path: "{{workspaceDir}}/artifacts/{client}-{form}.json", content: <your JSON> })`
   This makes the JSON appear in the artifact panel for user review and editing.
5. Output JSON wrapped in `<artifact>` tags (for streaming to chat)
6. Backend converts JSON to filled PDF
7. **REQUIRED: Read `post-generation-review.md` and complete the self-review before responding to the orchestrator**

---

## Method 2: Example-Based PDF

**For forms using the Example-Based PDF method** (see Method column in the Form Reference Table above). Do NOT output JSON artifacts or `<artifact>` tags for these forms.

**Workflow:**
1. Call `read_form_knowledge(form_type)` to get the knowledge document (e.g., `read_form_knowledge("ds156e-part3")`, `read_form_knowledge("i131")`, `read_form_knowledge("i485")`)
2. Invoke the PDF skill: `Skill({ skill: "pdf" })`
3. Follow the knowledge document's field mapping and extraction rules
4. Fill the PDF directly — output is a filled PDF file, NOT JSON
5. **After filling**, if you discovered any quirks, workarounds, or corrections, call `update_form_knowledge(form_type, content)` to update the knowledge document for future sessions
6. **REQUIRED: Read `post-generation-review.md` and complete the self-review before responding to the orchestrator**

---

## CRITICAL: Missing Data Policy

**NEVER estimate, guess, or use "typical defaults" for any form field.**

Immigration forms are legal documents. Incorrect data causes rejections, delays, or worse.

### If data is not in documents → ASK

Use `ask_user_question` to collect missing information:

```javascript
ask_user_question({
  questions: [{
    question: "What is the applicant's height?",
    header: "Height",
    options: [
      { label: "5'4\" (163 cm)", description: "" },
      { label: "5'7\" (170 cm)", description: "" },
      { label: "5'10\" (178 cm)", description: "" }
    ]
  }]
})
```

### Fields that are NEVER in documents (always ask):
- **Physical descriptors**: Height, weight, eye color, hair color
- **Trip details**: Duration abroad, countries to visit, departure date
- **Contact preferences**: Daytime phone vs mobile, email
- **SSN**: Usually not on passport/visa docs

### Fields to verify if unclear:
- Address (may have moved since last document)
- Phone number
- Phone numbers that look like placeholders (sequential digits like 1234567890) — omit these entirely
- Employer address (may have multiple locations)

### What NOT to do:
- ❌ "Used 5'7" (estimated)"
- ❌ "Brown eyes (typical default)"
- ❌ "Set to 1-2 years based on context"
- ❌ Making assumptions about physical appearance
- ❌ Guessing trip duration

### What TO do:
- ✅ Ask user for height, weight, eye color, hair color
- ✅ Ask user for trip duration and purpose
- ✅ Leave field blank and note it needs user input
- ✅ Ask clarifying questions before generating JSON


