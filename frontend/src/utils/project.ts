import { type Project } from '@bambulab-p1screen/printer-api'

export const PROJECTS_STORAGE_KEY = 'projects'

export const saveProject = async (project: Project) => {
  if (typeof window === 'undefined') return
  const projects = getProjects()
  const targetIndex = projects.findIndex(item => item.task_id === project.task_id && item.subtask_id === project.subtask_id)
  if (targetIndex >= 0) {
    projects[targetIndex] = project
  } else {
    projects.push(project)
  }
  localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects))
}

export const getProjects = () => {
  if (typeof window === 'undefined') return [] as Project[]
  try {
    const rawProjects = localStorage.getItem(PROJECTS_STORAGE_KEY)
    if (!rawProjects) {
      return [] as Project[]
    }
    const parsedProjects = JSON.parse(rawProjects)
    return Array.isArray(parsedProjects) ? parsedProjects as Project[] : []
  } catch (error: any) {
    console.warn(`failed to parse projects from localStorage: ${error.message}`)
    return [] as Project[]
  }
}

export const getCurrentProject = (taskId?: string, subtaskId?: string) => {
  if (!taskId || !subtaskId) {
    return null
  }

  return getProjects().find(project => (
    project.task_id === taskId && project.subtask_id === subtaskId
  )) ?? null
}
