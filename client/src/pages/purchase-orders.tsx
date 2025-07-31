import { useState } from "react";
import { ShoppingCart, Plus, Calendar, ArrowRight, Scissors, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout";

interface PurchaseOrder {
  id: number;
  poNumber: string;
  dateOrdered: string;
  dateReceived?: string;
  itemName: string;
  pricePerUnit: string;
  company: string;
  quantityOnHand: string;
  total: string;
  status: 'active' | 'waiting' | 'in-progress' | 'pending' | 'done';
}

const mockPurchaseOrders: PurchaseOrder[] = [
  { 
    id: 6, 
    poNumber: "6", 
    dateOrdered: "07/29/25 12:08 PM", 
    dateReceived: "07/29/25 12:09 PM",
    itemName: "12\" full extension drawer slide",
    pricePerUnit: "1 Pair",
    company: "Richelieu", 
    quantityOnHand: "0 (S-Drawer Glides)",
    total: "$73.36",
    status: 'done'
  },
  { 
    id: 5, 
    poNumber: "5", 
    dateOrdered: "07/24/25 3:44 PM",
    itemName: "18\" full extension drawer slide", 
    pricePerUnit: "1 Pair",
    company: "Richelieu", 
    quantityOnHand: "0 (S-Drawer Glides)",
    total: "$721.48",
    status: 'active'
  },
  { 
    id: 4, 
    poNumber: "4", 
    dateOrdered: "07/24/25 3:06 PM", 
    dateReceived: "07/24/25 3:07 PM",
    itemName: "20\" full extension drawer slide",
    pricePerUnit: "1 Pair", 
    company: "Richelieu", 
    quantityOnHand: "0 (S-Drawer Glides)",
    total: "$161.68",
    status: 'done'
  },
  { 
    id: 3, 
    poNumber: "3", 
    dateOrdered: "07/03/25 4:29 PM", 
    dateReceived: "07/03/25 4:30 PM",
    itemName: "22\" full extension drawer slide",
    pricePerUnit: "1 Pair",
    company: "Test Supplier", 
    quantityOnHand: "0 (S-Drawer Glides)",
    total: "$5.00",
    status: 'done'
  },
];

const statusColors = {
  'active': 'bg-blue-500',
  'waiting': 'bg-red-500',
  'in-progress': 'bg-orange-500',
  'pending': 'bg-yellow-500',
  'done': 'bg-green-500'
};

const statusLabels = {
  'active': 'A',
  'waiting': 'W', 
  'in-progress': 'In',
  'pending': 'P',
  'done': 'D'
};

export default function PurchaseOrders() {
  const [currentTime] = useState(new Date());
  const [dateFrom, setDateFrom] = useState("2025-06-30");
  const [dateTo, setDateTo] = useState("2025-07-31");

  return (
    <Layout currentTime={currentTime}>
      <div className="flex h-screen bg-gray-50">
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <nav className="text-sm text-gray-500 mb-2">
                  <span>Home / Supplies / Purchase Orders</span>
                </nav>
                <div className="flex items-center space-x-4">
                  <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
                  <span className="text-gray-400 text-lg">Supplies List</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600 text-center">
                  <div>Order Minimum</div>
                  <div className="text-xs">$200 per color/style</div>
                  <div className="text-xs">Orders under $200: $100 fee</div>
                  <div className="text-xs italic">Terms and conditions apply</div>
                </div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex">
              {/* Main Table Area */}
              <div className="flex-1 bg-white overflow-auto">
                <div className="p-6">
                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">PO #</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">
                            DATE ORDERED
                            <ChevronDown className="inline ml-1 h-3 w-3" />
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">ITEM NAME</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">
                            DATE RECEIVED
                            <ChevronDown className="inline ml-1 h-3 w-3" />
                          </th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">PRICE/UNIT</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">COMPANY</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">QUANTITY ON HAND</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">
                            TOTAL
                            <ChevronDown className="inline ml-1 h-3 w-3" />
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {mockPurchaseOrders.map((po) => (
                          <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{po.poNumber}</td>
                            <td className="py-3 px-4 text-gray-600">{po.dateOrdered}</td>
                            <td className="py-3 px-4">{po.itemName}</td>
                            <td className="py-3 px-4 text-gray-600">{po.dateReceived || '-'}</td>
                            <td className="py-3 px-4 text-gray-600">{po.pricePerUnit}</td>
                            <td className="py-3 px-4">{po.company}</td>
                            <td className="py-3 px-4 text-gray-600">{po.quantityOnHand}</td>
                            <td className="py-3 px-4 font-medium">{po.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                    <span>1-{mockPurchaseOrders.length} of {mockPurchaseOrders.length}</span>
                  </div>
                </div>
              </div>

              {/* Filters Sidebar */}
              <div className="w-80 bg-gray-800 text-white overflow-y-auto">
                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-2">
                      <ArrowRight className="h-4 w-4" />
                      <span className="font-semibold">SEND TO</span>
                    </div>
                    <Scissors className="h-4 w-4" />
                  </div>

                  {/* Filters Section */}
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">FILTERS</h3>
                        <ChevronDown className="h-4 w-4" />
                      </div>
                      
                      {/* Date Filters */}
                      <div className="space-y-3 mb-4">
                        <div>
                          <label className="text-sm mb-1 block">Date Ordered</label>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <Input 
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                            <div className="flex items-center space-x-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              <Input 
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="bg-gray-700 border-gray-600 text-white"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Job Status */}
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Job Status</h4>
                        <div className="space-y-2">
                          {Object.entries(statusColors).map(([status, color]) => (
                            <div key={status} className="flex items-center space-x-2">
                              <div className={`w-3 h-3 rounded-full ${color}`}></div>
                              <span className="text-sm">{statusLabels[status as keyof typeof statusLabels]}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recent */}
                      <div className="mb-4">
                        <h4 className="font-medium mb-2">Recent</h4>
                        <div className="space-y-1">
                          <div className="text-sm">System</div>
                          <div className="text-sm">Real-ti</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Purchase Order Button */}
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add purchase order
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 