Devyard

Application Design & Technical Specification

Tagline: Build. Test. Deploy.

Product: Self-hosted software development, build automation, and application deployment platform.

Deployment target: Single-server homelab environment, with an architecture that can grow over time.

Primary technology stack: React, TypeScript, Node.js, Fastify, SQLite, Docker, and Caddy.

Architecture philosophy: Modular monolith, local-first Git repositories, isolated build execution, immutable deployments, and minimal infrastructure overhead.

⸻

1. Product Overview

1.1 Vision

Devyard is a self-hosted software development and deployment platform that combines the convenience of JSFiddle, the development experience of VS Code, the repository management capabilities of GitHub, and the automation capabilities of GitHub Actions.

The platform should allow developers to:

* Create and manage software projects.
* Quickly prototype applications using a browser-based playground.
* Develop full applications inside a browser-based IDE.
* Manage local Git repositories and connect them to GitHub.
* Build applications using automated pipelines.
* Run tests and quality checks.
* Deploy applications to the host server.
* Manage static websites, native Node.js applications, and Docker containers.
* Monitor running applications and deployment health.
* Collaborate with other platform users.

Devyard should be capable of handling the entire software development lifecycle without requiring developers to leave the platform.

1.2 Core Experience

The platform consists of two primary development environments.

Quick Playground

A lightweight JSFiddle-style environment for rapidly experimenting with HTML, CSS, JavaScript, and supported frameworks.

Full Development Workspace

A VS Code-style browser IDE with a file explorer, Monaco Editor, terminal, Git integration, project management, and build/deployment tools.

Both environments should integrate with the same project management and deployment infrastructure.

1.3 Target Users

* Individual developers.
* Homelab administrators.
* Small development teams.
* Developers managing multiple self-hosted applications.
* Users who want control over their source code, builds, and deployment infrastructure.

⸻

2. Visual Identity & Design Language

2.1 Overall Direction

Build the visual identity around a professional software workshop aesthetic: dark graphite surfaces, subtle industrial accents, and a clean enterprise interface.

Devyard should feel like a sophisticated environment where software is assembled, tested, refined, and deployed.

The interface should resemble a polished enterprise development workstation rather than a generic SaaS dashboard.

2.2 Design Principles

* Dark graphite foundation: Use graphite, charcoal, and deep neutral tones as the primary interface surfaces.
* Industrial accents: Incorporate restrained metallic, steel, muted amber, or carefully selected industrial accent colors.
* Clean enterprise interface: Maintain excellent visual hierarchy, consistent spacing, readable typography, and predictable navigation.
* Professional developer tooling: The interface should feel like a serious software engineering environment.
* Functional density: Display useful information efficiently without making the interface feel cluttered.
* Consistency: Apply one coherent design system across every module.
* Clarity: Important actions, errors, deployment states, and system conditions must be immediately understandable.

2.3 Interface Styling

Use:

* Graphite and charcoal backgrounds.
* Differentiated surfaces for panels, editors, terminals, and overlays.
* Subtle borders and restrained shadows.
* Consistent spacing and typography.
* Carefully controlled contrast.
* Industrial accent colors for important actions and statuses.
* Consistent iconography.
* Clear visual hierarchy.

Avoid:

* Excessive gradients.
* Overly colorful dashboards.
* Cartoonish illustrations.
* Unnecessary animations.
* Generic consumer SaaS styling.
* Excessive use of rounded cards.

2.4 Application Shell

The application should use a persistent application shell containing:

* Primary navigation sidebar.
* Top application toolbar.
* Breadcrumb navigation.
* Context-sensitive actions.
* User account menu.
* Notifications.
* Workspace/project context.
* Main content region.

The interface should be responsive across desktop, tablet, and mobile devices.

The IDE should prioritize desktop usability while maintaining useful mobile access to project information, deployments, logs, and administration.

2.5 Branding

Primary brand: Devyard

Tagline: Build. Test. Deploy.

The visual identity should communicate:

* Technical sophistication.
* Reliability.
* Infrastructure ownership.
* Software engineering.
* Production readiness.

⸻

3. Technology Stack

3.1 Frontend

