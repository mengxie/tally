import type { ReactNode } from 'react';

/** A till receipt with torn edges: the one place this design is allowed to be loud. */
export function Receipt({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="receipt-wrap">
      <section className="receipt" aria-label={title}>
        <h2 className="receipt__title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

export function ReceiptRule() {
  return <hr className="receipt__rule" />;
}
