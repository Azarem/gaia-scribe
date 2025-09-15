# Scribe - AI Agent Onboarding Guide

**Comprehensive context dump for AI agents to quickly understand the Scribe application architecture, technology stack, and development patterns.**

## 📋 Project Overview

**Scribe** is a modern, real-time collaborative game database editor built for GaiaLabs ROM data management. It enables teams to collaboratively edit game database structures with live updates, comprehensive data models, and type-safe operations.

**Core Domain**: Game development tool for managing ROM data structures including:
- **COPs** (Custom Operations) - Assembly-like instruction codes  
- **Files** - Game asset files with metadata
- **Blocks** - Data structures with parts and transformations
- **Strings** - Text encoding systems with character maps and commands
- **Labels** - Memory location markers and annotations
- **Mnemonics** - Assembly instruction representations
- **Overrides/Rewrites** - Value modifications and patches

## 🏗️ Architecture Principles

### **Database-First Approach**
- **Supabase REST API** for all database operations (`supabase.from('table').select()`)
- **Supabase Realtime** subscriptions for live collaboration (`postgres_changes`)
- **Prisma-generated types** for compile-time type safety
- **No service layers** - direct API usage without abstractions
- **No data transforms** - raw database objects with Prisma typing

### **Key Patterns**
```typescript
// ✅ Correct data access pattern
const { data, error } = await supabase
  .from('ScribeProject')
  .select(`*, createdByUser:User!inner(id, name, email)`)
  .is('deletedAt', null)

// ✅ Correct realtime subscription
const channel = supabase
  .channel('projects-changes')
  .on('postgres_changes', { 
    event: 'INSERT', 
    schema: 'public', 
    table: 'ScribeProject' 
  }, (payload) => {
    const newProject = payload.new as ScribeProject // Prisma types
    // Handle update
  })
```

## 🛠️ Technology Stack & Documentation

### **React 19 - Frontend Framework**
**Context7 Documentation Patterns:**
- **Form Actions**: Use `useActionState` for form handling
- **Form Status**: Use `useFormStatus` for loading states  
- **Optimistic Updates**: Use `useOptimistic` for responsive UI

```typescript
// React 19 form pattern used in LoginPage
const [error, submitAction] = useActionState(
  async (_previousState: string | null, formData: FormData) => {
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const { error } = await signInWithEmail(email, password)
    return error?.message || null
  }, null
)

function SubmitButton() {
  const { pending } = useFormStatus()
  return <button type="submit" disabled={pending}>
    {pending ? 'Signing in...' : 'Sign in'}
  </button>
}
```

### **Supabase - Backend Infrastructure**
**Context7 Documentation Patterns:**
- **Database API**: `supabase.from('table').select()` for queries
- **Realtime**: `postgres_changes` events for live updates
- **Auth**: `signInWithOAuth` and `signInWithPassword`

```typescript
// Database query pattern
export const db = {
  projects: {
    async getAll() {
      return supabase
        .from('ScribeProject')
        .select(`*, createdByUser:User!inner(id, name, email)`)
        .is('deletedAt', null)
        .order('updatedAt', { ascending: false })
    }
  }
}

// Realtime subscription pattern  
useEffect(() => {
  const channel = supabase
    .channel('schema-db-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public', 
      table: 'ScribeProject'
    }, (payload) => {
      const newProject = payload.new as ScribeProject
      setProjects(prev => [...prev, newProject])
    })
    .subscribe()
  
  return () => supabase.removeChannel(channel)
}, [])
```

### **Prisma - Type Generation**
**Context7 Documentation Patterns:**
- **Code Generation**: `prisma generate` creates TypeScript types
- **Type Safety**: Import types from `@prisma/client`
- **No ORM Usage**: Only use generated types, not Prisma Client

```typescript
// ✅ Correct usage - Types only
import type { ScribeProject, User } from '@prisma/client'

type ProjectWithCreator = ScribeProject & {
  createdByUser: Pick<User, 'id' | 'name' | 'email'>
}

// ❌ Never use Prisma Client directly 
// const prisma = new PrismaClient() // WRONG!
```

### **Tailwind CSS v4 - Styling**
**Context7 Documentation Patterns:**
- **CSS-first config**: Use `@theme` directive for customization
- **Vite plugin**: Required `@tailwindcss/vite` plugin
- **Import syntax**: Single `@import "tailwindcss"`

```css
/* src/index.css - Tailwind v4 pattern */
@import "tailwindcss";

@theme {
  --color-primary: hsl(221.2 83.2% 53.3%);
  --color-primary-foreground: hsl(210 40% 98%);
  --radius-lg: 0.5rem;
}

/* Component utilities */
.btn-primary {
  @apply inline-flex items-center justify-center rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2;
}
```

```typescript
// vite.config.ts - Required plugin
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react(), tailwindcss()], // Required!
})
```

## 📦 Package Breakdown & Usage

### **Dependencies (package.json)**