Technology	Purpose
React	Application interface
TypeScript	Application development
ENTERPRISE-UI	Primary enterprise UI framework
Monaco Editor	Browser-based code editor
xterm.js	Integrated terminal
WebSockets	Real-time events and updates
Vite	Frontend development and build tooling

The frontend should be modular, component-driven, and designed around reusable enterprise UI patterns.

Use ENTERPRISE-UI wherever practical rather than introducing multiple competing component systems.

3.2 Backend

Technology	Purpose
Node.js ES2022+	Runtime
TypeScript	Backend implementation
Fastify	REST API
WebSockets	Real-time communication
SQLite	Persistent application database
Drizzle ORM	Database access and migrations

The backend should use a modular monolith architecture.

Do not introduce microservices unless a demonstrated architectural requirement justifies them.

3.3 Infrastructure

Technology	Purpose
Docker	Isolated development and build environments
Caddy	Reverse proxy and HTTPS
Git	Version control
systemd	Native application lifecycle management
SQLite	Job queue and application persistence

Initial deployment should work on one Linux server.

Do not introduce Kubernetes, Kafka, Redis, or other distributed infrastructure dependencies into the MVP.

⸻

4. Platform Architecture

4.1 Architectural Model

Use a modular monolith with clearly separated subsystems.

Suggested backend modules:

* Authentication
* Users
* Permissions
* Projects
* Workspaces
* Filesystem
* Git
* GitHub Integration
* Playground
* Development Environments
* Build Engine
* Pipeline Engine
* Artifact Management
* Deployment Engine
* Runtime Management
* Reverse Proxy Management
* Monitoring
* Notifications
* Administration
* Audit Logging

Each module should expose defined interfaces and avoid unnecessary direct dependencies on other modules.

4.2 Execution Architecture

Separate the platform control plane from project execution.

Control Plane

Responsible for:

* Authentication and authorization.
* Project management.
* Repository operations.
* Pipeline orchestration.
* Deployment management.
* Runtime management.
* UI/API communication.

Execution Plane

Responsible for:

* Running project commands.
* Installing dependencies.
* Building applications.
* Running tests.
* Executing pipeline steps.
* Creating deployment artifacts.

Project code must never execute inside the main API process.

All arbitrary project scripts must execute in isolated environments.

4.3 Initial Server Layout

The initial deployment should be designed for a single Linux host.

Suggested directory structure:

/opt/devyard/
├── app/
│   ├── backend/
│   └── frontend/
├── config/
├── data/
│   ├── database/
│   ├── users/
│   ├── projects/
│   ├── repositories/
│   ├── artifacts/
│   ├── deployments/
│   └── logs/
├── runners/
├── runtimes/
├── backups/
└── tmp/

Use configurable paths rather than hardcoding filesystem locations throughout the application.

⸻

5. Authentication & Multi-User Management

Devyard must support multiple independent users.

5.1 Authentication

Support:

* Username/email and password authentication.
* Secure password hashing.
* Session management.
* Session expiration.
* Logout and session revocation.
* Password reset workflow.
* Optional future support for external authentication providers.

Use secure, HTTP-only, SameSite cookies for browser sessions.

5.2 User Management

Administrators should be able to:

* Create users.
* Disable users.
* Delete users.
* Reset passwords.
* View user activity.
* Assign permissions.
* Manage resource access.

5.3 Roles and Permissions

Initial roles:

Administrator

* Full platform access.
* User management.
* Infrastructure management.
* Global configuration.

Developer

* Create and manage permitted projects.
* Edit source code.
* Manage repositories.
* Execute builds.
* Deploy applications where authorized.

Viewer

* View permitted projects.
* Inspect build history.
* View deployments and logs.
* No source modification or deployment permissions.

Use resource-level permissions so that project owners can share individual projects with other users.

5.4 Future Team Support

Design the permissions system so that teams and organizations can be added later without redesigning the authentication system.

⸻

6. Project Management

Projects are the central organizational unit within Devyard.

6.1 Project Creation

Users should be able to create projects through:

* Empty project.
* Quick Playground.
* HTML/CSS/JavaScript template.
* React template.
* React + TypeScript template.
* Vanilla JavaScript template.
* Node.js application template.
* Existing local Git repository.
* GitHub repository import.

6.2 Project Configuration

Each project should contain:

* Project name.
* Description.
* Owner.
* Collaborators.
* Project type.
* Primary language.
* Framework.
* Repository configuration.
* Build configuration.
* Deployment configuration.
* Environment variables.
* Build history.
* Deployment history.
* Project activity.

6.3 Project Dashboard

Display:

* Project overview.
* Recent commits.
* Recent builds.
* Current deployment status.
* Application health.
* Recent activity.
* Build success/failure statistics.
* Deployment history.
* Quick access to the IDE.

6.4 Project Templates

Templates should be extensible.

Each template should define:

* Files and directories.
* Default dependencies.
* Development commands.
* Build commands.
* Test commands.
* Artifact output location.
* Default deployment type.

⸻

7. Quick Playground

The Playground provides a lightweight JSFiddle-style development environment.

7.1 Purpose

Allow developers to rapidly prototype and test code without creating a full development workspace.

7.2 Editor Layout

Provide separate editing panels for:

* HTML
* CSS
* JavaScript

Include a live preview panel.

Suggested layout:

+-------------------------------------------------------+
| Devyard Playground                   Save | Run | ... |
+----------------------+--------------------------------+
|                      |                                |
| HTML                 |                                |
|                      |                                |
|----------------------|         LIVE PREVIEW           |
| CSS                  |                                |
|                      |                                |
|----------------------|                                |
| JavaScript           |                                |
|                      |                                |
+----------------------+--------------------------------+
| Console | Errors | Network | Output                   |
+-------------------------------------------------------+

7.3 Features

* Live preview.
* Manual execution.
* Automatic execution with configurable debounce.
* Console output.
* JavaScript error reporting.
* HTML/CSS/JS editing.
* Save playground.
* Duplicate playground.
* Export project.
* Convert playground into a full project.
* Responsive preview sizes.

7.4 Security

Run previews in isolated browser contexts.

Use sandboxed iframes and restrictive Content Security Policies.

Do not allow playground code unrestricted access to the platform application context.

⸻

8. Full Development IDE

The full IDE is the primary application development environment.

8.1 IDE Layout

The IDE should provide a familiar VS Code-style interface.

+-------------------------------------------------------+
| Devyard | Project | Branch | Build | Deploy | Account |
+----------+--------------------------------------------+
|          |                                            |
| Explorer |              Monaco Editor                 |
|          |                                            |
| Search   |                                            |
| Git      |                                            |
|          |                                            |
|          +--------------------------------------------+
|          | Terminal | Problems | Output | Debug        |
+----------+--------------------------------------------+

8.2 File Explorer

Support:

* Directory navigation.
* File creation.
* Directory creation.
* Rename.
* Delete.
* Copy and move.
* File upload.
* File download.
* Context menus.
* Search.
* File type icons.

File operations must respect project permissions and filesystem boundaries.

8.3 Code Editor

Use Monaco Editor.

Support:

* Syntax highlighting.
* IntelliSense where language services are available.
* Search and replace.
* Multiple tabs.
* Split editors.
* File navigation.
* Minimap.
* Line numbers.
* Code folding.
* Formatting.
* Configurable themes.
* Keyboard shortcuts.
* Unsaved-change indicators.

8.4 Terminal

Use xterm.js for the browser terminal.

The terminal should connect to an isolated project development environment.

Support:

* Interactive shell.
* npm commands.
* Node.js commands.
* Git commands.
* Build commands.
* Test commands.
* Multiple terminal sessions.
* Terminal resizing.
* Session termination.

Do not execute terminal commands through the Fastify application process.

8.5 Problems and Output

Provide panels for:

* Compiler errors.
* TypeScript errors.
* Linter warnings.
* Test failures.
* Build output.
* Runtime logs.

Where possible, clicking an error should navigate to the relevant file and line.

8.6 Development Environments

Projects should have configurable development environments.

Initial supported environments:

* Vanilla JavaScript.
* HTML/CSS/JavaScript.
* React.
* React + TypeScript.
* Node.js.
* TypeScript.

Each environment should define its own runtime image, dependencies, startup command, and resource limits.

⸻

9. Git & Repository Management

Git is a first-class platform feature.

Devyard must support both local repositories and GitHub repositories.

9.1 Local-First Git

Every Devyard-managed project should be capable of maintaining its own local Git repository.

