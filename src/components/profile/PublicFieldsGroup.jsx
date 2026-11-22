/**
 * src/components/profile/PublicFieldsGroup.jsx
 * 2026-11-22 (public profile plan, step 14.7c-1): the "Shown on your public profile" group of the one
 * Edit screen. It only draws and reports changes; the screen owns the values and the saves.
 *
 *   - Preview: the chosen avatar, the name (in its own direction) and the @username (always left to right)
 *   - Name        the one name (with a username it is saved the public way; without one, as a detail)
 *   - Username    editable once every 30 days; inside the pause it is shown as fixed with the days left
 *   - Avatar      a ready-made design or initials (the sign-in photo is never used here)
 *   - Bio         optional, 160 characters
 *   - Old addresses keep working   a switch
 * Without a username yet the group shows the name and one "Set up" button that opens the setup sheet.
 */

import { Contact, AtSign, AlignLeft, AlertCircle } from 'lucide-react'
import PublicAvatar from '../ui/PublicAvatar'
import { WizardField, PillInput, wizardCardStyle, fieldIconStyle } from './FormParts'
import { AVATAR_CODES } from '../../utils/profileRules'
import { NAME_HELP, HANDLE_HELP, BIO_HELP, BIO_MAX, NAME_MAX, HANDLE_MAX } from '../../utils/publicSetup'
import { FORWARDING_LABEL, FORWARDING_HELP, hasHandle } from '../../utils/editProfile'

const TEXT = { fontFamily: 'var(--font-body)' }
const iconProps = { size: 14, strokeWidth: 1.8, color: 'var(--color-text-secondary)', style: fieldIconStyle }
const HELP = { margin: '6px 0 0', fontSize: 12, lineHeight: 1.4, color: 'var(--color-text-secondary)', ...TEXT }

const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)
// 'heart-rose' -> 'Heart, rose'
const avatarLabel = (code) => {
  const i = code.lastIndexOf('-')
  return `${cap(code.slice(0, i))}, ${code.slice(i + 1)}`
}

function Preview({ values }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', marginBottom: 'var(--space-4)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--color-surface-muted)' }}>
      <PublicAvatar code={values.avatarCode} name={values.fullName} size={52} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div dir="auto" style={{ fontSize: 16, fontWeight: 700, color: values.fullName ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...TEXT }}>
          {values.fullName || 'Your name'}
        </div>
        <div dir="ltr" style={{ fontSize: 14, color: 'var(--color-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left', ...TEXT }}>
          @{values.handle || 'username'}
        </div>
      </div>
    </div>
  )
}

