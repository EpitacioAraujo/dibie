<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class ProductMockupTest extends TestCase
{
    use RefreshDatabase;

    private const SETTINGS = [
        'mugColor' => '#ffffff',
        'handleColor' => '#c0392b',
        'circumference' => 26.5,
        'height' => 9.5,
        'artWidth' => 21,
        'artHeight' => 9.3,
        'offsetX' => 0,
        'offsetY' => 1.2,
        'rotation' => 0,
        'azimuth' => -135,
        'elevation' => 22,
    ];

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
            'name' => 'Caneca teste',
            'price' => '49.90',
            'cat' => 'canecas',
            'active' => 1,
        ], $extra);
    }

    private function art(string $name = 'arte.png'): UploadedFile
    {
        return UploadedFile::fake()->create($name, 10, 'image/png');
    }

    public function test_salva_a_arte_e_as_medidas_da_caneca(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'art' => $this->art(),
            'mockup' => json_encode(self::SETTINGS),
        ]))->assertCreated();

        $mockup = Product::first()->mockup;

        $this->assertSame(26.5, $mockup['circumference']);
        $this->assertSame('#c0392b', $mockup['handleColor']);
        Storage::disk('public')->assertExists($mockup['art']);
    }

    public function test_o_site_publico_devolve_o_mockup_e_a_url_da_arte(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'art' => $this->art(),
            'mockup' => json_encode(self::SETTINGS),
        ]))->assertCreated();

        $this->getJson('/api/products/'.Product::first()->slug)
            ->assertOk()
            ->assertJsonPath('mockup.azimuth', -135)
            ->assertJsonPath('mockup_art_url', fn ($url) => is_string($url) && $url !== '');
    }

    public function test_a_arte_sai_pela_rota_de_api_e_nao_pelo_storage(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'art' => $this->art(),
            'mockup' => json_encode(self::SETTINGS),
        ]))->assertCreated();

        $slug = Product::first()->slug;

        // É de /api/* que vêm os cabeçalhos CORS de que o canvas do three.js
        // depende: servida de /storage, a textura seria recusada pelo WebGL.
        $this->getJson('/api/products/'.$slug)
            ->assertJsonPath('mockup_art_url', url("/api/products/{$slug}/art"));

        $this->get("/api/products/{$slug}/art")
            ->assertOk()
            ->assertHeader('Cache-Control', 'max-age=3600, public');
    }

    public function test_a_arte_nao_vaza_produto_inativo_nem_sem_mockup(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'art' => $this->art(),
            'mockup' => json_encode(self::SETTINGS),
        ]))->assertCreated();
        $this->postJson('/api/admin/products', $this->payload(['name' => 'Sem 3D']))
            ->assertCreated();

        [$comArte, $semArte] = Product::orderBy('id')->get()->all();

        $this->getJson("/api/products/{$semArte->slug}/art")->assertNotFound();

        $comArte->update(['active' => false]);
        $this->getJson("/api/products/{$comArte->slug}/art")->assertNotFound();
    }

    public function test_produto_sem_mockup_devolve_nulo(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload())->assertCreated();

        $this->getJson('/api/products/'.Product::first()->slug)
            ->assertOk()
            ->assertJsonPath('mockup', null)
            ->assertJsonPath('mockup_art_url', null);
    }

    public function test_rejeita_medidas_fora_dos_limites_do_editor(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'art' => $this->art(),
            'mockup' => json_encode(['azimuth' => 999] + self::SETTINGS),
        ]))->assertJsonValidationErrorFor('azimuth');
    }

    public function test_arte_nova_substitui_a_anterior_no_disco(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'art' => $this->art('velha.png'),
            'mockup' => json_encode(self::SETTINGS),
        ]))->assertCreated();

        $product = Product::first();
        $old = $product->mockup['art'];

        $this->postJson('/api/admin/products/'.$product->id, $this->payload([
            '_method' => 'PUT',
            'art' => $this->art('nova.png'),
            'mockup' => json_encode(['mugColor' => '#000000'] + self::SETTINGS),
        ]))->assertOk();

        $new = $product->fresh()->mockup;

        $this->assertNotSame($old, $new['art']);
        $this->assertSame('#000000', $new['mugColor']);
        Storage::disk('public')->assertMissing($old);
        Storage::disk('public')->assertExists($new['art']);
    }

    public function test_sem_arquivo_novo_a_arte_atual_continua_valendo(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'art' => $this->art(),
            'mockup' => json_encode(self::SETTINGS),
        ]))->assertCreated();

        $product = Product::first();
        $art = $product->mockup['art'];

        $this->postJson('/api/admin/products/'.$product->id, $this->payload([
            '_method' => 'PUT',
            'mockup' => json_encode(['elevation' => 40] + self::SETTINGS),
        ]))->assertOk();

        $this->assertSame($art, $product->fresh()->mockup['art']);
        $this->assertSame(40, $product->fresh()->mockup['elevation']);
        Storage::disk('public')->assertExists($art);
    }

    public function test_aceita_formatos_que_a_regra_image_recusa(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'art' => UploadedFile::fake()->create('arte.avif', 10, 'image/avif'),
            'mockup' => json_encode(self::SETTINGS),
        ]))->assertCreated();

        Storage::disk('public')->assertExists(Product::first()->mockup['art']);
    }

    public function test_recusa_arte_que_nao_e_imagem(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'art' => UploadedFile::fake()->create('arte.pdf', 10, 'application/pdf'),
            'mockup' => json_encode(self::SETTINGS),
        ]))->assertJsonValidationErrorFor('art');
    }

    public function test_recusa_configuracao_sem_arte(): void
    {
        Storage::fake('public');
        $this->actingAsAdmin();

        $this->postJson('/api/admin/products', $this->payload([
            'mockup' => json_encode(self::SETTINGS),
        ]))->assertStatus(422);
    }
}
