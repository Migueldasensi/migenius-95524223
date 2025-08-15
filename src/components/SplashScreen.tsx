import React, { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timeouts = [
      setTimeout(() => setStep(1), 300),   // Show icon
      setTimeout(() => setStep(2), 800),   // Show title
      setTimeout(() => setStep(3), 1300),  // Show subtitle
      setTimeout(() => onComplete(), 2500) // Complete splash
    ];

    return () => timeouts.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-migenius-gradient-from to-migenius-gradient-to flex items-center justify-center z-50">
      <div className="text-center">
        {/* App Icon */}
        <div 
          className={`w-24 h-24 mx-auto mb-8 bg-white/20 backdrop-blur-sm rounded-3xl flex items-center justify-center transition-all duration-700 ${
            step >= 1 ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-50 translate-y-4'
          }`}
        >
          <GraduationCap className="w-12 h-12 text-white" />
        </div>

        {/* App Title */}
        <h1 
          className={`text-5xl font-bold text-white mb-4 transition-all duration-700 delay-300 ${
            step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Migenius
        </h1>

        {/* Subtitle */}
        <p 
          className={`text-white/90 text-xl transition-all duration-700 delay-500 ${
            step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Miguel da sensi
        </p>

        {/* Loading animation */}
        <div 
          className={`mt-8 transition-all duration-500 delay-700 ${
            step >= 3 ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex justify-center space-x-1">
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;