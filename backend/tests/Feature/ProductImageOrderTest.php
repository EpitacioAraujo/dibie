<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProductImageOrderTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): void
    {
        foreach (['products.create', 'products.update'] as $name) {
            Permission::findOrCreate($name, 'web');
        }
        $user = User::factory()->create();
        $user->givePermissionTo(['products.create', 'products.update']);

        $this->actingAs($user, 'sanctum');
    }

    private function payload(array $extra = []): array
    {
        return array_merge([
            'slug' => 'caneca-teste',
            'name' => 'Caneca teste',
            'price_cents' => 4990,
            'cat' => 'canecas',
            'active' => 1,
        ], $extra);
    }

    public function test_order_define_a_posicao_das_imagens_novas(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'images' => [
                UploadedFile::fake()->create('a.jpg', 10, 'image/jpeg'),
                UploadedFile::fake()->create('b.jpg', 10, 'image/jpeg'),
            ],
            'order' => ['new:1', 'new:0'],
        ]))->assertCreated();

        // ids são sequenciais na ordem do upload: a segunda imagem tem o id maior
        // e, com order invertida, precisa ficar na posição 0.
        $images = Product::first()->images;

        $this->assertSame([0, 1], $images->pluck('position')->all());
        $this->assertGreaterThan($images[1]->id, $images[0]->id);
    }

    public function test_order_reordena_imagens_ja_salvas_e_troca_a_capa(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'images' => [
                UploadedFile::fake()->create('a.jpg', 10, 'image/jpeg'),
                UploadedFile::fake()->create('b.jpg', 10, 'image/jpeg'),
            ],
        ]))->assertCreated();

        $product = Product::first();
        [$first, $second] = $product->images->all();
        $capaAntiga = $product->image_url;

        $this->putJson("/api/admin/products/{$product->id}", $this->payload([
            'order' => [$second->id, $first->id],
        ]))->assertOk();

        $product = Product::first();

        $this->assertSame($second->id, $product->images->first()->id);
        $this->assertNotSame($capaAntiga, $product->image_url);
    }

    public function test_sem_order_a_ordem_de_upload_e_mantida(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'images' => [
                UploadedFile::fake()->create('a.jpg', 10, 'image/jpeg'),
                UploadedFile::fake()->create('b.jpg', 10, 'image/jpeg'),
            ],
        ]))->assertCreated();

        $images = Product::first()->images;

        $this->assertSame([0, 1], $images->pluck('position')->all());
        $this->assertLessThan($images[1]->id, $images[0]->id);
    }
}
