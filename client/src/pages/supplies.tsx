import { useState } from "react";
import { Package, Search, Plus, Filter, ChevronUp, Check, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import Layout from "@/components/layout";

interface Supply {
  id: number;
  name: string;
  pieceSize: string;
  quantityOnHand: number;
  category: string;
  location: string;
}

const mockSupplies: Supply[] = [
  { id: 1, name: "12\" full extension drawer slide", pieceSize: "1 Pair", quantityOnHand: 7, category: "5-Drawer Glides", location: "Bay 1" },
  { id: 2, name: "18\" full extension drawer slide", pieceSize: "1 Pair", quantityOnHand: 0, category: "5-Drawer Glides", location: "Bay 1" },
  { id: 3, name: "20\" full extension drawer slide", pieceSize: "1 Pair", quantityOnHand: 0, category: "5-Drawer Glides", location: "Bay 1" },
  { id: 4, name: "22\" full extension drawer slide", pieceSize: "1 Pair", quantityOnHand: 0, category: "5-Drawer Glides", location: "Bay 1" },
  { id: 5, name: "24\" full extension drawer slide", pieceSize: "1 Pair", quantityOnHand: 0, category: "5-Drawer Glides", location: "Bay 1" },
  { id: 6, name: "26\" full extension drawer slide", pieceSize: "1 Pair", quantityOnHand: 0, category: "5-Drawer Glides", location: "Bay 1" },
  { id: 7, name: "28\" full extension drawer slide", pieceSize: "1 Pair", quantityOnHand: 0, category: "5-Drawer Glides", location: "Bay 1" },
];

const categories = [
  "1-Sheet Materials",
  "2-Edgebandings", 
  "3-Hardwood Materials",
  "4-Drawer Box Materials",
  "5-Drawer Glides",
  "6-Hinges / Plates / Handles",
  "7-Accessories / Inserts",
  "8-Other Inventory"
];

const locations = [
  "Bay 1", "Bay 2", "Bay 3", "Bay 4", "Bay 5", "Bay 6", "Bay 7",
  "Rack 1", "Rack 2", "Rack 3", "Shipping Goods", "Unassigned"
];

export default function Supplies() {
  const [currentTime] = useState(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [showImages, setShowImages] = useState(true);
  const [onlySupplies, setOnlySupplies] = useState(false);
  const [availableInCatalog, setAvailableInCatalog] = useState(true);
  const [b2bEnabled, setB2bEnabled] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(categories);
  const [selectedLocations, setSelectedLocations] = useState<string[]>(locations.filter(l => l !== "Unassigned"));

  const filteredSupplies = mockSupplies.filter(supply => {
    const matchesSearch = supply.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategories.includes(supply.category);
    const matchesLocation = selectedLocations.includes(supply.location);
    return matchesSearch && matchesCategory && matchesLocation;
  });

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const toggleLocation = (location: string) => {
    setSelectedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  const toggleAllCategories = () => {
    setSelectedCategories(selectedCategories.length === categories.length ? [] : categories);
  };

  const toggleAllLocations = () => {
    setSelectedLocations(selectedLocations.length === locations.length ? [] : locations);
  };

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
                  <span>Home / Supplies</span>
                </nav>
                <h1 className="text-2xl font-bold text-gray-900">Supplies List</h1>
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
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">ITEM NAME</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">PIECE SIZE</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-900">QUANTITY ON HAND</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredSupplies.map((supply) => (
                          <tr key={supply.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                {showImages && (
                                  <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                                    <Package className="h-4 w-4 text-gray-500" />
                                  </div>
                                )}
                                <span className="font-medium">{supply.name}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{supply.pieceSize}</td>
                            <td className="py-3 px-4">
                              <Badge variant={supply.quantityOnHand > 0 ? "default" : "secondary"}>
                                {supply.quantityOnHand} ({supply.category})
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  <div className="mt-4 flex justify-between items-center text-sm text-gray-600">
                    <span>1-{filteredSupplies.length} of {filteredSupplies.length}</span>
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
                  </div>

                  {/* Filters Section */}
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold">FILTERS</h3>
                        <ChevronUp className="h-4 w-4" />
                      </div>
                      
                      {/* Search Fields */}
                      <div className="space-y-3 mb-4">
                        <Input 
                          placeholder="Supply Name" 
                          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        />
                        <Input 
                          placeholder="Sale Name" 
                          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        />
                        <Input 
                          placeholder="Vendor" 
                          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                        />
                      </div>

                      {/* Display Options */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={showImages} 
                            onCheckedChange={(checked) => setShowImages(checked === true)}
                            className="border-gray-600"
                          />
                          <span className="text-sm">Show images</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={onlySupplies} 
                            onCheckedChange={(checked) => setOnlySupplies(checked === true)}
                            className="border-gray-600"
                          />
                          <span className="text-sm">Only Show Supplies</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={availableInCatalog} 
                            onCheckedChange={(checked) => setAvailableInCatalog(checked === true)}
                            className="border-gray-600"
                          />
                          <span className="text-sm">Available in Catalog</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            checked={b2bEnabled} 
                            onCheckedChange={(checked) => setB2bEnabled(checked === true)}
                            className="border-gray-600"
                          />
                          <span className="text-sm">B2B-enabled</span>
                        </div>
                      </div>

                      {/* Locations */}
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">Locations</h4>
                          <span className="text-gray-400">?</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              checked={selectedCategories.length === categories.length}
                              onCheckedChange={toggleAllCategories}
                              className="border-gray-600"
                            />
                            <span className="text-sm">All</span>
                          </div>
                          {categories.map((category) => (
                            <div key={category} className="flex items-center space-x-2 ml-4">
                              <Checkbox 
                                checked={selectedCategories.includes(category)}
                                onCheckedChange={() => toggleCategory(category)}
                                className="border-gray-600"
                              />
                              <span className="text-sm">{category}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Physical Locations */}
                      <div className="mb-4">
                        <div className="space-y-1">
                          {locations.map((location) => (
                            <div key={location} className="flex items-center space-x-2">
                              <Checkbox 
                                checked={selectedLocations.includes(location)}
                                onCheckedChange={() => toggleLocation(location)}
                                className="border-gray-600"
                              />
                              <span className="text-sm">{location}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tag Filters */}
                      <div className="space-y-3 mb-6">
                        <div>
                          <div className="text-sm mb-2">Supply Has ANY Of these tags:</div>
                          <Button variant="outline" size="sm" className="w-full bg-gray-700 border-gray-600 text-white">
                            More Tags
                          </Button>
                        </div>
                        <div>
                          <div className="text-sm mb-2">Supply Has ALL Of these tags:</div>
                          <Button variant="outline" size="sm" className="w-full bg-gray-700 border-gray-600 text-white">
                            More Tags
                          </Button>
                        </div>
                        <div>
                          <div className="text-sm mb-2">Supply Has NONE Of these tags:</div>
                          <Button variant="outline" size="sm" className="w-full bg-gray-700 border-gray-600 text-white">
                            More Tags
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Add Item Button */}
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Item
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