#### **Core Framework**
- **`react@^19.1.1`** - Main UI framework with latest form features
  ```typescript
  // Usage: Component with hooks
  import { useState, useEffect } from 'react'
  const [state, setState] = useState(initialValue)
  ```

- **`react-dom@^19.1.1`** - DOM rendering and form hooks
  ```typescript  
  // Usage: Form status in components
  import { useFormStatus } from 'react-dom'
  const { pending } = useFormStatus()
  ```

- **`react-router-dom@^7.9.1`** - Client-side routing
  ```typescript
  // Usage: Protected routes and navigation
  import { Navigate, useNavigate } from 'react-router-dom'
  if (!user) return <Navigate to="/login" replace />
  ```

#### **Database & Backend**
- **`@supabase/supabase-js@^2.57.4`** - Supabase client for API and realtime
  ```typescript
  // Usage: Database operations and auth
  import { createClient } from '@supabase/supabase-js'
  const supabase = createClient(url, key)
  ```

- **`@prisma/client@^6.16.1`** - Generated database types (not client usage)
  ```typescript  
  // Usage: Type imports only
  import type { User, ScribeProject } from '@prisma/client'
  ```

#### **State Management**
- **`zustand@^5.0.8`** - Lightweight state management  
  ```typescript
  // Usage: Global state stores
  import { create } from 'zustand'
  const useAuthStore = create((set) => ({
    user: null,
    setUser: (user) => set({ user })
  }))
  ```

#### **Forms & Validation** 
- **`react-hook-form@^7.62.0`** - Form state management
  ```typescript
  // Usage: Form handling with validation
  import { useForm } from 'react-hook-form'
  const { register, handleSubmit, formState: { errors } } = useForm()
  ```

- **`@hookform/resolvers@^3.10.0`** - Validation schema resolvers
  ```typescript
  // Usage: Zod integration with react-hook-form  
  import { zodResolver } from '@hookform/resolvers/zod'
  const form = useForm({ resolver: zodResolver(schema) })
  ```

- **`zod@^4.1.8`** - Schema validation
  ```typescript
  // Usage: Form and API validation schemas
  import { z } from 'zod'
  const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
  })
  ```

#### **UI & Styling**
- **`lucide-react@^0.544.0`** - Icon library
  ```typescript
  // Usage: UI icons
  import { Github, Mail, Lock, LogOut } from 'lucide-react'
  <Mail className="h-4 w-4" />
  ```

- **`class-variance-authority@^0.7.1`** - Component variant utilities
  ```typescript
  // Usage: Component styling variants
  import { cva, type VariantProps } from 'class-variance-authority'
  const buttonVariants = cva("btn", {
    variants: { variant: { primary: "btn-primary" } }
  })
  ```

- **`clsx@^2.1.1`** - Conditional CSS classes
  ```typescript
  // Usage: Dynamic class names
  import clsx from 'clsx'
  const className = clsx('base-class', {
    'active': isActive,
    'disabled': !enabled
  })
  ```

- **`tailwind-merge@^3.3.1`** - Tailwind class merging
  ```typescript
  // Usage: Merge conflicting Tailwind classes
  import { twMerge } from 'tailwind-merge'  
  const merged = twMerge('px-2 py-1 bg-red-500', 'px-3 bg-blue-500')
  // Result: 'py-1 px-3 bg-blue-500'
  ```

### **Development Dependencies**

#### **Build Tools**
- **`vite@^7.1.5`** - Build tool and dev server
- **`@vitejs/plugin-react@^5.0.2`** - React support for Vite  
- **`@tailwindcss/vite@^4.1.13`** - Tailwind v4 Vite plugin (REQUIRED)

#### **TypeScript**
- **`typescript@^5.9.2`** - TypeScript compiler
- **`@types/react@^19.1.13`** - React type definitions
- **`@types/react-dom@^19.1.9`** - React DOM type definitions
- **`@types/node@^22.18.3`** - Node.js type definitions

#### **Database Tools**
- **`prisma@^6.16.1`** - Prisma CLI for code generation
  ```bash
  # Usage: Generate types from schema
  npx prisma generate  # Creates @prisma/client types
  npx prisma db push   # Push schema to database
  ```

#### **Linting & Code Quality**
- **`eslint@^9.35.0`** - JavaScript/TypeScript linting
- **`@typescript-eslint/eslint-plugin@^8.43.0`** - TypeScript-specific rules
- **`@typescript-eslint/parser@^8.43.0`** - TypeScript parser for ESLint

## 🗄️ Database Schema Overview

### **Core Models**

#### **User Model**
```typescript
interface User {
  id: string                    // UUID primary key
  name?: string                 // Display name (unique)
  email?: string                // Email address (unique) 
  avatarUrl?: string            // Profile image URL
  groups: string[]              // Role groups (default: ["user"])
  
  // Activity tracking
  lastActiveProjectId?: string
  lastActiveObjectId?: string  
  lastActiveObjectType?: string
  
  // Audit fields (all models have these)
  createdAt: DateTime
  updatedAt: DateTime  
  deletedAt?: DateTime
  deletedBy?: string
  updatedBy?: string
}
```

