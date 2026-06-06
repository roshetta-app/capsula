const AGE_COLORS = {
  adult:    { bg: '#DBEAFE', color: '#1E40AF' },
  child:    { bg: '#D1FAE5', color: '#065F46' },
  both:     { bg: '#EDE9FE', color: '#5B21B6' },
  neonatal: { bg: '#FEF3C7', color: '#92400E' },
}

export default function ConditionCard({ condition, onTap }) {
  const age = AGE_COLORS[condition.ageGroup] || { bg: '#F3F4F6', color: '#374151' }

  return (
    <div
      onClick={() => onTap(condition)}
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--space-3) var(--space-4)',
        marginBottom: 'var(--space-2)',
        cursor: 'pointer',
        boxShadow: 'var(--shadow-card)',
        transition: 'box-shadow 0.15s ease, transform 0.1s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-elevated)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = 'var(--shadow-card)'
        e.currentTarget.style.transform = 'translateY(0)'
      }}
    >
      {/* Top row: specialty chip + age badge */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 'var(--space-2)',
      }}>
        {condition.specialtyName && (
          <span style={{
            fontSize: 11, fontWeight: 500,
            letterSpacing: '0.04em', textTransform: 'uppercase',
            color: 'var(--color-text-tertiary)',
            backgroundColor: 'var(--color-bg)',
            border: '1px solid var(--color-border)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
          }}>
            {condition.specialtyName}
          </span>
        )}
        {condition.ageGroup && (
          <span style={{
            fontSize: 11, fontWeight: 500,
            backgroundColor: age.bg, color: age.color,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            flexShrink: 0,
            marginLeft: 'auto',
          }}>
            {condition.ageGroup.charAt(0).toUpperCase() + condition.ageGroup.slice(1)}
          </span>
        )}
      </div>

      {/* Condition name */}
      <div style={{
        fontSize: 16, fontWeight: 600,
        color: 'var(--color-text-primary)',
        lineHeight: 1.3, marginBottom: 'var(--space-1)',
      }}>
        {condition.name}
      </div>

      {/* Clinical picture preview */}
      {condition.clinicalPicture && (
        <div style={{
          fontSize: 13,
          color: 'var(--color-text-secondary)',
          lineHeight: 1.4,
          overflow: 'hidden',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {condition.clinicalPicture}
        </div>
      )}
    </div>
  )
}
