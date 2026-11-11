/**
 * Where the katana sequence lands. A first pass of the Projects chapter:
 * the carousel itself comes next.
 */
const PLACEHOLDER = [
  { no: '01', title: 'Project One', kind: 'Web App' },
  { no: '02', title: 'Project Two', kind: 'Interactive' },
  { no: '03', title: 'Project Three', kind: 'Design System' },
]

export function ProjectsLanding() {
  return (
    <section id="projects" className="projects" aria-labelledby="projects-title">
      <div className="projects__glow" aria-hidden="true" />
      <header className="projects__head">
        <span className="projects__kanji" aria-hidden="true">作品</span>
        <div>
          <p className="eyebrow">Chapter II</p>
          <h2 id="projects-title">Projects</h2>
        </div>
      </header>
      <ol className="projects__list">
        {PLACEHOLDER.map(p => (
          <li key={p.no} className="project-card">
            <span className="project-card__no">{p.no}</span>
            <h3>{p.title}</h3>
            <p>{p.kind}</p>
            <span className="project-card__cut" aria-hidden="true" />
          </li>
        ))}
      </ol>
    </section>
  )
}
