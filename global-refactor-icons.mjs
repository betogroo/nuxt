import fs from 'fs';
import path from 'path';

// Import iconMap logic directly (since we can't easily import TS)
const iconMap = {
  finances: 'mdi-cash-multiple',
  time: 'mdi-clock-outline',
  success: 'mdi-check-circle-outline',
  balance: 'mdi-scale-balance',
  categories: 'mdi-tag-multiple-outline',
  back: 'mdi-keyboard-return',
  history: 'mdi-history',
  next: 'mdi-arrow-right',
  energy: 'mdi-lightning-bolt-outline',
  currency: 'mdi-currency-brl',
  transfer: 'mdi-arrow-split-horizontal',
  identifier: 'mdi-identifier',
  calendar: 'mdi-calendar',
  company: 'mdi-domain',
  contactDetails: 'mdi-card-account-details',
  email: 'mdi-email',
  emailAlt: 'mdi-email-outline',
  document: 'mdi-clipboard-text-outline',
  edit: 'mdi-pencil',
  recordsList: 'mdi-clipboard-list-outline',
  userBadge: 'mdi-badge-account-outline',
  product: 'mdi-package-variant-outline',
  security: 'mdi-lock-outline',
  searchDocument: 'mdi-text-box-search-outline',
  userProfile: 'mdi-account-circle-outline',
  addUser: 'mdi-account-plus-outline',
  usersGroup: 'mdi-account-group-outline',
  disableUser: 'mdi-account-off-outline',
  inventory: 'mdi-package-variant-closed',
  notifications: 'mdi-bell-outline',
  databaseSearch: 'mdi-database-search-outline',
  home: 'mdi-home-outline',
  dashboard: 'mdi-view-dashboard-outline',
  packageSolid: 'mdi-package-variant',
  delivery: 'mdi-truck-delivery-outline',
  info: 'mdi-information-outline',
  circle: 'mdi-circle-outline',
  sun: 'mdi-weather-sunny',
  moon: 'mdi-weather-night',
  add: 'mdi-plus',
  refresh: 'mdi-refresh',
  editOutline: 'mdi-pencil-outline',
  search: 'mdi-magnify',
  deleteOutline: 'mdi-delete-outline',
  arrowLeft: 'mdi-arrow-left',
  close: 'mdi-close',
  externalLink: 'mdi-open-in-new',
  delete: 'mdi-delete',
  arrowLeftBold: 'mdi-arrow-left-bold',
  logout: 'mdi-logout',
  clipboardClock: 'mdi-clipboard-text-clock-outline',
  check: 'mdi-check',
  alert: 'mdi-alert-circle-outline',
  clockAlert: 'mdi-clock-alert-outline',
  link: 'mdi-link-variant',
  userOutline: 'mdi-account-outline',
  shieldUser: 'mdi-shield-account-outline',
  save: 'mdi-content-save-outline',
  calendarOutline: 'mdi-calendar-outline',
  addUserSolid: 'mdi-account-plus',
  arrowRightBold: 'mdi-arrow-right-bold',
  chevronDown: 'mdi-chevron-down',
  chevronUp: 'mdi-chevron-up',
};

const reverseIconMap = Object.fromEntries(
  Object.entries(iconMap).map(([k, v]) => [v, k])
);

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // Replace mdi-* string occurrences with their mapped keys
  // This looks for "mdi-something" or 'mdi-something'
  content = content.replace(/(['"])(mdi-[a-z0-9-]+)\1/g, (match, quote, mdiClass) => {
    const name = reverseIconMap[mdiClass];
    if (name) {
      return `${quote}${name}${quote}`;
    }
    return match;
  });

  if (originalContent !== content) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Updated Data in: ${filePath}`);
  }
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.js') || fullPath.endsWith('.vue')) {
      // Exclude the icons.ts file itself
      if (!fullPath.replace(/\\/g, '/').endsWith('app/components/ui/icons.ts')) {
        processFile(fullPath);
      }
    }
  }
}

['pages', 'layouts', 'components', 'composables', 'utils', 'middleware'].forEach(subDir => {
  processDirectory(path.join(process.cwd(), 'app', subDir));
});

console.log('Global replacement complete.');
