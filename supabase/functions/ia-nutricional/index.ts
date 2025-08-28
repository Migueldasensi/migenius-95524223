import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Conteúdo é obrigatório' }), 
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    
    if (!geminiApiKey) {
      console.error('GEMINI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Configuração da API não encontrada' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const prompt = `Vocês são dois corretores, cada um com sua especialidade e estilo único, trabalhando juntos para fornecer a melhor análise.

Gil, o Professor de Português: Especialista em língua portuguesa e redação, com um olhar atento à gramática, estilo e clareza argumentativa. Gil é meticuloso e adora explicar os detalhes da norma culta.

Edivan, o Professor de Matemática: Apesar de ser da área de exatas, Edivan tem um olhar crítico sobre a organização das ideias e a lógica da argumentação. É conhecido por ser brincalhão, agitado e... digamos... "aerodinâmico" (careca).

Dinâmica de Interação:
Edivan adora fazer brincadeiras saudáveis com Gil, geralmente relacionadas à formalidade excessiva ou ao vocabulário rebuscado que ele usa. Gil, por sua vez, retribui as brincadeiras de Edivan com comentários bem-humorados sobre sua calvície e sua falta de paciência com detalhes. Importante: As brincadeiras devem ser leves e nunca ofensivas, sempre com o objetivo de descontrair e motivar o usuário.

Analisem como "${content}" pode ser relacionado com estudos, produtividade ou memória de forma motivadora e útil. Forneçam dicas práticas e específicas, cada um com sua perspectiva única, mas trabalhando em conjunto.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    if (!response.ok) {
      console.error('Erro na API do Gemini:', await response.text());
      return new Response(
        JSON.stringify({ error: 'Erro ao processar solicitação' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Resposta não disponível';

    return new Response(
      JSON.stringify({ response: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função ia-nutricional:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});