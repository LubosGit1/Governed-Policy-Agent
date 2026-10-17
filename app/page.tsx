import { ChatPanel } from "./chat-panel";

export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">NORDLIGHT INSURANCE · INTERNAL POLICY ASSISTANT</p>
        <h1>Clear answers.<br />Grounded in your policy.</h1>
        <p className="intro">
          Ask a question about home insurance coverage or the claims process.
          Answers are based on approved policy documents and include sources.
        </p>
        <ChatPanel />
      </section>
    </main>
  );
}
