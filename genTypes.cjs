const { execSync } = require('child_process');
const fs = require('fs');

try {
  const result = execSync('npx supabase gen types typescript --local', { encoding: 'utf8' });
  fs.writeFileSync('app/types/database.types.ts', result, 'utf8');
  console.log('Types generated successfully in UTF-8.');
} catch (e) {
  console.error('Error:', e.message);
}
