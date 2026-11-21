// When the roshetta editor must ask before leaving (Roshetta plan, Phase K, step 12.9b; cases K12, K22).
//
// The editor saves by itself, so a pause or a slow save is not "unsaved": leaving waits for the save
// to be handed over (the editor does that, and also saves on the way out). What is unsaved is a
// change that could not be saved: the last save was refused, or the server refused a change of this
// roshetta. Only then Leave or Stay is asked, on the on-screen arrow and on a tapped notification.
// Plain code with no React so the checks can run it.
export function editorUnsaved({ refused = false, failedHere = false } = {}) {
  return Boolean(refused || failedHere)
}

export function leaveQuestion() {
  return {
    title: 'Leave without saving?',
    message: "Your last change couldn't be saved. If you leave now, it will be lost. Stay keeps you here.",
    confirmLabel: 'Leave',
  }
}
