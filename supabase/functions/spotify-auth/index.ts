import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SPOTIFY_CLIENT_ID = Deno.env.get('VITE_SPOTIFY_CLIENT_ID');
const SPOTIFY_CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (action === 'token') {
      return await handleTokenExchange(req);
    } else if (action === 'refresh') {
      return await handleTokenRefresh(req);
    } else if (action === 'profile') {
      return await handleGetProfile(req);
    } else if (action === 'playlists') {
      return await handleGetPlaylists(req);
    } else if (action === 'playlist') {
      return await handleGetPlaylist(req);
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Spotify Auth Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleTokenExchange(req: Request) {
  const { code, redirect_uri } = await req.json();

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
    }),
  });

  const tokenData = await response.json();

  if (!response.ok) {
    throw new Error(tokenData.error_description || 'Token exchange failed');
  }

  // Get user profile from Spotify
  const profileResponse = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`
    }
  });

  const profile = await profileResponse.json();

  // Update user profile in Supabase
  const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);
  
  const authHeader = req.headers.get('authorization');
  if (authHeader) {
    supabase.auth.setSession({ access_token: authHeader.replace('Bearer ', ''), refresh_token: '' } as any);
  }

  await supabase.from('user_profiles').upsert({
    id: (await supabase.auth.getUser()).data.user?.id,
    spotify_id: profile.id,
    spotify_display_name: profile.display_name,
    updated_at: new Date().toISOString()
  });

  return new Response(JSON.stringify({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_in: tokenData.expires_in,
    profile
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleTokenRefresh(req: Request) {
  const { refresh_token } = await req.json();

  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token,
    }),
  });

  const tokenData = await response.json();

  if (!response.ok) {
    throw new Error(tokenData.error_description || 'Token refresh failed');
  }

  return new Response(JSON.stringify(tokenData), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleGetProfile(req: Request) {
  const authHeader = req.headers.get('authorization');
  const spotifyToken = req.headers.get('x-spotify-token');

  if (!spotifyToken) {
    throw new Error('Spotify token required');
  }

  const response = await fetch('https://api.spotify.com/v1/me', {
    headers: {
      'Authorization': `Bearer ${spotifyToken}`
    }
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleGetPlaylists(req: Request) {
  const spotifyToken = req.headers.get('x-spotify-token');
  const url = new URL(req.url);
  const limit = url.searchParams.get('limit') || '20';
  const offset = url.searchParams.get('offset') || '0';

  if (!spotifyToken) {
    throw new Error('Spotify token required');
  }

  const response = await fetch(`https://api.spotify.com/v1/me/playlists?limit=${limit}&offset=${offset}`, {
    headers: {
      'Authorization': `Bearer ${spotifyToken}`
    }
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handleGetPlaylist(req: Request) {
  const spotifyToken = req.headers.get('x-spotify-token');
  const url = new URL(req.url);
  const playlistId = url.searchParams.get('id');

  if (!spotifyToken || !playlistId) {
    throw new Error('Spotify token and playlist ID required');
  }

  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}`, {
    headers: {
      'Authorization': `Bearer ${spotifyToken}`
    }
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}