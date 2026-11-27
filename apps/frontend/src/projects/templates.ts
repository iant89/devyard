import type { Project } from '@devyard/contracts';

export type TemplateId = Project['projectType'];

export interface TemplateInfo {
  id: TemplateId;
  label: string;
  description: string;
  /** Phase 1 only creates empty projects (backend rejects the rest); others show when they arrive. */
  availableIn: number | null;
}

/** SPEC §6.1 creation sources, in DY-D1 Screen 5 order. */
export const TEMPLATES: TemplateInfo[] = [
  {
    id: 'empty',
    label: 'Empty project',
    description: 'Blank repository with no files',
    availableIn: null,
  },
  {
    id: 'playground',
    label: 'Quick Playground',
    description: 'HTML/CSS/JS sandbox you can promote later',
    availableIn: 2,
  },
  {
    id: 'html-css-js',
    label: 'HTML/CSS/JavaScript',
    description: 'Static site starter',
    availableIn: 3,
  },
  { id: 'react', label: 'React', description: 'React app with Vite', availableIn: 3 },
  {
    id: 'react-ts',
    label: 'React + TypeScript',
    description: 'Typed React starter',
    availableIn: 3,
  },
  {
    id: 'vanilla-js',
    label: 'Vanilla JavaScript',
    description: 'Plain JS module starter',
    availableIn: 3,
  },
  {
    id: 'node',
    label: 'Node.js application',
    description: 'Fastify/Node service starter',
    availableIn: 3,
  },
  {
    id: 'local-git',
    label: 'Existing local Git repository',
    description: 'Point at a repository on this server',
    availableIn: 4,
  },
  {
    id: 'github-import',
    label: 'GitHub repository import',
    description: 'Clone from GitHub',
    availableIn: 4,
  },
];

export function templateLabel(p: Pick<Project, 'projectType' | 'framework'>): string {
  if (p.framework) return p.framework;
  return TEMPLATES.find((t) => t.id === p.projectType)?.label ?? p.projectType;
}

export const ROLE_LABEL: Record<NonNullable<Project['myRole']>, string> = {
  owner: 'Owner',
  maintainer: 'Maintainer',
  developer: 'Developer',
  viewer: 'Viewer',
};

/** Project slugs: same rule as the API's ProjectSlug. */
export const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;
