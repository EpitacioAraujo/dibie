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
        $product = Product::create($data);
        $this->storeImages($request, $product);

        return response()->json($product->load('images'), 201);
    }

    public function show(Product $product)
    {
        return $product->load('images');
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->validateData($request, $product->id);
        $product->update($data);
        $this->storeImages($request, $product);

        return $product->load('images');
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
            'slug' => ['required', 'string', 'max:255', Rule::unique('products')->ignore($ignoreId)],
            'name' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'cat' => ['required', 'string', 'max:255'],
            'active' => ['boolean'],
        ]);
    }

    /** Adiciona (nunca substitui) as imagens enviadas em `images[]`, respeitando o limite de 4. */
    private function storeImages(Request $request, Product $product): void
    {
        if (!$request->hasFile('images')) {
            return;
        }

        $files = $request->file('images');
        $existing = $product->images()->count();

        abort_if($existing + count($files) > self::MAX_IMAGES, 422, 'Máximo de '.self::MAX_IMAGES.' imagens por produto.');

        $request->validate(['images.*' => ['image', 'max:4096']]);

        foreach ($files as $i => $file) {
            ProductImage::create([
                'product_id' => $product->id,
                'path' => $file->store('products', 'public'),
                'position' => $existing + $i,
            ]);
        }
    }
}
