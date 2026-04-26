import * as Icons from 'lucide-react';

// 💥 2. ฟังก์ชันช่วยแปลงชื่อไอคอน (เช่น Brain -> brain, ArrowRight -> arrow-right)
const toKebabCase = (str: string) => str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

/**
 * ICON_MAP เวอร์ชันอัปเกรด: กรองเฉพาะที่เป็น React Component จริงๆ เท่านั้น
 */
export const ICON_MAP: Record<string, any> = Object.entries(Icons)
  .filter(([key, value]) => {
    return (
      /^[A-Z]/.test(key) && 
      key !== 'LucideIcon' && 
      (typeof value === 'function' || typeof value === 'object')
    );
  })
  .reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, any>);

// รายชื่อไอคอนทั้งหมด
export const ICON_LIST = Object.keys(ICON_MAP);