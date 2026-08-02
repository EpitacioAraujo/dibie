<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index()
    {
        return Role::with('permissions:id,name')->orderBy('name')->get()
            ->map(fn (Role $r) => $this->format($r));
    }

    public function store(Request $request)
    {
        $data = $this->validateData($request, null);
        $role = Role::create(['name' => $data['name'], 'guard_name' => 'web']);
        $role->syncPermissions($data['permissions'] ?? []);

        return response()->json($this->format($role), 201);
    }

    public function show(Role $role)
    {
        return $this->format($role);
    }

    public function update(Request $request, Role $role)
    {
        $data = $this->validateData($request, $role->id);
        $role->update(['name' => $data['name']]);
        $role->syncPermissions($data['permissions'] ?? []);

        return $this->format($role);
    }

    public function destroy(Role $role)
    {
        $role->delete();

        return response()->noContent();
    }

    private function validateData(Request $request, ?int $ignoreId): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('roles')->ignore($ignoreId)],
            'permissions' => ['array'],
            'permissions.*' => ['string', 'exists:permissions,name'],
        ]);
    }

    private function format(Role $role): array
    {
        return [
            'id' => $role->id,
            'name' => $role->name,
            'permissions' => $role->permissions->pluck('name'),
        ];
    }
}
