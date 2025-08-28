import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Music, MessageCircle, Upload, Users, X } from "lucide-react";
import { isFeatureEnabled } from "@/lib/featureFlags";

interface DynamicIslandState {
  type: 'idle' | 'music' | 'notification' | 'upload' | 'audioRoom';
  data?: any;
}

interface DynamicIslandProps {
  className?: string;
}

export default function DynamicIsland({ className = "" }: DynamicIslandProps) {
  const [state, setState] = useState<DynamicIslandState>({ type: 'idle' });
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if feature is disabled
  if (!isFeatureEnabled('dynamicIsland')) {
    return null;
  }

  const handleTap = () => {
    if (state.type !== 'idle') {
      setIsExpanded(!isExpanded);
    }
  };

  const handleDismiss = () => {
    setState({ type: 'idle' });
    setIsExpanded(false);
  };

  const getIcon = () => {
    switch (state.type) {
      case 'music':
        return <Music className="h-4 w-4" />;
      case 'notification':
        return <MessageCircle className="h-4 w-4" />;
      case 'upload':
        return <Upload className="h-4 w-4" />;
      case 'audioRoom':
        return <Users className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    switch (state.type) {
      case 'music':
        return (
          <div className="flex items-center gap-3">
            {state.data?.albumArt && (
              <img 
                src={state.data.albumArt} 
                alt="Album art" 
                className="h-8 w-8 rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{state.data?.title || 'Unknown Track'}</p>
              <p className="text-xs text-muted-foreground truncate">{state.data?.artist || 'Unknown Artist'}</p>
            </div>
            {isExpanded && (
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-1 overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    style={{ width: `${state.data?.progress || 0}%` }}
                    animate={{ width: `${state.data?.progress || 0}%` }}
                  />
                </div>
                {/* Equalizer animation */}
                <div className="flex items-center gap-px">
                  {[...Array(4)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-0.5 bg-primary rounded-full"
                      animate={{
                        height: [2, 8, 4, 10, 3],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        delay: i * 0.1,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'notification':
        return (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium">{state.data?.title || 'New Message'}</p>
              <p className="text-xs text-muted-foreground truncate">{state.data?.message || ''}</p>
            </div>
          </div>
        );

      case 'upload':
        return (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium">Uploading...</p>
              <div className="mt-1 bg-muted rounded-full h-1 overflow-hidden">
                <motion.div 
                  className="h-full bg-primary"
                  style={{ width: `${state.data?.progress || 0}%` }}
                  animate={{ width: `${state.data?.progress || 0}%` }}
                />
              </div>
            </div>
          </div>
        );

      case 'audioRoom':
        return (
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium">{state.data?.roomName || 'Audio Room'}</p>
              <p className="text-xs text-muted-foreground">{state.data?.participants || 0} participants</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: -20 }}
          animate={{ 
            scale: 1, 
            opacity: 1, 
            y: 0,
            width: isExpanded ? 320 : state.type === 'idle' ? 120 : 240,
            height: isExpanded ? 'auto' : 32,
          }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          transition={{ 
            type: "spring", 
            stiffness: 500, 
            damping: 30,
            duration: 0.2 
          }}
          className="bg-background/80 backdrop-blur-lg border border-border/50 rounded-full px-4 py-2 cursor-pointer select-none"
          onClick={handleTap}
          style={{
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          }}
        >
          {state.type === 'idle' ? (
            <div className="flex items-center justify-center h-4">
              <div className="w-12 h-1 bg-muted rounded-full" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {getIcon()}
              <div className="flex-1 min-w-0">
                {renderContent()}
              </div>
              {isExpanded && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                  }}
                  className="p-1 hover:bg-muted rounded-full transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// Hook to control Dynamic Island state
export const useDynamicIsland = () => {
  const [state, setState] = useState<DynamicIslandState>({ type: 'idle' });

  const showMusic = (data: { title: string; artist: string; albumArt?: string; progress?: number }) => {
    setState({ type: 'music', data });
  };

  const showNotification = (data: { title: string; message: string }) => {
    setState({ type: 'notification', data });
    // Auto dismiss after 3 seconds
    setTimeout(() => setState({ type: 'idle' }), 3000);
  };

  const showUpload = (progress: number) => {
    setState({ type: 'upload', data: { progress } });
    if (progress >= 100) {
      setTimeout(() => setState({ type: 'idle' }), 1000);
    }
  };

  const showAudioRoom = (data: { roomName: string; participants: number }) => {
    setState({ type: 'audioRoom', data });
  };

  const hide = () => {
    setState({ type: 'idle' });
  };

  return {
    state,
    showMusic,
    showNotification,
    showUpload,
    showAudioRoom,
    hide,
  };
};