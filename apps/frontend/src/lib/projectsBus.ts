/** Lets views that list projects (header context, lists, dashboard) refresh after a create/delete. */
const EVENT = 'devyard:projects-changed';

export function notifyProjectsChanged(): void {
  window.dispatchEvent(new Event(EVENT));
}

export function onProjectsChanged(listener: () => void): () => void {
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
