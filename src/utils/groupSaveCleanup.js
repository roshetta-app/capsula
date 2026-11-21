/**
 * src/utils/groupSaveCleanup.js
 *
 * Step 13.8: when a saved group's drugs cannot be added, the half-made group is deleted again.
 * That delete can fail too (the connection drops at that moment), and an empty group with its
 * link set would stay behind. So the delete is checked and tried again a few times.
 *
 * run: async () => { error } (one delete). Returns true once a try came back without an error,
 * false when every try failed or threw. wait: pause between tries (handed in so checks run fast).
 */
const pause = () => new Promise(resolve => setTimeout(resolve, 400))

export async function removeWithRetry(run, attempts = 3, wait = pause) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await run()
      if (!res?.error) return true
    } catch {
      // a thrown error counts as a failed try
    }
    if (i < attempts - 1) await wait(i)
  }
  return false
}
