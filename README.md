# Task Management System (OA)

## Project Setup

This project is a React application built with Vite, TypeScript, and Tailwind CSS.

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Deployment to GitHub Pages

This project is configured to be deployed to GitHub Pages under the path `/oa/`.

### Configuration

- **Base Path**: The project is configured with `base: '/oa/'` in `vite.config.ts`.
- **Router**: The React Router is configured to use `/oa` as the basename.

### Automated Deployment

A GitHub Actions workflow is included in `.github/workflows/deploy.yml`. It will automatically build and deploy to the `gh-pages` branch whenever you push to `main` or `master`.

To enable this:
1.  Push this code to a GitHub repository (recommended name: `oa`).
2.  Go to the repository **Settings** -> **Pages**.
3.  Under **Build and deployment**, select **Source** as `Deploy from a branch`.
4.  Select `gh-pages` branch and `/ (root)` folder (this branch will be created by the Action after the first push).
5.  If using a custom domain (e.g., `www.rorcc.com`), ensure it is configured in the main repository (or this one if it's the root). If `www.rorcc.com` is your main site, this repo `oa` will serve at `www.rorcc.com/oa`.

