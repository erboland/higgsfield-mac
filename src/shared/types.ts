export type Modality = 'image' | 'video' | '3d' | 'audio'

export type ModelEntry = {
  id: string
  name: string
  modality: Modality
  prompt: 'required' | 'optional' | 'unused'
  media?: 'video' | 'image'
}

export type SkillId =
  | 'higgsfield-generate'
  | 'higgsfield-soul-id'
  | 'higgsfield-product-photoshoot'
  | 'higgsfield-brandkit'
  | 'higgsfield-marketplace-cards'
  | 'higgsfield-websites'
  | 'higgsfield-video-explainer'
  | 'higgsfield-youtube-thumbnail'

export type SkillEntry = {
  id: SkillId
  title: string
  summary: string
  chains: string
  command: string
  upstream: string
  defaultModelId?: string
}

export type PhotoshootMode = {
  id: string
  label: string
  detail: string
}

export type JobDraft = {
  skillId: SkillId
  modelId: string
  prompt: string
  aspectRatio: string
  photoshootMode: string
  marketplaceScope: string
  websiteType: 'website' | 'app' | 'game'
  websiteTemplate: string
  websiteCategory: string
  subdomain: string
  characterName: string
  imagePath: string
  videoPath: string
}

export type BuiltCommand = {
  argv: string[]
  display: string
  summary: string
}

export type Workspace = {
  id: string
  name: string
  directory: string
  createdAt: string
}

export type SavedJob = {
  id: string
  createdAt: string
  draft: JobDraft
  display: string
  summary: string
}

export type ToolchainStatus = {
  installed: boolean
  path: string | null
  version: string | null
  detail: string
}

export type AppInfo = {
  platform: NodeJS.Platform
  bridge: 'desktop' | 'browser'
}

export type JobEvent =
  | { runId: string; type: 'log'; text: string }
  | { runId: string; type: 'exit'; code: number | null; error?: string }

export type LocalGeneration = {
  modelId: string
  modelName: string
  kind: 'image' | 'video'
  filePath: string
  mediaType: string
  base64: string
}

export type LocalProgress = {
  phase: 'download' | 'generate'
  detail: string
}

export type HiggsfieldApi = {
  getInfo(): Promise<AppInfo>
  getToolchain(): Promise<ToolchainStatus>
  listWorkspaces(): Promise<Workspace[]>
  createWorkspace(input: { name: string; directory: string }): Promise<Workspace>
  removeWorkspace(id: string): Promise<void>
  pickDirectory(): Promise<string | null>
  listJobs(workspaceId: string): Promise<SavedJob[]>
  saveJob(workspaceId: string, draft: JobDraft): Promise<SavedJob>
  runJob(workspaceId: string, draft: JobDraft): Promise<{ runId: string }>
  generateLocal(input: { workspaceId: string; prompt: string; kind: 'image' | 'video' }): Promise<LocalGeneration>
  onLocalProgress(listener: (event: LocalProgress) => void): () => void
  onJobEvent(listener: (event: JobEvent) => void): () => void
  openExternal(url: string): Promise<void>
}
