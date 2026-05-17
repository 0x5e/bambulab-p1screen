import { watch, type Ref } from 'vue'
import { unzipSync } from 'fflate'
import type { Project } from '../api/project'
import { saveProject } from '../utils/project'

import brokenThumbnail from '../assets/images/monitor_brokenimg.png'

export const useProjectThumbnail = (project: Ref<Project | null>) => {
  const loadProjectThumbnail = async () => {
    if (!project.value) return
    if ((project.value.thumbnail_url || '').length > 0) return

    try {
      console.log('[useProjectThumbnail] fetching project file from oss')
      const response = await fetch(`/api/fetch?url=${encodeURIComponent(project.value.url)}`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      const data = new Uint8Array(arrayBuffer)
      const unzipped = unzipSync(data)
      const thumbnailData = unzipped[`Metadata/plate_${project.value.plate_idx}.png`]

      project.value.thumbnail_url = thumbnailData
        ? `data:image/png;base64,${btoa(String.fromCharCode(...thumbnailData))}`
        : undefined

      saveProject(project.value)
      console.log('[useProjectThumbnail] extracted project thumbnail from .3mf')
    } catch (error) {
      console.error('[useProjectThumbnail] loadProjectThumbnail error:', error)
      project.value.thumbnail_url = brokenThumbnail
    }

    project.value = Object.assign({}, project.value)
  }

  watch(
    project,
    () => {
      loadProjectThumbnail()
    },
    { immediate: true }
  )
}