#### **ScribeProject Model** 
```typescript
interface ScribeProject {
  id: string                    // CUID primary key
  name: string                  // Project name (unique)
  isPublic: boolean             // Visibility (default: false)
  meta?: Json                   // Additional metadata
  gameRomId?: string            // Associated ROM identifier
  
  // Relations (all project-scoped)
  cops: Cop[]                   // Custom operations
  files: File[]                 // Game files  
  blocks: Block[]               // Data blocks
  strings: StringType[]         // String encodings
  structs: Struct[]             // Data structures
  labels: Label[]               // Memory labels
  rewrites: Rewrite[]           // Value patches
  mnemonics: GameMnemonic[]     // Assembly instructions
  overrides: Override[]         // Register overrides
}
```

#### **Game Data Models**
All models follow the same audit pattern with `createdBy`, `updatedBy`, `deletedBy` user tracking.

- **Cop** - Custom operation codes with mnemonics and halt conditions
- **File** - Game assets with compression, grouping, and scene metadata  
- **Block** - Data containers with transformations and parts
- **StringType** - Text encoding systems with character maps and commands
- **Label** - Memory location markers  
- **GameMnemonic** - Assembly instruction representations
- **Override** - Register value overrides
- **Rewrite** - Memory value patches

### **Audit Trail System**
Every model includes comprehensive audit fields:
```typescript
// Standard audit pattern used across all models
interface AuditFields {
  createdAt: DateTime           // Auto-generated
  createdBy: string             // User UUID  
  updatedAt: DateTime           // Auto-updated
  updatedBy?: string            // User UUID
  deletedAt?: DateTime          // Soft delete
  deletedBy?: string            // User UUID
  
  // Relations to User model
  createdByUser: User
  updatedByUser?: User  
  deletedByUser?: User
}
```

## 🔄 Development Patterns

### **Component Structure**
```
src/
├── components/           # Reusable UI components
│   ├── ProtectedRoute.tsx
│   └── example/         # Example implementations
├── pages/               # Route-level components  
│   ├── LoginPage.tsx
│   ├── DashboardPage.tsx
│   └── AuthCallback.tsx
├── lib/                # Utilities and configuration
│   ├── supabase.ts     # Supabase client + DB helpers
│   └── types.ts        # Prisma type re-exports
├── stores/             # Zustand state management
│   └── auth-store.ts   # Authentication state
└── types/              # Additional type definitions
```

### **Data Access Pattern**
```typescript
// Always use Supabase APIs directly
export const db = {
  projects: {
    async getAll() {
      return supabase.from('ScribeProject').select(`
        *,
        createdByUser:User!inner(id, name, email)
      `)
    },
    
    async create(project: CreateProject, userId: string) {
      return supabase.from('ScribeProject').insert({
        ...project,
        createdBy: userId
      })
    }
  }
}
```

### **Realtime Integration Pattern**
```typescript
// Standard realtime subscription setup
useEffect(() => {
  const channel = supabase
    .channel('table-changes')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'ScribeProject'
    }, (payload) => {
      const newRecord = payload.new as ScribeProject
      setState(prev => [...prev, newRecord])
    })
    .subscribe()

  return () => supabase.removeChannel(channel)
}, [])
```

### **Authentication Pattern**
```typescript
// Centralized auth state with Zustand
const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading })
}))

// Auth persistence with Supabase
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    setUser(session?.user ?? null)
  })

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => setUser(session?.user ?? null)
  )

  return () => subscription.unsubscribe()
}, [])
```

## 🚀 Development Phase Status

**Phase 1 ✅ Complete**: Authentication & Core Setup
- Full authentication system (email + GitHub OAuth)
- Protected routing with user sessions  
- Real-time subscriptions infrastructure
- Type-safe database operations

**Phase 2 🏗️ Next**: Project Management
- Project creation and selection interfaces
- Collaborative user presence
- Project visibility controls

**Phase 3-8**: Core data management → Advanced features → Production scaling

## 🔧 Development Commands

```bash
# Development
npm run dev                 # Start dev server (port 3001)
npm run build              # Production build  
npm run type-check         # TypeScript validation

# Database  
npm run db:generate        # Generate Prisma types
npm run db:push           # Push schema to Supabase
npm run db:migrate        # Run database migrations
npm run db:studio         # Open Prisma Studio

# Code Quality
npm run lint              # ESLint validation
```

## 🌟 Key Success Principles

1. **Type Safety First** - Always use Prisma-generated types
2. **Direct API Usage** - No service abstraction layers
3. **Real-time by Default** - Every data interaction should support live updates
4. **Audit Everything** - All changes tracked with user attribution
5. **Progressive Enhancement** - Use React 19 features for better UX
6. **Collaborative-First** - Design for multiple simultaneous users

---

**This document provides complete context for AI agents to understand and contribute to the Scribe application. All patterns, technologies, and architectural decisions are documented with working examples from the actual codebase.**
