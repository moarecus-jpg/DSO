export function PageHero({ title, highlight, subtitle, children }) {
  return (
    <section className="hero">
      <div className="hero-inner">
        <div className="hero-copy">
          <h1 className="hero-title">
            {title}
            {highlight && <span className="hero-highlight"> {highlight}</span>}
          </h1>
          {subtitle && <p className="hero-subtitle">{subtitle}</p>}
        </div>
        {children && <div className="hero-actions">{children}</div>}
      </div>
    </section>
  );
}
