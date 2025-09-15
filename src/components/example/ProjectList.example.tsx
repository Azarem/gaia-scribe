// Example component showing how to use Prisma types with Supabase APIs and realtime
import { useState, useEffect } from 'react'
import { supabase, db } from '../../lib/supabase'
import type { ScribeProject, User } from '@prisma/client'

// Type for project with related user data (using Prisma types)
type ProjectWithCreator = ScribeProject & {
  createdByUser: Pick<User, 'id' | 'name' | 'email'>
}

export default function ProjectListExample() {
  const [projects, setProjects] = useState<ProjectWithCreator[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load initial data using Supabase API
    const loadProjects = async () => {
      try {
        const { data, error } = await db.projects.getAll()
        if (error) {
          console.error('Error loading projects:', error)
          return
        }
        setProjects(data || [])
      } catch (error) {
        console.error('Error loading projects:', error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()

    // Set up realtime subscription using Supabase realtime
    const channel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'ScribeProject' 
        },
        (payload) => {
          // payload.new is automatically typed as ScribeProject from Prisma
          const newProject = payload.new as ScribeProject
          console.log('New project created:', newProject.name)
          
          // Add the new project to the list
          // In a real app, you'd fetch the full project with relations
          setProjects(prev => [...prev, newProject as ProjectWithCreator])
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'ScribeProject' 
        },
        (payload) => {
          const updatedProject = payload.new as ScribeProject
          setProjects(prev => 
            prev.map(p => p.id === updatedProject.id ? { ...p, ...updatedProject } : p)
          )
        }
      )
      .on(
        'postgres_changes',
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'ScribeProject' 
        },
        (payload) => {
          const deletedProject = payload.old as ScribeProject
          setProjects(prev => prev.filter(p => p.id !== deletedProject.id))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (loading) {
    return <div>Loading projects...</div>
  }

  return (
    <div>
      <h2>My Projects</h2>
      {projects.map((project) => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          <p>Created by: {project.createdByUser?.name || project.createdByUser?.email}</p>
          <p>Public: {project.isPublic ? 'Yes' : 'No'}</p>
          {project.gameRomId && <p>ROM ID: {project.gameRomId}</p>}
        </div>
      ))}
    </div>
  )
}

// This example demonstrates:
// 1. Using Prisma-generated types for TypeScript safety (ScribeProject, User)
// 2. Using Supabase REST API for data operations (supabase.from().select())
// 3. Using Supabase realtime subscriptions for live updates
// 4. Type-safe realtime payloads using Prisma types
// 5. No custom services or data transforms - direct Supabase API usage!
