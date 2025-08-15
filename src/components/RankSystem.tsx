import { Badge } from "@/components/ui/badge";
import { Crown, Medal, Shield, Star, Trophy, Zap } from "lucide-react";

interface RankSystemProps {
  xp: number;
  className?: string;
}

interface Rank {
  name: string;
  minXp: number;
  maxXp: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  level: number;
}

const ranks: Rank[] = [
  // Bronze (0-2999)
  { name: "Bronze I", minXp: 0, maxXp: 999, color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-300", icon: Shield, level: 1 },
  { name: "Bronze II", minXp: 1000, maxXp: 1999, color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-300", icon: Shield, level: 2 },
  { name: "Bronze III", minXp: 2000, maxXp: 2999, color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-300", icon: Shield, level: 3 },
  
  // Prata (3000-7999)
  { name: "Prata I", minXp: 3000, maxXp: 4249, color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-300", icon: Medal, level: 4 },
  { name: "Prata II", minXp: 4250, maxXp: 5499, color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-300", icon: Medal, level: 5 },
  { name: "Prata III", minXp: 5500, maxXp: 6749, color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-300", icon: Medal, level: 6 },
  { name: "Prata IV", minXp: 6750, maxXp: 7999, color: "text-gray-600", bgColor: "bg-gray-50", borderColor: "border-gray-300", icon: Medal, level: 7 },
  
  // Ouro (8000-15999)
  { name: "Ouro I", minXp: 8000, maxXp: 9999, color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-300", icon: Star, level: 8 },
  { name: "Ouro II", minXp: 10000, maxXp: 11999, color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-300", icon: Star, level: 9 },
  { name: "Ouro III", minXp: 12000, maxXp: 13999, color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-300", icon: Star, level: 10 },
  { name: "Ouro IV", minXp: 14000, maxXp: 15999, color: "text-yellow-600", bgColor: "bg-yellow-50", borderColor: "border-yellow-300", icon: Star, level: 11 },
  
  // Platina (16000-31999)
  { name: "Platina I", minXp: 16000, maxXp: 19999, color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-300", icon: Trophy, level: 12 },
  { name: "Platina II", minXp: 20000, maxXp: 23999, color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-300", icon: Trophy, level: 13 },
  { name: "Platina III", minXp: 24000, maxXp: 27999, color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-300", icon: Trophy, level: 14 },
  { name: "Platina IV", minXp: 28000, maxXp: 31999, color: "text-cyan-600", bgColor: "bg-cyan-50", borderColor: "border-cyan-300", icon: Trophy, level: 15 },
  
  // Diamante (32000-63999)
  { name: "Diamante I", minXp: 32000, maxXp: 39999, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-300", icon: Zap, level: 16 },
  { name: "Diamante II", minXp: 40000, maxXp: 47999, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-300", icon: Zap, level: 17 },
  { name: "Diamante III", minXp: 48000, maxXp: 55999, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-300", icon: Zap, level: 18 },
  { name: "Diamante IV", minXp: 56000, maxXp: 63999, color: "text-blue-600", bgColor: "bg-blue-50", borderColor: "border-blue-300", icon: Zap, level: 19 },
  
  // Mestre (64000+)
  { name: "Mestre I", minXp: 64000, maxXp: Infinity, color: "text-purple-600", bgColor: "bg-purple-50", borderColor: "border-purple-300", icon: Crown, level: 20 },
];

export function getRankFromXP(xp: number): Rank {
  return ranks.find(rank => xp >= rank.minXp && xp <= rank.maxXp) || ranks[0];
}

export function getProgressToNextRank(xp: number): { current: Rank; next: Rank | null; progress: number; xpNeeded: number } {
  const currentRank = getRankFromXP(xp);
  const nextRankIndex = ranks.findIndex(r => r.level === currentRank.level) + 1;
  const nextRank = nextRankIndex < ranks.length ? ranks[nextRankIndex] : null;
  
  if (!nextRank) {
    return { current: currentRank, next: null, progress: 100, xpNeeded: 0 };
  }
  
  const xpInCurrentRank = xp - currentRank.minXp;
  const xpNeededForRank = nextRank.minXp - currentRank.minXp;
  const progress = Math.min(100, (xpInCurrentRank / xpNeededForRank) * 100);
  const xpNeeded = nextRank.minXp - xp;
  
  return { current: currentRank, next: nextRank, progress, xpNeeded };
}

export function calculateStreak(activities: Array<{ created_at: string }>): number {
  if (!activities.length) return 0;
  
  const today = new Date();
  const sortedActivities = activities
    .map(a => new Date(a.created_at))
    .sort((a, b) => b.getTime() - a.getTime());
  
  let streak = 0;
  let currentDate = new Date(today);
  currentDate.setHours(0, 0, 0, 0);
  
  for (const activityDate of sortedActivities) {
    const actDate = new Date(activityDate);
    actDate.setHours(0, 0, 0, 0);
    
    if (actDate.getTime() === currentDate.getTime()) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else if (actDate.getTime() < currentDate.getTime()) {
      break;
    }
  }
  
  return streak;
}

export default function RankSystem({ xp, className = "" }: RankSystemProps) {
  const rank = getRankFromXP(xp);
  const { current, next, progress, xpNeeded } = getProgressToNextRank(xp);
  const Icon = rank.icon;
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`relative p-2 rounded-full border-2 ${rank.borderColor} ${rank.bgColor}`}>
        <Icon className={`h-5 w-5 ${rank.color}`} />
      </div>
      <div className="flex flex-col">
        <Badge variant="secondary" className={`${rank.color} ${rank.bgColor} border ${rank.borderColor} font-semibold`}>
          {rank.name}
        </Badge>
        {next && (
          <div className="text-xs text-muted-foreground mt-1">
            {xpNeeded} XP para {next.name}
          </div>
        )}
      </div>
    </div>
  );
}