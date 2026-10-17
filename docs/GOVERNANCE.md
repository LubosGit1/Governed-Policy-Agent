# AI governance

## Data handling and PII

All policy content in this repository is fictional. Questions are redacted for email addresses, phone numbers, IBANs, and Czech birth numbers before retrieval and before any provider call. The audit table stores only the redacted question, retrieved source IDs, tool names, approvals, provider/model name, latency, token counts, refusal/escalation indicators, and timestamp. Handoff ticket summaries are redacted before persistence. Raw chat questions and model responses are not written to audit logs.

Pattern-based detection is not guaranteed to identify every personal or sensitive value. Employees should not submit claim identifiers, medical details, payment details, or other sensitive information. The demo does not implement automatic log retention or deletion; production must define a lawful retention schedule, access process, and deletion mechanism before collecting personal data.

## Human oversight

The assistant provides informational summaries only. It cannot determine coverage, approve a claim, make a settlement offer, or promise payment. Lack of evidence results in an explicit uncertainty response and an option to request human review.

The assistant cannot create handoff tickets by asking a model to invoke a tool. Ticket creation is a separate server endpoint reached from a UI confirmation dialog; the server requires an explicit approval flag and writes the ticket and approval audit record atomically. This is a demonstration of the workflow, not proof of an employee's identity. Production must authenticate the employee and bind the approval record to that identity and request.

## Auditability and traceability

Each valid assistant request has a UUID and records the redacted input, stable retrieved chunk IDs, tool calls, approvals, selected provider/model, latency, token counts, refusal status, escalation status, and creation time. The admin dashboard shows aggregate request, refusal, escalation, and latency metrics; access requires the configured admin key. CSV export includes only redacted audit data and protects spreadsheet cells from formula execution.

Policy source IDs are derived from document slugs and chunk positions, for example `water-damage#001`. Changing a document can change chunk positions; review source IDs and evaluation results when editing policy documents.

## Provider and model changes

The deterministic mock is the default and is required for automated tests and CI. The Anthropic provider is selected explicitly with `LLM_PROVIDER=anthropic`; the API key is supplied only through `ANTHROPIC_API_KEY`. Claude API billing is separate from a Claude Max subscription.

Before changing the provider, model, prompt, or retrieval behavior:

1. Review data residency, retention, contractual, and privacy implications.
2. Confirm the PII redaction and provider boundary with tests.
3. Run the 40-case evaluation and compare scores with the accepted baseline.
4. Review citations, refusals, prompt-injection cases, latency, and token use.
5. Update this document, the decision record, and deployment configuration.
6. Obtain human review before rollout and retain a rollback path.

## Quality monitoring

The evaluation set covers supported and unsupported questions, prompt injection, and PII. CI requires minimum correctness, citation, refusal, injection-resistance, and PII-leakage scores. Evaluation reports are CI artifacts. This compact synthetic set is a regression check, not evidence of real-world coverage accuracy. Monitor escalation, refusal, latency, and quality with a human reviewer before production use.
