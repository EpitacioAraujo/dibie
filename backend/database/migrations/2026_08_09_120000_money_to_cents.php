<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Dinheiro passa a trafegar em centavos inteiros. O `decimal` do banco era exato,
 * mas virava float em PHP e no JS do carrinho — 45.90 * 3 dava 137.70000000000002.
 * Com inteiro não existe conversão nem erro de arredondamento no caminho.
 *
 * A coluna nova nasce NOT NULL com default em vez de usar ->change(): alterar tipo
 * é o que diverge entre o Postgres de produção e o sqlite dos testes.
 */
return new class extends Migration
{
    /** tabela => [coluna antiga, coluna nova, precisão do decimal no rollback] */
    private const COLUMNS = [
        'products' => ['price', 'price_cents', 8],
        'orders' => ['total', 'total_cents', 10],
        'order_items' => ['price', 'price_cents', 8],
    ];

    public function up(): void
    {
        foreach (self::COLUMNS as $table => [$old, $new]) {
            Schema::table($table, fn (Blueprint $t) => $t->integer($new)->default(0));
            DB::statement("UPDATE {$table} SET {$new} = ROUND({$old} * 100)");
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn($old));
        }
    }

    public function down(): void
    {
        foreach (self::COLUMNS as $table => [$old, $new, $precision]) {
            Schema::table($table, fn (Blueprint $t) => $t->decimal($old, $precision, 2)->default(0));
            DB::statement("UPDATE {$table} SET {$old} = {$new} / 100.0");
            Schema::table($table, fn (Blueprint $t) => $t->dropColumn($new));
        }
    }
};
