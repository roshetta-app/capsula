// One way to open a topic from a list (Roshetta plan, Phase K, step 12.7b; cases K5, K7).
//
// Plain code with no React so the checks can run it with fakes, like openDrug.js. The door gives it
// the topic and two small things: openPage (the tap guard's open, which returns false when it
// ignored a double tap) and pathFor (the address builder). The topic opens as one plain new step,
// with no flags: Back returns to the door at the same place. A topic with no slug opens nothing.
// ("Recently viewed" for topics is written by the topic page itself when it is shown, so the door
// does not write it.)
export function openTopicWith(topic, { openPage, pathFor }) {
  if (!topic) return false
  const slug = topic.slug
  if (slug === undefined || slug === null || slug === '') return false
  return openPage(pathFor(slug)) === true
}
