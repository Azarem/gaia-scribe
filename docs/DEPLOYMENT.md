# GitHub Pages Deployment Guide

This document outlines the GitHub Pages deployment setup for the Scribe application.

## 🚀 Deployment Overview

The application is automatically deployed to GitHub Pages using GitHub Actions whenever code is pushed to the `main` branch. The deployment uses a custom domain (`scribe.gaia.studio`) and integrates with Supabase for backend services.

## 📋 Prerequisites

Before deployment works correctly, ensure the following are configured in your GitHub repository:

### 1. Repository Variables

Navigate to **Settings > Secrets and variables > Actions > Variables** and configure:

- `SUPABASE_URL`: Your Supabase project URL (e.g., `https://your-project.supabase.co`)
- `SUPABASE_ANON_KEY`: Your Supabase anonymous/public key

### 2. GitHub Pages Settings

Navigate to **Settings > Pages** and configure:

- **Source**: Deploy from a branch
- **Branch**: `gh-pages` (this will be created automatically by the workflow)
- **Custom domain**: `scribe.gaia.studio` (if using custom domain)

### 3. Domain Configuration (Optional)

If using a custom domain:

1. Configure your DNS provider to point `scribe.gaia.studio` to GitHub Pages:
   - Add a CNAME record: `scribe.gaia.studio` → `your-username.github.io`
   - Or add A records pointing to GitHub Pages IPs:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`

2. The `CNAME` file in the `public/` directory is automatically included in the build

## 🔧 Workflow Configuration

The deployment workflow (`.github/workflows/deploy.yml`) includes:

### Build Process
1. **Environment Setup**: Node.js 18, npm cache
2. **Quality Checks**: TypeScript compilation, ESLint validation
3. **Build**: Vite production build with Supabase environment variables
4. **Artifact Upload**: Prepared for GitHub Pages deployment

### Deployment Process
1. **Pages Setup**: Configures GitHub Pages environment
2. **Deployment**: Deploys built artifacts to GitHub Pages

### Key Features
- **Automatic Triggers**: Deploys on push to `main` branch
- **Manual Triggers**: Can be triggered manually from Actions tab
- **Environment Variables**: Securely injects Supabase configuration during build
- **Quality Gates**: Ensures code quality before deployment
- **Concurrent Safety**: Prevents conflicting deployments

## 🏗️ Build Configuration

### Vite Configuration
The application builds to the `dist/` directory with:
- Source maps enabled for debugging
- Optimized dependencies for Supabase
- TypeScript compilation
- Tailwind CSS processing

### Environment Variables
During build, the following environment variables are injected:
- `VITE_PUBLIC_SUPABASE_URL`: From repository variable `SUPABASE_URL`
- `VITE_PUBLIC_SUPABASE_ANON_KEY`: From repository variable `SUPABASE_ANON_KEY`

## 📁 Static Assets

Static assets in the `public/` directory are automatically copied to the build output:
- `CNAME`: Custom domain configuration
- `vite.svg`: Application favicon
- Any other static files you add

## 🔍 Monitoring Deployment

### GitHub Actions
1. Navigate to **Actions** tab in your repository
2. View deployment status and logs
3. Debug any build or deployment issues

### Deployment URL
- **Custom Domain**: https://scribe.gaia.studio
- **GitHub Pages URL**: https://your-username.github.io/gaia-scribe

## 🛠️ Troubleshooting

### Common Issues

1. **Build Failures**
   - Check TypeScript errors: `npm run type-check`
   - Check linting errors: `npm run lint`
   - Verify environment variables are set in repository settings

2. **Deployment Failures**
   - Ensure GitHub Pages is enabled in repository settings
   - Check that the workflow has proper permissions
   - Verify the `gh-pages` branch is created

3. **Runtime Errors**
   - Check browser console for JavaScript errors
   - Verify Supabase environment variables are correctly set
   - Ensure Supabase project allows requests from your domain

4. **Custom Domain Issues**
   - Verify DNS configuration
   - Check that CNAME file contains correct domain
   - Ensure domain is configured in GitHub Pages settings

### Manual Deployment

If needed, you can manually trigger deployment:
1. Go to **Actions** tab
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow" button
4. Select `main` branch and run

## 🔄 Development Workflow

1. **Local Development**: `npm run dev`
2. **Testing**: `npm run type-check && npm run lint`
3. **Commit & Push**: Push to `main` branch
4. **Automatic Deployment**: GitHub Actions handles the rest

## 📚 Additional Resources

- [GitHub Pages Documentation](https://docs.github.com/en/pages)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Supabase Documentation](https://supabase.com/docs)
