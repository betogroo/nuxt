const fs = require('fs');

const fixDatabaseTypes = () => {
  const file = 'app/types/database.types.ts';
  let content = fs.readFileSync(file, 'utf8');
  
  // demands row
  content = content.replace(
    /internal_process_number: string \| null/g,
    'internal_process_number: string | null\n          process_number: string | null'
  );
  
  // demands insert
  content = content.replace(
    /internal_process_number\?: string \| null/g,
    'internal_process_number?: string | null\n          process_number?: string | null'
  );
  
  fs.writeFileSync(file, content, 'utf8');
};

fixDatabaseTypes();
console.log('database.types.ts updated manually.');
