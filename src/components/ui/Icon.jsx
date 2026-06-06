/**
 * Icon.jsx — unified icon wrapper for Capsula
 *
 * Usage:
 *   <Icon name="Search" />                        — Lucide icon by string name
 *   <Icon name="Search" size={24} color="red" />
 *   <Icon faIcon={faPills} />                     — FontAwesome icon object
 *   <Icon faIcon={faPills} size={20} />
 *
 * Props:
 *   name      — Lucide icon name string (e.g. "Search", "ArrowLeft")
 *   faIcon    — FA icon object (e.g. faPills from @fortawesome/free-solid-svg-icons)
 *   size      — number, default 20
 *   color     — CSS color string, default "currentColor"
 *   className — optional class string
 *
 * Rules:
 *   - If faIcon is provided, renders FontAwesomeIcon (FA takes priority)
 *   - Otherwise renders the named Lucide icon
 *   - Never import icon libraries directly in other components — always use <Icon>
 */

import * as LucideIcons from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function Icon({ name, faIcon, size = 20, color = 'currentColor', className }) {
  // FontAwesome path
  if (faIcon) {
    return (
      <FontAwesomeIcon
        icon={faIcon}
        style={{ width: size, height: size, color }}
        className={className}
      />
    )
  }

  // Lucide path — dynamic lookup by string name
  if (name) {
    const LucideIcon = LucideIcons[name]
    if (!LucideIcon) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Icon] Unknown Lucide icon: "${name}"`)
      }
      return null
    }
    return (
      <LucideIcon
        size={size}
        color={color}
        className={className}
        strokeWidth={1.8}
      />
    )
  }

  return null
}
