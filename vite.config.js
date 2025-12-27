import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// Plugin untuk menampilkan HTTP request logs di terminal
function requestLoggerPlugin() {
  return {
    name: 'request-logger',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const start = Date.now()
        
        res.on('finish', () => {
          const duration = Date.now() - start
          const status = res.statusCode
          const method = req.method
          const url = req.url
          
          // Warna berdasarkan status code
          let statusColor = '\x1b[32m' // hijau untuk 2xx
          if (status >= 400) statusColor = '\x1b[31m' // merah untuk 4xx/5xx
          else if (status >= 300) statusColor = '\x1b[33m' // kuning untuk 3xx
          
          // Warna berdasarkan method
          let methodColor = '\x1b[36m' // cyan default
          if (method === 'POST') methodColor = '\x1b[33m' // kuning
          else if (method === 'PUT' || method === 'PATCH') methodColor = '\x1b[35m' // magenta
          else if (method === 'DELETE') methodColor = '\x1b[31m' // merah
          
          console.log(
            `${methodColor}${method.padEnd(7)}\x1b[0m ${url} ${statusColor}${status}\x1b[0m ${duration}ms`
          )
        })
        
        next()
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    requestLoggerPlugin()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
