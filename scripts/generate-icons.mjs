import sharp from 'sharp'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../public/favicon.svg', import.meta.url))
const targets = [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['pwa-maskable-512x512.png', 512],
]

await Promise.all(targets.map(async ([name, size]) => {
  const destination = fileURLToPath(new URL(`../public/${name}`, import.meta.url))
  await sharp(source).resize(Number(size), Number(size)).png().toFile(destination)
}))
