<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    /** Catálogo de permissões (fixo, semeado). */
    public function index()
    {
        return Permission::orderBy('name')->pluck('name');
    }
}
