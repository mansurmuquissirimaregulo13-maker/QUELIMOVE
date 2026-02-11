import React from 'react';
interface MobileFrameProps {
  children: React.ReactNode;
  className?: string;
}
export function MobileFrame({ children, className = '' }: MobileFrameProps) {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-0 md:p-8 font-['Montserrat',sans-serif]">
      <div
        className={`w-full max-w-[430px] h-[100dvh] md:h-[850px] bg-[#0a0a0a] md:rounded-[3rem] md:border-[8px] md:border-[#1a1a1a] overflow-hidden relative shadow-2xl flex flex-col ${className}`}>

        {/* Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-8 scrollbar-hide bg-[#0a0a0a]">
          {children}
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/20 rounded-full z-50" />
      </div>
    </div>);

}