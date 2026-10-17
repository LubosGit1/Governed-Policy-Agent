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
        <form className="question" action="#">
          <label htmlFor="question">What would you like to know?</label>
          <textarea id="question" name="question" placeholder="For example: Is water damage from a burst pipe covered?" rows={3} />
          <button type="submit" disabled>Ask the policy assistant</button>
          <p className="notice">Prototype in progress. Do not enter personal or claim information.</p>
        </form>
      </section>
    </main>
  );
}
