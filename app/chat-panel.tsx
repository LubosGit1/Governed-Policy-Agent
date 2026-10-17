"use client";

import { useState, type FormEvent } from "react";

interface Citation {
  sourceId: string;
  title: string;
}

interface ChatResult {
  requestId: string;
  answer: string;
  citations: Citation[];
  refused: boolean;
  escalationOffered: boolean;
}

export function ChatPanel() {
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState<ChatResult>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [ticketMessage, setTicketMessage] = useState("");

  async function askQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setTicketMessage("");
    setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const payload = await response.json() as ChatResult | { error: string };
      if (!response.ok || !("answer" in payload)) {
        throw new Error("error" in payload ? payload.error : "The assistant could not answer.");
      }
      setResult(payload);
      setApprovalOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The request failed.");
    } finally {
      setBusy(false);
    }
  }

  async function approveHandoff() {
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/api/handoffs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: true, question }),
      });
      const payload = await response.json() as { ticketId?: string; error?: string };
      if (!response.ok || !payload.ticketId) {
        throw new Error(payload.error ?? "The handoff could not be created.");
      }
      setTicketMessage(`Your request was sent to the claims team. Reference: ${payload.ticketId}`);
      setApprovalOpen(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The handoff failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="question" onSubmit={askQuestion}>
        <label htmlFor="question">What would you like to know?</label>
        <textarea
          id="question"
          name="question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="For example: Is water damage from a burst pipe covered?"
          maxLength={2000}
          rows={3}
          required
        />
        <button type="submit" disabled={busy || !question.trim()}>
          {busy ? "Checking approved policy…" : "Ask the policy assistant"}
        </button>
        <p className="notice">Avoid entering personal, payment or claim-identifying information.</p>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {result && (
        <section className="answer" aria-live="polite" aria-label="Assistant answer">
          <p className="answer-label">{result.refused ? "I could not confirm this" : "Policy answer"}</p>
          <p>{result.answer}</p>
          {result.citations.length > 0 && (
            <div className="citations">
              <h2>Sources</h2>
              <ul>
                {result.citations.map((citation) => (
                  <li key={citation.sourceId}>
                    <span>{citation.title}</span>
                    <code>{citation.sourceId}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.escalationOffered && (
            <button className="secondary-button" type="button" onClick={() => setApprovalOpen(true)}>
              Request human review
            </button>
          )}
          <p className="notice">Request reference: {result.requestId}</p>
        </section>
      )}

      {ticketMessage && <p className="success" role="status">{ticketMessage}</p>}

      {approvalOpen && (
        <div className="dialog-backdrop">
          <section className="approval-dialog" role="dialog" aria-modal="true" aria-labelledby="approval-title">
            <h2 id="approval-title">Send this question to a person?</h2>
            <p>
              A claims-team handoff ticket will be created. The ticket contains a PII-redacted
              version of your question. This does not submit or approve an insurance claim.
            </p>
            <blockquote>{question}</blockquote>
            <div className="dialog-actions">
              <button type="button" className="secondary-button" onClick={() => setApprovalOpen(false)} disabled={busy}>
                Cancel
              </button>
              <button type="button" onClick={approveHandoff} disabled={busy}>
                {busy ? "Sending…" : "Approve and send"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
