import React, { useState } from 'react';
import { X, Send, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core'; // เพิ่มตัวนี้เพื่อเรียกใช้ Rust
import Alert from "../components/Alert";


interface ReportBugProps {
  isOpen: boolean;
  onClose: () => void;
  currentTheme: any;
}

const ReportBug: React.FC<ReportBugProps> = ({ isOpen, onClose, currentTheme }) => {
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  const [alertConfig, setAlertConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'error' as 'error' | 'success' | 'info'
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !description) return;

    setStatus('sending');

    try {
      await invoke('send_bug_report', { 
        userEmail: email, 
        description: description 
      });

      setStatus('success');
      
      setTimeout(() => {
        onClose();
        setStatus('idle');
        setEmail('');
        setDescription('');
      }, 2500);

    } catch (error) {
      console.error("Bug Report Error:", error);
      setStatus('idle');
      
      setAlertConfig({
        isOpen: true,
        title: "Submission Failed",
        message: String(error) || "Could not send report.",
        type: 'error'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all duration-500 ${currentTheme.panel} ${currentTheme.border}`}>
        
        {/* Header */}
        <div className={`${currentTheme.isDark ? 'bg-white/5' : 'bg-black/5'} flex items-center justify-between px-6 py-4 border-b border-white/5 `}>
          <div className="flex items-center gap-2">
            <AlertCircle size={18} className="text-red-400" />
            <h3 className="font-bold tracking-tight">Report a Bug</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-500 hover:text-current transition-colors p-1 hover:bg-white/10 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {status === 'success' ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-6 animate-in zoom-in-95 duration-500">
                {/* วงกลมไอคอนพร้อมแสง Glow */}
                <div className={`relative flex items-center justify-center w-20 h-20 rounded-full border-2 transition-colors duration-500 ${
                currentTheme.isDark 
                    ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.2)]' 
                    : 'bg-green-50 border-green-500/30'
                }`}>
                <div className="absolute inset-0 rounded-full animate-ping bg-green-500/20 opacity-20" />
                <svg 
                    className={`w-10 h-10 ${currentTheme.isDark ? 'text-green-400' : 'text-green-600'}`}
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor" 
                    strokeWidth={3}
                >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                </div>

                <div className="text-center space-y-1">
                <h3 className={`text-xl font-black tracking-tight ${
                    currentTheme.isDark ? 'text-white' : 'text-zinc-900'
                }`}>
                    Report Sent Successfully!
                </h3>
                <p className="text-sm font-medium opacity-60">
                    Thanks for the feedback! 🚀
                </p>
                </div>

                {/* แถบโหลดเล็กๆ ด้านล่าง บอกว่าจะปิดในอีกไม่ช้า */}
                <div className={`w-32 h-1 rounded-full overflow-hidden ${
                currentTheme.isDark ? 'bg-white/10' : 'bg-black/5'
                }`}>
                <div className="h-full bg-green-500 animate-[progress_2s_ease-in-out]" style={{ width: '100%' }} />
                </div>
                <Alert 
                  isOpen={alertConfig.isOpen}
                  title={alertConfig.title}
                  message={alertConfig.message}
                  type={alertConfig.type}
                  activeTheme={currentTheme}
                  onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
                />
                
                <style dangerouslySetInnerHTML={{ __html: `
                @keyframes progress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                `}} />
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 ml-1">
                  Your Contact Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className={`${currentTheme.isDark ? 'bg-black/20' : 'bg-white/50'} w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all ${currentTheme.border} text-sm`}
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 ml-1">
                  Bug Description
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell me what went wrong..."
                  className={`${currentTheme.isDark ? 'bg-black/20' : 'bg-white/50'} w-full px-4 py-2.5 rounded-xl border focus:outline-none focus:ring-2 focus:ring-red-500/30 transition-all resize-none ${currentTheme.border} text-sm`}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'sending'}
                className="w-full py-3.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20"
              >
                {status === 'sending' ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Send Bug Report</span>
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
      <Alert 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        activeTheme={currentTheme}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />

      <style dangerouslySetInnerHTML={{ __html: `@keyframes progress { 0% { width: 0%; } 100% { width: 100%; } }` }} />
    </div>
  );
};

export default ReportBug;