<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class MockupController extends Controller
{
    // Escolhido pelo `input_fidelity`: é o que segura a estampa impressa sem
    // reinterpretar texto e logo, que é o risco desse fluxo.
    private const MODEL = 'openai/gpt-image-1.5';

    /**
     * Recebe o render 3D do editor (data URI) e devolve a versão fotorrealista
     * gerada pelo Replicate, também como data URI — assim o front não precisa
     * buscar a imagem no replicate.delivery (CORS) e o backend não precisa de
     * URL pública para hospedar o input.
     */
    public function render(Request $request)
    {
        $data = $request->validate([
            // O editor captura em 2048px; o data URI cabe no post_max_size=20M
            // que a imagem do backend configura.
            'image' => ['required', 'string', 'starts_with:data:image/', 'max:15000000'],
            'prompt' => ['required', 'string', 'max:600'],
            // Muda o custo em ~30x entre low e high: rascunho barato, final caro.
            'quality' => ['nullable', 'in:low,medium,high'],
        ]);

        $token = config('services.replicate.token');
        abort_if(blank($token), 500, 'REPLICATE_API_TOKEN não configurado.');

        // ponytail: `Prefer: wait` em vez de criar a prediction e pollar.
        // O Kontext leva ~10s; se começar a estourar, vira create + GET /{id}.
        $response = Http::withToken($token)
            ->withHeaders(['Prefer' => 'wait'])
            ->timeout(120)
            ->post('https://api.replicate.com/v1/models/'.self::MODEL.'/predictions', [
                'input' => [
                    'prompt' => $data['prompt'],
                    'input_images' => [$data['image']],
                    'input_fidelity' => 'high',
                    'quality' => $data['quality'] ?? 'medium',
                    // O editor sempre captura o render em quadrado.
                    'aspect_ratio' => '1:1',
                    'output_format' => 'png',
                ],
            ]);

        if ($response->failed()) {
            return response()->json([
                'message' => $response->json('detail') ?? 'Falha ao chamar o Replicate.',
            ], 502);
        }

        $prediction = $response->json();

        if (($prediction['status'] ?? null) !== 'succeeded') {
            return response()->json([
                'message' => $prediction['error'] ?? 'A geração não terminou a tempo (status: '.($prediction['status'] ?? '?').').',
            ], 502);
        }

        // `output` pode vir como string ou array de URLs, depende do modelo.
        $url = data_get($prediction, 'output');
        $url = is_array($url) ? ($url[0] ?? null) : $url;

        if (blank($url)) {
            return response()->json(['message' => 'O Replicate não retornou imagem.'], 502);
        }

        $image = Http::timeout(60)->get($url);

        if ($image->failed()) {
            return response()->json(['message' => 'Não foi possível baixar a imagem gerada.'], 502);
        }

        return response()->json([
            'image' => 'data:image/png;base64,'.base64_encode($image->body()),
        ]);
    }
}