Users should not be required to connect GitHub to use version control.

Support:

* Initialize repository.
* View status.
* Stage changes.
* Unstage changes.
* Commit.
* View commit history.
* Compare commits.
* Create branches.
* Switch branches.
* Merge branches.
* Rebase branches.
* Resolve merge conflicts.
* Create tags.
* View diffs.
* Revert commits.

9.2 GitHub Integration

GitHub should be an optional upstream provider.

Support:

* Connect GitHub account.
* Import repositories.
* Clone repositories.
* Push changes.
* Pull changes.
* Fetch updates.
* Create branches.
* Create pull requests.
* View pull requests.
* Webhook integration.
* Commit status updates.

9.3 Multiple Remotes

A repository must support multiple Git remotes.

For example:

origin   -> Devyard-managed repository
upstream -> Original GitHub repository
backup   -> Secondary remote

Users should be able to configure remote URLs and credentials.

9.4 Upstream Synchronization

A local repository should be able to merge changes from GitHub or another upstream remote.

Support:

* Fetch upstream.
* Inspect incoming changes.
* Compare local and remote branches.
* Merge upstream.
* Rebase onto upstream.
* Resolve conflicts.
* Push local changes.
* Push to a selected remote.

Do not automatically overwrite local changes during synchronization.

Show the user what will change before destructive operations.

9.5 Git UI

Provide:

* Branch selector.
* Commit history.
* Changed files.
* Diff viewer.
* Staging area.
* Commit message input.
* Push/pull controls.
* Remote management.
* Conflict resolution interface.

⸻

10. Build & CI/CD Pipeline Engine

Devyard should provide GitHub Actions-style automated pipelines.

10.1 Pipeline Purpose

Pipelines automate:

1. Source preparation.
2. Dependency installation.
3. Compilation.
4. Testing.
5. Quality checks.
6. Artifact creation.
7. Deployment.

10.2 Pipeline Configuration

Use YAML-based pipeline definitions.

Example:

name: Build Application
on:
  push:
    branches:
      - main
  manual: true
jobs:
  build:
    steps:
      - name: Install Dependencies
        run: npm ci
      - name: Type Check
        run: npx tsc --noEmit
      - name: Run Tests
        run: npm test
      - name: Build
        run: npm run build
      - name: Publish Artifact
        uses: devyard/artifact-publish
        with:
          path: dist/

This is an illustrative Devyard workflow format. The actual schema should be versioned and documented.

10.3 Pipeline Triggers

Support:

* Manual execution.
* Git push.
* Branch updates.
* Pull requests.
* Webhooks.
* Scheduled execution.
* Deployment requests.

10.4 Pipeline Execution

Each pipeline job must run inside an isolated execution environment.

Support:

* Docker-based runners.
* Configurable Node.js versions.
* Environment variables.
* Secrets.
* Execution timeouts.
* CPU limits.
* Memory limits.
* Disk limits.
* Network restrictions.
* Cancellation.

10.5 Pipeline Interface

Display:

* Pipeline status.
* Current stage.
* Job list.
* Execution duration.
* Live logs.
* Exit codes.
* Artifacts.
* Error details.
* Retry controls.
* Cancellation controls.

Use real-time WebSocket events to update execution status.

10.6 Job Queue

Use a persistent SQLite-backed job queue.

The queue must survive application restarts.

Support:

* Pending jobs.
* Running jobs.
* Completed jobs.
* Failed jobs.
* Cancelled jobs.
* Retry attempts.
* Job priority.
* Concurrency limits.

For the initial homelab deployment, a single runner service with configurable concurrency is sufficient.

Do not introduce Redis or a distributed queue unless the system genuinely outgrows SQLite.

10.7 Build Strategy

Builds should produce immutable artifacts.

Once a build is completed, the resulting artifact must not be silently modified.

Deployments should reference a specific artifact and build identifier.

⸻

11. Artifact Management

Artifacts are the output of successful build operations.

11.1 Artifact Types

Support:

* Static website bundles.
* Node.js application bundles.
* Docker images.
* Compressed archives.
* Build reports.
* Test reports.

11.2 Artifact Metadata

Store:

* Artifact ID.
* Project ID.
* Build ID.
* Version.
* Creation timestamp.
* Artifact type.
* File size.
* Checksum.
* Storage location.
* Build commit SHA.

