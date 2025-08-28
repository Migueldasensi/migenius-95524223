import { useState, useEffect } from "react";

interface StudyTimerProps {
  seconds: number;
  className?: string;
}

export function StudyTimer({ seconds, className = "" }: StudyTimerProps) {
  const formatTimeFromSeconds = (totalSeconds: number) => {
    const days = Math.floor(totalSeconds / (24 * 60 * 60));
    const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
    const secs = totalSeconds % 60;
    
    return { days, hours, minutes, seconds: secs };
  };

  const time = formatTimeFromSeconds(seconds);

  return (
    <div className={`flex items-center gap-2 font-mono text-2xl font-bold ${className}`}>
      {time.days > 0 && (
        <>
          <div className="flex flex-col items-center">
            <span className="text-3xl">{time.days.toString().padStart(2, '0')}</span>
            <span className="text-xs text-muted-foreground">dias</span>
          </div>
          <span className="text-muted-foreground">:</span>
        </>
      )}
      
      <div className="flex flex-col items-center">
        <span className="text-3xl">{time.hours.toString().padStart(2, '0')}</span>
        <span className="text-xs text-muted-foreground">horas</span>
      </div>
      <span className="text-muted-foreground">:</span>
      
      <div className="flex flex-col items-center">
        <span className="text-3xl">{time.minutes.toString().padStart(2, '0')}</span>
        <span className="text-xs text-muted-foreground">min</span>
      </div>
      <span className="text-muted-foreground">:</span>
      
      <div className="flex flex-col items-center">
        <span className="text-3xl">{time.seconds.toString().padStart(2, '0')}</span>
        <span className="text-xs text-muted-foreground">seg</span>
      </div>
    </div>
  );
}