import * as Icons from 'lucide-react';

/**
 * ICON_MAP เวอร์ชันอัปเกรด: กรองเฉพาะที่เป็น React Component จริงๆ เท่านั้น
 */
export const ICON_MAP: Record<string, any> = Object.entries(Icons)
  .filter(([key, value]) => {
    // 1. ต้องขึ้นต้นด้วยตัวใหญ่ (กฎของ React Component)
    // 2. ไม่ใช่คำต้องห้าม
    // 3. สำคัญที่สุด: ต้องเป็น ฟังก์ชัน หรือ Object (กันเหนียวถ้าเป็น ForwardRef)
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