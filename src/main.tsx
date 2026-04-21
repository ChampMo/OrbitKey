import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { getCurrentWindow } from "@tauri-apps/api/window";

// สร้าง Component หุ้มเพื่อจัดการเรื่องความโปร่งใสบน Mac
const Root = () => {
  useEffect(() => {
    const setupWindow = async () => {
      const appWindow = getCurrentWindow();
      // เติม class เข้าไปที่ <html> ตามชื่อ label (เช่น action-ring-window)
      document.documentElement.classList.add(`${appWindow.label}-window`);
      
      // สำหรับ macOS: บังคับให้พื้นหลัง Webview ใสในระดับลึก
      if (appWindow.label === "action-ring") {
        // บังคับผ่าน Style โดยตรงอีกชั้น
        document.body.style.background = "transparent";
        document.body.style.backgroundColor = "transparent";
      }
    };
    setupWindow();
  }, []);

  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

ReactDOM.createRoot(document.getElementById("root")!).render(<Root />);