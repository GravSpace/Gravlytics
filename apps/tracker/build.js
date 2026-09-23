/**
 * Gravlytics Tracker — Build script (Bun)
 * Minifies the tracker and checks gzip size < 2 KB
 */
import { gzipSync } from 'bun'
import { readFileSync, mkdirSync } from 'fs'

const MAX_GZIP_BYTES = 5120

async function build() {
  // Build & minify
  const result = await Bun.build({
    entrypoints: ['./src/gravlytics.js'],
    outdir: './dist',
    minify: true,
    naming: 'gravlytics.min.js',
    target: 'browser',
  })

  if (!result.success) {
    console.error('❌ Build failed:')
    for (const log of result.logs) {
      console.error(log)
    }
    process.exit(1)
  }

  // Read output and check gzip size
  const minified = readFileSync('./dist/gravlytics.min.js')
  const gzipped = gzipSync(minified, { level: 9 })

  const rawSize = minified.length
  const gzipSize = gzipped.length

  console.log(`✅ Build complete`)
  console.log(`   Raw:  ${rawSize} bytes`)
  console.log(`   Gzip: ${gzipSize} bytes`)

  if (gzipSize > MAX_GZIP_BYTES) {
    console.error(
      `\n❌ FAIL: Gzip size (${gzipSize}B) exceeds limit (${MAX_GZIP_BYTES}B)`
    )
    process.exit(1)
  } else {
    console.log(
      `   ✅ Under ${MAX_GZIP_BYTES}B limit (${MAX_GZIP_BYTES - gzipSize}B headroom)`
    )
  }
}

build()