11.3 Artifact Lifecycle

Support:

* Artifact browsing.
* Download.
* Retention policies.
* Cleanup of expired artifacts.
* Deployment references.
* Artifact integrity verification.

Never delete an artifact that is still referenced by an active deployment or a deployment retained for rollback.

⸻

12. Deployment Engine

The deployment engine is responsible for taking a successful build and making it available through the network.

Devyard must support three deployment types.

12.1 Static Hosting

For HTML, CSS, JavaScript, and frontend application builds.

Examples:

* Vanilla JavaScript.
* React.
* Vite.
* Static documentation.
* Generated websites.

Deployment process:

1. Receive a successful build artifact.
2. Validate the artifact.
3. Extract it into a versioned deployment directory.
4. Configure the application route.
5. Update the Caddy configuration.
6. Validate the configuration.
7. Activate the new deployment.
8. Perform a health check.
9. Retain the previous deployment for rollback.

Example:

/opt/devyard/data/deployments/
└── project-123/
    ├── release-001/
    ├── release-002/
    └── current -> release-002/

12.2 Native Node.js Applications

Support applications running directly on the host without Docker.

The platform should manage these applications through systemd.

Each deployed application must run under a dedicated restricted Linux user.

Support:

* Node.js version selection.
* Environment variables.
* Startup commands.
* Working directory.
* Port allocation.
* Restart policies.
* Health checks.
* Runtime logs.
* Start/stop/restart.
* Rollback.

Native applications must not run with root privileges.

Use restricted filesystem permissions and systemd security hardening.

12.3 Docker Applications

Support building and deploying Docker applications.

Features:

* Dockerfile detection.
* Custom Docker build configuration.
* Image tagging.
* Container creation.
* Port mapping.
* Volume configuration.
* Environment variables.
* Restart policies.
* Health checks.
* Container logs.
* Start/stop/restart.
* Rollback.

Do not expose the Docker socket to project containers.

Docker operations must be performed through a privileged, narrowly scoped deployment service with strict authorization and validation.

12.4 Deployment Dashboard

Display:

* Application name.
* Deployment type.
* Current version.
* Deployment timestamp.
* Health status.
* Runtime status.
* Assigned domain.
* Assigned port.
* Last successful deployment.
* Previous deployments.

12.5 Rollback

Every deployment should be versioned.

Support rollback to any retained successful deployment.

Rollback should:

1. Identify the selected deployment.
2. Validate its artifact and configuration.
3. Restore the previous runtime or static content.
4. Perform health checks.
5. Record the rollback operation.

Where practical, use atomic release switching to minimize downtime.

⸻

13. Domain & Reverse Proxy Management

Use Caddy as the reverse proxy.

13.1 Domain Management

Allow administrators and authorized project owners to configure:

* Application domains.
* Subdomains.
* Custom hostnames.
* Internal hostnames.
* Application ports.
* HTTPS settings.

13.2 Routing

Devyard should automatically generate and manage Caddy routing configuration.

Examples:

devyard.example.com       -> Devyard frontend
api.devyard.example.com   -> Devyard API
app1.example.com          -> Static application
app2.example.com          -> Node.js application
app3.example.com          -> Docker application

13.3 Configuration Safety

* Validate generated configuration before activation.
* Back up the previous configuration.
* Apply changes atomically where possible.
* Revert failed changes.
* Never expose internal management endpoints unintentionally.

⸻

14. Runtime & Application Monitoring

Provide a centralized view of deployed applications and their health.

14.1 Runtime Information

Display:

* Running/stopped state.
* CPU usage.
* Memory usage.
* Uptime.
* Restart count.
* Assigned port.
* Health check result.
* Last deployment.

14.2 Logs

Support:

* Application logs.
* Container logs.
* systemd journal logs.
* Deployment logs.
* Pipeline logs.

Provide live log streaming through WebSockets.

14.3 Health Checks

Support configurable health checks:

* HTTP endpoint.
* TCP connection.
* Process status.
* Container health.
* Custom command.

Failed health checks should generate visible alerts.

⸻

15. Environment Variables & Secrets

Projects require configuration and credentials.

15.1 Environment Variables

