# Scribe - Collaborative Game Database Editor

A modern, real-time collaborative editor for game database management, built with React 19, Supabase, and TypeScript.

## 🚀 Features

- **Authentication**: Email/password and GitHub OAuth support
- **Real-time Collaboration**: Live editing with Supabase Realtime
- **Comprehensive Data Models**: Support for game ROMs, projects, files, blocks, strings, and more
- **Modern UI**: Built with Tailwind CSS and Lucide icons
- **Type-safe**: Full TypeScript support with generated database types
- **Progressive Enhancement**: Utilizes React 19's new form features

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **Database ORM**: Prisma (with native Supabase PostgreSQL)
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod validation
- **Icons**: Lucide React
- **Routing**: React Router v6

## 🎯 Architecture Approach

This application uses **Supabase's REST API** for all database operations along with **Supabase realtime subscriptions** for live updates. We use **Prisma-generated types** for TypeScript safety without any custom viewmodels or transforms, keeping the data layer clean and type-safe.

**Key Principles:**
- **Supabase APIs**: Direct use of `supabase.from('table').select()` for data operations  
- **Realtime Subscriptions**: `postgres_changes` events for live updates
- **Prisma Types**: Generated TypeScript types for compile-time safety
- **No Services**: Direct API calls without additional service layers
- **No Transforms**: Raw database objects with Prisma typing

## 🏗️ Development Roadmap

### Phase 1: Authentication & Core Setup ✅
- [x] Project structure and configuration
- [x] Supabase integration and auth setup
- [x] Login/logout functionality (email + GitHub OAuth)
- [x] Protected routes and user session management
- [x] Basic dashboard layout

### Phase 2: Project Management 🏗️ (Next)
- [ ] **Project Creation & Selection Interface**
  - Create new projects with validation
  - Project listing with search/filter
  - Project deletion and archival
  - Project visibility controls (public/private)
- [ ] **Project Dashboard Enhancement**
  - Recent projects display
  - Quick project switching
  - Project statistics overview
  - Collaborative user presence indicators

### Phase 3: Core Data Management 📋
- [ ] **File Management System**
  - File upload and organization
  - File type detection and validation  
  - File compression and optimization
  - File search and filtering
- [ ] **Block Editor Interface**
  - Visual block creation and editing
  - Block transformation pipeline
  - Block part management
  - Real-time block collaboration
- [ ] **String Type Management**
  - String type definition interface
  - Character mapping configuration
  - Command system for string types
  - String validation and preview

### Phase 4: Advanced Editing Features 🎯
- [ ] **Label & Annotation System**
  - Visual label placement on data
  - Label categorization and filtering
  - Collaborative label discussions
  - Label version history
- [ ] **Mnemonic & Assembly Support**
  - Assembly code visualization
  - Mnemonic auto-completion
  - Syntax highlighting for assembly
  - Assembly validation and testing
- [ ] **Override & Rewrite Management**
  - Value override interface
  - Batch rewrite operations
  - Override conflict resolution
  - Rewrite history and rollback

### Phase 5: Real-time Collaboration 👥
- [ ] **Live Editing Features**
  - Real-time cursor tracking
  - Operational transformation for conflicts
  - User presence indicators
  - Live editing notifications
- [ ] **Communication Tools**
  - In-app commenting system
  - Real-time chat for projects
  - Change request system
  - Activity feed and notifications

### Phase 6: Data Analysis & Visualization 📊
- [ ] **Data Visualization Dashboard**
  - Game data structure visualization
  - Memory usage analysis
  - Dependency graphs for game objects
  - Performance metrics and insights
- [ ] **Search & Discovery**
  - Global search across all data types
  - Advanced filtering and sorting
  - Saved search queries
  - Data relationship exploration

### Phase 7: Advanced Features 🔧
- [ ] **Import/Export System**
  - Multiple format support (JSON, XML, CSV)
  - Batch import/export operations
  - Data validation during import
  - Export customization options
- [ ] **Version Control & History**
  - Project versioning system
  - Change history with diffs
  - Branch and merge functionality
  - Rollback capabilities
- [ ] **API & Integration**
  - REST API for external tools
  - Webhook support for notifications
  - Plugin system for extensions
  - CLI tools for automation

### Phase 8: Production & Scaling 🏆
- [ ] **Performance Optimization**
  - Database query optimization
  - Real-time connection scaling
  - Caching strategies
  - CDN integration for assets
- [ ] **Security & Compliance**
  - Role-based access control (RBAC)
  - Audit logging
  - Data encryption at rest
  - Security monitoring
- [ ] **Monitoring & Analytics**
  - Application performance monitoring
  - User analytics and insights
  - Error tracking and reporting
  - Usage metrics and optimization

## 🚦 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Environment Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env`:
   ```env
   VITE_PUBLIC_SUPABASE_URL=your_supabase_url
   VITE_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. Run database migrations: `npm run db:push`
5. Start the development server: `npm run dev`

### Database Setup
The project uses Prisma with PostgreSQL via Supabase. The schema includes comprehensive models for:
- User management and authentication
- Project organization and collaboration
- Game data structures (COPs, files, blocks, strings, etc.)
- Audit trails for all operations

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines and join our development discussions.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Supabase Documentation](https://supabase.com/docs)
- [React 19 Documentation](https://react.dev)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Tailwind CSS](https://tailwindcss.com)

---

Built with ❤️ for the game development community.
