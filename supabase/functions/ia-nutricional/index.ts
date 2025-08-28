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

    const prompt = `Você é um professor especialista em correção de redações do ENEM. Analise a redação a seguir e forneça uma correção completa.

**IMPORTANTE**: Comece sua resposta OBRIGATORIAMENTE com a nota numérica em uma das seguintes formas:
- "NOTA: [número de 0 a 1000]"
- "Nota: [número de 0 a 1000]"
- "SCORE: [número de 0 a 1000]"

**Critérios de avaliação ENEM (0-1000 pontos):**
1. **Competência 1**: Domínio da modalidade escrita formal da língua portuguesa (0-200)
2. **Competência 2**: Compreender a proposta de redação e aplicar conceitos das várias áreas de conhecimento (0-200)
3. **Competência 3**: Selecionar, relacionar, organizar e interpretar informações, fatos, opiniões e argumentos (0-200)
4. **Competência 4**: Demonstrar conhecimento dos mecanismos linguísticos necessários para a construção da argumentação (0-200)
5. **Competência 5**: Elaborar proposta de intervenção para o problema abordado, respeitando os direitos humanos (0-200)

**Redação para análise:**
${content}

**Formato da resposta:**
NOTA: [número de 0 a 1000]

**Análise detalhada:**
1. **Pontos Fortes**
2. **Pontos a Melhorar**
3. **Correções Específicas**
4. **Sugestões de Melhoria**
5. **Comentários Motivacionais**

Forneça uma análise detalhada, construtiva e sempre com tom encorajador.`;

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