Allow environment variables to be configured at:

* Project level.
* Development environment level.
* Pipeline level.
* Deployment level.

15.2 Secrets

Support secure storage of:

* GitHub tokens.
* Git credentials.
* API keys.
* Database credentials.
* Deployment credentials.
* Application secrets.

Secrets must:

* Be encrypted at rest.
* Never be returned in plaintext through ordinary API responses.
* Be masked in pipeline logs.
* Be accessible only to authorized execution contexts.
* Support rotation and deletion.

Do not store secrets in source-controlled pipeline files.

⸻

16. Real-Time Communication

Use WebSockets for live platform updates.

Events should include:

* Terminal output.
* Pipeline progress.
* Build logs.
* Deployment progress.
* Runtime status changes.
* Application health changes.
* Notifications.
* Git operation status.

WebSocket connections must authenticate users and enforce project-level permissions.

Do not rely on the frontend to enforce authorization.

⸻

17. REST API

Use Fastify to expose a versioned REST API.

Suggested API structure:

/api/v1/
├── auth/
├── users/
├── permissions/
├── projects/
├── workspaces/
├── files/
├── git/
├── github/
├── playgrounds/
├── environments/
├── pipelines/
├── builds/
├── artifacts/
├── deployments/
├── runtimes/
├── domains/
├── secrets/
├── monitoring/
├── notifications/
└── admin/

API requirements:

* Consistent response structures.
* Input validation.
* Authentication.
* Resource-level authorization.
* Pagination.
* Filtering.
* Sorting.
* Structured error handling.
* Request logging.
* Rate limiting.
* API versioning.

All sensitive operations must be authorized server-side.

⸻

18. Database Design

Use SQLite for the initial deployment.

Use Drizzle ORM and versioned migrations.

Suggested entities:

users
sessions
roles
permissions
user_roles
projects
project_members
project_settings
workspaces
repositories
git_remotes
git_branches
playgrounds
development_environments
pipelines
pipeline_runs
pipeline_jobs
builds
artifacts
deployments
deployment_domains
runtimes
environment_variables
secrets
notifications
audit_logs
system_settings

Use appropriate indexes and foreign key constraints.

Store large build artifacts, Git repositories, and project files on disk rather than directly in SQLite.

SQLite should remain the authoritative source for application metadata and orchestration state.

⸻

19. Security Requirements

Security must be a foundational part of the architecture.

19.1 Execution Isolation

* Never execute arbitrary project code inside the API process.
* Use isolated Docker environments for builds and development sessions.
* Apply CPU, memory, storage, and execution-time limits.
* Restrict container capabilities.
* Avoid privileged containers.
* Use dedicated runtime users.
* Restrict filesystem access.
* Control network access where practical.

19.2 Docker Security

The Docker management service must be isolated from ordinary project workloads.

Do not mount the Docker socket inside project containers.

Do not allow project users to submit unrestricted Docker daemon commands through the API.

19.3 Filesystem Security

* Enforce project directory boundaries.
* Prevent path traversal.
* Validate file operations.
* Restrict symlink traversal.
* Apply ownership and permission controls.
* Prevent users from accessing other users’ project files without authorization.

19.4 Application Security

* Secure session cookies.
* CSRF protection where applicable.
* Input validation.
* Output encoding.
* Rate limiting.
* Secure headers.
* Audit logging.
* Dependency vulnerability checks.

19.5 Git Security

* Protect stored credentials.
* Avoid logging tokens.
* Validate repository paths.
* Restrict dangerous Git operations.
* Prevent credential leakage into build artifacts.

⸻

20. Backup & Recovery

Devyard must provide a backup and recovery strategy.

Back up:

* SQLite database.
* User configuration.
* Git repositories.
* Project files.
* Secrets and encryption keys.
* Deployment metadata.
* Caddy configuration.
* Pipeline definitions.

Support:

* Manual backup.
* Scheduled backup.
* Backup verification.
* Restore procedures.
* Configurable retention.

Backups should be stored separately from the primary application data where possible.

Encryption keys must be backed up securely; losing them may make encrypted secrets unrecoverable.

⸻

21. Notifications & Audit Logging

21.1 Notifications

Provide notifications for:

* Build success.
* Build failure.
* Deployment success.
* Deployment failure.
* Application health failures.
* Runtime crashes.
* Git synchronization conflicts.
* User access changes.

Support an in-app notification center.

Design the notification subsystem so email and other delivery channels can be added later.

21.2 Audit Logging

Record important operations:

* Login attempts.
* User creation and deletion.
* Permission changes.
* Project sharing.
* Repository modifications.
* Pipeline execution.
* Deployment operations.
* Runtime changes.
* Secret changes.
* Administrative configuration changes.

Include actor, action, target, timestamp, and outcome.

Never log secret values.

⸻

22. Administration Dashboard

The administration dashboard should provide centralized platform management.

Display:

* System health.
* CPU and memory usage.
* Disk utilization.
* Docker status.
* Caddy status.
* Database status.
* Runner status.
* Active builds.
* Active deployments.
* User count.
* Project count.
* Recent system events.

Provide configuration for:

* User management.
* Permissions.
* Storage paths.
* Build concurrency.
* Runner configuration.
* Runtime limits.
* Domain settings.
* Backup settings.
* Platform maintenance.

⸻

23. Suggested Frontend Navigation

Devyard
│
├── Dashboard
│
├── Projects
│   ├── All Projects
│   ├── My Projects
│   └── Shared Projects
│
├── Playground
│   ├── New Playground
│   └── Saved Playgrounds
│
├── Development
│   ├── Workspaces
│   └── Environments
│
├── Git
│   ├── Repositories
│   ├── Branches
│   └── Remotes
│
├── Pipelines
│   ├── All Pipelines
│   ├── Build History
│   └── Runners
│
├── Deployments
│   ├── Applications
│   ├── Deployment History
│   └── Domains
│
├── Monitoring
│   ├── System
│   ├── Applications
│   └── Logs
│
├── Notifications
│
└── Administration
    ├── Users
    ├── Permissions
    ├── Storage
    ├── Infrastructure
    ├── Security
    └── Settings

The navigation should adapt to the user’s permissions.

⸻

24. Development Phases

Implementation should be incremental. Each phase must produce a working, testable platform.

Phase 1 — Foundation

* Initialize React + TypeScript frontend.
* Initialize Fastify backend.
* Integrate ENTERPRISE-UI.
* Establish SQLite and Drizzle.
* Implement authentication.
* Implement multi-user permissions.
* Create the application shell.
* Establish the visual design system.
* Implement project creation and management.

Deliverable: Users can authenticate and manage projects.

Phase 2 — Playground

* Implement HTML/CSS/JavaScript editors.
* Implement live preview.
* Implement console output.
* Implement error reporting.
* Implement playground persistence.
* Implement conversion to full projects.

Deliverable: Functional browser-based playground.

Phase 3 — Full IDE

* Integrate Monaco Editor.
* Implement file explorer.
* Implement project filesystem APIs.
* Integrate xterm.js.
* Implement isolated development environments.
* Implement terminal session management.
* Implement problems and output panels.

Deliverable: Functional browser-based development workstation.

Phase 4 — Git Integration

* Implement local Git repositories.
* Implement staging and commits.
* Implement branch management.
* Implement diffs and history.
* Implement GitHub integration.
* Implement multiple remotes.
* Implement upstream synchronization.
* Implement conflict resolution.

Deliverable: Full repository management system.

Phase 5 — Build Engine

* Implement pipeline configuration.
* Implement YAML parser and validation.
* Implement persistent job queue.
* Implement Docker runners.
* Implement build execution.
* Implement live logs.
* Implement test reporting.
* Implement artifact publishing.

Deliverable: Automated CI/build platform.

Phase 6 — Deployment Engine

* Implement static hosting.
* Implement Caddy configuration management.
* Implement native Node.js deployment.
* Implement systemd integration.
* Implement Docker deployment.
* Implement health checks.
* Implement deployment history.
* Implement rollback.

Deliverable: Full application deployment platform.

Phase 7 — Monitoring & Administration

* Implement runtime monitoring.
* Implement log streaming.
* Implement notifications.
* Implement audit logging.
* Implement system administration.
* Implement backup and restore.

Deliverable: Operationally manageable platform.

Phase 8 — Hardening & Optimization

