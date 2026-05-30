import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/bg-white(?!\/)(?!\s*dark:bg-)/g, 'bg-white dark:bg-slate-800');
content = content.replace(/bg-slate-50(?!\/)(?!\s*dark:bg-)/g, 'bg-slate-50 dark:bg-slate-900');
content = content.replace(/text-slate-800(?!\s*dark:text-)/g, 'text-slate-800 dark:text-slate-100');
content = content.replace(/text-slate-900(?!\s*dark:text-)/g, 'text-slate-900 dark:text-slate-50');
content = content.replace(/text-slate-600(?!\s*dark:text-)/g, 'text-slate-600 dark:text-slate-300');
content = content.replace(/text-slate-500(?!\s*dark:text-)/g, 'text-slate-500 dark:text-slate-400');
content = content.replace(/border-slate-100(?!\/)(?!\s*dark:border-)/g, 'border-slate-100 dark:border-slate-700');
content = content.replace(/border-slate-200(?!\/)(?!\s*dark:border-)/g, 'border-slate-200 dark:border-slate-600');

fs.writeFileSync('src/App.tsx', content);

let houseContent = fs.readFileSync('src/components/HouseTab.tsx', 'utf8');
houseContent = houseContent.replace(/bg-white(?!\/)(?!\s*dark:bg-)/g, 'bg-white dark:bg-slate-800');
houseContent = houseContent.replace(/bg-slate-50(?!\/)(?!\s*dark:bg-)/g, 'bg-slate-50 dark:bg-slate-900');
houseContent = houseContent.replace(/text-slate-800(?!\s*dark:text-)/g, 'text-slate-800 dark:text-slate-100');
houseContent = houseContent.replace(/text-slate-900(?!\s*dark:text-)/g, 'text-slate-900 dark:text-slate-50');
houseContent = houseContent.replace(/text-slate-600(?!\s*dark:text-)/g, 'text-slate-600 dark:text-slate-300');
houseContent = houseContent.replace(/text-slate-500(?!\s*dark:text-)/g, 'text-slate-500 dark:text-slate-400');
houseContent = houseContent.replace(/border-slate-100(?!\/)(?!\s*dark:border-)/g, 'border-slate-100 dark:border-slate-700');
houseContent = houseContent.replace(/border-slate-200(?!\/)(?!\s*dark:border-)/g, 'border-slate-200 dark:border-slate-600');

fs.writeFileSync('src/components/HouseTab.tsx', houseContent);
console.log('Dark mode classes applied');
