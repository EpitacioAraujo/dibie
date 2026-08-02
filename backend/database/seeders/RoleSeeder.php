<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Super Admin: recebe todas as permissões do catálogo (e o Gate::before
        // garante acesso a permissões criadas futuramente).
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions(Permission::all());

        // Exemplo de perfil restrito, útil de partida (só leitura de catálogo).
        $editorProdutos = Role::firstOrCreate(['name' => 'Editor de produtos', 'guard_name' => 'web']);
        $editorProdutos->syncPermissions([
            'products.view', 'products.create', 'products.update', 'products.delete',
            'orders.view',
        ]);
    }
}
