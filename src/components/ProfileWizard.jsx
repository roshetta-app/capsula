/**
 * src/components/ProfileWizard.jsx
 * Profile wizard redesign
 *
 * Shared 2-step form used by both AccountEditScreen.jsx (later edits,
 * pre-filled) and the first-time-signup flow (via ProfileSetupRedirect.jsx
 * navigating to /account/edit). Takes initialValues + the signed-in auth
 * user (for the read-only photo/email) and an onComplete callback.
 *
 * onComplete(values) is expected to return a Promise — this component
 * awaits it and owns its own saving/error UI internally (same
 * self-contained pattern the old ProfileSetupModal used), so the caller
 * only has to implement the actual persistence call.
 *
 * Country / specialty / governorate lists are static arrays here rather
 * than a Supabase-fed lookup table — no new dependency, matches how
 * OCCUPATION_OPTIONS already worked in this app, and avoids a
 * package-install round trip with no direct repo access.
 *
 * wizard-refinements batch (2026-08-22): the phone number field is the one
 * exception to the "no new dependency" rule above — it now formats/parses
 * via libphonenumber-js instead of a hand-rolled digit strip, a deliberate,
 * explicitly-confirmed override, since correct phone formatting varies
 * enough per country (trunk prefixes, digit counts) that a hand-rolled
 * approach can't cover every case correctly.
 *
 * header-skip-country-tweaks (2026-08-23):
 *   - Country dropdown moved from step 2 to step 1 (directly under Phone).
 *     Its required-field check moved from step2Valid to step1Valid with it.
 *     Picking a phone country code now auto-fills Country to match, via the
 *     same DIAL_TO_ISO2/COUNTRIES lookup already used for phone validation.
 *   - Skip for now (step 1) gained the same pointerdown/up/leave
 *     scale-transform press feedback used elsewhere in this file, plus a
 *     busy/disabled "Skipping…" state while its async onSkip is in flight.
 *
 * wizard-inline-nav-fields-move (2026-08-23), same-day follow-up:
 *   - Governorate moved to step 1 too, right under Country, since it
 *     depends on it and step 2 had nothing location-related left once
 *     Country moved. Step 2's heading dropped "& Location" accordingly —
 *     it's just "Professional" now.
 *   - Back/Continue/Save buttons are no longer a fixed footer bar pinned
 *     to the viewport bottom — they flow normally right after the fields
 *     card, like the rest of the form. The paddingBottom reservation on
 *     the wrapper (needed only for the old fixed footer) was removed too.
 *
 * governorate-collection-removed (2026-08-23), same-day follow-up:
 *   - Egypt governorate is no longer collected at all — Country alone is
 *     enough. EGYPT_GOVERNORATES, the Governorate field, values.governorate,
 *     and the country->governorate reset logic are all gone.
 *   - "Full name" label renamed to "Your name" (placeholder/error text
 *     updated to match).
 *   - The read-only email row moved from its own field near the bottom of
 *     step 1's card to directly under the avatar/initials circle at the
 *     top, using the same small-icon-plus-text treatment AccountScreen's
 *     own profile header already uses for email.
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import {
  ChevronDown, ChevronLeft, Search, Contact, User, Phone, Mail,
  Stethoscope, PenLine, HeartPulse, GraduationCap, MapPin,
} from 'lucide-react'
import { AsYouType, isValidPhoneNumber, validatePhoneNumberLength } from 'libphonenumber-js'

// ─── Static option data ─────────────────────────────────────────────────────

const GENDER_OPTIONS = [
  { value: 'male',        label: 'Male' },
  { value: 'female',      label: 'Female' },
  { value: 'undisclosed', label: 'Prefer not to say' },
]

// {value, label} pairs — same pattern GENDER_OPTIONS already uses.
// "Medical Student" keeps its stored value unchanged (existing profiles
// already have this value saved) but displays as "Student" to avoid
// repeating "student" right next to the Student Type field below it.
const OCCUPATION_OPTIONS = [
  { value: 'Specialist Physician', label: 'Specialist Physician' },
  { value: 'Junior Resident Physician', label: 'Junior Resident Physician' },
  { value: 'Senior Resident Physician', label: 'Senior Resident Physician' },
  { value: 'General Practitioner', label: 'General Practitioner' },
  { value: 'Intern Doctor',        label: 'Intern Doctor' },
  { value: 'Medical Student',      label: 'Student' },
  { value: 'Pharmacist',           label: 'Pharmacist' },
  { value: 'Dentist',              label: 'Dentist' },
  { value: 'Nurse',                label: 'Nurse' },
  { value: 'Other',                label: 'Other' },
]

const STUDENT_TYPE_OPTIONS = [
  'Medical student',
  'Pharmacy student',
  'Dental student',
  'Nursing student',
]

const SPECIALTY_OPTIONS = [
  'Family Medicine',
  'Anesthesiology & Critical Care',
  'Cardiology',
  'Cardiothoracic Surgery',
  'Clinical Pathology',
  'Critical Care Medicine (ICU)',
  'Dermatology',
  'Emergency Medicine',
  'Endocrinology & Diabetes',
  'Gastroenterology & Hepatology',
  'General Surgery',
  'Geriatrics',
  'Immunology & Allergy',
  'Infectious Disease',
  'Internal Medicine',
  'Nephrology',
  'Neurology',
  'Neurosurgery',
  'Obstetrics & Gynecology (OB/GYN)',
  'Oncology & Hematology',
  'Ophthalmology',
  'Orthopedic Surgery',
  'Otolaryngology (ENT)',
  'Pediatrics & Neonatology',
  'Physical Medicine & Rehabilitation',
  'Plastic Surgery & Aesthetics',
  'Psychiatry',
  'Public Health / Preventive Medicine',
  'Pulmonology / Chest Diseases',
  'Radiology & Imaging',
  'Rheumatology',
  'Urology',
  'Vascular Surgery',
  'Other Clinical',
  'Other Non-Clinical / Administrative',
]

// governorate-collection-removed (2026-08-23): Egypt governorate is no
// longer collected at all — Country alone is enough. EGYPT_GOVERNORATES
// removed along with every other governorate reference in this file.

// name + calling code together — Country field uses just the name, Phone
// field uses "name (+dial)" so the same base list backs both dropdowns.
const COUNTRIES = [
  { name: 'Afghanistan', dial: '+93', iso2: 'AF' }, { name: 'Albania', dial: '+355', iso2: 'AL' },
  { name: 'Algeria', dial: '+213', iso2: 'DZ' }, { name: 'Andorra', dial: '+376', iso2: 'AD' },
  { name: 'Angola', dial: '+244', iso2: 'AO' }, { name: 'Antigua and Barbuda', dial: '+1268', iso2: 'AG' },
  { name: 'Argentina', dial: '+54', iso2: 'AR' }, { name: 'Armenia', dial: '+374', iso2: 'AM' },
  { name: 'Australia', dial: '+61', iso2: 'AU' }, { name: 'Austria', dial: '+43', iso2: 'AT' },
  { name: 'Azerbaijan', dial: '+994', iso2: 'AZ' }, { name: 'Bahamas', dial: '+1242', iso2: 'BS' },
  { name: 'Bahrain', dial: '+973', iso2: 'BH' }, { name: 'Bangladesh', dial: '+880', iso2: 'BD' },
  { name: 'Barbados', dial: '+1246', iso2: 'BB' }, { name: 'Belarus', dial: '+375', iso2: 'BY' },
  { name: 'Belgium', dial: '+32', iso2: 'BE' }, { name: 'Belize', dial: '+501', iso2: 'BZ' },
  { name: 'Benin', dial: '+229', iso2: 'BJ' }, { name: 'Bhutan', dial: '+975', iso2: 'BT' },
  { name: 'Bolivia', dial: '+591', iso2: 'BO' }, { name: 'Bosnia and Herzegovina', dial: '+387', iso2: 'BA' },
  { name: 'Botswana', dial: '+267', iso2: 'BW' }, { name: 'Brazil', dial: '+55', iso2: 'BR' },
  { name: 'Brunei', dial: '+673', iso2: 'BN' }, { name: 'Bulgaria', dial: '+359', iso2: 'BG' },
  { name: 'Burkina Faso', dial: '+226', iso2: 'BF' }, { name: 'Burundi', dial: '+257', iso2: 'BI' },
  { name: 'Cabo Verde', dial: '+238', iso2: 'CV' }, { name: 'Cambodia', dial: '+855', iso2: 'KH' },
  { name: 'Cameroon', dial: '+237', iso2: 'CM' }, { name: 'Canada', dial: '+1', iso2: 'CA' },
  { name: 'Central African Republic', dial: '+236', iso2: 'CF' }, { name: 'Chad', dial: '+235', iso2: 'TD' },
  { name: 'Chile', dial: '+56', iso2: 'CL' }, { name: 'China', dial: '+86', iso2: 'CN' },
  { name: 'Colombia', dial: '+57', iso2: 'CO' }, { name: 'Comoros', dial: '+269', iso2: 'KM' },
  { name: 'Congo (Republic of the)', dial: '+242', iso2: 'CG' }, { name: 'Congo (Democratic Republic of the)', dial: '+243', iso2: 'CD' },
  { name: 'Costa Rica', dial: '+506', iso2: 'CR' }, { name: 'Croatia', dial: '+385', iso2: 'HR' },
  { name: 'Cuba', dial: '+53', iso2: 'CU' }, { name: 'Cyprus', dial: '+357', iso2: 'CY' },
  { name: 'Czechia', dial: '+420', iso2: 'CZ' }, { name: 'Denmark', dial: '+45', iso2: 'DK' },
  { name: 'Djibouti', dial: '+253', iso2: 'DJ' }, { name: 'Dominica', dial: '+1767', iso2: 'DM' },
  { name: 'Dominican Republic', dial: '+1809', iso2: 'DO' }, { name: 'Ecuador', dial: '+593', iso2: 'EC' },
  { name: 'Egypt', dial: '+20', iso2: 'EG' }, { name: 'El Salvador', dial: '+503', iso2: 'SV' },
  { name: 'Equatorial Guinea', dial: '+240', iso2: 'GQ' }, { name: 'Eritrea', dial: '+291', iso2: 'ER' },
  { name: 'Estonia', dial: '+372', iso2: 'EE' }, { name: 'Eswatini', dial: '+268', iso2: 'SZ' },
  { name: 'Ethiopia', dial: '+251', iso2: 'ET' }, { name: 'Fiji', dial: '+679', iso2: 'FJ' },
  { name: 'Finland', dial: '+358', iso2: 'FI' }, { name: 'France', dial: '+33', iso2: 'FR' },
  { name: 'Gabon', dial: '+241', iso2: 'GA' }, { name: 'Gambia', dial: '+220', iso2: 'GM' },
  { name: 'Georgia', dial: '+995', iso2: 'GE' }, { name: 'Germany', dial: '+49', iso2: 'DE' },
  { name: 'Ghana', dial: '+233', iso2: 'GH' }, { name: 'Greece', dial: '+30', iso2: 'GR' },
  { name: 'Grenada', dial: '+1473', iso2: 'GD' }, { name: 'Guatemala', dial: '+502', iso2: 'GT' },
  { name: 'Guinea', dial: '+224', iso2: 'GN' }, { name: 'Guinea-Bissau', dial: '+245', iso2: 'GW' },
  { name: 'Guyana', dial: '+592', iso2: 'GY' }, { name: 'Haiti', dial: '+509', iso2: 'HT' },
  { name: 'Honduras', dial: '+504', iso2: 'HN' }, { name: 'Hungary', dial: '+36', iso2: 'HU' },
  { name: 'Iceland', dial: '+354', iso2: 'IS' }, { name: 'India', dial: '+91', iso2: 'IN' },
  { name: 'Indonesia', dial: '+62', iso2: 'ID' }, { name: 'Iran', dial: '+98', iso2: 'IR' },
  { name: 'Iraq', dial: '+964', iso2: 'IQ' }, { name: 'Ireland', dial: '+353', iso2: 'IE' },
  { name: 'Israel', dial: '+972', iso2: 'IL' }, { name: 'Italy', dial: '+39', iso2: 'IT' },
  { name: 'Jamaica', dial: '+1876', iso2: 'JM' }, { name: 'Japan', dial: '+81', iso2: 'JP' },
  { name: 'Jordan', dial: '+962', iso2: 'JO' }, { name: 'Kazakhstan', dial: '+7', iso2: 'KZ' },
  { name: 'Kenya', dial: '+254', iso2: 'KE' }, { name: 'Kiribati', dial: '+686', iso2: 'KI' },
  { name: 'Kuwait', dial: '+965', iso2: 'KW' }, { name: 'Kyrgyzstan', dial: '+996', iso2: 'KG' },
  { name: 'Laos', dial: '+856', iso2: 'LA' }, { name: 'Latvia', dial: '+371', iso2: 'LV' },
  { name: 'Lebanon', dial: '+961', iso2: 'LB' }, { name: 'Lesotho', dial: '+266', iso2: 'LS' },
  { name: 'Liberia', dial: '+231', iso2: 'LR' }, { name: 'Libya', dial: '+218', iso2: 'LY' },
  { name: 'Liechtenstein', dial: '+423', iso2: 'LI' }, { name: 'Lithuania', dial: '+370', iso2: 'LT' },
  { name: 'Luxembourg', dial: '+352', iso2: 'LU' }, { name: 'Madagascar', dial: '+261', iso2: 'MG' },
  { name: 'Malawi', dial: '+265', iso2: 'MW' }, { name: 'Malaysia', dial: '+60', iso2: 'MY' },
  { name: 'Maldives', dial: '+960', iso2: 'MV' }, { name: 'Mali', dial: '+223', iso2: 'ML' },
  { name: 'Malta', dial: '+356', iso2: 'MT' }, { name: 'Marshall Islands', dial: '+692', iso2: 'MH' },
  { name: 'Mauritania', dial: '+222', iso2: 'MR' }, { name: 'Mauritius', dial: '+230', iso2: 'MU' },
  { name: 'Mexico', dial: '+52', iso2: 'MX' }, { name: 'Micronesia', dial: '+691', iso2: 'FM' },
  { name: 'Moldova', dial: '+373', iso2: 'MD' }, { name: 'Monaco', dial: '+377', iso2: 'MC' },
  { name: 'Mongolia', dial: '+976', iso2: 'MN' }, { name: 'Montenegro', dial: '+382', iso2: 'ME' },
  { name: 'Morocco', dial: '+212', iso2: 'MA' }, { name: 'Mozambique', dial: '+258', iso2: 'MZ' },
  { name: 'Myanmar', dial: '+95', iso2: 'MM' }, { name: 'Namibia', dial: '+264', iso2: 'NA' },
  { name: 'Nauru', dial: '+674', iso2: 'NR' }, { name: 'Nepal', dial: '+977', iso2: 'NP' },
  { name: 'Netherlands', dial: '+31', iso2: 'NL' }, { name: 'New Zealand', dial: '+64', iso2: 'NZ' },
  { name: 'Nicaragua', dial: '+505', iso2: 'NI' }, { name: 'Niger', dial: '+227', iso2: 'NE' },
  { name: 'Nigeria', dial: '+234', iso2: 'NG' }, { name: 'North Korea', dial: '+850', iso2: 'KP' },
  { name: 'North Macedonia', dial: '+389', iso2: 'MK' }, { name: 'Norway', dial: '+47', iso2: 'NO' },
  { name: 'Oman', dial: '+968', iso2: 'OM' }, { name: 'Pakistan', dial: '+92', iso2: 'PK' },
  { name: 'Palau', dial: '+680', iso2: 'PW' }, { name: 'Palestine', dial: '+970', iso2: 'PS' },
  { name: 'Panama', dial: '+507', iso2: 'PA' }, { name: 'Papua New Guinea', dial: '+675', iso2: 'PG' },
  { name: 'Paraguay', dial: '+595', iso2: 'PY' }, { name: 'Peru', dial: '+51', iso2: 'PE' },
  { name: 'Philippines', dial: '+63', iso2: 'PH' }, { name: 'Poland', dial: '+48', iso2: 'PL' },
  { name: 'Portugal', dial: '+351', iso2: 'PT' }, { name: 'Qatar', dial: '+974', iso2: 'QA' },
  { name: 'Romania', dial: '+40', iso2: 'RO' }, { name: 'Russia', dial: '+7', iso2: 'RU' },
  { name: 'Rwanda', dial: '+250', iso2: 'RW' }, { name: 'Saint Kitts and Nevis', dial: '+1869', iso2: 'KN' },
  { name: 'Saint Lucia', dial: '+1758', iso2: 'LC' }, { name: 'Saint Vincent and the Grenadines', dial: '+1784', iso2: 'VC' },
  { name: 'Samoa', dial: '+685', iso2: 'WS' }, { name: 'San Marino', dial: '+378', iso2: 'SM' },
  { name: 'Sao Tome and Principe', dial: '+239', iso2: 'ST' }, { name: 'Saudi Arabia', dial: '+966', iso2: 'SA' },
  { name: 'Senegal', dial: '+221', iso2: 'SN' }, { name: 'Serbia', dial: '+381', iso2: 'RS' },
  { name: 'Seychelles', dial: '+248', iso2: 'SC' }, { name: 'Sierra Leone', dial: '+232', iso2: 'SL' },
  { name: 'Singapore', dial: '+65', iso2: 'SG' }, { name: 'Slovakia', dial: '+421', iso2: 'SK' },
  { name: 'Slovenia', dial: '+386', iso2: 'SI' }, { name: 'Solomon Islands', dial: '+677', iso2: 'SB' },
  { name: 'Somalia', dial: '+252', iso2: 'SO' }, { name: 'South Africa', dial: '+27', iso2: 'ZA' },
  { name: 'South Korea', dial: '+82', iso2: 'KR' }, { name: 'South Sudan', dial: '+211', iso2: 'SS' },
  { name: 'Spain', dial: '+34', iso2: 'ES' }, { name: 'Sri Lanka', dial: '+94', iso2: 'LK' },
  { name: 'Sudan', dial: '+249', iso2: 'SD' }, { name: 'Suriname', dial: '+597', iso2: 'SR' },
  { name: 'Sweden', dial: '+46', iso2: 'SE' }, { name: 'Switzerland', dial: '+41', iso2: 'CH' },
  { name: 'Syria', dial: '+963', iso2: 'SY' }, { name: 'Taiwan', dial: '+886', iso2: 'TW' },
  { name: 'Tajikistan', dial: '+992', iso2: 'TJ' }, { name: 'Tanzania', dial: '+255', iso2: 'TZ' },
  { name: 'Thailand', dial: '+66', iso2: 'TH' }, { name: 'Timor-Leste', dial: '+670', iso2: 'TL' },
  { name: 'Togo', dial: '+228', iso2: 'TG' }, { name: 'Tonga', dial: '+676', iso2: 'TO' },
  { name: 'Trinidad and Tobago', dial: '+1868', iso2: 'TT' }, { name: 'Tunisia', dial: '+216', iso2: 'TN' },
  { name: 'Turkey', dial: '+90', iso2: 'TR' }, { name: 'Turkmenistan', dial: '+993', iso2: 'TM' },
  { name: 'Tuvalu', dial: '+688', iso2: 'TV' }, { name: 'Uganda', dial: '+256', iso2: 'UG' },
  { name: 'Ukraine', dial: '+380', iso2: 'UA' }, { name: 'United Arab Emirates', dial: '+971', iso2: 'AE' },
  { name: 'United Kingdom', dial: '+44', iso2: 'GB' }, { name: 'United States', dial: '+1', iso2: 'US' },
  { name: 'Uruguay', dial: '+598', iso2: 'UY' }, { name: 'Uzbekistan', dial: '+998', iso2: 'UZ' },
  { name: 'Vanuatu', dial: '+678', iso2: 'VU' }, { name: 'Vatican City', dial: '+379', iso2: 'VA' },
  { name: 'Venezuela', dial: '+58', iso2: 'VE' }, { name: 'Vietnam', dial: '+84', iso2: 'VN' },
  { name: 'Yemen', dial: '+967', iso2: 'YE' }, { name: 'Zambia', dial: '+260', iso2: 'ZM' },
  { name: 'Zimbabwe', dial: '+263', iso2: 'ZW' },
]

const COUNTRY_OPTIONS   = COUNTRIES.map(c => c.name)

// ─── Shared styles ───────────────────────────────────────────────────────────

// wizard-fields-redesign: switched from a bordered pill (transparent card
// bg, visible outline) to a filled field — no border by default, a soft
// muted fill instead. Sits inside a WizardCard (below), whose bg is
// var(--color-surface); using --color-surface-muted here (a step darker)
// keeps the field visible against the card without needing an outline.
const pillInputStyle = {
  width:           '100%',
  padding:         'var(--space-3) var(--space-4)',
  borderRadius:    'var(--radius-md)',
  border:          '1px solid transparent',
  backgroundColor: 'var(--color-surface-muted)',
  color:           'var(--color-text-primary)',
  fontSize:        15,
  fontFamily:      'var(--font-body)',
  boxSizing:       'border-box',
  transition:      'border-color var(--motion-fast) var(--ease-settle), box-shadow var(--motion-fast) var(--ease-settle)',
}

// wizard-refinements batch: brand-accent focus ring, applied via onFocus/
// onBlur (or WizardDropdown's own `open` state) rather than a CSS
// pseudo-class, since every field here is styled with an inline `style`
// object, not a stylesheet class.
const pillInputFocusStyle = {
  borderColor: 'var(--color-accent)',
  boxShadow:   '0 0 0 3px color-mix(in srgb, var(--color-accent) 20%, transparent)',
}

// Per-field error state — same red used by the existing saveError banner,
// just applied to the individual field's border/background instead of a
// single block at the bottom of the form.
const pillInputErrorStyle = {
  borderColor:     '#DC2626',
  backgroundColor: '#FEF2F2',
}

// wizard-fields-redesign: groups a step's fields into one bordered card,
// matching the same card look AccountEditScreen's read-only view already
// uses (ReadOnlyGroup) — ties the editable and read-only screens to one
// visual language instead of two.
const wizardCardStyle = {
  backgroundColor: 'var(--color-surface)',
  border:          '1px solid var(--color-border)',
  borderRadius:    'var(--radius-lg)',
  padding:         'var(--space-4)',
}

const fieldIconStyle = { flexShrink: 0 }

function getInitials(fullName, email) {
  const source = (fullName || '').trim()
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0][0].toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return (email?.[0] || '?').toUpperCase()
}

// ─── Field wrapper ───────────────────────────────────────────────────────────

function WizardField({ label, icon, last, error, children }) {
  return (
    <div style={{ marginBottom: last ? 0 : 'var(--space-3)' }}>
      <label style={{
        display:      'flex',
        alignItems:   'center',
        gap:          6,
        fontSize:     13,
        fontWeight:   500,
        color:        error ? '#DC2626' : 'var(--color-text-secondary)',
        marginBottom: 'var(--space-2)',
      }}>
        {icon}
        {label}
      </label>
      {children}
      {error && (
        <div style={{ fontSize: 12, color: '#DC2626', marginTop: 6, lineHeight: 1.4 }}>
          {error}
        </div>
      )}
    </div>
  )
}

// ─── Pill dropdown, with an optional search box for long lists ─────────────

function WizardDropdown({ value, onChange, options, placeholder = 'Select…', disabled = false, error = false }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const containerRef      = useRef(null)
  const searchRef         = useRef(null)

  // Normalize to { value, label } — plain strings map to themselves.
  const normalized = useMemo(
    () => options.map(o => (typeof o === 'string' ? { value: o, label: o } : o)),
    [options]
  )
  const searchable = normalized.length > 8

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return normalized
    const q = query.trim().toLowerCase()
    return normalized.filter(o => o.label.toLowerCase().includes(q))
  }, [normalized, query, searchable])

  const selected = normalized.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (!containerRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  useEffect(() => {
    if (open && searchable) searchRef.current?.focus()
    if (!open) setQuery('')
  }, [open, searchable])

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        style={{
          ...pillInputStyle,
          ...(open ? pillInputFocusStyle : {}),
          ...(error && !open ? pillInputErrorStyle : {}),
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          cursor:         disabled ? 'not-allowed' : 'pointer',
          opacity:        disabled ? 0.6 : 1,
          textAlign:      'left',
        }}
      >
        <span style={{ color: selected ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)' }}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.8}
          color="var(--color-text-secondary)"
          style={{
            transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform var(--motion-fast) var(--ease-settle)',
            flexShrink: 0,
          }}
        />
      </button>

      {open && (
        <div style={{
          position:        'absolute',
          top:             'calc(100% + 6px)',
          left:            0,
          right:           0,
          zIndex:          100,
          backgroundColor: 'var(--color-surface)',
          border:          '1px solid var(--color-border)',
          borderRadius:    'var(--radius-md)',
          boxShadow:       '0 4px 16px rgba(0,0,0,0.10)',
          overflow:        'hidden',
        }}>
          {searchable && (
            <div style={{
              display:      'flex',
              alignItems:   'center',
              gap:          'var(--space-2)',
              padding:      'var(--space-2) var(--space-3)',
              borderBottom: '1px solid var(--color-border)',
            }}>
              <Search size={14} strokeWidth={1.8} color="var(--color-text-tertiary)" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search…"
                style={{
                  flex:       1,
                  border:     'none',
                  outline:    'none',
                  background: 'none',
                  fontSize:   14,
                  fontFamily: 'var(--font-body)',
                  color:      'var(--color-text-primary)',
                }}
              />
            </div>
          )}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{
                padding:  '10px 12px',
                fontSize: 14,
                color:    'var(--color-text-tertiary)',
              }}>
                No matches
              </div>
            )}
            {filtered.map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => { onChange(option.value); setOpen(false) }}
                style={{
                  width:      '100%',
                  textAlign:  'left',
                  padding:    '10px 12px',
                  border:     'none',
                  background: option.value === value ? 'var(--color-bg)' : 'none',
                  fontSize:   14,
                  fontFamily: 'var(--font-body)',
                  color:      'var(--color-text-primary)',
                  cursor:     'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = option.value === value ? 'var(--color-bg)' : 'transparent' }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Phone country-code picker — full-width bottom sheet ───────────────────
//
// Previously this was just another WizardDropdown squeezed into the Phone
// row's 42%-wide code column. With 150+ countries and a search box, that
// popover had nowhere to render but overlapping/clipped at the screen edge.
// Sheet shell (backdrop fade, slide-up transform, shouldRender/animateIn
// mount timing, Escape key, body-scroll lock) copied from the same
// convention already used by SpecialtiesBottomSheet.jsx and
// PregnancyCategoryBottomSheet.jsx — no new sheet mechanism introduced.
// Search box lives in the fixed header (unlike those two sheets, which have
// no search) since this list is far longer than either of theirs.

function PhoneCodeSheet({ value, onSelect, onClose, isOpen }) {
  const [shouldRender, setShouldRender] = useState(isOpen)
  const [animateIn,    setAnimateIn]    = useState(isOpen)
  const [query,        setQuery]        = useState('')
  const searchRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true)
      requestAnimationFrame(() => setAnimateIn(true))
    } else {
      setAnimateIn(false)
      const t = setTimeout(() => setShouldRender(false), 280)
      return () => clearTimeout(t)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) searchRef.current?.focus()
    else setQuery('')
  }, [isOpen])

  if (!shouldRender) return null

  const filtered = query.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(query.trim().toLowerCase()) ||
        c.dial.includes(query.trim())
      )
    : COUNTRIES

  function handleSelect(dial) {
    onSelect(dial)
    onClose()
  }

  return (
    <>
      <div
        onClick={onClose}
        aria-hidden="true"
        style={{
          position:        'fixed',
          inset:           0,
          zIndex:          200,
          backgroundColor: 'rgba(0,0,0,0.35)',
          opacity:         animateIn ? 1 : 0,
          transition:      'opacity var(--motion-base) var(--ease-reveal)',
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Select country code"
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          zIndex:          201,
          backgroundColor: 'var(--color-surface)',
          borderRadius:    '16px 16px 0 0',
          display:         'flex',
          flexDirection:   'column',
          maxHeight:       '70dvh',
          paddingBottom:   'env(safe-area-inset-bottom)',
          transform:       animateIn ? 'translateY(0)' : 'translateY(100%)',
          transition:      'transform var(--motion-screen) var(--ease-settle)',
        }}
      >
        {/* Fixed header — drag handle, label, search. Does not scroll;
            only the country list below it does. */}
        <div style={{ flexShrink: 0, padding: 'var(--space-5) var(--space-4) var(--space-3)' }}>
          <div style={{
            width:           40,
            height:          4,
            borderRadius:    2,
            backgroundColor: 'var(--color-border)',
            margin:          '0 auto var(--space-4)',
          }} />
          <div style={{
            fontSize:     13,
            fontWeight:   500,
            color:        'var(--color-text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            marginBottom: 'var(--space-3)',
          }}>
            Select country code
          </div>
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          'var(--space-2)',
            padding:      '10px var(--space-3)',
            border:       '1px solid var(--color-border)',
            borderRadius: 999,
          }}>
            <Search size={16} strokeWidth={1.8} color="var(--color-text-tertiary)" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search country or code…"
              style={{
                flex:       1,
                border:     'none',
                outline:    'none',
                background: 'none',
                fontSize:   15,
                fontFamily: 'var(--font-body)',
                color:      'var(--color-text-primary)',
              }}
            />
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{
          flex:      1,
          overflowY: 'auto',
          padding:   '0 var(--space-4) var(--space-6)',
        }}>
          {filtered.length === 0 && (
            <div style={{
              padding:  'var(--space-4) 0',
              fontSize: 14,
              color:    'var(--color-text-tertiary)',
              textAlign: 'center',
            }}>
              No matches
            </div>
          )}
          {filtered.map(c => (
            <button
              key={c.name}
              type="button"
              onClick={() => handleSelect(c.dial)}
              style={{
                width:           '100%',
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'space-between',
                textAlign:       'left',
                padding:         '12px 14px',
                marginBottom:    2,
                borderRadius:    'var(--radius-md)',
                border:          'none',
                background:      c.dial === value ? 'var(--color-bg)' : 'none',
                fontSize:        15,
                fontFamily:      'var(--font-body)',
                fontWeight:      c.dial === value ? 600 : 400,
                color:           'var(--color-text-primary)',
                cursor:          'pointer',
              }}
            >
              <span>{c.name}</span>
              <span style={{ color: 'var(--color-text-secondary)' }}>{c.dial}</span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// phone-entry-standardization: maps each dial code in COUNTRIES to its
// ISO 3166-1 alpha-2 code, verified directly against libphonenumber-js's
// own metadata (see matched_countries.json generation) rather than typed
// by hand. Two dial codes are shared by more than one country in this
// list (+1: US/Canada, +7: Russia/Kazakhstan); for those, defaulting to
// the same country libphonenumber-js itself picks when a region is
// ambiguous (US, Russia) — the same fallback every phone-input library
// in this situation uses, since the stored value is the dial code alone.
const DIAL_TO_ISO2 = Object.fromEntries(COUNTRIES.map(c => [c.dial, c.iso2]))
DIAL_TO_ISO2['+1'] = 'US'
DIAL_TO_ISO2['+7'] = 'RU'

// Formats the digits typed so far into that country's national format for
// display (e.g. "011 13674256" for Egypt) — the stored value in
// `values.phoneNumber` stays plain digits either way, this only affects
// what's shown in the input. Per-country AsYouType handles each
// country's own dialing conventions (trunk prefixes, grouping, etc.)
// internally — the raw digits the person actually typed (leading 0
// included, for countries that use one) are fed straight in, exactly as
// libphonenumber-js expects; no manual concatenation or stripping.
function formatPhoneDisplay(dialCode, digits) {
  if (!digits) return digits
  const iso2 = DIAL_TO_ISO2[dialCode]
  if (!iso2) return digits
  const formatted = new AsYouType(iso2).input(digits)
  return formatted || digits
}

// Same reasoning as above: validity is delegated entirely to
// libphonenumber-js's per-country rules (correct number of digits,
// correct prefixes, etc.) instead of a hardcoded length check for one
// country — this is the same validation every major phone-input library
// (react-phone-number-input, intl-tel-input, etc.) relies on.
function isPhoneInvalid(dialCode, digits) {
  if (!digits) return false
  const iso2 = DIAL_TO_ISO2[dialCode]
  if (!iso2) return false
  return !isValidPhoneNumber(digits, iso2)
}

// ─── Wizard ──────────────────────────────────────────────────────────────────


/**
 * @param {object} props
 * @param {object} props.initialValues — { fullName, gender, phoneCountryCode, phoneNumber, occupation, occupationOther, specialty, studentType, country }
 * @param {object} props.user — the signed-in auth user (for read-only photo + email)
 * @param {(values: object) => Promise<void>} props.onComplete — called on final Save; the wizard awaits it and shows its own saving/error state
 * @param {() => void} [props.onBack] — called if the person backs out of step 1 entirely (no history to fall back on otherwise)
 * @param {() => void} [props.onSkip] — profile-nudge-system: called if the person taps Skip on step 1. Only
 *   ever passed on the forced first-time signup path (never when editing an existing profile) — its presence
 *   is what makes the Skip link render at all. Only offered on step 1; once someone has moved on to step 2
 *   they're close enough to done that we no longer offer an early exit.
 */
export default function ProfileWizard({ initialValues, user, onComplete, onBack, onSkip }) {
  const [step, setStep]     = useState(1)
  const [values, setValues] = useState({
    fullName:         initialValues?.fullName ?? '',
    gender:           initialValues?.gender ?? '',
    phoneCountryCode: initialValues?.phoneCountryCode ?? '',
    phoneNumber:      initialValues?.phoneNumber ?? '',
    occupation:       initialValues?.occupation ?? '',
    occupationOther:  initialValues?.occupationOther ?? '',
    specialty:        initialValues?.specialty ?? '',
    studentType:      initialValues?.studentType ?? '',
    country:          initialValues?.country ?? '',
  })
  const [saving, setSaving]     = useState(false)
  const [saveError, setSaveError] = useState(null)
  // header-skip-country-tweaks: press-feedback + busy state for the Skip
  // link, same pointerdown/up/leave scale-transform pattern every other
  // wizard/AccountEditScreen button already uses (BottomNav/MenuRow/Edit
  // Profile pill/Logout button).
  const [skipPressed, setSkipPressed]   = useState(false)
  const [skipping, setSkipping]         = useState(false)
  const [phoneSheetOpen, setPhoneSheetOpen] = useState(false)
  // Focus state for the plain text inputs (Full name, Other occupation,
  // phone number) — WizardDropdown tracks its own `open` state instead,
  // since its trigger button doesn't get a native browser focus ring.
  const [fullNameFocused, setFullNameFocused]   = useState(false)
  const [phoneFocused, setPhoneFocused]         = useState(false)
  const [phoneBlurred, setPhoneBlurred]         = useState(false)
  const [occupationOtherFocused, setOccupationOtherFocused] = useState(false)
  // Only shows a field's error state after the person has tried to move
  // on once — avoids flashing every required field red before they've had
  // a chance to fill anything in.
  const [attemptedStep1, setAttemptedStep1] = useState(false)
  const [attemptedStep2, setAttemptedStep2] = useState(false)

  function set(field, value) {
    setValues(prev => {
      const next = { ...prev, [field]: value }
      // Conditional-field clearing per the agreed spec's exact rules.
      if (field === 'occupation') {
        if (value !== 'Specialist Physician' && value !== 'Junior Resident Physician' && value !== 'Senior Resident Physician') next.specialty = ''
        if (value !== 'Medical Student') next.studentType = ''
        if (value !== 'Other') next.occupationOther = ''
      }
      // header-skip-country-tweaks: Country now sits on step 1, directly
      // under Phone — auto-fill it from the selected phone country code
      // using the same DIAL_TO_ISO2 lookup already used for phone
      // validation/selectedCountry below, so the two fields agree by
      // default. The person can still change it manually afterward, since
      // Country is a real dropdown right underneath.
      if (field === 'phoneCountryCode') {
        const matchedCountry = COUNTRIES.find(c => c.iso2 === DIAL_TO_ISO2[value])
        if (matchedCountry) next.country = matchedCountry.name
      }
      return next
    })
  }

  const selectedCountry     = COUNTRIES.find(c => c.iso2 === DIAL_TO_ISO2[values.phoneCountryCode])
  const showSpecialty       = values.occupation === 'Specialist Physician' || values.occupation === 'Junior Resident Physician' || values.occupation === 'Senior Resident Physician'
  const showStudentType     = values.occupation === 'Medical Student'
  const showOccupationOther = values.occupation === 'Other'

  // profile-nudge-system: phone is now required on step 1, alongside full
  // name — was optional before (AccountScreen's completeness nudge treats
  // it as one of the required fields, so the wizard has to actually
  // enforce it or someone could "finish" the wizard and still trip the
  // nudge). A phone counts as filled only once it's also valid for the
  // selected country, matching the field's existing validation.
  // header-skip-country-tweaks: Country's required check moves here with
  // the field itself — it used to live in step2Valid back when the
  // dropdown was on step 2.
  const step1Valid = values.fullName.trim().length > 0
    && values.phoneNumber.trim().length > 0
    && !isPhoneInvalid(values.phoneCountryCode, values.phoneNumber)
    && values.country.trim().length > 0
  // profile-nudge-system: specialty is now required on step 2, but only
  // when it's actually shown (physician occupations) — pharmacists,
  // students, etc. never see the field at all, so it can't be required
  // for them.
  const step2Valid = values.occupation.trim().length > 0
    && (!showOccupationOther || values.occupationOther.trim().length > 0)
    && (!showSpecialty || values.specialty.trim().length > 0)

  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
  const initials  = getInitials(values.fullName, user?.email)
  // account-avatar-broken-image-fallback: a truthy URL doesn't mean the
  // image actually loads — Google's avatar URLs can 403/expire/CORS-block
  // depending on session state, which previously left the browser's own
  // broken-image icon showing instead of falling back to initials. This
  // tracks a real load failure, not just URL presence. Same fix as
  // AccountScreen.jsx / AccountEditScreen.jsx, which read the same field.
  const [avatarError, setAvatarError] = useState(false)

  async function handleFormSubmit(e) {
    e.preventDefault()
    // Step 1's "Continue" and step 2's "Save" are both type="submit" so
    // pressing Enter in any text field (or tapping a mobile keyboard's
    // Enter/Done key) does the same thing a tap would — advance on step 1,
    // save on step 2 — instead of falling through to the browser's native
    // form submission (no onSubmit handler was ever assigned for step 1
    // before this fix, which caused an actual page reload on Enter, wiping
    // whatever had been typed).
    if (step === 1) {
      setAttemptedStep1(true)
      if (step1Valid) setStep(2)
      return
    }
    setAttemptedStep2(true)
    if (saving || !step2Valid) return
    setSaving(true)
    setSaveError(null)
    try {
      await onComplete(values)
    } catch (err) {
      setSaveError(err.message ?? 'Could not save. Please try again.')
      setSaving(false)
      return
    }
    setSaving(false)
  }

  return (
    <div style={{
      fontFamily: 'var(--font-body)',
    }}>
      {/* wizard-header-both-steps: avatar + email render above the progress
          bar on both step 1 and step 2 — swapped ahead of the progress bar
          (was below it) per explicit ordering request, same day. */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
        {avatarUrl && !avatarError ? (
          <img
            src={avatarUrl}
            alt=""
            onError={() => setAvatarError(true)}
            style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-border)' }}
          />
        ) : (
          <div style={{
            width:           72,
            height:          72,
            borderRadius:    '50%',
            backgroundColor: 'var(--color-accent)',
            color:           '#fff',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        24,
            fontWeight:      600,
          }}>
            {initials}
          </div>
        )}
      </div>

      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        gap:            'var(--space-1)',
        color:          'var(--color-text-secondary)',
        marginBottom:   'var(--space-4)',
      }}>
        <Mail size={15} strokeWidth={1.8} />
        <span style={{ fontSize: 15 }}>{user?.email ?? ''}</span>
      </div>

      {/* ── Progress bar (2 segments), with Skip alongside it ──
          profile-nudge-system: Skip only ever renders on step 1, and only
          when the caller passed onSkip (the forced first-time signup
          path) — editing an existing profile never gets this link. A
          plain text link, not a button, so it doesn't compete visually
          with the Continue CTA below. */}
      <div style={{ marginBottom: 'var(--space-2)' }}>
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            'var(--space-3)',
          marginBottom:   'var(--space-2)',
        }}>
          <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
            Step {step} of 2
          </div>
          {step === 1 && onSkip && (
            <button
              type="button"
              disabled={skipping}
              onClick={async () => {
                if (skipping) return
                setSkipping(true)
                try {
                  await onSkip()
                } finally {
                  // onSkip navigates away on success, so this mostly only
                  // matters if it throws — keeps the link from getting
                  // stuck disabled/busy on a failed attempt.
                  setSkipping(false)
                }
              }}
              onPointerDown={() => setSkipPressed(true)}
              onPointerUp={() => setSkipPressed(false)}
              onPointerLeave={() => setSkipPressed(false)}
              style={{
                border:                  'none',
                background:              'none',
                padding:                 0,
                fontSize:                13,
                fontWeight:              600,
                fontFamily:              'var(--font-body)',
                color:                   'var(--color-text-secondary)',
                textDecoration:          'underline',
                cursor:                  skipping ? 'default' : 'pointer',
                opacity:                 skipping ? 0.6 : 1,
                transform:               skipPressed ? 'scale(0.97)' : 'scale(1)',
                transition:              'transform var(--motion-fast) var(--ease-settle), opacity var(--motion-fast) var(--ease-settle)',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {skipping ? 'Skipping…' : 'Skip for now'}
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[1, 2].map(i => (
            <div key={i} style={{
              flex:            1,
              height:          4,
              borderRadius:    2,
              backgroundColor: i <= step ? 'var(--color-accent)' : 'var(--color-border)',
              transition:      'background-color var(--motion-base) var(--ease-settle)',
            }} />
          ))}
        </div>
      </div>

      <form onSubmit={handleFormSubmit} style={{ marginTop: 'var(--space-5)' }}>

        {step === 1 && (
          <>
            <h2 style={{ margin: '0 0 var(--space-4)', fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Personal info
            </h2>

            <div style={wizardCardStyle}>
              <WizardField
                label="Your name"
                icon={<Contact size={14} strokeWidth={1.8} color="var(--color-text-secondary)" style={fieldIconStyle} />}
                error={attemptedStep1 && !step1Valid ? 'Your name is required' : null}
              >
                <input
                  type="text"
                  value={values.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  onFocus={() => setFullNameFocused(true)}
                  onBlur={() => setFullNameFocused(false)}
                  placeholder="Your name"
                  style={{
                    ...pillInputStyle,
                    ...(fullNameFocused
                      ? pillInputFocusStyle
                      : (attemptedStep1 && !step1Valid ? pillInputErrorStyle : {})),
                  }}
                />
              </WizardField>

              <WizardField label="Gender" icon={<User size={14} strokeWidth={1.8} color="var(--color-text-secondary)" style={fieldIconStyle} />}>
                <WizardDropdown
                  value={values.gender}
                  onChange={v => set('gender', v)}
                  options={GENDER_OPTIONS}
                />
              </WizardField>

              <WizardField
                label="Phone"
                icon={<Phone size={14} strokeWidth={1.8} color="var(--color-text-secondary)" style={fieldIconStyle} />}
                error={
                  attemptedStep1 && !values.phoneNumber.trim()
                    ? 'Phone number is required'
                    : phoneBlurred && isPhoneInvalid(values.phoneCountryCode, values.phoneNumber)
                      ? `That doesn't look like a valid phone number for ${selectedCountry?.name ?? 'the selected country'}`
                      : null
                }
              >
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button
                    type="button"
                    onClick={() => setPhoneSheetOpen(true)}
                    style={{
                      ...pillInputStyle,
                      flex:           '0 0 30%',
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'center',
                      gap:            4,
                      cursor:         'pointer',
                      color:          values.phoneCountryCode ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                    }}
                  >
                    {values.phoneCountryCode || 'Code'}
                    <ChevronDown size={14} strokeWidth={1.8} color="var(--color-text-secondary)" />
                  </button>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={formatPhoneDisplay(values.phoneCountryCode, values.phoneNumber)}
                    onChange={e => {
                      const digits = e.target.value.replace(/[^\d]/g, '')
                      // Stop accepting further digits once the number is
                      // already too long for the selected country — per
                      // that country's own rules, not a hardcoded number.
                      const iso2 = DIAL_TO_ISO2[values.phoneCountryCode]
                      if (iso2 && digits.length > values.phoneNumber.length
                          && validatePhoneNumberLength(digits, iso2) === 'TOO_LONG') {
                        return
                      }
                      set('phoneNumber', digits)
                    }}
                    onFocus={() => setPhoneFocused(true)}
                    onBlur={() => { setPhoneFocused(false); setPhoneBlurred(true) }}
                    placeholder="Phone number"
                    style={{
                      ...pillInputStyle,
                      ...(phoneFocused
                        ? pillInputFocusStyle
                        : ((attemptedStep1 && !values.phoneNumber.trim())
                            || (phoneBlurred && isPhoneInvalid(values.phoneCountryCode, values.phoneNumber))
                              ? pillInputErrorStyle : {})),
                      flex: 1,
                    }}
                  />
                </div>
              </WizardField>

              {/* header-skip-country-tweaks: moved here from step 2,
                  directly under Phone — auto-fills from the phone country
                  code (see set() above), person can still override it. */}
              <WizardField
                label="Country"
                icon={<MapPin size={14} strokeWidth={1.8} color="var(--color-text-secondary)" style={fieldIconStyle} />}
                error={attemptedStep1 && !values.country.trim() ? 'Country is required' : null}
                last
              >
                <WizardDropdown
                  value={values.country}
                  onChange={v => set('country', v)}
                  options={COUNTRY_OPTIONS}
                  error={attemptedStep1 && !values.country.trim()}
                />
              </WizardField>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={{ margin: '0 0 var(--space-4)', fontSize: 18, fontWeight: 700, color: 'var(--color-text-primary)' }}>
              Professional
            </h2>

            <div style={wizardCardStyle}>
              <WizardField
                label="Occupation"
                icon={<Stethoscope size={14} strokeWidth={1.8} color="var(--color-text-secondary)" style={fieldIconStyle} />}
                error={attemptedStep2 && !values.occupation.trim() ? 'Occupation is required' : null}
                last={!showOccupationOther && !showSpecialty && !showStudentType}
              >
                <WizardDropdown
                  value={values.occupation}
                  onChange={v => set('occupation', v)}
                  options={OCCUPATION_OPTIONS}
                  error={attemptedStep2 && !values.occupation.trim()}
                />
              </WizardField>

              {showOccupationOther && (
                <WizardField
                  label="Please specify"
                  icon={<PenLine size={14} strokeWidth={1.8} color="var(--color-text-secondary)" style={fieldIconStyle} />}
                  error={attemptedStep2 && !values.occupationOther.trim() ? 'Please tell us your occupation' : null}
                  last
                >
                  <input
                    type="text"
                    value={values.occupationOther}
                    onChange={e => set('occupationOther', e.target.value)}
                    onFocus={() => setOccupationOtherFocused(true)}
                    onBlur={() => setOccupationOtherFocused(false)}
                    placeholder="e.g. Physiotherapist"
                    style={{
                      ...pillInputStyle,
                      ...(occupationOtherFocused
                        ? pillInputFocusStyle
                        : (attemptedStep2 && !values.occupationOther.trim() ? pillInputErrorStyle : {})),
                    }}
                  />
                </WizardField>
              )}

              {showSpecialty && (
                <WizardField
                  label="Specialty"
                  icon={<HeartPulse size={14} strokeWidth={1.8} color="var(--color-text-secondary)" style={fieldIconStyle} />}
                  error={attemptedStep2 && !values.specialty.trim() ? 'Specialty is required' : null}
                  last
                >
                  <WizardDropdown
                    value={values.specialty}
                    onChange={v => set('specialty', v)}
                    options={SPECIALTY_OPTIONS}
                    error={attemptedStep2 && !values.specialty.trim()}
                  />
                </WizardField>
              )}

              {showStudentType && (
                <WizardField label="Student type" icon={<GraduationCap size={14} strokeWidth={1.8} color="var(--color-text-secondary)" style={fieldIconStyle} />} last>
                  <WizardDropdown
                    value={values.studentType}
                    onChange={v => set('studentType', v)}
                    options={STUDENT_TYPE_OPTIONS}
                  />
                </WizardField>
              )}
            </div>

            {saveError && (
              <div style={{
                fontSize:        13,
                color:           '#DC2626',
                backgroundColor: '#FEF2F2',
                border:          '1px solid #FECACA',
                borderRadius:    'var(--radius-sm)',
                padding:         'var(--space-2) var(--space-3)',
                lineHeight:      1.4,
                marginTop:       'var(--space-4)',
              }}>
                {saveError}
              </div>
            )}
          </>
        )}

        {/* ── Nav buttons — inline, right after the fields card ──
            wizard-inline-nav-buttons: was a fixed footer bar pinned to the
            bottom of the viewport; now just flows normally after the last
            field, like the rest of the form. Still a normal DOM descendant
            of <form>, so the type="submit" buttons inside keep submitting
            it exactly as before. */}
        <div style={{
          maxWidth:  680,
          margin:    'var(--space-5) auto 0',
          display:   'flex',
          gap:       'var(--space-3)',
        }}>
          <button
            type="button"
            onClick={() => (step === 1 ? onBack?.() : setStep(1))}
            style={{
              flex:            onBack || step === 2 ? '0 0 auto' : undefined,
              display:         (step === 1 && !onBack) ? 'none' : 'flex',
              alignItems:      'center',
              gap:             4,
              padding:         'var(--space-3) var(--space-5)',
              borderRadius:    999,
              border:          'none',
              backgroundColor: 'transparent',
              color:           'var(--color-text-secondary)',
              fontSize:        15,
              fontWeight:      600,
              fontFamily:      'var(--font-body)',
              cursor:          'pointer',
            }}
          >
            <ChevronLeft size={16} strokeWidth={2} />
            Back
          </button>

          {step === 1 ? (
            <button
              type="submit"
              disabled={!step1Valid}
              style={{
                flex:            1,
                padding:         'var(--space-3) var(--space-5)',
                borderRadius:    999,
                border:          'none',
                backgroundColor: step1Valid ? 'var(--color-accent)' : 'var(--color-border)',
                color:           step1Valid ? '#fff' : 'var(--color-text-tertiary)',
                fontSize:        15,
                fontWeight:      600,
                fontFamily:      'var(--font-body)',
                cursor:          step1Valid ? 'pointer' : 'not-allowed',
              }}
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={saving || !step2Valid}
              style={{
                flex:            1,
                padding:         'var(--space-3) var(--space-5)',
                borderRadius:    999,
                border:          'none',
                backgroundColor: (saving || !step2Valid) ? 'var(--color-border)' : 'var(--color-accent)',
                color:           (saving || !step2Valid) ? 'var(--color-text-tertiary)' : '#fff',
                fontSize:        15,
                fontWeight:      600,
                fontFamily:      'var(--font-body)',
                cursor:          (saving || !step2Valid) ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          )}
        </div>
      </form>

      <PhoneCodeSheet
        isOpen={phoneSheetOpen}
        value={values.phoneCountryCode}
        onSelect={code => set('phoneCountryCode', code)}
        onClose={() => setPhoneSheetOpen(false)}
      />
    </div>
  )
}