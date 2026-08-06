<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class ProductController extends Controller
{
    private const MAX_IMAGES = 4;

    /** Colunas que o admin pode ordenar. Fora dessa lista o sort é ignorado. */
    private const SORTABLE = ['id', 'name', 'price', 'cat', 'active'];

    /**
     * Busca, filtro, ordenação e paginação acontecem aqui. Sem per_page a lista
     * sai inteira, do jeito que as telas de destaques e mockups esperam.
     */
    public function index(Request $request)
    {
        // LOWER + LIKE em vez de ILIKE: o app roda em Postgres e os testes em sqlite.
        $term = '%'.mb_strtolower($request->string('q')).'%';
        $sort = in_array($request->input('sort'), self::SORTABLE, true) ? $request->input('sort') : 'id';
        $dir = $request->input('dir') === 'desc' ? 'desc' : 'asc';

        $query = Product::with('images')
            ->when($request->filled('cat'), fn ($q) => $q->where('cat', $request->string('cat')))
            ->when($request->filled('q'), fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', [$term]))
            ->orderBy($sort, $dir)
            ->orderBy('id');

        return $request->filled('per_page')
            ? $query->paginate(min((int) $request->input('per_page'), 100))
            : $query->get();
    }

    /** Categorias em uso, incluindo as de produtos inativos, para o filtro do admin. */
    public function cats()
    {
        return Product::distinct()->orderBy('cat')->pluck('cat');
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request, null);
        $data['slug'] ??= Product::generateSlug();
        $product = Product::create($data);
        $this->applyOrder($request, $product, $this->storeImages($request, $product));
        $this->storeMockup($request, $product);

        return response()->json($product->load('images'), 201);
    }

    public function show(Product $product)
    {
        return $product->load('images');
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->validateData($request, $product->id);
        // Sem slug no payload o produto mantém o código que já tem.
        $product->update(array_filter($data, fn ($v, $k) => $k !== 'slug' || $v !== null, ARRAY_FILTER_USE_BOTH));
        $this->applyOrder($request, $product, $this->storeImages($request, $product));
        $this->storeMockup($request, $product);

        return $product->load('images');
    }

    /** Marca quais produtos aparecem na home e em que ordem. */
    public function featured(Request $request)
    {
        $data = $request->validate([
            'items' => ['required', 'array'],
            'items.*.id' => ['required', 'integer', 'exists:products,id'],
            'items.*.featured' => ['required', 'boolean'],
            'items.*.position' => ['required', 'integer', 'min:0'],
        ]);

        foreach ($data['items'] as $row) {
            Product::where('id', $row['id'])->update([
                'featured' => $row['featured'],
                'position' => $row['position'],
            ]);
        }

        // a tela de destaques trabalha com a lista inteira
        return Product::with('images')->orderBy('id')->get();
    }

    public function destroy(Product $product)
    {
        foreach ($product->images as $image) {
            Storage::disk('public')->delete($image->path);
        }
        if (isset($product->mockup['art'])) {
            Storage::disk('public')->delete($product->mockup['art']);
        }
        $product->delete();

        return response()->noContent();
    }

    public function destroyImage(Product $product, ProductImage $image)
    {
        abort_unless($image->product_id === $product->id, 404);

        Storage::disk('public')->delete($image->path);
        $image->delete();

        $product->images()->get()->values()->each(
            fn ($img, $i) => $img->position === $i ? null : $img->update(['position' => $i])
        );

        return response()->noContent();
    }

    private function validateData(Request $request, ?int $ignoreId): array
    {
        return $request->validate([
            // Ausente: o backend gera o código (Product::generateSlug).
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('products')->ignore($ignoreId)],
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'cat' => ['required', 'string', 'max:255'],
            'active' => ['boolean'],
            'featured' => ['boolean'],
            'position' => ['integer', 'min:0'],
        ]);
    }

    /**
     * Adiciona (nunca substitui) as imagens enviadas em `images[]`, respeitando o limite de 4.
     *
     * @return array<int,int> índice do arquivo em `images[]` => id da imagem criada
     */
    private function storeImages(Request $request, Product $product): array
    {
        if (!$request->hasFile('images')) {
            return [];
        }

        $files = $request->file('images');
        $existing = $product->images()->count();

        abort_if($existing + count($files) > self::MAX_IMAGES, 422, 'Máximo de '.self::MAX_IMAGES.' imagens por produto.');

        // 8 MB: o print do editor sai em 2048px, e PNG de estampa com muito
        // traço passa fácil dos 4 MB de antes.
        $request->validate(['images.*' => ['image', 'max:8192']]);

        $created = [];

        foreach ($files as $i => $file) {
            $created[$i] = ProductImage::create([
                'product_id' => $product->id,
                'path' => $file->store('products', 'public'),
                'position' => $existing + $i,
            ])->id;
        }

        return $created;
    }

    /**
     * Guarda a caneca 3D do produto: a arte estampada (arquivo `art`) e as medidas
     * da cena (`mockup`, JSON). É o que o site remonta no visualizador do cliente.
     */
    private function storeMockup(Request $request, Product $product): void
    {
        if (!$request->has('mockup')) {
            return;
        }

        // `image` recusa AVIF/HEIC, que o navegador desenha numa boa: a lista aqui
        // é o que o <img> do site consegue mostrar. SVG fica de fora de propósito
        // (é servido do nosso domínio e pode carregar script).
        $request->validate([
            'mockup' => ['json'],
            'art' => ['nullable', 'file', 'max:8192', 'mimetypes:image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif'],
        ], [
            'art.mimetypes' => 'A arte precisa ser JPG, PNG, GIF, WEBP, AVIF ou HEIC.',
            'art.max' => 'A arte precisa ter no máximo 8 MB.',
        ]);

        // Esses números viram parâmetros de render no navegador do cliente: valem
        // os mesmos limites dos controles do editor, nem um a mais.
        $settings = validator(json_decode($request->input('mockup'), true) ?? [], [
            'mugColor' => ['required', 'string', 'regex:/^#[0-9a-f]{6}$/i'],
            'handleColor' => ['required', 'string', 'regex:/^#[0-9a-f]{6}$/i'],
            'circumference' => ['required', 'numeric', 'between:10,60'],
            'height' => ['required', 'numeric', 'between:4,30'],
            'artWidth' => ['required', 'numeric', 'between:1,60'],
            'artHeight' => ['required', 'numeric', 'between:1,60'],
            'offsetX' => ['required', 'numeric', 'between:-30,30'],
            'offsetY' => ['required', 'numeric', 'between:-30,30'],
            'rotation' => ['required', 'numeric', 'between:-180,180'],
            'rotateX' => ['required', 'numeric', 'between:0,360'],
            'rotateY' => ['required', 'numeric', 'between:0,360'],
            'zoom' => ['required', 'numeric', 'between:50,300'],
        ])->validate();

        // Sem arquivo novo a arte atual continua valendo — dá para reajustar só as
        // medidas sem reenviar a imagem.
        $art = $product->mockup['art'] ?? null;

        if ($file = $request->file('art')) {
            if ($art) {
                Storage::disk('public')->delete($art);
            }
            $art = $file->store('mockups', 'public');
        }

        abort_if($art === null, 422, 'Envie a arte da caneca junto da configuração 3D.');

        $product->update(['mockup' => $settings + ['art' => $art]]);
    }

    /**
     * Aplica a ordem enviada em `order[]`, onde cada item é o id de uma imagem já
     * salva ou `new:<índice em images[]>`. Sem `order[]`, a ordem atual é mantida.
     *
     * @param  array<int,int>  $created
     */
    private function applyOrder(Request $request, Product $product, array $created): void
    {
        $order = $request->input('order');

        if (!is_array($order) || $order === []) {
            return;
        }

        $ids = collect($order)
            ->map(fn ($token) => str_starts_with((string) $token, 'new:')
                ? ($created[(int) substr((string) $token, 4)] ?? null)
                : (int) $token)
            ->filter()
            ->values();

        $images = $product->images()->get()->keyBy('id');

        $ids->each(function ($id, $i) use ($images) {
            $image = $images->get($id);
            if ($image && $image->position !== $i) {
                $image->update(['position' => $i]);
            }
        });
    }
}
