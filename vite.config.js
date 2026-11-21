import { Buffer } from 'node:buffer'
import process from 'node:process'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

const DEV_API_BODY_LIMIT = 32 * 1024

const readJsonBody = async (request) => {
  const chunks = []
  let size = 0

  for await (const chunk of request) {
    size += chunk.length
    if (size > DEV_API_BODY_LIMIT) {
      const error = new Error('Request body is too large.')
      error.statusCode = 413
      throw error
    }
    chunks.push(chunk)
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  } catch {
    const error = new Error('Request body must be valid JSON.')
    error.statusCode = 400
    throw error
  }
}

const localAdvisorApi = () => ({
  name: 'local-advisor-api',
  apply: 'serve',
  async configureServer(server) {
    const { default: advisorHandler } = await import('./api/advisor.js')

    server.middlewares.use('/api/advisor', async (request, response, next) => {
      request.url = '/api/advisor'
      request.query = {}

      try {
        if (request.method === 'POST') request.body = await readJsonBody(request)

        response.status = function status(code) {
          this.statusCode = code
          return this
        }
        response.json = function json(body) {
          this.setHeader('Content-Type', 'application/json; charset=utf-8')
          this.end(JSON.stringify(body))
        }

        await advisorHandler(request, response)
      } catch (error) {
        if (response.headersSent) return
        if (error.statusCode) {
          response.statusCode = error.statusCode
          response.setHeader('Content-Type', 'application/json; charset=utf-8')
          response.end(JSON.stringify({ error: error.message }))
          return
        }
        next(error)
      }
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY || ''
  process.env.GEMINI_MODEL = env.GEMINI_MODEL || process.env.GEMINI_MODEL || ''
  process.env.VITE_FIREBASE_API_KEY = env.VITE_FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || ''

  return {
    plugins: [react(), localAdvisorApi()],
  }
})
