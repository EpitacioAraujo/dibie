<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::updateOrCreate(
            ['email' => env('ADMIN_EMAIL', 'admin@dibie.com.br')],
            [
                'name' => env('ADMIN_NAME', 'Admin dibiê'),
                'password' => Hash::make(env('ADMIN_PASSWORD', 'dibie1234')),
            ]
        );
        $user->syncRoles(['Super Admin']);
    }
}
