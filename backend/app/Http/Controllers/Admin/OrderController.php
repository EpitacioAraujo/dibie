<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;

class OrderController extends Controller
{
    public function index()
    {
        return Order::with('items')->latest()->paginate(20);
    }

    public function show(Order $order)
    {
        return $order->load('items');
    }

    public function update(Request $request, Order $order)
    {
        $data = $request->validate([
            'status' => ['required', 'string', 'max:50'],
        ]);
        $order->update($data);

        return $order->load('items');
    }
}
