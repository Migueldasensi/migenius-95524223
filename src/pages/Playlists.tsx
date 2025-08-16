import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Music, Play, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { spotifyService } from "@/services/spotifyService";
import { useToast } from "@/hooks/use-toast";

interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  images: Array<{ url: string; height: number; width: number }>;
  tracks: { total: number };
  owner: { display_name: string };
}

export default function Playlists() {
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkSpotifyConnection();
  }, []);

  const checkSpotifyConnection = () => {
    setIsConnected(spotifyService.isConnected());
    if (spotifyService.isConnected()) {
      loadPlaylists();
    } else {
      setLoading(false);
    }
  };

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const data = await spotifyService.getPlaylists(50);
      setPlaylists(data.items);
    } catch (error) {
      console.error('Error loading playlists:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as playlists",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const connectSpotify = async () => {
    try {
      await spotifyService.initiateAuth();
    } catch (error) {
      console.error('Error connecting to Spotify:', error);
      toast({
        title: "Erro",
        description: "Não foi possível conectar ao Spotify",
        variant: "destructive",
      });
    }
  };

  const getPlaylistImage = (playlist: SpotifyPlaylist) => {
    return playlist.images?.[0]?.url || '/placeholder.svg';
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-14 border-b flex items-center px-4 gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Playlists</h1>
        </header>

        <main className="p-6">
          <div className="max-w-md mx-auto text-center space-y-6">
            <div className="p-8">
              <Music className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">Spotify não configurado</h2>
              <p className="text-muted-foreground mb-6">
                Para usar o Spotify, é necessário configurar as credenciais da API do Spotify.
              </p>
              <div className="text-left bg-muted p-4 rounded-lg text-sm">
                <p className="font-medium mb-2">Para configurar:</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Acesse o <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Spotify Developer Dashboard</a></li>
                  <li>Crie um novo app</li>
                  <li>Configure as URLs de redirecionamento</li>
                  <li>Adicione as credenciais ao projeto</li>
                </ol>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b flex items-center px-4 gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-lg font-semibold">Suas Playlists</h1>
        <div className="ml-auto">
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Music className="h-3 w-3 mr-1" />
            Conectado
          </Badge>
        </div>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <Skeleton className="aspect-square w-full rounded-lg mb-3" />
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {playlists.map((playlist) => (
              <Card key={playlist.id} className="group hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-muted">
                    <img
                      src={getPlaylistImage(playlist)}
                      alt={playlist.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button size="sm" variant="secondary" asChild>
                        <Link to={`/playlist/${playlist.id}`}>
                          <Play className="h-4 w-4 mr-2" />
                          Ver faixas
                        </Link>
                      </Button>
                    </div>
                  </div>
                  
                  <h3 className="font-medium text-sm truncate mb-1">
                    {playlist.name}
                  </h3>
                  
                  <p className="text-xs text-muted-foreground truncate mb-2">
                    Por {playlist.owner.display_name}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{playlist.tracks.total} faixas</span>
                    <Button variant="ghost" size="sm" className="p-1 h-auto" asChild>
                      <a
                        href={`https://open.spotify.com/playlist/${playlist.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && playlists.length === 0 && (
          <div className="text-center py-12">
            <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma playlist encontrada</h3>
            <p className="text-muted-foreground">
              Crie algumas playlists no Spotify para vê-las aqui.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}