import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Play, Pause, Clock, ExternalLink, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { spotifyService } from "@/services/spotifyService";
import { useDynamicIsland } from "@/components/DynamicIsland";
import { useToast } from "@/hooks/use-toast";

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string; id: string }>;
  album: {
    name: string;
    images: Array<{ url: string; height: number; width: number }>;
  };
  preview_url?: string;
  duration_ms: number;
}

interface PlaylistWithTracks {
  id: string;
  name: string;
  description?: string;
  images: Array<{ url: string; height: number; width: number }>;
  tracks: {
    items: Array<{ track: SpotifyTrack }>;
    total: number;
  };
  owner: { display_name: string };
}

export default function PlaylistDetail() {
  const { id } = useParams<{ id: string }>();
  const [playlist, setPlaylist] = useState<PlaylistWithTracks | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { showMusic, hide } = useDynamicIsland();
  const { toast } = useToast();

  useEffect(() => {
    if (id) {
      loadPlaylist();
    }
  }, [id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      if (currentTrack && isPlaying) {
        const progress = (audio.currentTime / audio.duration) * 100;
        showMusic({
          title: currentTrack.name,
          artist: currentTrack.artists.map(a => a.name).join(', '),
          albumArt: currentTrack.album.images[0]?.url,
          progress,
        });
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTrack(null);
      hide();
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, isPlaying, showMusic, hide]);

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      const data = await spotifyService.getPlaylist(id!);
      setPlaylist(data);
    } catch (error) {
      console.error('Error loading playlist:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a playlist",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const playTrack = async (track: SpotifyTrack) => {
    if (!track.preview_url) {
      toast({
        title: "Preview não disponível",
        description: "Esta música não tem preview disponível",
        variant: "destructive",
      });
      return;
    }

    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack?.id === track.id && isPlaying) {
      // Pause current track
      audio.pause();
      setIsPlaying(false);
      hide();
    } else {
      // Play new track
      if (currentTrack?.id !== track.id) {
        audio.src = track.preview_url;
        setCurrentTrack(track);
      }
      
      try {
        await audio.play();
        setIsPlaying(true);
        showMusic({
          title: track.name,
          artist: track.artists.map(a => a.name).join(', '),
          albumArt: track.album.images[0]?.url,
          progress: 0,
        });
      } catch (error) {
        console.error('Error playing track:', error);
        toast({
          title: "Erro",
          description: "Não foi possível reproduzir a música",
          variant: "destructive",
        });
      }
    }
  };

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const sharePlaylist = async () => {
    if (playlist) {
      try {
        await navigator.share({
          title: playlist.name,
          text: `Confira esta playlist: ${playlist.name}`,
          url: `https://open.spotify.com/playlist/${playlist.id}`,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(`https://open.spotify.com/playlist/${playlist.id}`);
        toast({
          title: "Link copiado",
          description: "Link da playlist copiado para a área de transferência",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-14 border-b flex items-center px-4 gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/playlists">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Skeleton className="h-5 w-32" />
        </header>

        <main className="p-6">
          <div className="mb-8">
            <div className="flex gap-6 mb-6">
              <Skeleton className="w-48 h-48 rounded-lg" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-3">
                <Skeleton className="w-12 h-12 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Playlist não encontrada</h2>
          <Button asChild>
            <Link to="/playlists">Voltar às playlists</Link>
          </Button>
        </div>
      </div>
    );
  }

  const playlistImage = playlist.images?.[0]?.url || '/placeholder.svg';

  return (
    <div className="min-h-screen bg-background">
      <audio ref={audioRef} />
      
      <header className="h-14 border-b flex items-center px-4 gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/playlists">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold truncate">{playlist.name}</h1>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={sharePlaylist}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <a
              href={`https://open.spotify.com/playlist/${playlist.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </header>

      <main className="p-6">
        {/* Playlist Header */}
        <div className="mb-8">
          <div className="flex gap-6 mb-6">
            <img
              src={playlistImage}
              alt={playlist.name}
              className="w-48 h-48 rounded-lg object-cover bg-muted"
            />
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2">{playlist.name}</h1>
              {playlist.description && (
                <p className="text-muted-foreground mb-3 text-sm">
                  {playlist.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Por {playlist.owner.display_name}</span>
                <span>•</span>
                <span>{playlist.tracks.total} faixas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Track List */}
        <div className="space-y-1">
          <div className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-2 text-xs font-medium text-muted-foreground border-b">
            <span>#</span>
            <span>TÍTULO</span>
            <Clock className="h-4 w-4" />
          </div>

          {playlist.tracks.items.map((item, index) => {
            const track = item.track;
            const isCurrentTrack = currentTrack?.id === track.id;
            const isTrackPlaying = isCurrentTrack && isPlaying;

            return (
              <div
                key={track.id}
                className="grid grid-cols-[auto_1fr_auto] gap-4 px-4 py-3 rounded-lg hover:bg-muted/50 group cursor-pointer"
                onClick={() => playTrack(track)}
              >
                <div className="flex items-center justify-center w-8">
                  {isTrackPlaying ? (
                    <Pause className="h-4 w-4" />
                  ) : isCurrentTrack ? (
                    <Play className="h-4 w-4" />
                  ) : (
                    <span className="text-sm text-muted-foreground group-hover:hidden">
                      {index + 1}
                    </span>
                  )}
                  {!isCurrentTrack && (
                    <Play className="h-4 w-4 hidden group-hover:block" />
                  )}
                </div>

                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={track.album.images[0]?.url || '/placeholder.svg'}
                    alt={track.album.name}
                    className="w-10 h-10 rounded object-cover bg-muted"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">
                      {track.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {track.artists.map(a => a.name).join(', ')}
                    </p>
                  </div>
                  {!track.preview_url && (
                    <Badge variant="secondary" className="text-xs">
                      Sem preview
                    </Badge>
                  )}
                </div>

                <div className="flex items-center">
                  <span className="text-sm text-muted-foreground">
                    {formatDuration(track.duration_ms)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {playlist.tracks.items.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Esta playlist está vazia.</p>
          </div>
        )}
      </main>
    </div>
  );
}