import { defineConfig, type Plugin } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import { generateLocal, listLibrary } from './runner/generate.ts'

const repoRoot = path.dirname(fileURLToPath(import.meta.url))
process.env.HIGGSFIELD_ROOT = repoRoot

const previewModelHome = process.env.HIGGSFIELD_MODEL_HOME || '/tmp/higgsfield-studio/models'

function localGenerateApi(): Plugin {
  return {
    name: 'higgsfield-local-generate',
    configureServer(server) {
      server.middlewares.use('/api/library', (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405
          res.end()
          return
        }
        void listLibrary(previewModelHome)
          .then((report) => {
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify(report))
          })
          .catch((error: unknown) => {
            res.statusCode = 500
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'The model library could not be read.' }))
          })
      })
      server.middlewares.use('/api/local-generate', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', () => {
          void (async () => {
            try {
              const body = JSON.parse(Buffer.concat(chunks).toString()) as {
                prompt?: string
                kind?: 'image' | 'video'
                directory?: string
                modelId?: string
                aspectRatio?: string
                loraId?: string
                vaeId?: string
                embeddingId?: string
              }
              if (!body.directory || (body.kind !== 'image' && body.kind !== 'video') || typeof body.prompt !== 'string') {
                throw new Error('Generate needs a folder, a prompt, and an image or a local clip.')
              }
              res.writeHead(200, { 'content-type': 'application/x-ndjson', 'cache-control': 'no-cache' })
              const result = await generateLocal({
                prompt: body.prompt,
                kind: body.kind,
                directory: body.directory,
                modelId: body.modelId,
                aspectRatio: body.aspectRatio,
                loraId: body.loraId,
                vaeId: body.vaeId,
                embeddingId: body.embeddingId,
                modelHome: previewModelHome,
                onProgress: (progress) => {
                  res.write(`${JSON.stringify({ type: 'progress', progress })}\n`)
                },
              })
              res.end(`${JSON.stringify({ type: 'result', result })}\n`)
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Local generation failed.'
              if (res.headersSent) {
                res.end(`${JSON.stringify({ type: 'error', error: message })}\n`)
                return
              }
              res.statusCode = 400
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: message }))
            }
          })()
        })
      })
    },
  }
}

const webPreview = process.env.VITE_WEB_PREVIEW === '1'

export default defineConfig({
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 43127,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: 43127,
    strictPort: true,
  },
  plugins: [
    react(),
    tailwindcss(),
    localGenerateApi(),
    ...(webPreview
      ? []
      : [
          electron({
            main: {
              entry: 'electron/main.ts',
            },
            preload: {
              input: path.join(__dirname, 'electron/preload.ts'),
              vite: {
                build: {
                  rollupOptions: {
                    output: {
                      format: 'cjs',
                      inlineDynamicImports: true,
                      entryFileNames: 'preload.cjs',
                    },
                  },
                },
              },
            },
          }),
        ]),
  ],
})
