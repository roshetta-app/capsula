/**
 * PreviewModeContext — true inside the CMS "Phone preview" popup.
 *
 * The popup shows the app's own screens inside the editor, which already sits
 * in the app's router. Screens that open another page (a tapped drug name)
 * read this to do nothing instead of leaving the editor.
 */
import { createContext } from 'react'

export const PreviewModeContext = createContext(false)
