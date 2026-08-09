<?php

namespace Tests\Feature;

use App\Models\HeroItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class HomeAdminTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(): void
    {
        Permission::findOrCreate('products.update', 'web');
        $user = User::factory()->create();
        $user->givePermissionTo('products.update');

        $this->actingAs($user, 'sanctum');
    }

    private function upload(string $lane = 'slide'): int
    {
        return $this->post('/api/admin/hero', [
            'lane' => $lane,
            'image' => UploadedFile::fake()->create('slide.jpg', 10, 'image/jpeg'),
        ])->assertCreated()->json('id');
    }

    public function test_hero_exige_permissao(): void
    {
        Permission::findOrCreate('products.update', 'web');
        $this->actingAs(User::factory()->create(), 'sanctum');

        $this->getJson('/api/admin/hero')->assertForbidden();
    }

    public function test_sobe_ordena_e_apaga_itens_da_hero(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $primeiro = $this->upload();
        $segundo = $this->upload();

        $this->putJson('/api/admin/hero', ['items' => [
            ['id' => $segundo, 'lane' => 'slide', 'position' => 0, 'title' => 'Novo título', 'sub' => 'sub'],
            ['id' => $primeiro, 'lane' => 'slide', 'position' => 1],
        ]])->assertOk();

        $lista = $this->getJson('/api/hero')->assertOk()->json();
        $this->assertSame($segundo, $lista[0]['id']);
        $this->assertSame('Novo título', $lista[0]['title']);

        $this->deleteJson("/api/admin/hero/{$segundo}")->assertNoContent();

        // a faixa é reindexada: o que sobrou volta para a posição 0
        $this->assertSame(0, HeroItem::find($primeiro)->position);
    }

    public function test_destaques_definem_quais_produtos_a_home_lista_e_em_que_ordem(): void
    {
        $this->actingAsAdmin();

        $a = Product::create(['slug' => 'a', 'name' => 'A', 'price_cents' => 1000, 'cat' => 'c', 'active' => true]);
        $b = Product::create(['slug' => 'b', 'name' => 'B', 'price_cents' => 1000, 'cat' => 'c', 'active' => true]);
        $c = Product::create(['slug' => 'c', 'name' => 'C', 'price_cents' => 1000, 'cat' => 'c', 'active' => true]);

        // c e b em destaque (nessa ordem); a nem entra no payload.
        $this->patchJson('/api/admin/products-featured', ['items' => [
            ['id' => $c->id, 'featured' => true, 'position' => 0],
            ['id' => $b->id, 'featured' => true, 'position' => 1],
        ]])->assertOk();

        $publico = $this->getJson('/api/products')->assertOk()->json('data');

        // destaques na ordem definida, o não destacado no fim
        $this->assertSame([$c->id, $b->id, $a->id], array_column($publico, 'id'));
        $this->assertFalse($publico[2]['featured']);
    }
}
