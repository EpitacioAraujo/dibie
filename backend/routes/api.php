<?php

use App\Http\Controllers\Admin\HeroController as AdminHeroController;
use App\Http\Controllers\Admin\MockupController;
use App\Http\Controllers\Admin\OrderController as AdminOrderController;
use App\Http\Controllers\Admin\PermissionController;
use App\Http\Controllers\Admin\ProductController as AdminProductController;
use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\UserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\HeroController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use Illuminate\Support\Facades\Route;

// ---- Público (site) ----
Route::post('auth/login', [AuthController::class, 'login']);
Route::get('products', [ProductController::class, 'index']);
Route::get('categories', [ProductController::class, 'categories']);
Route::get('products/{slug}', [ProductController::class, 'show']);
// A arte da caneca 3D vem por aqui para herdar o CORS do /api/* (ver o método art).
Route::get('products/{slug}/art', [ProductController::class, 'art']);
Route::get('hero', [HeroController::class, 'index']);
Route::post('orders', [OrderController::class, 'store']);

// ---- Autenticado ----
Route::middleware('auth:sanctum')->group(function () {
    Route::post('auth/logout', [AuthController::class, 'logout']);
    Route::get('auth/me', [AuthController::class, 'me']);

    Route::prefix('admin')->group(function () {
        // Produtos
        Route::get('products', [AdminProductController::class, 'index'])->middleware('permission:products.view');
        Route::post('products', [AdminProductController::class, 'store'])->middleware('permission:products.create');
        Route::get('products/{product}', [AdminProductController::class, 'show'])->middleware('permission:products.view');
        Route::match(['put', 'patch'], 'products/{product}', [AdminProductController::class, 'update'])->middleware('permission:products.update');
        Route::delete('products/{product}', [AdminProductController::class, 'destroy'])->middleware('permission:products.delete');
        Route::delete('products/{product}/images/{image}', [AdminProductController::class, 'destroyImage'])->middleware('permission:products.update');
        Route::patch('products-featured', [AdminProductController::class, 'featured'])->middleware('permission:products.update');

        // Home (hero do site) — reusa a permissão de produtos, como o endpoint de mockups
        Route::get('hero', [AdminHeroController::class, 'index'])->middleware('permission:products.update');
        Route::post('hero', [AdminHeroController::class, 'store'])->middleware('permission:products.update');
        Route::put('hero', [AdminHeroController::class, 'update'])->middleware('permission:products.update');
        Route::delete('hero/{hero}', [AdminHeroController::class, 'destroy'])->middleware('permission:products.update');

        // Mockups (gerador 3D + IA)
        Route::post('mockups/render', [MockupController::class, 'render'])->middleware('permission:products.update');

        // Pedidos
        Route::get('orders', [AdminOrderController::class, 'index'])->middleware('permission:orders.view');
        Route::get('orders/{order}', [AdminOrderController::class, 'show'])->middleware('permission:orders.view');
        Route::match(['put', 'patch'], 'orders/{order}', [AdminOrderController::class, 'update'])->middleware('permission:orders.update');

        // Usuários
        Route::get('users', [UserController::class, 'index'])->middleware('permission:users.view');
        Route::post('users', [UserController::class, 'store'])->middleware('permission:users.create');
        Route::get('users/{user}', [UserController::class, 'show'])->middleware('permission:users.view');
        Route::match(['put', 'patch'], 'users/{user}', [UserController::class, 'update'])->middleware('permission:users.update');
        Route::delete('users/{user}', [UserController::class, 'destroy'])->middleware('permission:users.delete');

        // Perfis (roles)
        Route::get('roles', [RoleController::class, 'index'])->middleware('permission:roles.view');
        Route::post('roles', [RoleController::class, 'store'])->middleware('permission:roles.manage');
        Route::get('roles/{role}', [RoleController::class, 'show'])->middleware('permission:roles.view');
        Route::match(['put', 'patch'], 'roles/{role}', [RoleController::class, 'update'])->middleware('permission:roles.manage');
        Route::delete('roles/{role}', [RoleController::class, 'destroy'])->middleware('permission:roles.manage');

        // Catálogo de permissões
        Route::get('permissions', [PermissionController::class, 'index'])->middleware('permission:permissions.view');
    });
});