* Security testing.
* Permission testing.
* Resource isolation testing.
* Performance testing.
* Failure recovery testing.
* Backup restoration testing.
* Browser compatibility testing.
* Responsive UI testing.
* Documentation.

Deliverable: Production-ready homelab platform.

⸻

25. MVP Acceptance Criteria

The MVP should not be considered complete until the following capabilities work end-to-end.

User Management

* Multiple users can authenticate.
* Users have independent project access.
* Project sharing works.
* Permissions are enforced by the backend.

Playground

* Users can write HTML, CSS, and JavaScript.
* Preview updates correctly.
* Console errors are visible.
* Playgrounds can be saved.

IDE

* Users can browse and edit project files.
* Monaco Editor works.
* Terminal sessions work.
* Terminal commands execute in isolated environments.

Git

* Local repositories can be initialized.
* Changes can be committed.
* Branches can be created and switched.
* GitHub repositories can be connected.
* Local changes can be pushed upstream.
* Upstream changes can be merged locally.

Pipelines

* YAML pipeline definitions can be validated.
* Pipelines can execute.
* Jobs survive application restarts.
* Build logs stream in real time.
* Build artifacts are retained.

Deployment

* Static websites can be deployed.
* Native Node.js applications can be deployed.
* Docker applications can be deployed.
* Domains can be configured.
* Health checks work.
* Previous deployments can be restored.

Security

* Project code cannot execute inside the API process.
* Users cannot access unauthorized projects.
* Secrets are protected.
* Project execution is resource-limited.
* Docker management is isolated from project containers.

⸻

26. Engineering Guidelines

26.1 Code Organization

Keep frontend, backend, infrastructure, and shared contracts logically separated.

Use TypeScript strict mode.

Prefer explicit interfaces and typed API contracts.

Avoid unnecessary abstractions and excessive dependencies.

26.2 Reliability

* Make long-running operations persistent.
* Make build and deployment operations observable.
* Use timeouts.
* Handle process termination.
* Record execution results.
* Design operations to be safely retried where possible.
* Preserve deployment rollback capability.

26.3 Performance

* Avoid loading entire repositories into memory.
* Stream large files and logs.
* Paginate history and activity.
* Use efficient database indexes.
* Limit concurrent build jobs.
* Cache reusable dependencies where safe.
* Avoid unnecessary WebSocket traffic.

26.4 Documentation

Maintain documentation for:

* Architecture.
* Installation.
* Configuration.
* API.
* Database schema.
* Pipeline YAML.
* Runner implementation.
* Deployment types.
* Security model.
* Backup and restore.
* Troubleshooting.

⸻

27. Important Architectural Decisions

The following decisions are intentional and should not be changed without a clear technical justification.

Area	Decision	Reason
Architecture	Modular monolith	Simpler deployment and maintenance
Frontend	React + TypeScript	Rich application interface
UI framework	ENTERPRISE-UI	Consistent enterprise design
Backend	Fastify + Node.js	Lightweight API and execution orchestration
Database	SQLite	Low operational overhead
ORM	Drizzle	Typed database access and migrations
Editor	Monaco	VS Code-style editing experience
Terminal	xterm.js	Browser-based terminal
Git	Local-first	GitHub remains optional
CI/CD	YAML pipelines	Familiar automation model
Queue	SQLite-backed persistent queue	Avoid unnecessary infrastructure
Build isolation	Docker	Separate untrusted project execution
Static hosting	Caddy	Simple reverse proxy and hosting
Native Node.js	systemd	Restricted and manageable processes
Containers	Docker	Flexible application deployment
Deployment	Immutable artifacts	Reliable releases and rollback

⸻

28. Final Product Goal

Devyard should ultimately provide a complete self-hosted software development environment.

A developer should be able to:

1. Log into Devyard.
2. Create a project or import an existing GitHub repository.
3. Open the project in the browser-based IDE.
4. Write and test code.
5. Commit changes locally.
6. Push changes to GitHub or another remote.
7. Trigger an automated pipeline.
8. Run tests and quality checks.
9. Generate a versioned build artifact.
10. Deploy the application.
11. Monitor its health.
12. Roll back if something goes wrong.

All without leaving Devyard.

Devyard is not simply a browser-based code editor. It is a self-hosted software development, automation, and deployment platform.