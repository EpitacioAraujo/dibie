<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class PermissionCatalogSeeder extends Seeder
{
    /** Catálogo fixo de permissões do admin. */
    public const CATALOG = [
        'products.view', 'products.create', 'products.update', 'products.delete',
        'orders.view', 'orders.update',
        'users.view', 'users.create', 'users.update', 'users.delete',
        'roles.view', 'roles.manage',
        'permissions.view',
    ];

    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (self::CATALOG as $name) {
            Permission::firstOrCreate(['name' => $name, 'guard_name' => 'web']);
        }
    }
}
