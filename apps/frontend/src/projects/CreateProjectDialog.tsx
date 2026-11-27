import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  CodeXml,
  File,
  FileCode,
  Folder,
  GitBranch,
  GitMerge,
  Lock,
  Server,
  SquareCode,
  Braces,
  type LucideIcon,
} from 'lucide-react';
import {
  Badge,
  Button,
  Dialog,
  Input,
  MessageStrip,
  Select,
  Text,
  TextArea,
  Title,
  useToast,
} from '@enterprise-ui/react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { notifyProjectsChanged } from '../lib/projectsBus';
import { SLUG_RE, TEMPLATES, type TemplateId } from './templates';

const ICONS: Record<TemplateId, LucideIcon> = {
  empty: File,
  playground: SquareCode,
  'html-css-js': CodeXml,
  react: Braces,
  'react-ts': FileCode,
  'vanilla-js': Braces,
  node: Server,
  'local-git': Folder,
  'github-import': GitMerge,
};

const NAME_HINT = 'Lowercase letters, numbers and hyphens.';
const NAME_ERROR = 'Use lowercase letters, numbers and hyphens only (e.g. portfolio-site).';

interface Errors {
  name?: string;
  description?: string;
  form?: string;
}

/** DY-D1 Screen 5. Phase 1 creates empty projects only; other templates are listed but locked. */
export function CreateProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<TemplateId>('empty');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [busy, setBusy] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const tileRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const reset = () => {
    setTemplate('empty');
    setName('');
    setDescription('');
    setErrors({});
    setBusy(false);
  };
  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const validate = (): Errors => {
    const e: Errors = {};
    const n = name.trim();
    if (!n) e.name = 'Enter a project name.';
    else if (n.length < 2 || n.length > 48 || !SLUG_RE.test(n)) e.name = NAME_ERROR;
    if (description.length > 2000) e.description = 'Keep the description under 2,000 characters.';
    return e;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (e.name || e.description) {
      nameRef.current?.focus();
      return;
    }
    const slug = name.trim();
    setBusy(true);
    try {
      const project = await api.createProject({
        name: slug,
        slug,
        description: description.trim(),
        template,
      });
      notifyProjectsChanged();
      toast.show({ title: `Project ${project.name} created`, tone: 'success' });
      reset();
      onClose();
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiError && err.code === 'CONFLICT') {
        setErrors({ name: `A project named ${slug} already exists.` });
        nameRef.current?.focus();
      } else if (err instanceof ApiError && err.code === 'VALIDATION_FAILED') {
        const byPath = Object.fromEntries(err.details.map((d) => [d.path, d.message]));
        setErrors({
          name: byPath.name ?? byPath.slug,
          description: byPath.description,
          form: byPath.name || byPath.slug || byPath.description ? undefined : err.message,
        });
      } else {
        setErrors({
          form: err instanceof Error ? err.message : 'Could not create the project.',
        });
      }
    }
  };

  const fieldErrors = [errors.name, errors.description].filter(Boolean).length;
  const selected = TEMPLATES.find((t) => t.id === template)!;

  // Radio group keyboard model: arrows move between the selectable tiles.
  const selectable = TEMPLATES.map((t, i) => (t.availableIn === null ? i : -1)).filter(
    (i) => i >= 0,
  );
  const onTileKey = (e: KeyboardEvent, index: number) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const pos = selectable.indexOf(index);
    const next = selectable[(pos + dir + selectable.length) % selectable.length]!;
    setTemplate(TEMPLATES[next]!.id);
    tileRefs.current[next]?.focus();
  };

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Create project"
      size="lg"
      showClose
      closeOnOverlayClick={!busy}
      closeOnEscape={!busy}
      initialFocusRef={nameRef}
      footer={
        <div className="dy-dialog-footer">
          <Text size="xs" tone="secondary">
            You can change build and deployment settings later.
          </Text>
          <div className="dy-dialog-footer-actions">
            <Button variant="tertiary" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" form="dy-create-project" loading={busy}>
              {busy ? 'Creating…' : 'Create project'}
            </Button>
          </div>
        </div>
      }
    >
      <form id="dy-create-project" className="dy-create-form" onSubmit={submit} noValidate>
        {fieldErrors > 0 && (
          <MessageStrip tone="error" announce="assertive">
            {fieldErrors === 1
              ? 'Fix 1 error before creating the project.'
              : `Fix ${fieldErrors} errors before creating the project.`}
          </MessageStrip>
        )}
        {errors.form && (
          <MessageStrip tone="error" announce="assertive">
            {errors.form}
          </MessageStrip>
        )}

        <section aria-labelledby="dy-start-from">
          <Title level={3} size="sm" id="dy-start-from" className="dy-section-label">
            Start from
          </Title>
          <div className="dy-template-grid" role="radiogroup" aria-labelledby="dy-start-from">
            {TEMPLATES.map((t, i) => {
              const Icon = ICONS[t.id];
              const locked = t.availableIn !== null;
              const checked = t.id === template;
              return (
                <button
                  key={t.id}
                  ref={(el) => {
                    tileRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  aria-disabled={locked || undefined}
                  tabIndex={checked ? 0 : -1}
                  className="dy-template"
                  data-selected={checked || undefined}
                  onClick={() => !locked && setTemplate(t.id)}
                  onKeyDown={(e) => onTileKey(e, i)}
                >
                  <Icon size={18} aria-hidden />
                  <span className="dy-template-text">
                    <span className="dy-template-title">
                      {t.label}
                      {locked && (
                        <Badge tone="neutral" className="dy-template-badge">
                          Phase {t.availableIn}
                        </Badge>
                      )}
                    </span>
                    <span className="dy-template-desc">{t.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <Text size="xs" tone="secondary" className="dy-template-hint">
            {selected.id === 'empty'
              ? 'Creates an empty project. Starter templates and repository imports arrive in later phases.'
              : selected.description}
          </Text>
        </section>

        <section aria-labelledby="dy-details">
          <Title level={3} size="sm" id="dy-details" className="dy-section-label">
            Details
          </Title>
          <div className="dy-form-grid">
            <Input
              ref={nameRef}
              label="Project name"
              required
              name="name"
              autoComplete="off"
              spellCheck={false}
              value={name}
              onChange={(e) => setName(e.target.value)}
              description={NAME_HINT}
              error={errors.name}
              placeholder="portfolio-site"
              maxLength={48}
            />
            <Select
              label="Visibility / access"
              value="private"
              options={[
                {
                  value: 'private',
                  label: 'Private (only me)',
                  icon: <Lock size={16} aria-hidden />,
                },
              ]}
              description="Share with specific users after creation."
            />
            <div className="dy-span-full">
              <TextArea
                label="Description"
                name="description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                error={errors.description}
              />
            </div>
            <div className="dy-span-full dy-muted-row">
              <GitBranch size={14} aria-hidden />
              <Text size="xs" tone="secondary">
                Default branch and repository settings arrive with Git integration (Phase 4).
              </Text>
            </div>
          </div>
        </section>
      </form>
    </Dialog>
  );
}
