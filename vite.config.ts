import { defineConfig, type Plugin } from 'vite'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron/simple'
import os from 'node:os'
import { generateLocal } from './runner/generate.ts'
import { listLocalModels, modelEnv } from './src/shared/modelLibrary.ts'

const repoRoot = path.dirname(fileURLToPath(import.meta.url))
process.env.HIGGSFIELD_ROOT = repoRoot

function localGenerateApi(): Plugin {
  return {
    name: 'higgsfield-local-generate',
    configureServer(server) {
      server.middlewares.use('/api/local-models', (_req, res) => {
        res.setHeader('content-type', 'application/json')
        res.end(
          JSON.stringify(
            listLocalModels({
              home: os.homedir(),
              modelHome: path.join(os.homedir(), 'Library', 'Application Support', 'higgsfield-local', 'models'),
              env: modelEnv(process.env),
            }),
          ),
        )
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
              }
              if (!body.directory || (body.kind !== 'image' && body.kind !== 'video') || typeof body.prompt !== 'string') {
                throw new Error('A local run needs a folder, a prompt, and an image or video.')
              }
              const result = await generateLocal({
                prompt: body.prompt,
                kind: body.kind,
                modelId: body.modelId,
                directory: body.directory,
              })
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify(result))
            } catch (error) {
              res.statusCode = 400
              res.setHeader('content-type', 'application/json')
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Local generation failed.' }))
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
