import fs from 'fs'
import path from 'path'

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8')
  let originalContent = content

  // Replace <v-chip> with <UiChip>
  content = content.replace(/<v-chip\b/g, '<UiChip')
  // Replace </v-chip> with </UiChip>
  content = content.replace(/<\/v-chip>/g, '</UiChip>')

  if (originalContent !== content) {
    fs.writeFileSync(filePath, content, 'utf-8')
    console.log(`Updated: ${filePath}`)
  }
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return
  const files = fs.readdirSync(dir)
  for (const file of files) {
    const fullPath = path.join(dir, file)
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath)
    } else if (fullPath.endsWith('.vue')) {
      // Exclude Chip.vue itself
      if (!fullPath.replace(/\\/g, '/').endsWith('app/components/ui/Chip.vue')) {
        processFile(fullPath)
      }
    }
  }
}

;['pages', 'layouts', 'components'].forEach((subDir) => {
  processDirectory(path.join(process.cwd(), 'app', subDir))
})

console.log('Global v-chip replacement complete.')
