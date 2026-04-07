'use client'

import { DirectorySettings, parseLeadershipData } from '@/types'

export interface LeadershipPageProps {
  settings: DirectorySettings
}

function NameColumn({ title, names }: { title: string; names: string[] }) {
  const lines = names.map((n) => n.trim()).filter(Boolean)
  return (
    <div>
      <div className="directory-leadership-col-title">{title}</div>
      <ul className="directory-leadership-name-list">
        {lines.map((name, i) => (
          <li key={`${title}-${i}`}>{name}</li>
        ))}
      </ul>
    </div>
  )
}

export function LeadershipPage({ settings }: LeadershipPageProps) {
  const d = parseLeadershipData(settings.leadership_data)

  return (
    <section className="directory-page directory-leadership-page break-after-page">
      <div className="directory-leadership-inner">
        <div className="directory-leadership-top">
          <h1 className="directory-leadership-h1">Elders &amp; Diaconate</h1>
          <div className="directory-leadership-columns">
            <NameColumn title="Elders" names={d.elders} />
            <NameColumn title="Deacons" names={d.deacons} />
            <NameColumn title="Deaconesses" names={d.deaconesses} />
          </div>
        </div>

        <hr className="directory-leadership-divider" />

        <div className="directory-leadership-staff-section">
          <h2 className="directory-leadership-h2">Staff</h2>
          <ul className="directory-leadership-staff-list">
            {d.staff.map((s, i) => (
              <li key={i}>
                <strong>{s.name}</strong>, {s.title} | {s.email}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
