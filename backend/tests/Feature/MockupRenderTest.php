<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class MockupRenderTest extends TestCase
{
    use RefreshDatabase;

    private const PIXEL = 'data:image/png;base64,iVBORw0KGgo=';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.replicate.token' => 'test-token']);
    }

    private function actingAsAdmin(): void
    {
        Permission::findOrCreate('products.update', 'web');
        $user = User::factory()->create();
        $user->givePermissionTo('products.update');

        $this->actingAs($user, 'sanctum');
    }

    public function test_requer_autenticacao(): void
    {
        $this->postJson('/api/admin/mockups/render', [
            'image' => self::PIXEL,
            'prompt' => 'foto realista',
        ])->assertUnauthorized();
    }

    public function test_requer_permissao_de_produtos(): void
    {
        Permission::findOrCreate('products.update', 'web');
        $this->actingAs(User::factory()->create(), 'sanctum');

        $this->postJson('/api/admin/mockups/render', [
            'image' => self::PIXEL,
            'prompt' => 'foto realista',
        ])->assertForbidden();
    }

    public function test_rejeita_imagem_que_nao_e_data_uri(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/admin/mockups/render', [
            'image' => 'https://exemplo.com/render.png',
            'prompt' => 'foto realista',
        ])->assertJsonValidationErrorFor('image');
    }

    public function test_envia_o_render_ao_replicate_e_devolve_data_uri(): void
    {
        $this->actingAsAdmin();

        Http::fake([
            'api.replicate.com/*' => Http::response([
                'status' => 'succeeded',
                'output' => 'https://replicate.delivery/out.png',
            ]),
            'replicate.delivery/*' => Http::response('PNGBYTES'),
        ]);

        $this->postJson('/api/admin/mockups/render', [
            'image' => self::PIXEL,
            'prompt' => 'foto realista numa mesa de madeira',
        ])
            ->assertOk()
            ->assertJson(['image' => 'data:image/png;base64,'.base64_encode('PNGBYTES')]);

        Http::assertSent(function (Request $request) {
            return str_contains($request->url(), 'gpt-image-1.5/predictions')
                && $request->header('Prefer') === ['wait']
                && $request['input']['input_images'] === [self::PIXEL]
                // Sem fidelidade alta o modelo redesenha a estampa.
                && $request['input']['input_fidelity'] === 'high'
                && $request['input']['prompt'] === 'foto realista numa mesa de madeira';
        });
    }

    public function test_qualidade_cai_para_medium_quando_nao_informada(): void
    {
        $this->actingAsAdmin();
        Http::fake([
            'api.replicate.com/*' => Http::response(['status' => 'succeeded', 'output' => 'https://replicate.delivery/o.png']),
            'replicate.delivery/*' => Http::response('PNGBYTES'),
        ]);

        $this->postJson('/api/admin/mockups/render', [
            'image' => self::PIXEL,
            'prompt' => 'foto realista',
        ]);

        // "high" custa ~30x mais: nunca pode ser o default silencioso.
        Http::assertSent(fn (Request $request) => str_contains($request->url(), 'predictions')
            && $request['input']['quality'] === 'medium');
    }

    public function test_qualidade_informada_e_repassada(): void
    {
        $this->actingAsAdmin();
        Http::fake([
            'api.replicate.com/*' => Http::response(['status' => 'succeeded', 'output' => 'https://replicate.delivery/o.png']),
            'replicate.delivery/*' => Http::response('PNGBYTES'),
        ]);

        $this->postJson('/api/admin/mockups/render', [
            'image' => self::PIXEL,
            'prompt' => 'foto realista',
            'quality' => 'low',
        ]);

        Http::assertSent(fn (Request $request) => str_contains($request->url(), 'predictions')
            && $request['input']['quality'] === 'low');
    }

    public function test_rejeita_qualidade_invalida(): void
    {
        $this->actingAsAdmin();

        $this->postJson('/api/admin/mockups/render', [
            'image' => self::PIXEL,
            'prompt' => 'foto realista',
            'quality' => 'ultra',
        ])->assertJsonValidationErrorFor('quality');
    }

    public function test_erro_do_replicate_vira_502(): void
    {
        $this->actingAsAdmin();

        Http::fake([
            'api.replicate.com/*' => Http::response(['detail' => 'Insufficient credit'], 402),
        ]);

        $this->postJson('/api/admin/mockups/render', [
            'image' => self::PIXEL,
            'prompt' => 'foto realista',
        ])
            ->assertStatus(502)
            ->assertJson(['message' => 'Insufficient credit']);
    }

    public function test_geracao_que_nao_conclui_vira_502(): void
    {
        $this->actingAsAdmin();

        Http::fake([
            'api.replicate.com/*' => Http::response(['status' => 'processing']),
        ]);

        $this->postJson('/api/admin/mockups/render', [
            'image' => self::PIXEL,
            'prompt' => 'foto realista',
        ])->assertStatus(502);
    }
}
