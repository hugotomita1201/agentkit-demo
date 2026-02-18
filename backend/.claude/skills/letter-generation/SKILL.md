---
name: Immigration Letter Generation
description: This skill should be used when the user asks to "write support letter", "create L-1B letter", "generate E-2 letter", "draft H-1B letter", "write visa letter", or any immigration support letter.
version: 1.1.0
---

# Immigration Support Letter Generation

Based on the visa type, load ONE template using the Read tool. Each template is self-contained with all formatting rules.

| Visa Type | Template File |
|-----------|---------------|
| **E-1 Treaty Trader** | `references/e1-treaty-trader.md` |
| **E-2 Essential Skills** | `references/e2-essential-skills.md` |
| **E-2 Manager/Supervisor** | `references/e2-manager.md` |
| **E-2 Executive** | `references/e2-executive.md` |
| **E-2 Dependent** | `references/e2-dependent.md` |
| **L-1A Manager/Executive** | `references/l1a-manager.md` |
| **L-1B Specialized Knowledge** | `references/l1b-blanket.md` |
| **L-2 Dependent** | `references/l2-dependent.md` |
| **H-1B Specialty Occupation** | `references/h1b-specialty.md` |
| **Other (O-1, TN, P-1, etc.)** | `references/general-letter.md` |

---

## Asking Clarifying Questions

**You don't need to generate everything in one go.** Immigration support letters are legal documents that require accuracy. If you're unsure about something or the documents don't provide enough detail, it's better to ask than to guess.

### When to Ask

Feel free to ask clarifying questions when:
- **Key dates are unclear** (employment start dates, project timelines, promotions)
- **Job responsibilities need specifics** (what exactly does the beneficiary do?)
- **Achievements lack detail** (numbers, metrics, impact)
- **Organizational structure is unclear** (who reports to whom, team size)
- **Specialized knowledge claims need support** (what makes their skills unique?)

**Note:** For general company information (mission, what they do, industry context), you may research online as the templates suggest. But for beneficiary-specific facts, ask if not in documents.

### What NOT to Do

- ❌ Invent specific dates or timelines not in documents
- ❌ Make up job responsibilities or achievements
- ❌ Fabricate numbers (revenue, team size, years of experience)
- ❌ Assume the beneficiary has certain skills without evidence
- ❌ Create fictional projects or accomplishments

### What TO Do

- ✅ Ask the user for missing beneficiary-specific details
- ✅ Use `ask_user_question` tool to gather specifics
- ✅ Note areas that need user input (e.g., "[PLACEHOLDER: specific project details needed]")
- ✅ Request clarification on ambiguous information
- ✅ Generate a draft and explicitly note what needs to be verified

**Remember:** A letter with placeholders that gets reviewed is better than a letter with fabricated details that gets submitted.

---

## Header/Footer

If a reference letter is available, copy its header and footer to the new letter by default.

---

## Workflow

1. Load the appropriate template from the table above using the Read tool
2. Check knowledge base: `read_form_knowledge({ form_type: "letter-<template-type>" })`
3. Extract beneficiary info from documents (see "Context Awareness" in your system prompt — read core docs fully, use Grep/targeted extraction for supporting documents)
4. **Ask clarifying questions** for anything unclear (see "Asking Clarifying Questions" section)
5. Generate the letter following template structure
6. Create DOCX using document-generation skill: `Skill({ skill: "document-generation" })`
7. **REQUIRED: Read `post-generation-review.md` and complete the self-review before responding to the orchestrator**
