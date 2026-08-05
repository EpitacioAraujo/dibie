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

    public function index()
    {
        return Product::with('images')->orderBy('id')->get();
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request, null);
        $data['slug'] ??= Product::generateSlug();
        $product = Product::create($data);
        $this->applyOrder($request, $product, $this->storeImages($request, $product));

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

        return $this->index();
    }

    public function destroy(Product $product)
    {
        foreach ($product->images as $image) {
            Storage::disk('public')->delete($image->path);
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

        $request->validate(['images.*' => ['image', 'max:4096']]);

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
