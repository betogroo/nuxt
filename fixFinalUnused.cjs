const fs = require('fs');

let profileFile = 'app/pages/profile.vue';
let profileContent = fs.readFileSync(profileFile, 'utf8');
profileContent = profileContent.replace(/fetchProfile, /g, '');
fs.writeFileSync(profileFile, profileContent, 'utf8');

let chipFile = 'app/components/ui/UiChip.vue';
let chipContent = fs.readFileSync(chipFile, 'utf8');
chipContent = chipContent.replace(/  defineEmits<{\n    \(e: 'click:close'\): void\n    \(e: 'click'\): void\n  }>\(\)/, "  defineEmits<{ (e: 'click:close' | 'click'): void }>()");
fs.writeFileSync(chipFile, chipContent, 'utf8');

console.log('Fixed profile and UiChip');