export default function PublicFieldsGroup({
  values, onChange, errors = {}, handleDaysLeft = 0, disabled = false, onSetUp, setUpBlockedLine = null,
}) {
  const withCard = hasHandle(values)
  const handleLocked = handleDaysLeft > 0

  return (
    <div style={wizardCardStyle}>
      <Preview values={values} />

      <WizardField label="Name" icon={<Contact {...iconProps} />} error={errors.name} last={!withCard && !onSetUp}>
        <PillInput
          type="text"
          value={values.fullName}
          onChange={(e) => onChange('fullName', e.target.value.slice(0, NAME_MAX))}
          maxLength={NAME_MAX}
          dir="auto"
          autoComplete="off"
          disabled={disabled}
          error={Boolean(errors.name)}
          aria-invalid={Boolean(errors.name)}
          placeholder="Your name"
        />
        <p style={HELP}>{NAME_HELP}</p>
      </WizardField>

      {!withCard && (
        <div style={{ marginTop: 'var(--space-2)' }}>
          <p style={{ ...HELP, margin: '0 0 var(--space-3)' }}>
            You have no public profile yet. Set one up to choose a username and avatar, and to share roshettas and drug groups.
          </p>
          <button
            type="button"
            onClick={onSetUp}
            disabled={disabled || Boolean(setUpBlockedLine)}
            style={{
              width: '100%', minHeight: 48, borderRadius: 'var(--radius-md)', border: 'none',
              cursor: disabled || setUpBlockedLine ? 'default' : 'pointer',
              backgroundColor: 'var(--color-accent-solid)', color: '#fff', fontSize: 15, fontWeight: 600,
              opacity: disabled || setUpBlockedLine ? 0.55 : 1, WebkitTapHighlightColor: 'transparent', outline: 'none', ...TEXT,
            }}
          >
            Set up your public profile
          </button>
          {setUpBlockedLine && <p style={HELP}>{setUpBlockedLine}</p>}
        </div>
      )}

      {withCard && (
        <>
          <WizardField label="Username" icon={<AtSign {...iconProps} />} error={errors.handle}>
            <PillInput
              type="text"
              value={values.handle}
              onChange={(e) => onChange('handle', e.target.value.slice(0, HANDLE_MAX + 4))}
              dir="ltr"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              disabled={disabled || handleLocked}
              error={Boolean(errors.handle)}
              aria-invalid={Boolean(errors.handle)}
              style={{ textAlign: 'left' }}
            />
            <p style={HELP}>
              {handleLocked
                ? `You can change your username again in ${handleDaysLeft === 1 ? '1 day' : `${handleDaysLeft} days`}.`
                : HANDLE_HELP}
            </p>
          </WizardField>

          <div style={{ marginBottom: 'var(--space-3)' }}>
            <span id="edit-avatar-label" style={{ display: 'block', marginBottom: 8, fontSize: 13, fontWeight: 500, color: errors.avatar ? 'var(--color-danger)' : 'var(--color-text-secondary)', ...TEXT }}>Avatar</span>
            <div role="radiogroup" aria-labelledby="edit-avatar-label" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {[null, ...AVATAR_CODES].map((code) => {
                const on = values.avatarCode === code
                return (
                  <button
                    key={code ?? 'initials'}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={code ? avatarLabel(code) : 'Initials'}
                    disabled={disabled}
                    onClick={() => onChange('avatarCode', code)}
                    style={{
                      width: 48, height: 48, padding: 0, borderRadius: '50%', border: 'none', cursor: disabled ? 'default' : 'pointer', background: 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', outline: 'none',
                      boxShadow: on ? '0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent-solid)' : 'none',
                    }}
                  >
                    <PublicAvatar code={code} name={values.fullName} size={44} />
                  </button>
                )
              })}
            </div>
            {errors.avatar && (
              <div role="alert" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-danger)', ...TEXT }}>
                <AlertCircle size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
                {errors.avatar}
              </div>
            )}
            <p style={HELP}>The first one shows your initials.</p>
          </div>

          <WizardField label="Bio (optional)" icon={<AlignLeft {...iconProps} />} error={errors.bio}>
            <PillInput
              multiline
              rows={2}
              value={values.bio}
              onChange={(e) => onChange('bio', e.target.value.slice(0, BIO_MAX + 20))}
              dir="auto"
              disabled={disabled}
              error={Boolean(errors.bio)}
              aria-invalid={Boolean(errors.bio)}
            />
            <p style={HELP}>{BIO_HELP} {values.bio.length > 120 ? `${BIO_MAX - values.bio.length} left.` : ''}</p>
          </WizardField>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div id="edit-forwarding-label" style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)', ...TEXT }}>{FORWARDING_LABEL}</div>
              <p style={{ ...HELP, marginTop: 2 }}>{FORWARDING_HELP}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={values.handleForwarding}
              aria-labelledby="edit-forwarding-label"
              disabled={disabled}
              onClick={() => onChange('handleForwarding', !values.handleForwarding)}
              style={{
                flexShrink: 0, width: 52, height: 32, borderRadius: 16, border: 'none', padding: 3, cursor: disabled ? 'default' : 'pointer',
                backgroundColor: values.handleForwarding ? 'var(--color-accent-solid)' : 'var(--color-border)',
                display: 'flex', alignItems: 'center', justifyContent: values.handleForwarding ? 'flex-end' : 'flex-start',
                WebkitTapHighlightColor: 'transparent', outline: 'none',
              }}
            >
              <span style={{ width: 26, height: 26, borderRadius: '50%', backgroundColor: '#fff', display: 'block' }} />
            </button>
          </div>
        </>
      )}

      {errors.general && (
        <div role="alert" style={{ marginTop: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-danger)', ...TEXT }}>
          <AlertCircle size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
          {errors.general}
        </div>
      )}
    </div>
  )
}
