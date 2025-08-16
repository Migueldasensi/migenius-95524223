import { supabase } from "@/integrations/supabase/client";

interface SpotifyTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface SpotifyProfile {
  id: string;
  display_name: string;
  email?: string;
  images?: Array<{ url: string; height: number; width: number }>;
  followers?: { total: number };
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string;
  images: Array<{ url: string; height: number; width: number }>;
  tracks: { total: number };
  owner: { display_name: string };
}

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

class SpotifyService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiry: number | null = null;

  private get clientId() {
    return import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  }

  private get redirectUri() {
    return `${window.location.origin}/spotify/callback`;
  }

  // Generate PKCE challenge
  private generateCodeChallenge(codeVerifier: string): Promise<string> {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(codeVerifier))
      .then(hash => btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''));
  }

  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  async initiateAuth(): Promise<void> {
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    
    // Store code verifier in session storage
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);

    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: this.redirectUri,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
      scope: 'user-read-private user-read-email playlist-read-private playlist-read-collaborative user-library-read',
    });

    window.location.href = `https://accounts.spotify.com/authorize?${params}`;
  }

  async handleCallback(code: string): Promise<SpotifyTokens & { profile: SpotifyProfile }> {
    const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) {
      throw new Error('No code verifier found');
    }

    sessionStorage.removeItem('spotify_code_verifier');

    const { data, error } = await supabase.functions.invoke('spotify-auth/token', {
      body: {
        code,
        redirect_uri: this.redirectUri,
        code_verifier: codeVerifier,
      },
    });

    if (error) throw error;

    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.tokenExpiry = Date.now() + (data.expires_in * 1000);

    // Store tokens securely
    localStorage.setItem('spotify_tokens', JSON.stringify({
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
      expires_at: this.tokenExpiry,
    }));

    return data;
  }

  private async ensureValidToken(): Promise<void> {
    // Load tokens from storage if not in memory
    if (!this.accessToken) {
      const stored = localStorage.getItem('spotify_tokens');
      if (stored) {
        const tokens = JSON.parse(stored);
        this.accessToken = tokens.access_token;
        this.refreshToken = tokens.refresh_token;
        this.tokenExpiry = tokens.expires_at;
      }
    }

    // Check if token needs refresh
    if (!this.accessToken || (this.tokenExpiry && Date.now() >= this.tokenExpiry)) {
      if (!this.refreshToken) {
        throw new Error('No refresh token available');
      }

      const { data, error } = await supabase.functions.invoke('spotify-auth/refresh', {
        body: { refresh_token: this.refreshToken },
      });

      if (error) throw error;

      this.accessToken = data.access_token;
      if (data.refresh_token) {
        this.refreshToken = data.refresh_token;
      }
      this.tokenExpiry = Date.now() + (data.expires_in * 1000);

      // Update stored tokens
      localStorage.setItem('spotify_tokens', JSON.stringify({
        access_token: this.accessToken,
        refresh_token: this.refreshToken,
        expires_at: this.tokenExpiry,
      }));
    }
  }

  async getProfile(): Promise<SpotifyProfile> {
    await this.ensureValidToken();

    const { data, error } = await supabase.functions.invoke('spotify-auth/profile', {
      headers: {
        'x-spotify-token': this.accessToken!,
      },
    });

    if (error) throw error;
    return data;
  }

  async getPlaylists(limit = 20, offset = 0): Promise<{ items: SpotifyPlaylist[]; total: number }> {
    await this.ensureValidToken();

    const { data, error } = await supabase.functions.invoke('spotify-auth/playlists', {
      headers: {
        'x-spotify-token': this.accessToken!,
      },
      body: { limit, offset },
    });

    if (error) throw error;
    return data;
  }

  async getPlaylist(playlistId: string): Promise<SpotifyPlaylist & { tracks: { items: Array<{ track: SpotifyTrack }> } }> {
    await this.ensureValidToken();

    const { data, error } = await supabase.functions.invoke('spotify-auth/playlist', {
      headers: {
        'x-spotify-token': this.accessToken!,
      },
      body: { id: playlistId },
    });

    if (error) throw error;
    return data;
  }

  isConnected(): boolean {
    const stored = localStorage.getItem('spotify_tokens');
    return !!stored && !!this.accessToken;
  }

  disconnect(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('spotify_tokens');
  }
}

export const spotifyService = new SpotifyService();